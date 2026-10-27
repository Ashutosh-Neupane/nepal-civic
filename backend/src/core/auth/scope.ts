import type {
  AuthScope,
  GovernmentLevel,
  JurisdictionAttributes,
  ServiceRequestAttributes,
  StaffUserAttributes
} from '../../types';

/** Lowest to highest. */
export const LEVEL_ORDER: GovernmentLevel[] = ['ward', 'palika', 'district', 'province'];

export const ROLE_LEVEL: Record<string, GovernmentLevel | 'national'> = {
  ward_officer: 'ward',
  palika_officer: 'palika',
  district_officer: 'district',
  province_officer: 'province',
  super_admin: 'national',
};

export function levelRank(level: GovernmentLevel | 'national'): number {
  return level === 'national' ? LEVEL_ORDER.length : LEVEL_ORDER.indexOf(level);
}

export function nextLevel(level: GovernmentLevel): GovernmentLevel | null {
  const index = LEVEL_ORDER.indexOf(level);
  return index >= 0 && index < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[index + 1] : null;
}

export function scopeForStaff(staff: StaffUserAttributes): AuthScope {
  if (staff.role === 'super_admin' || staff.permissions?.includes('access-all-jurisdictions')) {
    return { level: 'national' };
  }
  const base = {
    provinceId: staff.provinceId ?? null,
    districtId: staff.districtId ?? null,
    jurisdictionId: staff.jurisdictionId ?? null,
  };
  switch (staff.role) {
    case 'province_officer':
      return { level: 'province', provinceId: base.provinceId };
    case 'district_officer':
      return { level: 'district', provinceId: base.provinceId, districtId: base.districtId };
    case 'ward_officer':
      return { level: 'ward', ...base, wardNo: staff.wardNo ?? null };
    default:
      // palika officers, and staff created through the original Palika admin API without a role
      return { level: 'palika', ...base };
  }
}

/** Whether a scope may manage a Palika as a whole (services, departments, staff, settings). */
export function scopeCoversJurisdiction(scope: AuthScope, jurisdiction: JurisdictionAttributes): boolean {
  switch (scope.level) {
    case 'national':
      return true;
    case 'province':
      return !!scope.provinceId && scope.provinceId === jurisdiction.provinceId;
    case 'district':
      return !!scope.districtId && scope.districtId === jurisdiction.districtId;
    case 'palika':
      return !!scope.jurisdictionId && scope.jurisdictionId === jurisdiction.id;
    default:
      return false;
  }
}

/** Whether a scope may see a grievance (its location is inside the scope's area). */
export function scopeCoversGrievance(scope: AuthScope, record: ServiceRequestAttributes): boolean {
  switch (scope.level) {
    case 'national':
      return true;
    case 'province':
      return !!scope.provinceId && scope.provinceId === record.provinceId;
    case 'district':
      return !!scope.districtId && scope.districtId === record.districtId;
    case 'palika':
      return !!scope.jurisdictionId && scope.jurisdictionId === record.jurisdictionId;
    case 'ward':
      return !!scope.jurisdictionId
        && scope.jurisdictionId === record.jurisdictionId
        && scope.wardNo === record.wardNo;
    default:
      return false;
  }
}

/**
 * Whether a scope may act on a grievance: it must be in the area, and the
 * grievance must not have been escalated above the officer's level.
 */
export function scopeCanActOnGrievance(scope: AuthScope, record: ServiceRequestAttributes): boolean {
  if (!scopeCoversGrievance(scope, record)) { return false; }
  return levelRank(scope.level) >= levelRank(record.currentLevel);
}

/** Sequelize `where` fragment that limits grievances to a scope. */
export function scopeToWhere(scope: AuthScope | null): Record<string, unknown> {
  if (!scope) { return {}; }
  switch (scope.level) {
    case 'national':
      return {};
    case 'province':
      return { provinceId: scope.provinceId ?? -1 };
    case 'district':
      return { districtId: scope.districtId ?? -1 };
    case 'palika':
      return { jurisdictionId: scope.jurisdictionId ?? '' };
    case 'ward':
      return { jurisdictionId: scope.jurisdictionId ?? '', wardNo: scope.wardNo ?? -1 };
    default:
      return { id: null };
  }
}
