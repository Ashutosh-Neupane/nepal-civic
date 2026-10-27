import { Icon } from './Icon';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'inbox', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-2xl border border-outline-variant/60 bg-surface-container-lowest my-2 shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center mb-3 text-primary">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="text-base font-bold text-on-surface mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-on-surface-variant max-w-sm mb-4 leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
