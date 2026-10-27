import { Request, Response, Router } from 'express';
import { Op } from 'sequelize';
import { wrapHandler } from '../../helpers';
import { HttpError } from '../../middlewares';
import type {
  AuthContext,
  GovernmentLevel,
  GrievanceFilters,
  GrievancePriority,
  GrievanceRecord,
  ServiceRequestAttributes,
  ServiceRequestStatus
} from '../../types';
import { citizenAuth, requireAuth, requireCitizen, requireStaff, staffAuth } from '../auth/middlewares';
import { scopeCoversGrievance, scopeForStaff } from '../auth/scope';
import { REQUEST_STATUS_KEYS, SERVICE_REQUEST_ACTIVE_STATES } from '../service-requests/models';
import { CATEGORY_KEYS, GRIEVANCE_CATEGORIES, makeReference, PALIKA_DEPARTMENTS, PRIORITY_KEYS, PRIORITY_SLA_HOURS } from './constants';

export const grievanceRouter = Router();

const LEVELS: GovernmentLevel[] = ['ward', 'palika', 'district', 'province'];

function list<T extends string>(value: unknown, allowed: readonly string[]): T[] | undefined {
  if (value === undefined || value === '') { return undefined; }
  const items = String(value).split(',').map((item) => item.trim()).filter(Boolean);
  const invalid = items.filter((item) => !allowed.includes(item));
  if (invalid.length) { throw new HttpError(400, `Unknown filter value: ${invalid.join(', ')}`); }
  return items as T[];
}

function int(value: unknown): number | undefined {
  if (value === undefined || value === '') { return undefined; }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) { throw new HttpError(400, `Expected a whole number, got ${value}.`); }
  return parsed;
}

function date(value: unknown): Date | undefined {
  if (value === undefined || value === '') { return undefined; }
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) { throw new HttpError(400, `Invalid date: ${value}`); }
  return parsed;
}

function parseFilters(query: Request['query']): GrievanceFilters {
  return {
    status: list<ServiceRequestStatus>(query.status, REQUEST_STATUS_KEYS),
    category: list<string>(query.category, CATEGORY_KEYS),
    priority: list<GrievancePriority>(query.priority, PRIORITY_KEYS),
    level: list<GovernmentLevel>(query.level, LEVELS),
    provinceId: int(query.provinceId),
    districtId: int(query.districtId),
    jurisdictionId: query.jurisdictionId ? String(query.jurisdictionId) : undefined,
    wardNo: int(query.wardNo),
    assignedTo: query.assignedTo ? String(query.assignedTo) : undefined,
    overdue: query.overdue === 'true' || query.overdue === '1',
    search: query.q ? String(query.q).slice(0, 100) : undefined,
    dateFrom: date(query.dateFrom),
    dateTo: date(query.dateTo),
  };
}

interface DisplayNames {
  staff: Map<string, { displayName: string; designation?: string }>;
  departments: Map<string, string>;
}

/** Looks up assignee and department names for a page of grievances in two queries. */
async function loadDisplayNames(req: Request, records: ServiceRequestAttributes[]): Promise<DisplayNames> {
  const { StaffUser, Department } = req.app.database.models;
  const staffIds = [...new Set(records.map((record) => record.assignedTo).filter(Boolean))] as string[];
  const departmentIds = [...new Set(records.map((record) => record.departmentId).filter(Boolean))] as string[];
  const [staff, departments] = await Promise.all([
    staffIds.length
      ? StaffUser.findAll({ where: { id: { [Op.in]: staffIds } }, attributes: ['id', 'firstName', 'lastName', 'designation'] })
      : [],
    departmentIds.length
      ? Department.findAll({ where: { id: { [Op.in]: departmentIds } }, attributes: ['id', 'name'] })
      : [],
  ]);
  return {
    staff: new Map(staff.map((row) => {
      const plain = row.get({ plain: true }) as { id: string; firstName: string; lastName: string; designation?: string };
      return [plain.id, { displayName: `${plain.firstName} ${plain.lastName}`.trim(), designation: plain.designation }];
    })),
    departments: new Map(departments.map((row) => [row.get('id') as string, row.get('name') as string])),
  };
}

