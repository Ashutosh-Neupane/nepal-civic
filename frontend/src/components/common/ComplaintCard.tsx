import type { Complaint } from '@/types';
import { StatusBadge } from './StatusBadge';
import { Icon } from './Icon';
import { CATEGORY_META } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick?: () => void;
  index?: number;
}

function getProgressPercent(status: Complaint['status']): number {
  const map: Record<string, number> = {
    pending: 15,
    assigned: 35,
    in_progress: 65,
    resolved: 100,
    escalated: 50,
    closed: 100,
    rejected: 100,
    reopened: 25,
  };
  return map[status] ?? 0;
}

export function ComplaintCard({ complaint, onClick, index }: ComplaintCardProps) {
  const { t } = useLanguage();
  const catMeta = CATEGORY_META[complaint.category];
  const progress = getProgressPercent(complaint.status);

  function formatTimeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return hours <= 1 ? t('today') : `${hours} ${t('hoursAgo')}`;
    const days = Math.floor(hours / 24);
    return days === 1 ? t('yesterday') : `${days} ${t('daysAgo')}`;
  }

  const staggerClass = index !== undefined && index < 6 ? `stagger-${index + 1}` : '';

  return (
    <div
      className={`
        bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4.5 flex flex-col gap-3
        shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer
        animate-slide-up ${staggerClass}
      `}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon name={catMeta?.icon || 'report'} size={18} />
          </div>
          <span className="font-mono text-xs font-bold text-primary">#{complaint.referenceId}</span>
        </div>
        <StatusBadge status={complaint.status} size="sm" />
      </div>

      <h3 className="text-base text-on-surface font-bold leading-snug line-clamp-2">
        {complaint.title}
      </h3>

      <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
        <span>{complaint.wardLabel || `${complaint.jurisdictionName}, ${complaint.districtName}`}</span>
        <span>{t('reported')} {formatTimeAgo(complaint.createdAt)}</span>
      </div>

      <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden mt-1">
        <div
          className="h-full bg-secondary rounded-full progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
