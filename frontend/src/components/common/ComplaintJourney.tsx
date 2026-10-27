import { useMemo } from 'react';
import { Icon } from './Icon';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDateTime } from '@/lib/dateUtils';
import type { Complaint, ComplaintStatus, ComplaintUpdate } from '@/types';

interface ComplaintJourneyProps {
  complaint: Complaint;
  compact?: boolean;
}

interface JourneyStepConfig {
  status: ComplaintStatus;
  labelKey: string;
  defaultLabel: string;
  icon: string;
  description: string;
}

const JOURNEY_STEPS: JourneyStepConfig[] = [
  {
    status: 'pending',
    labelKey: 'submitted',
    defaultLabel: 'Complaint Submitted',
    icon: 'assignment_turned_in',
    description: 'Grievance registered and sent for administrative dispatch.',
  },
  {
    status: 'assigned',
    labelKey: 'assigned',
    defaultLabel: 'Assigned to Officer',
    icon: 'assignment_ind',
    description: 'Designated field officer assigned for investigation.',
  },
  {
    status: 'in_progress',
    labelKey: 'in_progress',
    defaultLabel: 'Work In Progress',
    icon: 'engineering',
    description: 'Field inspection completed and civil works underway.',
  },
  {
    status: 'resolved',
    labelKey: 'resolved',
    defaultLabel: 'Resolved',
    icon: 'task_alt',
    description: 'On-site rectification completed; awaiting citizen confirmation.',
  },
  {
    status: 'closed',
    labelKey: 'closed',
    defaultLabel: 'Formally Closed',
    icon: 'verified',
    description: 'Resolution verified and case formally closed in record.',
  },
];

const STATUS_ORDER: Record<ComplaintStatus, number> = {
  pending: 0,
  assigned: 1,
  in_progress: 2,
  blocked: 2,
  resolved: 3,
  closed: 4,
  escalated: 2, // parallel track at In Progress level
  reopened: 2,  // returns to In Progress track
  rejected: 99,
};


export function ComplaintJourney({ complaint, compact = false }: ComplaintJourneyProps) {
  const { t, language } = useLanguage();

  const isRejected = complaint.status === 'rejected';
  const isEscalated = complaint.status === 'escalated' || complaint.escalationLevel > 0;
  const isReopened = complaint.status === 'reopened';
  const currentStepIndex = isRejected ? -1 : (STATUS_ORDER[complaint.status] ?? 0);

  // Group updates by status to attach real database metadata to each journey milestone
  const updatesByStatus = useMemo(() => {
    const map = new Map<ComplaintStatus, ComplaintUpdate>();
    if (complaint.updates && complaint.updates.length > 0) {
      for (const update of complaint.updates) {
        // Keep the latest or most descriptive update for this status
        map.set(update.status, update);
      }
    }
    return map;
  }, [complaint.updates]);

  return (
    <div className={`rounded-3xl border border-outline-variant bg-surface-container-lowest shadow-card ${compact ? 'p-3 sm:p-4' : 'p-5 sm:p-6'}`}>
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
            <Icon name="route" size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface">
              {t('liveComplaintJourney') || 'Live Complaint Journey'}
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {t('realtimeAuditTrail') || 'Audited grievance progression from submission to closure'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEscalated && (
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-rose-300">
              <Icon name="priority_high" size={14} /> Tier {complaint.escalationLevel || 1} Escalated
            </span>
          )}
          {isReopened && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-amber-300">
              <Icon name="restart_alt" size={14} /> Reopened
            </span>
          )}
          {isRejected && (
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-rose-300">
              <Icon name="cancel" size={14} /> Rejected
            </span>
          )}
        </div>
      </div>

      {/* Terminal Rejection View */}
      {isRejected ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 animate-slide-up">
          <Icon name="block" size={22} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <strong className="block font-bold mb-0.5">Grievance Closed as Out of Scope / Rejected</strong>
            <p className="text-rose-800/90 leading-relaxed mb-2">
              {updatesByStatus.get('rejected')?.note || 'This complaint has been reviewed and marked as out of municipal jurisdiction or duplicate.'}
            </p>
            <div className="text-xs font-mono text-rose-700">
              Action taken by {updatesByStatus.get('rejected')?.updatedByName || 'Jurisdiction Officer'} on {formatDateTime(updatesByStatus.get('rejected')?.timestamp || complaint.updatedAt, language)}
            </div>
          </div>
        </div>
      ) : (
        /* Standard 5-Step Journey */
        <div className="relative flex flex-col gap-0">
          {JOURNEY_STEPS.map((step, idx) => {
            const isCompleted = currentStepIndex > idx;
            const isCurrent = currentStepIndex === idx;
            const isPending = currentStepIndex < idx;
            const isLast = idx === JOURNEY_STEPS.length - 1;

            const updateRecord = updatesByStatus.get(step.status);
            const stepTimestamp = updateRecord?.timestamp || (
              idx === 0 ? complaint.createdAt :
              (step.status === 'resolved' && complaint.resolvedAt) ? complaint.resolvedAt :
              (step.status === 'closed' && complaint.closedAt) ? complaint.closedAt :
              undefined
            );
            const actorName = updateRecord?.updatedByName || (
              step.status === 'pending' ? complaint.citizenName :
              step.status === 'assigned' ? (complaint.assignedToName || 'Jurisdiction Officer') :
              undefined
            );
            const noteText = updateRecord?.note;
            const staggerClass = `stagger-${idx + 1}`;

            return (
              <div key={step.status} className={`relative flex items-start gap-4 pb-6 last:pb-0 animate-slide-up ${staggerClass}`}>
                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={`absolute left-4 top-8 w-0.5 bottom-0 -ml-[1px] transition-colors duration-300 ${
                      isCompleted ? 'bg-primary' : 'bg-outline-variant/60'
                    }`}
                  />
                )}

                {/* Node Icon */}
                <div
                  className={`
                    relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all duration-300
                    ${isCompleted ? 'bg-primary text-on-primary shadow-xs' : ''}
                    ${isCurrent ? 'bg-primary text-on-primary ring-4 ring-primary/20 shadow-md scale-110' : ''}
                    ${isPending ? 'bg-surface-container text-on-surface-variant border border-outline-variant' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Icon name="check" size={16} />
                  ) : isCurrent ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse-subtle" />
                  ) : (
                    <span className="text-xs font-mono font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Step Details */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm font-bold leading-none ${
                          isCurrent
                            ? 'text-primary text-base font-bold'
                            : isCompleted
                            ? 'text-on-surface'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {t(step.labelKey) || step.defaultLabel}
                      </h4>
                      {isCurrent && (
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
                          {t('currentStage') || 'Current Stage'}
                        </span>
                      )}
                    </div>

                    {stepTimestamp && (
                      <span className="text-xs font-mono text-on-surface-variant font-medium">
                        {formatDateTime(stepTimestamp, language)}
                      </span>
                    )}
                  </div>

                  {/* Actor and Narrative */}
                  <div className="mt-1">
                    {actorName && (isCompleted || isCurrent) && (
                      <p className="text-xs text-on-surface font-semibold flex items-center gap-1.5">
                        <Icon name="person" size={14} className="text-primary shrink-0" />
                        <span>{actorName}</span>
                      </p>
                    )}

                    {noteText && (isCompleted || isCurrent) && (
                      <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed bg-surface-container/50 p-3 rounded-xl border border-outline-variant/40">
                        {noteText}
                      </p>
                    )}

                    {!noteText && (
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
