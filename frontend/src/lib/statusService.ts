import type { ComplaintStatus, GovernmentLevel, Role } from '@/types';
import { STATUS_META } from './constants';

/** Mirrors the backend's OFFICER_STATUS_TRANSITIONS; the backend has the final say. */
export const ALLOWED_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  pending: ['assigned', 'in_progress', 'blocked', 'rejected'],
  assigned: ['in_progress', 'blocked', 'resolved', 'rejected'],
  in_progress: ['blocked', 'resolved', 'rejected'],
  blocked: ['in_progress', 'resolved', 'rejected'],
  escalated: ['assigned', 'in_progress', 'blocked', 'resolved', 'rejected'],
  reopened: ['assigned', 'in_progress', 'blocked', 'resolved', 'rejected'],
  resolved: [],
  closed: [],
  rejected: [],
};

const SUPER_ADMIN_STATUSES: ComplaintStatus[] = ['assigned', 'in_progress', 'blocked', 'resolved', 'rejected', 'closed'];

/** Statuses that need a written note (same rule as the backend). */
export const STATUSES_REQUIRING_NOTE: ComplaintStatus[] = ['resolved', 'rejected', 'blocked'];

export const ROLE_LEVEL: Record<Exclude<Role, 'citizen'>, GovernmentLevel | 'national'> = {
  ward_officer: 'ward',
  palika_officer: 'palika',
  district_officer: 'district',
  province_officer: 'province',
  super_admin: 'national',
};

const LEVEL_RANK: Record<GovernmentLevel | 'national', number> = {
  ward: 0, palika: 1, district: 2, province: 3, national: 4,
};

export function isOfficer(role?: Role): role is Exclude<Role, 'citizen'> {
  return !!role && role !== 'citizen';
}

/** Whether an officer may act on a grievance currently held at the given level. */
export function canActAtLevel(role: Role | undefined, level: GovernmentLevel): boolean {
  if (!isOfficer(role)) return false;
  return LEVEL_RANK[ROLE_LEVEL[role]] >= LEVEL_RANK[level];
}

export function getValidNextStatuses(currentStatus: ComplaintStatus, userRole?: Role): ComplaintStatus[] {
  if (!isOfficer(userRole)) return [];
  if (['closed', 'rejected'].includes(currentStatus)) return [];
  if (userRole === 'super_admin') return SUPER_ADMIN_STATUSES.filter((status) => status !== currentStatus);
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
}

export function canTransitionStatus(currentStatus: ComplaintStatus, targetStatus: ComplaintStatus, userRole: Role): boolean {
  return getValidNextStatuses(currentStatus, userRole).includes(targetStatus);
}

export function getStatusDisplayName(status: ComplaintStatus, language = 'en'): string {
  const meta = STATUS_META[status];
  if (!meta) return status;
  return language === 'ne' ? meta.labelNe : meta.label;
}

export function getStatusSemanticDescription(status: ComplaintStatus): string {
  switch (status) {
    case 'pending': return 'Registered and waiting for the ward office to review it.';
    case 'assigned': return 'An officer has been given responsibility for this grievance.';
    case 'in_progress': return 'The responsible office is working on it.';
    case 'blocked': return 'Work is on hold, for example waiting for budget or another office.';
    case 'resolved': return 'The office reports the problem is fixed. The citizen can confirm or reopen.';
    case 'closed': return 'Confirmed by the citizen, or closed after no response within 7 days.';
    case 'rejected': return 'Not accepted: a duplicate, invalid, or outside the local government\'s responsibility.';
    case 'escalated': return 'Sent to the next level of government because the deadline passed or the office asked for help.';
    case 'reopened': return 'The citizen reports the problem is not fixed.';
    default: return '';
  }
}
