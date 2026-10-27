import { api } from './api';
import type { Notification, NotificationType } from '@/types';

interface ApiNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  serviceRequestId?: string | null;
  serviceRequestPublicId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function mapApiToNotification(row: ApiNotification): Notification {
  return {
    id: row.id,
    userId: row.recipientId,
    type: row.type,
    title: row.title,
    body: row.body,
    complaintId: row.serviceRequestId || undefined,
    complaintRef: row.serviceRequestPublicId || undefined,
    isRead: !!row.isRead,
    createdAt: row.createdAt,
  };
}

/** Notifications for the signed-in user. The userId argument is kept for older callers. */
export async function getNotifications(_userId?: string): Promise<Notification[]> {
  const { data } = await api.get<ApiNotification[]>('/notifications');
  return data.map(mapApiToNotification);
}

export async function getUnreadCount(): Promise<number> {
  const response = await api.get<ApiNotification[]>('/notifications', { limit: 1 });
  return response.unread ?? 0;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(_userId?: string): Promise<void> {
  await api.post('/notifications/read-all');
}

/** Polls for new notifications while the tab is visible. */
export function subscribeToNotifications(
  _userId: string,
  onUpdate: () => void,
  intervalMs = 30000
): () => void {
  const timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') onUpdate();
  }, intervalMs);
  return () => window.clearInterval(timer);
}
