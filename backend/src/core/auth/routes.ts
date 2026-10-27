import { Request, Response, Router } from 'express';
import validator from 'validator';
import { wrapHandler } from '../../helpers';
import { HttpError } from '../../middlewares';
import type { AuthContext, CitizenUserAttributes, OtpPurpose, StaffUserAttributes } from '../../types';
import { assertPasswordStrength, hashSecret, verifySecret } from './helpers';
import { requireAuth } from './middlewares';
import { CITIZEN_LANGUAGES } from './models';

export const authRouter = Router();

export function serializeStaff(staff: StaffUserAttributes): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = staff;
  return rest;
}

export function serializeCitizen(citizen: CitizenUserAttributes): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = citizen;
  return rest;
}

function describe(auth: AuthContext): Record<string, unknown> {
  if (auth.kind === 'citizen') {
    return { kind: 'citizen', role: 'citizen', user: serializeCitizen(auth.citizen), scope: null };
  }
  return { kind: 'staff', role: auth.role, user: serializeStaff(auth.staff), scope: auth.scope };
}

authRouter.post('/otp', wrapHandler(async (req: Request, res: Response) => {
    const { authService } = res.app.services;
    const { phone, purpose } = req.body;
    const result = await authService.requestOtp(phone, (purpose || 'register') as OtpPurpose);
    res.status(200).send({ data: { sent: true, ...result } });
}))

authRouter.post('/citizen/register', wrapHandler(async (req: Request, res: Response) => {
    const { authService } = res.app.services;
    const [citizen, token] = await authService.registerCitizen(req.body);
    res.status(201).send({ data: { token, kind: 'citizen', role: 'citizen', user: serializeCitizen(citizen) } });
}))

authRouter.post('/citizen/login', wrapHandler(async (req: Request, res: Response) => {
    const { authService } = res.app.services;
    const { identifier, password } = req.body;
    const [citizen, token] = await authService.loginCitizen(String(identifier || ''), String(password || ''));
    res.status(200).send({ data: { token, kind: 'citizen', role: 'citizen', user: serializeCitizen(citizen) } });
}))

authRouter.post('/citizen/reset-password', wrapHandler(async (req: Request, res: Response) => {
    const { authService } = res.app.services;
    const { phone, otp, password } = req.body;
    await authService.resetCitizenPassword(phone, otp, password);
    res.status(200).send({ data: { reset: true } });
}))

authRouter.post('/staff/login', wrapHandler(async (req: Request, res: Response) => {
    const { authService } = res.app.services;
    const { email, password } = req.body;
    const [staff, token] = await authService.loginStaff(String(email || ''), String(password || ''));
    const auth = await authService.authenticateToken(token) as AuthContext;
    res.status(200).send({ data: { token, ...describe(auth), user: serializeStaff(staff) } });
}))

authRouter.get('/me', requireAuth, wrapHandler(async (req: Request, res: Response) => {
    res.status(200).send({ data: describe(req.auth as AuthContext) });
}))

authRouter.patch('/me', requireAuth, wrapHandler(async (req: Request, res: Response) => {
    const { citizenUserRepository, staffUserRepository, geoRepository } = res.app.repositories;
    const auth = req.auth as AuthContext;
    if (auth.kind === 'citizen') {
        const update: Partial<CitizenUserAttributes> = {};
        if (typeof req.body.fullName === 'string') {
            const fullName = req.body.fullName.trim();
            if (fullName.length < 2) { throw new HttpError(400, 'Full name is required.'); }
            update.fullName = fullName;
        }
        if (req.body.email !== undefined) {
            const email = String(req.body.email || '').trim().toLowerCase();
            if (email && !validator.isEmail(email)) { throw new HttpError(400, 'Enter a valid email address.'); }
            const owner = email ? await citizenUserRepository.findByEmail(email) : null;
            if (owner && owner.id !== auth.id) { throw new HttpError(409, 'An account with this email already exists.'); }
            update.email = email || null;
        }
        if (CITIZEN_LANGUAGES.includes(req.body.preferredLanguage)) {
            update.preferredLanguage = req.body.preferredLanguage;
        }
        if (req.body.jurisdictionId !== undefined) {
            const localLevel = req.body.jurisdictionId ? await geoRepository.findLocalLevel(req.body.jurisdictionId) : null;
            if (req.body.jurisdictionId && !localLevel) { throw new HttpError(400, 'Unknown municipality.'); }
            const wardNo = req.body.wardNo ? Number(req.body.wardNo) : null;
            if (localLevel && wardNo !== null && (wardNo < 1 || wardNo > (localLevel.wardCount || 0))) {
                throw new HttpError(400, `Ward must be between 1 and ${localLevel.wardCount}.`);
            }
            Object.assign(update, {
                jurisdictionId: localLevel?.id ?? null,
                districtId: localLevel?.districtId ?? null,
                provinceId: localLevel?.provinceId ?? null,
                wardNo: localLevel ? wardNo : null,
            });
        }
        const citizen = await citizenUserRepository.update(auth.id, update);
        res.status(200).send({ data: { kind: 'citizen', role: 'citizen', user: serializeCitizen(citizen), scope: null } });
        return;
    }
    const update: Partial<StaffUserAttributes> = {};
    if (req.body.phone !== undefined) { update.phone = String(req.body.phone || '') || undefined; }
    if (typeof req.body.designation === 'string') { update.designation = req.body.designation.trim(); }
    const staff = await staffUserRepository.updateById(auth.id, update) as StaffUserAttributes;
    res.status(200).send({ data: { ...describe(auth), user: serializeStaff(staff) } });
}))

authRouter.post('/change-password', requireAuth, wrapHandler(async (req: Request, res: Response) => {
    const { citizenUserRepository, staffUserRepository } = res.app.repositories;
    const auth = req.auth as AuthContext;
    const { currentPassword, newPassword } = req.body;
    assertPasswordStrength(newPassword);
    if (auth.kind === 'citizen') {
        const record = await citizenUserRepository.findByPhone(auth.citizen.phone, true);
        if (!await verifySecret(String(currentPassword || ''), record?.passwordHash)) {
            throw new HttpError(400, 'Current password is incorrect.');
        }
        await citizenUserRepository.update(auth.id, { passwordHash: await hashSecret(newPassword) });
    } else {
        const record = await staffUserRepository.findByEmail(auth.staff.email, true);
        if (!await verifySecret(String(currentPassword || ''), record?.passwordHash)) {
            throw new HttpError(400, 'Current password is incorrect.');
        }
        await staffUserRepository.updateById(auth.id, { passwordHash: await hashSecret(newPassword) });
    }
    res.status(200).send({ data: { changed: true } });
}))
