import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileLayout } from '@/layouts/MobileLayout';
import { CivicMap } from '@/components/map/CivicMap';
import { getComplaints, subscribeToComplaints } from '@/lib/complaintService';
import { Icon } from '@/components/common/Icon';
import type { Complaint } from '@/types';

export function CitizenMapViewScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [viewScope, setViewScope] = useState<'my' | 'community'>(user?.uid ? 'my' : 'community');

  const BOTTOM_NAV = [
    { icon: 'home', label: t('home'), href: '/citizen' },
    { icon: 'assignment', label: t('myCases'), href: '/citizen/my-complaints' },
    { icon: 'add_circle', label: t('report'), href: '/citizen/report' },
    { icon: 'map', label: t('explore'), active: true, href: '/citizen/map' },
    { icon: 'person', label: t('profile'), href: '/citizen/profile' },
  ];

  async function loadComplaints() {
    if (viewScope === 'my' && user?.uid) {
      const list = await getComplaints({ mine: true });
      setComplaints(list);
    } else {
      const list = await getComplaints({});
      setComplaints(list);
    }
  }

  useEffect(() => {
    loadComplaints();
    const unsubscribe = subscribeToComplaints(() => {
      loadComplaints();
    });
    return () => {
      unsubscribe();
    };
  }, [user, viewScope]);

  return (
    <MobileLayout
      title={t('localGrievanceMap')}
      bottomNav={BOTTOM_NAV}
      headerRight={
        <div className="flex items-center gap-2">
          {user?.uid && (
            <div className="flex items-center p-0.5 bg-surface-container rounded-full border border-outline-variant/60 text-xs">
              <button
                type="button"
                onClick={() => setViewScope('my')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all ${
                  viewScope === 'my'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                My Cases
              </button>
              <button
                type="button"
                onClick={() => setViewScope('community')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all ${
                  viewScope === 'community'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Community
              </button>
            </div>
          )}
          <Link
            to="/citizen/report"
            aria-label="Report new grievance"
            className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:opacity-90 active:scale-95 transition-all"
          >
            <Icon name="add" size={20} />
          </Link>
        </div>
      }
    >
      <div className="w-full h-[calc(100vh-7.5rem)] h-[calc(100dvh-7.5rem)] min-h-[500px] p-2">
        <CivicMap
          mode="view"
          complaints={complaints}
          portalType="citizen"
          height="100%"
          showFilters={true}
          showLegend={true}
          onSelectComplaint={(c) => navigate(`/citizen/complaint/${c.id}`)}
        />
      </div>
    </MobileLayout>
  );
}
