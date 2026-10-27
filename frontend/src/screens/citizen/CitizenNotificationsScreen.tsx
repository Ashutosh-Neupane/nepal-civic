import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getNotifications, markNotificationAsRead } from '@/lib/notificationService';
import { MobileLayout } from '@/layouts/MobileLayout';
import { NotificationItem } from '@/components/common/NotificationItem';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import type { Notification } from '@/types';

export function CitizenNotificationsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const BOTTOM_NAV = [
    { icon: 'home', label: t('home'), href: '/citizen' },
    { icon: 'assignment', label: t('myCases'), href: '/citizen/my-complaints' },
    { icon: 'add_circle', label: t('report'), href: '/citizen/report' },
    { icon: 'map', label: t('explore'), href: '/citizen/map' },
    { icon: 'person', label: t('profile'), href: '/citizen/profile' },
  ];

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    async function loadNotifs() {
      if (!user?.uid) return;
      setLoading(true);
      const list = await getNotifications(user.uid);
      setNotifications(list);
      setLoading(false);
    }
    loadNotifs();
  }, [user]);

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      await markNotificationAsRead(n.id);
      setNotifications(prev => prev.map(item => (item.id === n.id ? { ...item, isRead: true } : item)));
    }
    if (n.complaintId) {
      navigate(`/citizen/complaint/${n.complaintId}`);
    }
  };

  const handleMarkAllRead = async () => {
    for (const n of notifications) {
      if (!n.isRead) await markNotificationAsRead(n.id);
    }
    setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
  };

  const filtered = notifications.filter(n => (activeFilter === 'unread' ? !n.isRead : true));

  return (
    <MobileLayout
      title={t('alertsUpdates')}
      bottomNav={BOTTOM_NAV}
      headerRight={
        notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs sm:text-sm font-bold text-primary hover:underline px-2"
          >
            {t('markAllRead')}
          </button>
        )
      }
    >
      <div className="px-4 py-4 pb-6 flex flex-col gap-3.5">
        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {t('allAlerts')} ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeFilter === 'unread'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {t('unread')} ({notifications.filter(n => !n.isRead).length})
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="notifications_off"
            title={t('noNotifications')}
            description={t('noNotificationsDesc')}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map(item => (
              <NotificationItem
                key={item.id}
                notification={item}
                onClick={() => handleNotificationClick(item)}
              />
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
