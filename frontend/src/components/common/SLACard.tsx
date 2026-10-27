import { useLanguage } from '@/contexts/LanguageContext';
import { formatDateTime } from '@/lib/dateUtils';
import { calculateSLADeadline } from '@/lib/escalationService';
import { Icon } from './Icon';
import type { ComplaintPriority, EscalationLevel } from '@/types';

interface SLACardProps {
  createdAt: string;
  priority: ComplaintPriority;
  escalationLevel?: EscalationLevel;
  slaDueAt?: string;
  compact?: boolean;
}

export function SLACard({ createdAt, priority, escalationLevel = 0, slaDueAt, compact = false }: SLACardProps) {
  const { pick, language } = useLanguage();
  const sla = calculateSLADeadline(createdAt, priority, slaDueAt);

  const statusConfig = {
    within_sla: {
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      progressBg: 'bg-emerald-500',
      icon: 'timer',
      label: '🟢 SLA Within Limit',
    },
    approaching_deadline: {
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-800',
      progressBg: 'bg-amber-500',
      icon: 'schedule',
      label: '🟠 SLA Approaching Deadline',
    },
    breached: {
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      badgeBg: 'bg-rose-100 text-rose-800',
      progressBg: 'bg-rose-500',
      icon: 'warning',
      label: '🔴 SLA Breached',
    },
  }[sla.statusTier];

  if (compact) {
    return (
      <div className={`px-3 py-1.5 rounded-xl border ${statusConfig.border} ${statusConfig.bg} flex items-center justify-between gap-2 text-xs`}>
        <div className="flex items-center gap-1.5 font-bold">
          <Icon name={statusConfig.icon} size={16} className={statusConfig.color} />
          <span className={statusConfig.color}>{statusConfig.label}</span>
        </div>
        <span className="font-mono font-bold text-on-surface text-xs">{sla.formattedCountdown}</span>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border ${statusConfig.border} ${statusConfig.bg} shadow-xs flex flex-col gap-3 animate-slide-up`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 ${statusConfig.badgeBg}`}>
            <Icon name={statusConfig.icon} size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span>{statusConfig.label}</span>
              {escalationLevel > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-900 text-xs font-bold uppercase">
                  Tier {escalationLevel} Escalated
                </span>
              )}
            </h4>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Statutory Resolution Window: <strong>{sla.totalHours} Hours</strong> ({priority.toUpperCase()} Priority)
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="font-mono text-sm sm:text-base font-bold text-on-surface block leading-tight">
            {sla.formattedCountdown}
          </span>
          <span className="text-xs text-on-surface-variant font-mono mt-0.5 block">
            {pick('Due', 'अन्तिम समय')}: {formatDateTime(sla.deadline, language)}
          </span>
        </div>
      </div>

      {/* SLA Progress Bar */}
      <div className="flex flex-col gap-1">
        <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
          <div
            style={{ width: `${sla.progressPercent}%` }}
            className={`h-full ${statusConfig.progressBg} rounded-full progress-bar-fill`}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
          <span>Elapsed: {sla.progressPercent}%</span>
          <span>{sla.isOverdue ? 'Overdue' : `${100 - sla.progressPercent}% Remaining`}</span>
        </div>
      </div>
    </div>
  );
}
