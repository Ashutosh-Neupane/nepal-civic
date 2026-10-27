import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getComplaints, subscribeToComplaints } from '@/lib/complaintService';
import { getNotifications } from '@/lib/notificationService';
import { MobileLayout } from '@/layouts/MobileLayout';
import { CategoryGrid } from '@/components/common/CategoryGrid';
import { ComplaintCard } from '@/components/common/ComplaintCard';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/common/Button';
import type { Complaint, ComplaintCategory } from '@/types';

export function CitizenHomeScreen() {
  const { user, logout } = useAuth();
  const { t, pick } = useLanguage();
  const navigate = useNavigate();

  const BOTTOM_NAV = [
    { icon: 'home', label: t('home'), active: true, href: '/citizen' },
    { icon: 'assignment', label: t('myCases'), href: '/citizen/my-complaints' },
    { icon: 'add_circle', label: t('report'), href: '/citizen/report' },
    { icon: 'map', label: t('explore'), href: '/citizen/map' },
    { icon: 'person', label: t('profile'), href: '/citizen/profile' },
  ];

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function init() {
      if (!user?.uid) return;
      const [list, notifs] = await Promise.all([
        getComplaints({ mine: true }),
        getNotifications(user.uid),
      ]);
      setComplaints(list);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    }
    init();
    const unsubscribe = subscribeToComplaints(() => {
      init();
    });
    return () => {
      unsubscribe();
    };
  }, [user]);

  const activeComplaint = complaints.find(c => c.status !== 'resolved' && c.status !== 'closed');
  const recentComplaints = complaints.slice(0, 3);

  const handleCategorySelect = (category: ComplaintCategory) => {
    navigate('/citizen/report', { state: { preselectedCategory: category, step: 2 } });
  };

  return (
    <MobileLayout
      title={user?.fullName || t('citizen')}
      greeting={t('goodMorning')}
      headerRight={
        <div className="flex items-center gap-2">
          <Link
            to="/citizen/notifications"
            className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
            aria-label="View notifications"
          >
            <Icon name="notifications" size={22} className="text-on-surface-variant" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full ring-2 ring-surface" />
            )}
          </Link>
          <button
            onClick={logout}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
            title={t('logout')}
            aria-label={t('logout')}
          >
            <Icon name="logout" size={20} className="text-on-surface-variant" />
          </button>
        </div>
      }
      bottomNav={BOTTOM_NAV}
    >
      <div className="flex flex-col gap-4 px-4 py-4 pb-3">
        {/* Quick Report Hero CTA Banner */}
        <section className="bg-primary rounded-3xl p-6 text-on-primary shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-on-primary/15 text-primary-fixed mb-3">
              <Icon name="campaign" size={16} /> {t('officialCitizenRedressal')}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold leading-snug mb-2">
              {t('spottedCivicProblem')}
            </h2>
            <p className="text-xs sm:text-sm text-on-primary/80 mb-5 leading-relaxed">
              {t('reportPotholesDesc')}
            </p>
            <Link to="/citizen/report">
              <Button
                variant="ghost"
                size="md"
                className="w-full !bg-white !text-primary font-bold shadow-md hover:!bg-white/90 py-3 text-sm sm:text-base"
                icon="add_circle"
                iconRight="arrow_forward"
              >
                {t('fileNewGrievance')}
              </Button>
            </Link>
          </div>

          {/* Decorative Background Circles */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-secondary/30 pointer-events-none blur-2xl" />
          <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
            <Icon name="account_balance" size={120} />
          </div>
        </section>

        {/* Active Grievance Live Tracker Card (if any active) */}
        {activeComplaint && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                {t('activeGrievanceTracking')}
              </h3>
              <Link
                to={`/citizen/complaint/${activeComplaint.id}`}
                className="text-xs sm:text-sm font-semibold text-primary hover:underline"
              >
                {t('viewTimeline')}
              </Link>
            </div>

            <div
              onClick={() => navigate(`/citizen/complaint/${activeComplaint.id}`)}
              className="p-4 rounded-2xl border border-primary/20 bg-primary-container/10 shadow-sm cursor-pointer hover:bg-primary-container/15 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs sm:text-sm font-bold text-primary">{activeComplaint.referenceId}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                  {t(activeComplaint.status)}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-on-surface line-clamp-1 mb-1">
                {activeComplaint.title}
              </h4>
              <p className="text-xs sm:text-sm text-on-surface-variant flex items-center gap-1">
                <Icon name="location_on" size={14} className="text-primary" />
                {pick(`Ward ${activeComplaint.wardNo}, ${activeComplaint.jurisdictionName}`, `${activeComplaint.jurisdictionNameNe || activeComplaint.jurisdictionName} वडा नं. ${activeComplaint.wardNo}`)}
              </p>
            </div>
          </section>
        )}

        {/* 8 Categories Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-bold text-on-surface">
              {t('popularCategories')}
            </h3>
            <span className="text-xs sm:text-sm text-on-surface-variant font-medium">{pick('Tap to report', 'उजुरी गर्न थिच्नुहोस्')}</span>
          </div>
          <CategoryGrid onSelect={handleCategorySelect} />
        </section>

        {/* Explore Real Geospatial Map Banner */}
        <section>
          <Link
            to="/citizen/map"
            className="p-4 rounded-2xl border border-outline-variant bg-surface-container-lowest flex items-center justify-between shadow-sm hover:bg-surface-container transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-105 transition-transform">
                <Icon name="map" size={24} />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-on-surface">
                  {t('localGrievanceMap')}
                </h4>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  {pick('See grievances reported in your Palika', 'तपाईंको पालिकामा दर्ता भएका गुनासो हेर्नुहोस्')}
                </p>
              </div>
            </div>
            <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
          </Link>
        </section>

        {/* Recent Grievances List */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-bold text-on-surface">
              {t('recentGrievances')}
            </h3>
            <Link
              to="/citizen/my-complaints"
              className="text-xs sm:text-sm font-bold text-primary hover:underline"
            >
              {t('viewAll')} ({complaints.length})
            </Link>
          </div>

          {recentComplaints.length === 0 ? (
            <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-lowest text-center">
              <Icon name="task_alt" size={32} className="text-primary mx-auto mb-1.5 opacity-60" />
              <p className="text-sm text-on-surface-variant font-medium">{t('noGrievancesDesc')}</p>
              <Link to="/citizen/report" className="inline-block mt-2 text-xs sm:text-sm font-bold text-primary hover:underline">
                + {t('fileNewGrievance')}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentComplaints.map(item => (
                <ComplaintCard
                  key={item.id}
                  complaint={item}
                  onClick={() => navigate(`/citizen/complaint/${item.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Service charter timelines */}
        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3">
          <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="speed" size={16} className="text-primary" />
            {pick('Response time by priority', 'प्राथमिकता अनुसार सम्बोधन समय')}
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { en: 'Critical', ne: 'अति जरुरी', time: pick('24 h', '२४ घण्टा') },
              { en: 'High', ne: 'उच्च', time: pick('48 h', '४८ घण्टा') },
              { en: 'Medium', ne: 'मध्यम', time: pick('3 days', '३ दिन') },
              { en: 'Low', ne: 'सामान्य', time: pick('5 days', '५ दिन') },
            ].map((row) => (
              <div key={row.en} className="p-2.5 rounded-xl bg-surface-container flex flex-col gap-0.5">
                <span className="text-xs text-on-surface-variant">{pick(row.en, row.ne)}</span>
                <span className="text-sm font-bold text-on-surface">{row.time}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant">
            {pick(
              'If the ward does not act in time, your grievance moves up to the Palika, then the District and the Province.',
              'वडाले समयमै सम्बोधन नगरे गुनासो पालिका, जिल्ला हुँदै प्रदेशसम्म स्वतः पुग्छ।'
            )}
          </p>
        </section>

        {/* Helplines */}
        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-2.5">
          <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <Icon name="support_agent" size={16} className="text-primary" />
            {pick('Helplines', 'हेल्पलाइन')}
          </h4>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {[
              { en: 'Hello Sarkar', ne: 'हेलो सरकार', subEn: 'Government grievances', subNe: 'सरकारी गुनासो', number: '1111' },
              { en: 'Police', ne: 'प्रहरी', subEn: 'Emergency', subNe: 'आपतकालीन', number: '100' },
              { en: 'Ambulance', ne: 'एम्बुलेन्स', subEn: 'Medical emergency', subNe: 'स्वास्थ्य आपतकाल', number: '102' },
              { en: 'Fire brigade', ne: 'दमकल', subEn: 'Fire', subNe: 'आगलागी', number: '101' },
            ].map((line) => (
              <a key={line.number} href={`tel:${line.number}`} className="p-3 rounded-xl bg-surface-container flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs sm:text-sm text-on-surface block">{pick(line.en, line.ne)}</span>
                  <span className="text-xs text-on-surface-variant">{pick(line.subEn, line.subNe)}</span>
                </div>
                <span className="font-mono font-bold text-primary text-base">{line.number}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
}
