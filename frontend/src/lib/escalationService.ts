import type { ComplaintPriority, EscalationLevel, GovernmentLevel } from '@/types';
import { LEVEL_ORDER } from './constants';

// SLA in hours (same as the backend).
export const PRIORITY_SLA_HOURS: Record<ComplaintPriority, number> = {
  critical: 24,
  high: 48,
  medium: 72,
  low: 120,
};

export type SLAStatusTier = 'within_sla' | 'approaching_deadline' | 'breached';

export interface SLACalculationResult {
  deadline: Date;
  isOverdue: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  totalHours: number;
  progressPercent: number;
  statusTier: SLAStatusTier;
  formattedCountdown: string;
  statusLabel: string;
}

/**
 * SLA countdown. The deadline restarts at each escalation or reopening, so pass
 * the grievance's `slaDueAt` when it is known; otherwise it is derived from the priority.
 */
export function calculateSLADeadline(
  createdAtIso: string, priority: ComplaintPriority = 'medium', slaDueAtIso?: string
): SLACalculationResult {
  const totalHours = PRIORITY_SLA_HOURS[priority] || 72;
  const slaDurationMs = totalHours * 60 * 60 * 1000;
  const deadlineMs = slaDueAtIso ? new Date(slaDueAtIso).getTime() : new Date(createdAtIso).getTime() + slaDurationMs;
  const startMs = deadlineMs - slaDurationMs;
  const now = Date.now();
  const diffMs = deadlineMs - now;
  const elapsedMs = Math.max(0, now - startMs);

  const isOverdue = diffMs < 0;
  const totalMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / slaDurationMs) * 100)));

  let statusTier: SLAStatusTier;
  let statusLabel: string;
  let formattedCountdown: string;
  if (isOverdue) {
    statusTier = 'breached';
    statusLabel = 'Deadline passed';
    formattedCountdown = `Overdue by ${hours}h ${minutes}m`;
  } else if (progressPercent >= 75 || hours < 6) {
    statusTier = 'approaching_deadline';
    statusLabel = 'Deadline approaching';
    formattedCountdown = `${hours}h ${minutes}m remaining`;
  } else {
    statusTier = 'within_sla';
    statusLabel = 'Within deadline';
    formattedCountdown = `${hours}h ${minutes}m remaining`;
  }

  return {
    deadline: new Date(deadlineMs),
    isOverdue,
    hoursRemaining: Math.floor(diffMs / (1000 * 60 * 60)),
    minutesRemaining: totalMinutes,
    totalHours,
    progressPercent,
    statusTier,
    formattedCountdown,
    statusLabel,
  };
}

export function levelToEscalation(level: GovernmentLevel): EscalationLevel {
  return Math.max(0, LEVEL_ORDER.indexOf(level)) as EscalationLevel;
}

export function getNextLevel(level: GovernmentLevel): GovernmentLevel | null {
  const index = LEVEL_ORDER.indexOf(level);
  return index >= 0 && index < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[index + 1] : null;
}
