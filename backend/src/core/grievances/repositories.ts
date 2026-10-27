import { inject, injectable } from 'inversify';
import { Op, QueryTypes, WhereOptions } from 'sequelize';
import { appIds } from '../../registry/service-identifiers';
import type {
  AppConfig,
  AuthScope,
  GovernmentLevel,
  GrievanceBreakdownRow,
  GrievanceFilters,
  GrievanceListOptions,
  GrievanceRecord,
  GrievanceStats,
  GrievanceUnitRow,
  IGrievanceRepository,
  Models,
  PublicGrievance,
  ServiceRequestAttributes,
  StaffUserAttributes
} from '../../types';
import { scopeToWhere } from '../auth/scope';
import { SERVICE_REQUEST_ACTIVE_STATES } from '../service-requests/models';
import { makeReference, parseReference } from './constants';

const JURISDICTION_ATTRIBUTES = ['id', 'name', 'nameNe', 'wardCount', 'localLevelType', 'districtId', 'provinceId'];
const TREND_DAYS = 14;
const NEPAL_TIME_ZONE = 'Asia/Kathmandu';

/** Which column the dashboard breaks a scope down by: the level just below the viewer. */
const UNIT_FOR_SCOPE: Record<string, { level: GovernmentLevel; column: string } | null> = {
  national: { level: 'province', column: 'provinceId' },
  province: { level: 'district', column: 'districtId' },
  district: { level: 'palika', column: 'jurisdictionId' },
  palika: { level: 'ward', column: 'wardNo' },
  ward: null,
};

function toWhere(filters: GrievanceFilters, scope: AuthScope | null, now: Date): Record<string | symbol, unknown> {
  const where: Record<string | symbol, unknown> = { ...scopeToWhere(scope) };
  const and: unknown[] = [];
  if (filters.status?.length) { where.status = { [Op.in]: filters.status }; }
  if (filters.category?.length) { where.category = { [Op.in]: filters.category }; }
  if (filters.priority?.length) { where.priority = { [Op.in]: filters.priority }; }
  if (filters.level?.length) { where.currentLevel = { [Op.in]: filters.level }; }
  // Explicit location filters narrow the scope; they can never widen it.
  if (filters.provinceId) { and.push({ provinceId: filters.provinceId }); }
  if (filters.districtId) { and.push({ districtId: filters.districtId }); }
  if (filters.jurisdictionId) { and.push({ jurisdictionId: filters.jurisdictionId }); }
  if (filters.wardNo) { and.push({ wardNo: filters.wardNo }); }
  if (filters.citizenId) { where.citizenId = filters.citizenId; }
  if (filters.assignedTo) { where.assignedTo = filters.assignedTo; }
  if (filters.overdue) {
    and.push({ slaDueAt: { [Op.lt]: now } });
    and.push({ status: { [Op.in]: SERVICE_REQUEST_ACTIVE_STATES } });
  }
  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Record<symbol, Date> = {};
    if (filters.dateFrom) { createdAt[Op.gte] = filters.dateFrom; }
    if (filters.dateTo) { createdAt[Op.lte] = filters.dateTo; }
    where.createdAt = createdAt;
  }
  if (filters.search) {
    const term = `%${filters.search.replace(/[%_\\]/g, '\\$&')}%`;
    and.push({
      [Op.or]: [
        { title: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } },
        { address: { [Op.iLike]: term } },
        { publicId: { [Op.iLike]: term } },
      ]
    });
  }
  if (and.length) { where[Op.and] = and; }
  return where;
}

const GRIEVANCE_WORKFLOW_FIELDS = [
  'assignedTo', 'currentLevel', 'escalationCount', 'escalatedAt', 'slaDueAt', 'resolutionImages',
  'citizenConfirmedAt', 'citizenConfirmationNote', 'citizenRating', 'citizenFeedback', 'reopenCount',
];

@injectable()
export class GrievanceRepository implements IGrievanceRepository {

  models: Models;
  config: AppConfig;

  constructor(
    @inject(appIds.Models) models: Models,
    @inject(appIds.AppConfig) config: AppConfig,
  ) {
    this.models = models;
    this.config = config;
  }