export function serializeGrievance(
  record: ServiceRequestAttributes & Partial<GrievanceRecord>, auth: AuthContext | null, names?: DisplayNames
): Record<string, unknown> {
  const assignee = record.assignedTo ? names?.staff.get(record.assignedTo) : undefined;
  const isStaff = auth?.kind === 'staff';
  const now = Date.now();
  const isOpen = SERVICE_REQUEST_ACTIVE_STATES.includes(record.status);
  const jurisdiction = record.jurisdiction;
  const comments = (record.comments || [])
    .filter((comment) => isStaff || comment.isPublic)
    .map((comment) => ({
      id: comment.id,
      comment: comment.comment,
      addedBy: isStaff ? comment.addedBy : undefined,
      addedByName: comment.addedByName || (isStaff ? 'System' : undefined),
      isPublic: comment.isPublic,
      newStatus: comment.newStatus,
      level: comment.level,
      images: comment.images || [],
      createdAt: comment.createdAt,
    }));
  return {
    id: record.id,
    reference: makeReference(record.jurisdictionId, record.publicId),
    publicId: record.publicId,
    title: record.title,
    description: record.description,
    category: record.category,
    status: record.status,
    priority: record.priority,
    currentLevel: record.currentLevel,
    jurisdictionId: record.jurisdictionId,
    jurisdictionName: jurisdiction?.name ?? null,
    jurisdictionNameNe: jurisdiction?.nameNe ?? null,
    wardNo: record.wardNo,
    districtId: record.districtId,
    provinceId: record.provinceId,
    lat: record.lat,
    lon: record.lon,
    address: record.address,
    images: record.images || [],
    videos: record.videos || [],
    resolutionImages: record.resolutionImages || [],
    assignedTo: record.assignedTo || null,
    assignedToName: assignee?.displayName ?? null,
    assignedToDesignation: assignee?.designation ?? null,
    departmentId: record.departmentId || null,
    departmentName: record.departmentId ? names?.departments.get(record.departmentId) ?? null : null,
    citizenId: record.citizenId || null,
    submitterName: [record.firstName, record.lastName].filter(Boolean).join(' ') || null,
    submitterPhone: isStaff ? record.phone || null : undefined,
    submitterEmail: isStaff ? record.email || null : undefined,
    inputChannel: record.inputChannel,
    escalationCount: record.escalationCount || 0,
    escalatedAt: record.escalatedAt || null,
    reopenCount: record.reopenCount || 0,
    slaDueAt: record.slaDueAt || null,
    isOverdue: isOpen && !!record.slaDueAt && new Date(record.slaDueAt).getTime() < now,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    resolvedAt: record.resolvedAt || null,
    closedAt: record.closeDate || null,
    citizenConfirmedAt: record.citizenConfirmedAt || null,
    citizenConfirmationNote: record.citizenConfirmationNote || null,
    citizenRating: record.citizenRating || null,
    citizenFeedback: record.citizenFeedback || null,
    comments: record.comments ? comments : undefined,
  };
}

function assertCanView(auth: AuthContext, record: GrievanceRecord): void {
  const allowed = auth.kind === 'citizen'
    ? record.citizenId === auth.id
    : scopeCoversGrievance(auth.scope, record);
  if (!allowed) { throw new HttpError(404, 'Grievance not found.'); }
}

// ---- public -------------------------------------------------------------

grievanceRouter.get('/meta', wrapHandler(async (req: Request, res: Response) => {
    res.status(200).send({
      data: {
        categories: GRIEVANCE_CATEGORIES,
        departments: PALIKA_DEPARTMENTS,
        priorities: PRIORITY_KEYS,
        slaHours: PRIORITY_SLA_HOURS,
        statuses: REQUEST_STATUS_KEYS,
        levels: LEVELS,
      }
    });
}))

grievanceRouter.get('/public', wrapHandler(async (req: Request, res: Response) => {
    const { grievanceRepository } = res.app.repositories;
    const filters = parseFilters(req.query);
    delete filters.assignedTo;
    delete filters.search;
    const records = await grievanceRepository.findPublic(filters, Number(req.query.limit) || 500);
    res.status(200).send({ data: records, count: records.length });
}))

// ---- authenticated ------------------------------------------------------

grievanceRouter.use(requireAuth);

grievanceRouter.param('id', (req: Request, res: Response, next, id: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      next(new HttpError(404, 'Grievance not found.'));
      return;
    }
    next();
});

grievanceRouter.get('/', wrapHandler(async (req: Request, res: Response) => {
    const { grievanceRepository } = res.app.repositories;
    const auth = req.auth as AuthContext;
    const filters = parseFilters(req.query);
    if (req.query.mine === 'true' && auth.kind === 'staff') { filters.assignedTo = auth.id; }
    let scope = null;
    if (auth.kind === 'citizen') {
      filters.citizenId = auth.id;
    } else {
      scope = auth.scope;
    }
    const limit = Math.min(int(req.query.limit) ?? 50, 200);
    const offset = Math.max(int(req.query.offset) ?? 0, 0);
    const [records, count] = await grievanceRepository.findAll(filters, scope, { limit, offset });
    const names = await loadDisplayNames(req, records);
    res.status(200).send({ data: records.map((record) => serializeGrievance(record, auth, names)), count, limit, offset });
}))

grievanceRouter.get('/stats', requireStaff(), wrapHandler(async (req: Request, res: Response) => {
    const { grievanceRepository } = res.app.repositories;
    const auth = staffAuth(req);
    const stats = await grievanceRepository.getStats(parseFilters(req.query), auth.scope, new Date());
    res.status(200).send({ data: stats });
}))

grievanceRouter.get('/reference/:reference', wrapHandler(async (req: Request, res: Response) => {
    const { grievanceRepository } = res.app.repositories;
    const auth = req.auth as AuthContext;
    const record = await grievanceRepository.findOneByReference(req.params.reference);
    if (!record) { throw new HttpError(404, 'Grievance not found.'); }
    assertCanView(auth, record);
    res.status(200).send({ data: serializeGrievance(record, auth, await loadDisplayNames(req, [record])) });
}))

