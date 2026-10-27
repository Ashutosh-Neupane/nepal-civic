import { PRIORITY_META } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ComplaintPriority } from '@/types';
import { Icon } from './Icon';

interface PriorityBadgeProps {
  priority: ComplaintPriority;
  animate?: boolean;
}

export function PriorityBadge({ priority, animate }: PriorityBadgeProps) {
  const { t } = useLanguage();
  const meta = PRIORITY_META[priority];
  const isCritical = priority === 'critical';

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-semibold
        transition-all duration-200 shadow-sm
        ${meta?.bgClass || 'bg-surface-container'}
        ${meta?.colorClass || 'text-on-surface'}
        ${isCritical || animate ? 'animate-pulse-subtle' : ''}
      `}
    >
      <Icon name={meta?.icon || 'adjust'} size={15} className={isCritical ? 'text-error' : ''} />
      <span>{t(priority)}</span>
    </div>
  );
}