  async findAll(
    filters: GrievanceFilters, scope: AuthScope | null, options: GrievanceListOptions = {}
  ): Promise<[ServiceRequestAttributes[], number]> {
    const { ServiceRequest, Jurisdiction } = this.models;
    const { rows, count } = await ServiceRequest.findAndCountAll({
      where: toWhere(filters, scope, new Date()) as WhereOptions,
      include: [{ model: Jurisdiction, as: 'jurisdiction', attributes: JURISDICTION_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
      limit: Math.min(options.limit ?? 50, 200),
      offset: options.offset ?? 0,
      distinct: true,
    });
    return [rows.map((row) => row.get({ plain: true }) as ServiceRequestAttributes), count];
  }

  async findOne(id: string): Promise<GrievanceRecord | null> {
    const { ServiceRequest, ServiceRequestComment, Jurisdiction } = this.models;
    const record = await ServiceRequest.findByPk(id, {
      include: [
        { model: ServiceRequestComment, as: 'comments' },
        { model: Jurisdiction, as: 'jurisdiction', attributes: JURISDICTION_ATTRIBUTES },
      ],
      order: [[{ model: ServiceRequestComment, as: 'comments' }, 'createdAt', 'ASC']],
    });
    return record ? record.get({ plain: true }) as GrievanceRecord : null;
  }

  async findOneByReference(reference: string): Promise<GrievanceRecord | null> {
    const { ServiceRequest } = this.models;
    const parsed = parseReference(reference);
    if (!parsed) { return null; }
    const record = await ServiceRequest.findOne({
      where: { jurisdictionId: parsed.jurisdictionId, publicId: parsed.publicId },
      attributes: ['id'],
    });
    return record ? await this.findOne(record.get('id') as string) : null;
  }

  async findPublic(filters: GrievanceFilters, limit: number): Promise<PublicGrievance[]> {
    const { ServiceRequest, Jurisdiction } = this.models;
    const where = toWhere(filters, null, new Date());
    where.status = filters.status?.length
      ? { [Op.in]: filters.status.filter((status) => status !== 'junk') }
      : { [Op.ne]: 'junk' };
    const rows = await ServiceRequest.findAll({
      where: where as WhereOptions,
      attributes: [
        'id', 'publicId', 'title', 'category', 'status', 'priority', 'currentLevel', 'jurisdictionId',
        'districtId', 'provinceId', 'wardNo', 'lat', 'lon', 'createdAt', 'resolvedAt',
      ],
      include: [{ model: Jurisdiction, as: 'jurisdiction', attributes: ['name', 'nameNe'] }],
      order: [['createdAt', 'DESC']],
      limit: Math.min(limit, 1000),
    });
    // Coordinates are rounded to about 100 m so a public map cannot pinpoint a home.
    const round = (value: number) => Math.round(value * 1000) / 1000;
    return rows.map((row) => {
      const r = row.get({ plain: true }) as ServiceRequestAttributes & {
        jurisdiction?: { name: string | null; nameNe: string | null };
      };
      return {
        id: r.id,
        reference: makeReference(r.jurisdictionId, r.publicId),
        title: r.title ?? null,
        category: r.category ?? null,
        status: r.status,
        priority: r.priority,
        currentLevel: r.currentLevel,
        jurisdictionId: r.jurisdictionId,
        jurisdictionName: r.jurisdiction?.name ?? null,
        jurisdictionNameNe: r.jurisdiction?.nameNe ?? null,
        districtId: r.districtId ?? null,
        provinceId: r.provinceId ?? null,
        wardNo: r.wardNo ?? null,
        lat: round(r.lat || 0),
        lon: round(r.lon || 0),
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt ?? null,
      };
    });
  }

  async findOverdue(now: Date, limit: number): Promise<ServiceRequestAttributes[]> {
    const { ServiceRequest } = this.models;
    const rows = await ServiceRequest.findAll({
      where: {
        status: { [Op.in]: SERVICE_REQUEST_ACTIVE_STATES },
        slaDueAt: { [Op.lt]: now },
        currentLevel: { [Op.ne]: 'province' },
      },
      order: [['slaDueAt', 'ASC']],
      limit,
    });
    return rows.map((row) => row.get({ plain: true }) as ServiceRequestAttributes);
  }

  /**
   * Updates grievance workflow fields. The general service request update only
   * accepts the fields staff may edit directly, so the workflow uses this instead.
   */
  async updateWorkflowFields(id: string, data: Partial<ServiceRequestAttributes>): Promise<void> {
    const { ServiceRequest } = this.models;
    const fields = GRIEVANCE_WORKFLOW_FIELDS.filter((field) => field in data);
    if (!fields.length) { return; }
    await ServiceRequest.update(data, { where: { id }, fields: fields as (keyof ServiceRequestAttributes)[] });
  }

  async findResolvedBefore(cutoff: Date, limit: number): Promise<ServiceRequestAttributes[]> {
    const { ServiceRequest } = this.models;
    const rows = await ServiceRequest.findAll({
      where: { status: 'resolved', resolvedAt: { [Op.lt]: cutoff } },
      order: [['resolvedAt', 'ASC']],
      limit,
    });
    return rows.map((row) => row.get({ plain: true }) as ServiceRequestAttributes);
  }

  async findStaffForUnit(level: GovernmentLevel, record: ServiceRequestAttributes): Promise<StaffUserAttributes[]> {
    const { StaffUser } = this.models;
    const where: Record<string, unknown> = { isActive: true };
    switch (level) {
      case 'ward':
        Object.assign(where, { role: 'ward_officer', jurisdictionId: record.jurisdictionId, wardNo: record.wardNo });
        break;
      case 'palika':
        Object.assign(where, { role: 'palika_officer', jurisdictionId: record.jurisdictionId });
        break;
      case 'district':
        Object.assign(where, { role: 'district_officer', districtId: record.districtId });
        break;
      case 'province':
        Object.assign(where, { role: 'province_officer', provinceId: record.provinceId });
        break;
    }
    const rows = await StaffUser.findAll({ where, limit: 200 });
    return rows.map((row) => row.get({ plain: true }) as StaffUserAttributes);
  }

  async getStats(filters: GrievanceFilters, scope: AuthScope | null, now: Date): Promise<GrievanceStats> {
    const { ServiceRequest } = this.models;
    const sequelize = ServiceRequest.sequelize;
    if (!sequelize) { throw new Error('Database is not initialised.'); }
    const where = toWhere(filters, scope, now) as WhereOptions;

    // Build the WHERE clause once with Sequelize, then reuse it in the aggregate queries.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryGenerator = (sequelize.getQueryInterface() as any).queryGenerator;
    const whereSql: string = queryGenerator.getWhereConditions(where, 'ServiceRequest', ServiceRequest) || 'TRUE';
    const base = `FROM "ServiceRequest" AS "ServiceRequest" WHERE ${whereSql}`;
    const active = SERVICE_REQUEST_ACTIVE_STATES.map((status) => `'${status}'`).join(',');
    const select = async <T extends object>(sql: string, replacements: Record<string, unknown> = {}): Promise<T[]> =>
      await sequelize.query<T>(sql, { type: QueryTypes.SELECT, replacements });

    const statusRows = await select<{ status: string; count: string }>(
      `SELECT "status", COUNT(*) AS "count" ${base} GROUP BY "status"`
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusRows) { byStatus[row.status] = Number(row.count); }
    const [overdueRow = { count: '0' }] = await select<{ count: string }>(
      `SELECT COUNT(*) AS "count" ${base} AND "slaDueAt" < :now AND "status" IN (${active})`, { now }
    );
    const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

    const toRows = (rows: { key: string | null; count: string }[]): GrievanceBreakdownRow[] =>
      rows.map((row) => ({ key: row.key ?? 'unknown', count: Number(row.count) }));
    const byCategory = toRows(await select<{ key: string | null; count: string }>(
      `SELECT "category" AS "key", COUNT(*) AS "count" ${base} GROUP BY "category" ORDER BY "count" DESC`
    ));
    const byLevel = toRows(await select<{ key: string | null; count: string }>(
      `SELECT "currentLevel"::text AS "key", COUNT(*) AS "count" ${base} GROUP BY "currentLevel"`
    ));

    const trendStart = new Date(now.getTime() - (TREND_DAYS - 1) * 24 * 60 * 60 * 1000);
    const trendRows = await select<{ key: string; count: string }>(
      `SELECT to_char(("createdAt" AT TIME ZONE :tz)::date, 'YYYY-MM-DD') AS "key", COUNT(*) AS "count"
       ${base} AND "createdAt" >= :trendStart GROUP BY 1 ORDER BY 1`,
      { tz: NEPAL_TIME_ZONE, trendStart }
    );
    const trendMap = new Map(trendRows.map((row) => [row.key, Number(row.count)]));
    const dailyTrend: GrievanceBreakdownRow[] = [];
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = day.toLocaleDateString('en-CA', { timeZone: NEPAL_TIME_ZONE });
      dailyTrend.push({ key, count: trendMap.get(key) ?? 0 });
    }

    const unit = UNIT_FOR_SCOPE[scope?.level ?? 'national'];
    let byUnit: GrievanceUnitRow[] = [];
    if (unit) {
      const unitRows = await select<Record<string, string | null>>(
        `SELECT "${unit.column}"::text AS "unitId",
                COUNT(*) AS "total",
                COUNT(*) FILTER (WHERE "status" IN (${active})) AS "open",
                COUNT(*) FILTER (WHERE "status" IN ('resolved', 'closed')) AS "resolved",
                COUNT(*) FILTER (WHERE "status" IN (${active}) AND "slaDueAt" < :now) AS "overdue",
                AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)
                  FILTER (WHERE "resolvedAt" IS NOT NULL) AS "avgResolutionHours"
         ${base} AND "${unit.column}" IS NOT NULL GROUP BY "${unit.column}" ORDER BY "total" DESC`,
        { now }
      );
      byUnit = unitRows.map((row) => ({
        unitId: String(row.unitId),
        total: Number(row.total),
        open: Number(row.open),
        resolved: Number(row.resolved),
        overdue: Number(row.overdue),
        avgResolutionHours: row.avgResolutionHours === null ? null : Math.round(Number(row.avgResolutionHours) * 10) / 10,
      }));
    }

    const [quality = {}] = await select<Record<string, string | null>>(
      `SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)
                FILTER (WHERE "resolvedAt" IS NOT NULL) AS "avgResolutionHours",
              COUNT(*) FILTER (WHERE "resolvedAt" IS NOT NULL) AS "resolvedCount",
              COUNT(*) FILTER (WHERE "resolvedAt" IS NOT NULL AND "escalationCount" = 0
                AND "resolvedAt" <= "slaDueAt") AS "withinSla",
              AVG("citizenRating") AS "avgRating"
       ${base}`
    );
    const resolvedCount = Number(quality.resolvedCount ?? 0);
    const roundTo = (value: string | null, digits: number) =>
      value === null ? null : Math.round(Number(value) * 10 ** digits) / 10 ** digits;

    return {
      summary: {
        total,
        pending: byStatus.pending ?? 0,
        assigned: byStatus.assigned ?? 0,
        inProgress: (byStatus.in_progress ?? 0) + (byStatus.blocked ?? 0),
        resolved: byStatus.resolved ?? 0,
        escalated: byStatus.escalated ?? 0,
        rejected: (byStatus.rejected ?? 0) + (byStatus.junk ?? 0) + (byStatus.moved ?? 0),
        closed: byStatus.closed ?? 0,
        reopened: byStatus.reopened ?? 0,
        overdue: Number(overdueRow.count),
      },
      byCategory,
      byLevel,
      dailyTrend,
      byUnit,
      unitLevel: unit?.level ?? null,
      slaComplianceRate: resolvedCount > 0 ? Math.round((Number(quality.withinSla) / resolvedCount) * 1000) / 10 : null,
      avgResolutionHours: roundTo(quality.avgResolutionHours ?? null, 1),
      avgRating: roundTo(quality.avgRating ?? null, 2),
    };
  }

}
