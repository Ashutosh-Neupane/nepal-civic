import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { KPICard } from '@/components/common/KPICard';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { Icon } from '@/components/common/Icon';
import { getGrievanceStats, type GrievanceStats } from '@/lib/analyticsService';
import { getComplaints, subscribeToComplaints } from '@/lib/complaintService';
import { CATEGORY_META, ROLE_META } from '@/lib/constants';
import { describeTerritory, unitDisplayName } from '@/lib/jurisdictionService';
import { officerPortal } from '@/lib/officerNav';
import { formatRelative, localizeDigits } from '@/lib/dateUtils';
import type { Complaint } from '@/types';

const UNIT_HEADING: Record<string, [string, string]> = {
  province: ['Province', 'प्रदेश'],
  district: ['District', 'जिल्ला'],
  palika: ['Palika', 'पालिका'],
  ward: ['Ward', 'वडा'],
};

export function OfficerDashboardScreen() {
  const { user } = useAuth();
  const { pick, language } = useLanguage();
  const portal = officerPortal(user?.role);
  const [stats, setStats] = useState<GrievanceStats | null>(null);
  const [queue, setQueue] = useState<Complaint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [statData, queueData] = await Promise.all([
        getGrievanceStats(),
        getComplaints({ status: ['pending', 'escalated', 'reopened'], limit: 8 }),
      ]);
      setStats(statData);
      setQueue(queueData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    load();
    return subscribeToComplaints(load);
  }, [load]);

  const area = user?.territory && describeTerritory(user.territory, language);
  const roleLabel = user ? pick(ROLE_META[user.role].label, ROLE_META[user.role].labelNe) : '';
  const title = pick('Grievance overview', 'गुनासो सारांश');
  const subtitle = `${roleLabel} · ${area || pick('All of Nepal', 'सम्पूर्ण नेपाल')}`;

  if (error && !stats) {
    return (
      <DashboardLayout title={title} subtitle={subtitle}>
        <ErrorState title={pick('Could not load the dashboard', 'ड्यासबोर्ड लोड हुन सकेन')} description={error} onRetry={load} />
      </DashboardLayout>
    );
  }
  if (!stats) {
    return (
      <DashboardLayout title={title} subtitle={subtitle}>
        <LoadingState type="dashboard" />
      </DashboardLayout>
    );
  }

  const s = stats.summary;
  const n = (value: number) => localizeDigits(value, language);
  const needsAction = s.pending + s.reopened;
  const inProgress = s.assigned + s.inProgress;
  const resolved = s.resolved + s.closed;
  const maxUnit = Math.max(1, ...stats.units.map((u) => u.total));

  return (
    <DashboardLayout
      title={title}
      subtitle={subtitle}
      headerActions={
        <Link to={`${portal}/complaints`} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-on-primary text-sm font-semibold">
          <Icon name="assignment" size={18} />
          {pick('Open grievances', 'गुनासोहरू हेर्नुहोस्')}
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label={pick('Needs action', 'कारबाही आवश्यक')} value={n(needsAction)} icon="pending_actions" variant={needsAction ? 'warning' : 'default'} />
          <KPICard label={pick('In progress', 'काम हुँदै')} value={n(inProgress)} icon="engineering" />
          <KPICard label={pick('Overdue', 'समय नाघेको')} value={n(s.overdue)} icon="timer_off" variant={s.overdue ? 'critical' : 'default'} />
          <KPICard label={pick('Resolved', 'समाधान भएको')} value={n(resolved)} icon="task_alt" variant="success" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label={pick('Total grievances', 'जम्मा गुनासो')} value={n(s.total)} icon="inbox" />
          <KPICard label={pick('Escalated', 'माथि पठाइएको')} value={n(s.escalated)} icon="trending_up" />
          <KPICard
            label={pick('Resolved on time', 'समयमै समाधान')}
            value={stats.slaComplianceRate == null ? '—' : `${n(Math.round(stats.slaComplianceRate))}%`}
            icon="verified"
          />
          <KPICard
            label={pick('Citizen rating', 'नागरिक मूल्याङ्कन')}
            value={stats.avgRating == null ? '—' : `${localizeDigits(stats.avgRating.toFixed(1), language)} / ${n(5)}`}
            icon="star"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section className="xl:col-span-3 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card">
            <header className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/60">
              <div>
                <h2 className="text-base font-bold text-on-surface">{pick('Action queue', 'कारबाही सूची')}</h2>
                <p className="text-xs text-on-surface-variant">{pick('New, escalated and reopened grievances', 'नयाँ, माथि पठाइएका र पुनः खोलिएका गुनासो')}</p>
              </div>
              <Link to={`${portal}/complaints`} className="text-sm font-semibold text-primary">{pick('View all', 'सबै हेर्नुहोस्')}</Link>
            </header>
            {queue.length === 0 ? (
              <div className="p-5">
                <EmptyState icon="task_alt" title={pick('Nothing waiting', 'केही बाँकी छैन')} description={pick('No grievance needs action right now.', 'अहिले कारबाही गर्नुपर्ने गुनासो छैन।')} />
              </div>
            ) : (
              <ul className="divide-y divide-outline-variant/50">
                {queue.map((c) => (
                  <li key={c.id}>
                    <Link to={`${portal}/complaints?ref=${encodeURIComponent(c.referenceId)}`} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-container-low/50">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon name={CATEGORY_META[c.category]?.icon || 'report'} size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-on-surface truncate">{c.title}</div>
                        <div className="text-xs text-on-surface-variant truncate">
                          <span className="font-mono">{c.referenceId}</span> · {c.jurisdictionNameNe && language === 'ne' ? c.jurisdictionNameNe : c.jurisdictionName}
                          {c.wardNo ? ` · ${pick(`Ward ${c.wardNo}`, `वडा नं. ${localizeDigits(c.wardNo, 'ne')}`)}` : ''} · {formatRelative(c.createdAt, language)}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <PriorityBadge priority={c.priority} />
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="xl:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card">
            <header className="px-5 py-4 border-b border-outline-variant/60">
              <h2 className="text-base font-bold text-on-surface">{pick('By area', 'क्षेत्र अनुसार')}</h2>
              <p className="text-xs text-on-surface-variant">{pick('Open and overdue grievances in each area', 'प्रत्येक क्षेत्रका खुला र समय नाघेका गुनासो')}</p>
            </header>
            {stats.units.length === 0 ? (
              <div className="p-5">
                <EmptyState icon="map" title={pick('No grievances yet', 'अहिलेसम्म गुनासो छैन')} />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-on-surface-variant">
                    <th className="px-5 py-2 font-semibold">{pick(...(UNIT_HEADING[stats.unitLevel || 'ward'] || ['Area', 'क्षेत्र']))}</th>
                    <th className="px-2 py-2 font-semibold">{pick('Total', 'जम्मा')}</th>
                    <th className="px-2 py-2 font-semibold text-right">{pick('Open', 'खुला')}</th>
                    <th className="px-5 py-2 font-semibold text-right">{pick('Overdue', 'नाघेको')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.units.slice(0, 10).map((u) => (
                    <tr key={u.id} className="border-t border-outline-variant/40">
                      <td className="px-5 py-2.5 text-on-surface font-medium">{unitDisplayName(stats.unitLevel, u.id, language)}</td>
                      <td className="px-2 py-2.5 w-2/5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-surface-container">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${(u.total / maxUnit) * 100}%` }} />
                          </div>
                          <span className="tabular-nums text-on-surface w-8 text-right">{n(u.total)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-on-surface">{n(u.open)}</td>
                      <td className={`px-5 py-2.5 text-right tabular-nums ${u.overdue ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>{n(u.overdue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
