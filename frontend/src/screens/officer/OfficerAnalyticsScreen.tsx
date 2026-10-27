import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AreaFilter, type AreaSelection } from '@/components/officer/AreaFilter';
import { KPICard } from '@/components/common/KPICard';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { getGrievanceStats, type GrievanceStats } from '@/lib/analyticsService';
import { CATEGORY_META, LEVEL_META, LEVEL_ORDER } from '@/lib/constants';
import { formatShortDate, localizeDigits } from '@/lib/dateUtils';
import { unitDisplayName } from '@/lib/jurisdictionService';

type Range = '30' | '90' | '365' | 'all';
const RANGES: { key: Range; en: string; ne: string }[] = [
  { key: '30', en: 'Last 30 days', ne: 'पछिल्लो ३० दिन' },
  { key: '90', en: 'Last 90 days', ne: 'पछिल्लो ९० दिन' },
  { key: '365', en: 'Last year', ne: 'पछिल्लो एक वर्ष' },
  { key: 'all', en: 'All time', ne: 'सबै समय' },
];
const NAVY = '#002045';

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card p-5 flex flex-col">
      <h2 className="text-base font-bold text-on-surface">{title}</h2>
      {subtitle && <p className="text-xs text-on-surface-variant mb-4">{subtitle}</p>}
      {children}
    </section>
  );
}

/** Horizontal bar rows: one hue, values as text so the bars never carry meaning alone. */
function BarRows({ rows }: { rows: { key: string; label: string; value: number }[] }) {
  const { language } = useLanguage();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-sm" title={`${r.label}: ${r.value}`}>
          <span className="truncate text-on-surface">{r.label}</span>
          <div className="h-2.5 rounded-full bg-surface-container">
            <div className="h-2.5 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: NAVY, minWidth: r.value ? 4 : 0 }} />
          </div>
          <span className="text-right tabular-nums text-on-surface">{localizeDigits(r.value, language)}</span>
        </li>
      ))}
    </ul>
  );
}

