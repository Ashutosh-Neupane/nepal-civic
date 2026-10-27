import { api } from './api';
import { CATEGORY_KEYS } from './constants';
import { unitDisplayName } from './jurisdictionService';
import type { CategoryBreakdown, ComplaintCategory, DailyTrend, GovernmentLevel, KPISummary, UnitBreakdown } from '@/types';

/** Narrows statistics inside the officer's own area; the backend enforces the area. */
export interface AnalyticsFilter {
  provinceId?: number;
  districtId?: number;
  jurisdictionId?: string;
  wardNo?: number;
  dateFrom?: string;
  dateTo?: string;
}

interface ApiStats {
  summary: KPISummary & { reopened: number; overdue: number };
  byCategory: { key: string; count: number }[];
  byLevel: { key: string; count: number }[];
  dailyTrend: { key: string; count: number }[];
  byUnit: { unitId: string; total: number; open: number; resolved: number; overdue: number; avgResolutionHours: number | null }[];
  unitLevel: GovernmentLevel | null;
  slaComplianceRate: number | null;
  avgResolutionHours: number | null;
  avgRating: number | null;
}

export interface GrievanceStats {
  summary: KPISummary & { reopened: number; overdue: number };
  categories: CategoryBreakdown[];
  levels: { level: GovernmentLevel; count: number }[];
  dailyTrend: DailyTrend[];
  units: UnitBreakdown[];
  unitLevel: GovernmentLevel | null;
  slaComplianceRate: number | null;
  avgResolutionHours: number | null;
  avgRating: number | null;
}

const statsCache = new Map<string, { at: number; promise: Promise<GrievanceStats> }>();

/** Statistics for the signed-in officer's area (cached for a few seconds across widgets). */
export function getGrievanceStats(filter: AnalyticsFilter = {}): Promise<GrievanceStats> {
  const key = JSON.stringify(filter);
  const cached = statsCache.get(key);
  if (cached && Date.now() - cached.at < 5000) return cached.promise;
  const promise = api.get<ApiStats>('/grievances/stats', { ...filter }).then(({ data }) => {
    const total = data.summary.total;
    const counts = new Map(data.byCategory.map((row) => [row.key, row.count]));
    return {
      summary: data.summary,
      categories: CATEGORY_KEYS.map((category: ComplaintCategory) => {
        const count = counts.get(category) || 0;
        return { category, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 };
      }),
      levels: data.byLevel.map((row) => ({ level: row.key as GovernmentLevel, count: row.count })),
      dailyTrend: data.dailyTrend.map((row) => ({
        date: row.key, // YYYY-MM-DD in Nepal time; format for display with formatShortDate
        count: row.count,
      })),
      units: data.byUnit
        .map((row) => ({
          id: row.unitId,
          name: unitDisplayName(data.unitLevel, row.unitId),
          total: row.total,
          open: row.open,
          resolved: row.resolved,
          overdue: row.overdue,
        }))
        .sort((a, b) => b.total - a.total),
      unitLevel: data.unitLevel,
      slaComplianceRate: data.slaComplianceRate,
      avgResolutionHours: data.avgResolutionHours,
      avgRating: data.avgRating,
    };
  });
  statsCache.set(key, { at: Date.now(), promise });
  promise.catch(() => statsCache.delete(key));
  return promise;
}

export async function computeKPISummary(filter: AnalyticsFilter = {}): Promise<KPISummary> {
  return (await getGrievanceStats(filter)).summary;
}

export async function computeCategoryBreakdown(filter: AnalyticsFilter = {}): Promise<CategoryBreakdown[]> {
  return (await getGrievanceStats(filter)).categories;
}

/** Grievances registered per day over the last 14 days (Nepal time). */
export async function computeWeeklyTrend(filter: AnalyticsFilter = {}): Promise<DailyTrend[]> {
  return (await getGrievanceStats(filter)).dailyTrend;
}
