import { STATUS_META } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ComplaintStatus } from '@/types';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { t } = useLanguage();
  const meta = STATUS_META[status];
  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-xs font-semibold' : 'px-3 py-1 text-[13px] font-semibold';

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full transition-all duration-200 shadow-sm
        ${sizeClass}
        ${meta?.bgClass || 'bg-surface-container'}
        ${meta?.colorClass || 'text-on-surface'}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${meta?.dotClass || 'bg-outline'}`} />
      <span>{t(status) || meta?.label || status}</span>
    </div>
  );
}