export function OfficerAnalyticsScreen() {
  const { pick, language } = useLanguage();
  const [area, setArea] = useState<AreaSelection>({});
  const [range, setRange] = useState<Range>('90');
  const [stats, setStats] = useState<GrievanceStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const filter = useMemo(() => {
    const dateFrom = range === 'all' ? undefined : new Date(Date.now() - Number(range) * 86400000).toISOString();
    return { ...area, dateFrom };
  }, [area, range]);

  useEffect(() => {
    let cancelled = false;
    getGrievanceStats(filter)
      .then((data) => { if (!cancelled) { setStats(data); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)); });
    return () => { cancelled = true; };
  }, [filter, reload]);

  const n = (value: number) => localizeDigits(value, language);
  const trend = useMemo(
    () => (stats?.dailyTrend || []).map((d) => ({ ...d, label: formatShortDate(d.date, language) })),
    [stats, language]
  );

  const controls = (
    <div className="flex flex-wrap items-center gap-3">
      <AreaFilter value={area} onChange={setArea} />
      <div className="inline-flex rounded-xl border border-outline-variant overflow-hidden" role="group" aria-label={pick('Date range', 'समय अवधि')}>
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            aria-pressed={range === r.key}
            className={`h-10 px-3 text-sm font-medium ${range === r.key ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'}`}
          >
            {pick(r.en, r.ne)}
          </button>
        ))}
      </div>
    </div>
  );

  const title = pick('Performance analytics', 'कार्यसम्पादन विश्लेषण');
  if (error && !stats) {
    return (
      <DashboardLayout title={title}>
        {controls}
        <ErrorState title={pick('Could not load analytics', 'विश्लेषण लोड हुन सकेन')} description={error} onRetry={() => setReload((x) => x + 1)} />
      </DashboardLayout>
    );
  }
  if (!stats) {
    return (
      <DashboardLayout title={title}>
        <LoadingState type="dashboard" />
      </DashboardLayout>
    );
  }

  const s = stats.summary;
  const resolved = s.resolved + s.closed;
  const resolutionRate = s.total ? Math.round((resolved / s.total) * 100) : null;
  const categories = stats.categories
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((c) => ({ key: c.category, label: pick(CATEGORY_META[c.category].label, CATEGORY_META[c.category].labelNe), value: c.count }));
  const levelCounts = new Map(stats.levels.map((l) => [l.level, l.count]));
  const levels = LEVEL_ORDER.map((level) => ({
    key: level,
    label: pick(LEVEL_META[level].label, LEVEL_META[level].labelNe),
    value: levelCounts.get(level) || 0,
  }));
  const maxUnit = Math.max(1, ...stats.units.map((u) => u.total));

  return (
    <DashboardLayout title={title} subtitle={pick('How grievances are being handled in your area', 'तपाईंको क्षेत्रमा गुनासो कसरी सम्बोधन भइरहेका छन्')}>
      <div className="flex flex-col gap-6">
        {controls}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard label={pick('Grievances', 'गुनासो')} value={n(s.total)} icon="inbox" />
          <KPICard label={pick('Resolution rate', 'समाधान दर')} value={resolutionRate == null ? '—' : `${n(resolutionRate)}%`} icon="task_alt" variant="success" />
          <KPICard
            label={pick('Resolved on time', 'समयमै समाधान')}
            value={stats.slaComplianceRate == null ? '—' : `${n(Math.round(stats.slaComplianceRate))}%`}
            icon="verified"
          />
          <KPICard
            label={pick('Average time to resolve', 'औसत समाधान समय')}
            value={stats.avgResolutionHours == null ? '—' : pick(`${Math.round(stats.avgResolutionHours)} h`, `${n(Math.round(stats.avgResolutionHours))} घण्टा`)}
            icon="schedule"
          />
          <KPICard label={pick('Reopened', 'पुनः खोलिएको')} value={n(s.reopened)} icon="restart_alt" variant={s.reopened ? 'warning' : 'default'} />
        </div>

        <Panel
          title={pick('New grievances per day', 'दैनिक नयाँ गुनासो')}
          subtitle={pick('Last 14 days, Nepal time', 'पछिल्लो १४ दिन, नेपाली समय')}
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => [localizeDigits(Number(value ?? 0), language), pick('Grievances', 'गुनासो')]}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Line type="linear" dataKey="count" stroke={NAVY} strokeWidth={2} dot={{ r: 3, fill: NAVY }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title={pick('By category', 'वर्ग अनुसार')} subtitle={pick('Grievances in the selected period', 'छानिएको अवधिका गुनासो')}>
            {categories.length ? <BarRows rows={categories} /> : <p className="text-sm text-on-surface-variant">{pick('No grievances in this period.', 'यो अवधिमा गुनासो छैन।')}</p>}
          </Panel>
          <Panel title={pick('Where grievances are held', 'गुनासो रहेको तह')} subtitle={pick('Current level of government for each grievance', 'प्रत्येक गुनासो हाल रहेको सरकारको तह')}>
            <BarRows rows={levels} />
          </Panel>
        </div>

        {stats.units.length > 0 && (
          <Panel title={pick('Comparison by area', 'क्षेत्रगत तुलना')} subtitle={pick('Sorted by number of grievances', 'गुनासो संख्याका आधारमा क्रमबद्ध')}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-on-surface-variant">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">{pick('Area', 'क्षेत्र')}</th>
                    <th className="py-2 px-3 font-semibold">{pick('Total', 'जम्मा')}</th>
                    <th className="py-2 px-3 font-semibold text-right">{pick('Open', 'खुला')}</th>
                    <th className="py-2 px-3 font-semibold text-right">{pick('Resolved', 'समाधान')}</th>
                    <th className="py-2 px-3 font-semibold text-right">{pick('Resolution rate', 'समाधान दर')}</th>
                    <th className="py-2 pl-3 font-semibold text-right">{pick('Overdue', 'समय नाघेको')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.units.map((u) => (
                    <tr key={u.id} className="border-t border-outline-variant/40">
                      <td className="py-2.5 pr-3 font-medium text-on-surface whitespace-nowrap">{unitDisplayName(stats.unitLevel, u.id, language)}</td>
                      <td className="py-2.5 px-3 w-1/3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-surface-container">
                            <div className="h-2 rounded-full" style={{ width: `${(u.total / maxUnit) * 100}%`, background: NAVY }} />
                          </div>
                          <span className="tabular-nums w-10 text-right">{n(u.total)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{n(u.open)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{n(u.resolved)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{u.total ? `${n(Math.round((u.resolved / u.total) * 100))}%` : '—'}</td>
                      <td className={`py-2.5 pl-3 text-right tabular-nums ${u.overdue ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>{n(u.overdue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
}
