import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getComplaints, subscribeToComplaints } from '@/lib/complaintService';
import { MobileLayout } from '@/layouts/MobileLayout';
import { ComplaintCard } from '@/components/common/ComplaintCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Icon } from '@/components/common/Icon';
import type { Complaint } from '@/types';

export function MyComplaintsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const BOTTOM_NAV = [
    { icon: 'home', label: t('home'), href: '/citizen' },
    { icon: 'assignment', label: t('myCases'), active: true, href: '/citizen/my-complaints' },
    { icon: 'add_circle', label: t('report'), href: '/citizen/report' },
    { icon: 'map', label: t('explore'), href: '/citizen/map' },
    { icon: 'person', label: t('profile'), href: '/citizen/profile' },
  ];

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'resolved' | 'escalated'>('all');
  const [search, setSearch] = useState('');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!user?.uid) return;
    setLoading(true);
    const list = await getComplaints({
      mine: true,
    });
    setComplaints(list);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToComplaints(() => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [user]);

  const filteredList = complaints.filter(c => {
    if (activeTab === 'active' && (c.status === 'resolved' || c.status === 'closed')) return false;
    if (activeTab === 'resolved' && (c.status !== 'resolved' && c.status !== 'closed')) return false;
    if (activeTab === 'escalated' && (c.status !== 'escalated' && c.escalationLevel === 0)) return false;

    if (search.trim()) {
      const s = search.toLowerCase();
      const matches =
        c.title.toLowerCase().includes(s) ||
        c.referenceId.toLowerCase().includes(s) ||
        c.category.toLowerCase().includes(s);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <MobileLayout
      title={t('myGrievances')}
      bottomNav={BOTTOM_NAV}
      headerRight={
        <Link
          to="/citizen/notifications"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
        >
          <Icon name="notifications" size={22} className="text-on-surface-variant" />
        </Link>
      }
    >
      <div className="px-4 py-4 pb-3 flex flex-col gap-3">
        {/* Search Bar */}
        <div className="relative">
          <Icon name="search" size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: t('allCases'), count: complaints.length },
            { id: 'active', label: t('inProgressTab'), count: complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed').length },
            { id: 'resolved', label: t('resolvedTab'), count: complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length },
            { id: 'escalated', label: t('escalatedTab'), count: complaints.filter(c => c.status === 'escalated' || c.escalationLevel > 0).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.id ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-high'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Complaints List */}
        {loading ? (
          <LoadingState />
        ) : filteredList.length === 0 ? (
          <EmptyState
            icon="assignment_late"
            title={t('noGrievancesFound')}
            description={
              search
                ? t('noSearchMatch')
                : t('noGrievancesDesc')
            }
            actionLabel={t('fileAGrievance')}
            onAction={() => navigate('/citizen/report')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredList.map(item => (
              <ComplaintCard
                key={item.id}
                complaint={item}
                onClick={() => navigate(`/citizen/complaint/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
