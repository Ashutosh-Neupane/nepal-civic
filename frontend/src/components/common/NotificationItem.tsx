import type { Notification } from '@/types';
import { Icon } from './Icon';

const TYPE_ICON: Record<string, string> = {
  complaint_status_update: 'update',
  complaint_assigned: 'assignment_ind',
  complaint_escalated: 'priority_high',
  complaint_resolved: 'check_circle',
  new_complaint: 'report_problem',
  system: 'info',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  index?: number;
}

export function NotificationItem({ notification, onClick, index }: NotificationItemProps) {
  const icon = TYPE_ICON[notification.type] ?? 'notifications';
  const staggerClass = index !== undefined && index < 6 ? `stagger-${index + 1}` : '';

  return (
    <div
      className={`
        flex items-start gap-4 p-4 cursor-pointer hover:bg-surface-container-low transition-all duration-200
        animate-slide-up ${staggerClass}
        ${!notification.isRead ? 'bg-primary/5' : ''}
      `}
      onClick={onClick}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
        !notification.isRead ? 'bg-secondary-container text-on-secondary-container shadow-xs' : 'bg-surface-container text-on-surface-variant'
      }`}>
        <Icon name={icon} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm sm:text-base text-on-surface leading-snug font-semibold ${
            !notification.isRead ? 'font-bold text-primary' : ''
          }`}>{notification.title}</p>
          {!notification.isRead && (
            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1 animate-pulse-subtle" />
          )}
        </div>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">{notification.body}</p>
        <p className="text-xs text-on-surface-variant/80 mt-2 font-mono">{timeAgo(notification.createdAt)}</p>
      </div>
    </div>
  );
}