grievanceRouter.get('/:id', wrapHandler(async (req: Request, res: Response) => {
    const { grievanceRepository } = res.app.repositories;
    const auth = req.auth as AuthContext;
    const record = await grievanceRepository.findOne(req.params.id);
    if (!record) { throw new HttpError(404, 'Grievance not found.'); }
    assertCanView(auth, record);
    res.status(200).send({ data: serializeGrievance(record, auth, await loadDisplayNames(req, [record])) });
}))

grievanceRouter.get('/:id/assignable-staff', requireStaff(), wrapHandler(async (req: Request, res: Response) => {
    const { grievanceRepository, staffUserRepository } = res.app.repositories;
    const auth = staffAuth(req);
    const record = await grievanceRepository.findOne(req.params.id);
    if (!record || !scopeCoversGrievance(auth.scope, record)) { throw new HttpError(404, 'Grievance not found.'); }
    const candidates = await staffUserRepository.findAllWhere({
      isActive: true,
      [Op.or]: [
        { jurisdictionId: record.jurisdictionId },
        { role: 'district_officer', districtId: record.districtId },
        { role: 'province_officer', provinceId: record.provinceId },
      ],
    });
    const eligible = candidates
      .filter((staff) => scopeCoversGrievance(scopeForStaff(staff), record))
      .map((staff) => ({
        id: staff.id,
        displayName: staff.displayName,
        role: staff.role,
        designation: staff.designation,
        wardNo: staff.wardNo,
      }));
    res.status(200).send({ data: eligible, count: eligible.length });
}))

grievanceRouter.post('/', wrapHandler(async (req: Request, res: Response) => {
    const { grievanceService } = res.app.services;
    const auth = req.auth as AuthContext;
    const record = await grievanceService.create(auth, req.body);
    res.status(201).send({ data: serializeGrievance(record, auth, await loadDisplayNames(req, [record])) });
}))

grievanceRouter.post('/:id/status', requireStaff(), wrapHandler(async (req: Request, res: Response) => {
    const { grievanceService } = res.app.services;
    const { status, note, resolutionImages } = req.body;
    if (!REQUEST_STATUS_KEYS.includes(status)) { throw new HttpError(400, 'Unknown status.'); }
    const record = await grievanceService.changeStatus(staffAuth(req), req.params.id, status, note, resolutionImages);
    res.status(200).send({ data: serializeGrievance(record, req.auth as AuthContext, await loadDisplayNames(req, [record])) });
}))

grievanceRouter.post('/:id/assign', requireStaff(), wrapHandler(async (req: Request, res: Response) => {
    const { grievanceService } = res.app.services;
    const { staffUserId, departmentId } = req.body;
    const record = await grievanceService.assign(staffAuth(req), req.params.id, staffUserId || null, departmentId || null);
    res.status(200).send({ data: serializeGrievance(record, req.auth as AuthContext, await loadDisplayNames(req, [record])) });
}))

grievanceRouter.post('/:id/escalate', requireStaff(), wrapHandler(async (req: Request, res: Response) => {
    const { grievanceService } = res.app.services;
    const record = await grievanceService.escalate(staffAuth(req), req.params.id, req.body.note);
    res.status(200).send({ data: serializeGrievance(record, req.auth as AuthContext, await loadDisplayNames(req, [record])) });
}))

grievanceRouter.post('/:id/confirm', requireCitizen, wrapHandler(async (req: Request, res: Response) => {
    const { grievanceService } = res.app.services;
    const record = await grievanceService.confirm(citizenAuth(req), req.params.id, req.body.note);
    res.status(200).send({ data: serializeGrievance(record, req.auth as AuthContext, await loadDisplayNames(req, [record])) });
}))

grievanceRouter.post('/:id/reopen', requireCitizen, wrapHandler(async (req: Request, res: Response) => {
    const { grievanceService } = res.app.services;
    const record = await grievanceService.reopen(citizenAuth(req), req.params.id, req.body.note);
    res.status(200).send({ data: serializeGrievance(record, req.auth as AuthContext, await loadDisplayNames(req, [record])) });
}))

grievanceRouter.post('/:id/feedback', requireCitizen, wrapHandler(async (req: Request, res: Response) => {
    const { grievanceService } = res.app.services;
    const record = await grievanceService.feedback(
      citizenAuth(req), req.params.id, Number(req.body.rating), req.body.feedback
    );
    res.status(200).send({ data: serializeGrievance(record, req.auth as AuthContext, await loadDisplayNames(req, [record])) });
}))

grievanceRouter.post('/:id/comments', wrapHandler(async (req: Request, res: Response) => {
    const { grievanceService } = res.app.services;
    const { comment, isPublic, images } = req.body;
    const record = await grievanceService.addComment(
      req.auth as AuthContext, req.params.id, comment, isPublic !== false, images
    );
    res.status(200).send({ data: serializeGrievance(record, req.auth as AuthContext, await loadDisplayNames(req, [record])) });
}))
