import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import validator from 'validator';
import { wrapHandler } from '../../helpers';
import { HttpError } from '../../middlewares';
import { normalizeNepaliPhone } from '../../sms';
import type { AuthScope, StaffAuth, StaffRole, StaffUserAttributes } from '../../types';
import { generateTemporaryPassword, hashSecret } from '../auth/helpers';
import { requireStaff, staffAuth } from '../auth/middlewares';
import { serializeStaff } from '../auth/routes';
import { levelRank, ROLE_LEVEL, scopeForStaff, scopeToWhere } from '../auth/scope';
import { STAFF_ROLES } from '../staff-users/models';

export const adminRouter = Router();

// Ward officers do not manage accounts.
adminRouter.use(requireStaff('palika'));

/** An officer may manage accounts strictly below their own level, inside their own area. */
function canManage(auth: StaffAuth, targetRole: StaffRole, target: AuthScope): boolean {
  if (auth.scope.level === 'national') { return true; }
  if (levelRank(ROLE_LEVEL[targetRole]) >= levelRank(auth.scope.level)) { return false; }
  switch (auth.scope.level) {
    case 'province':
      return target.provinceId === auth.scope.provinceId;
    case 'district':
      return target.districtId === auth.scope.districtId;
    case 'palika':
      return target.jurisdictionId === auth.scope.jurisdictionId;
    default:
      return false;
  }
}

async function resolveTargetScope(
  req: Request, role: StaffRole, body: Record<string, unknown>
): Promise<AuthScope> {
  const { geoRepository } = req.app.repositories;
  if (role === 'super_admin') { return { level: 'national' }; }
  if (role === 'province_officer') {
    const province = await geoRepository.findProvince(Number(body.provinceId));
    if (!province) { throw new HttpError(400, 'Choose a province.'); }
    return { level: 'province', provinceId: province.id };
  }
  if (role === 'district_officer') {
    const district = await geoRepository.findDistrict(Number(body.districtId));
    if (!district) { throw new HttpError(400, 'Choose a district.'); }
    return { level: 'district', districtId: district.id, provinceId: district.provinceId };
  }
  const localLevel = await geoRepository.findLocalLevel(String(body.jurisdictionId || ''));
  if (!localLevel) { throw new HttpError(400, 'Choose a municipality.'); }
  const scope: AuthScope = {
    level: role === 'ward_officer' ? 'ward' : 'palika',
    jurisdictionId: localLevel.id,
    districtId: localLevel.districtId,
    provinceId: localLevel.provinceId,
  };
  if (role === 'ward_officer') {
    const wardNo = Number(body.wardNo);
    if (!Number.isInteger(wardNo) || wardNo < 1 || wardNo > (localLevel.wardCount || 0)) {
      throw new HttpError(400, `Ward must be between 1 and ${localLevel.wardCount}.`);
    }
    scope.wardNo = wardNo;
  }
  return scope;
}

async function loadManageable(req: Request): Promise<StaffUserAttributes> {
  const { staffUserRepository } = req.app.repositories;
  const auth = staffAuth(req);
  const staff = await staffUserRepository.findById(req.params.id);
  if (!staff || staff.id === auth.id) { throw new HttpError(404, 'Officer not found.'); }
  const role = (staff.role || 'palika_officer') as StaffRole;
  if (!canManage(auth, role, scopeForStaff(staff))) { throw new HttpError(404, 'Officer not found.'); }
  return staff;
}

adminRouter.get('/staff', wrapHandler(async (req: Request, res: Response) => {
    const { staffUserRepository } = res.app.repositories;
    const auth = staffAuth(req);
    const where: Record<string, unknown> = { ...scopeToWhere(auth.scope) };
    if (req.query.role && STAFF_ROLES.includes(String(req.query.role))) { where.role = String(req.query.role); }
    if (req.query.jurisdictionId) { where.jurisdictionId = String(req.query.jurisdictionId); }
    const records = await staffUserRepository.findAllWhere(where, 1000);
    res.status(200).send({ data: records.map(serializeStaff), count: records.length });
}))

adminRouter.post('/staff', wrapHandler(async (req: Request, res: Response) => {
    const { staffUserRepository } = res.app.repositories;
    const auth = staffAuth(req);
    const body = req.body as Record<string, unknown>;
    const role = String(body.role || '') as StaffRole;
    if (!STAFF_ROLES.includes(role)) { throw new HttpError(400, 'Choose a valid role.'); }
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    if (!firstName || !lastName) { throw new HttpError(400, 'First and last name are required.'); }
    const email = String(body.email || '').trim().toLowerCase();
    if (!validator.isEmail(email)) { throw new HttpError(400, 'Enter a valid email address.'); }
    if (await staffUserRepository.findByEmail(email)) { throw new HttpError(409, 'An officer with this email already exists.'); }
    const phone = body.phone ? normalizeNepaliPhone(String(body.phone)) : null;
    if (body.phone && !phone) { throw new HttpError(400, 'Enter a valid Nepali mobile number.'); }

    const scope = await resolveTargetScope(req, role, body);
    if (!canManage(auth, role, scope)) { throw new HttpError(403, 'You cannot create this officer.'); }

    const temporaryPassword = generateTemporaryPassword();
    const created = await staffUserRepository.create({
      id: crypto.randomUUID(),
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      role,
      designation: body.designation ? String(body.designation).trim().slice(0, 120) : undefined,
      jurisdictionId: scope.jurisdictionId ?? null,
      wardNo: scope.wardNo ?? null,
      districtId: scope.districtId ?? null,
      provinceId: scope.provinceId ?? null,
      isAdmin: role !== 'ward_officer',
      isActive: true,
      permissions: role === 'super_admin' ? ['read-contact-info', 'access-all-jurisdictions'] : ['read-contact-info'],
      passwordHash: await hashSecret(temporaryPassword),
    } as unknown as StaffUserAttributes);
    const record = await staffUserRepository.findById(created.id) as StaffUserAttributes;
    // The temporary password is shown once; the officer should change it after first login.
    res.status(201).send({ data: { ...serializeStaff(record), temporaryPassword } });
}))

adminRouter.patch('/staff/:id', wrapHandler(async (req: Request, res: Response) => {
    const { staffUserRepository } = res.app.repositories;
    const staff = await loadManageable(req);
    const update: Partial<StaffUserAttributes> = {};
    if (typeof req.body.isActive === 'boolean') { update.isActive = req.body.isActive; }
    if (typeof req.body.designation === 'string') { update.designation = req.body.designation.trim().slice(0, 120); }
    if (req.body.phone !== undefined) {
      const phone = req.body.phone ? normalizeNepaliPhone(String(req.body.phone)) : null;
      if (req.body.phone && !phone) { throw new HttpError(400, 'Enter a valid Nepali mobile number.'); }
      update.phone = phone || undefined;
    }
    const record = await staffUserRepository.updateById(staff.id, update) as StaffUserAttributes;
    res.status(200).send({ data: serializeStaff(record) });
}))

adminRouter.post('/staff/:id/reset-password', wrapHandler(async (req: Request, res: Response) => {
    const { staffUserRepository } = res.app.repositories;
    const staff = await loadManageable(req);
    const temporaryPassword = generateTemporaryPassword();
    await staffUserRepository.updateById(staff.id, { passwordHash: await hashSecret(temporaryPassword) });
    res.status(200).send({ data: { id: staff.id, temporaryPassword } });
}))
