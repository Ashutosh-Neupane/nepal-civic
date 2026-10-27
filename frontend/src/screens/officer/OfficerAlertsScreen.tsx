import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/common/Button';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotifications,
} from '@/lib/notificationService';
import { officerPortal } from '@/lib/officerNav';
import { describeTerritory } from '@/lib/jurisdictionService';
import { formatRelative, localizeDigits } from '@/lib/dateUtils';
import type { Notification } from '@/types';

export function OfficerAlertsScreen() {
  const { user, logout } = useAuth();
  const { t, pick, language } = useLanguage();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'escalations' | 'assignments'>('all');
  const [loading, setLoading] = useState(true);

  const portal = officerPortal(user?.role);
  const complaintsPath = `${portal}/complaints`;
  const escalationPath = portal === '/palika' ? complaintsPath : `${portal}/escalations`;

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    const load = async () => {
      try {
        const data = await getNotifications();
        if (active) setNotifications(data);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const unsubscribe = subscribeToNotifications(user.uid, load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.uid]);

  const handleMarkAllRead = async () => {
    if (!user?.uid) return;
    await markAllNotificationsAsRead(user.uid);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleAlertClick = async (item: Notification) => {
    if (!item.isRead) {
      await markNotificationAsRead(item.id);
      setNotifications(prev => prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n)));
    }

    const path = item.type === 'complaint_escalated' ? escalationPath : complaintsPath;
    navigate(item.complaintRef ? `${path}?ref=${item.complaintRef}` : path);
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'escalations') return n.type === 'complaint_escalated';
    if (filter === 'assignments') return n.type === 'complaint_assigned';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DashboardLayout
      title={t('alerts')}
      subtitle={user?.territory ? describeTerritory(user.territory, language) : undefined}
      headerActions={
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" icon="done_all" onClick={handleMarkAllRead}>
              {t('markAllRead')} ({localizeDigits(unreadCount, language)})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={logout} icon="logout">
            {t('logout')}
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl flex flex-col gap-6">
        {/* Filters */}
        <div className="flex items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-card flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {pick('All', 'सबै')} ({localizeDigits(notifications.length, language)})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                filter === 'unread'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t('unread')} ({localizeDigits(unreadCount, language)})
            </button>
            <button
              onClick={() => setFilter('escalations')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                filter === 'escalations'
                  ? 'bg-error text-on-error shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t('escalations')}
            </button>
            <button
              onClick={() => setFilter('assignments')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                filter === 'assignments'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {pick('Assignments', 'जिम्मेवारी')}
            </button>
          </div>

          <span className="text-xs sm:text-sm text-on-surface-variant">
            {pick('Refreshes every 30 seconds', 'हरेक ३० सेकेन्डमा अद्यावधिक हुन्छ')}
          </span>
        </div>

        {/* Notifications List */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">
              <span className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p>{t('loading')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">
              <Icon name="notifications_off" size={40} className="text-on-surface-variant/40 mx-auto mb-3" />
              <p className="font-bold text-base text-on-surface mb-1">{t('noNotifications')}</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/40">
              {filtered.map(item => {
                const isEscalation = item.type === 'complaint_escalated';
                const isAssignment = item.type === 'complaint_assigned';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleAlertClick(item)}
                    className={`p-5 flex items-start gap-4 cursor-pointer transition-colors ${
                      !item.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container/40'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isEscalation
                          ? 'bg-error-container text-error'
                          : isAssignment
                          ? 'bg-primary-container/30 text-primary'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <Icon
                        name={
                          isEscalation
                            ? 'warning'
                            : isAssignment
                            ? 'assignment_ind'
                            : 'notifications'
                        }
                        size={20}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-bold text-sm sm:text-base text-on-surface truncate flex items-center gap-2">
                          {item.title}
                          {!item.isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </h4>
                        <span className="text-xs text-on-surface-variant flex-shrink-0 font-mono">
                          {formatRelative(item.createdAt, language)}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed line-clamp-2 mb-2">
                        {item.body}
                      </p>

                      <div className="flex items-center gap-3 text-xs">
                        {item.complaintRef && (
                          <span className="font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                            {item.complaintRef}
                          </span>
                        )}
                        <span className="text-primary font-bold hover:underline flex items-center gap-1">
                          {pick('Open', 'खोल्नुहोस्')} <Icon name="arrow_forward" size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
