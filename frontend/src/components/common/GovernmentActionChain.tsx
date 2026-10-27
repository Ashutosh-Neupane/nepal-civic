import { useMemo } from 'react';
import { Icon } from './Icon';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDateTime } from '@/lib/dateUtils';
import { LEVEL_META, LEVEL_ORDER } from '@/lib/constants';
import type { Complaint, GovernmentLevel } from '@/types';

interface GovernmentActionChainProps {
  complaint: Complaint;
}

interface ActionChainNode {
  id: string;
  level: 'citizen' | GovernmentLevel | 'resolution';
  title: string;
  designation: string;
  actorName: string;
  jurisdiction: string;
  actionText: string;
  timestamp?: string;
  status: 'completed' | 'in_progress' | 'pending';
  icon: string;
}

const LEVEL_ICONS: Record<GovernmentLevel, string> = {
  ward: 'home_work',
  palika: 'location_city',
  district: 'domain',
  province: 'account_balance',
};


export function GovernmentActionChain({ complaint }: GovernmentActionChainProps) {
  const { t, pick, language } = useLanguage();

  const chainNodes = useMemo<ActionChainNode[]>(() => {
    const nodes: ActionChainNode[] = [];
    const updates = complaint.updates || [];
    const isFinished = complaint.status === 'resolved' || complaint.status === 'closed' || complaint.status === 'rejected';
    const currentIndex = LEVEL_ORDER.indexOf(complaint.currentLevel);
    const palika = pick(complaint.jurisdictionName, complaint.jurisdictionNameNe);

    nodes.push({
      id: 'citizen-node',
      level: 'citizen',
      title: 'Grievance Registered',
      designation: 'Citizen',
      actorName: complaint.citizenName || 'Citizen',
      jurisdiction: `${complaint.wardLabel}, ${palika}`,
      actionText: complaint.title,
      timestamp: complaint.createdAt,
      status: 'completed',
      icon: 'person',
    });

    // Every level the grievance has reached, from the ward office up to where it is now.
    LEVEL_ORDER.slice(0, currentIndex + 1).forEach((level, index) => {
      const levelUpdates = updates.filter((u) => u.level === level);
      const latest = levelUpdates[levelUpdates.length - 1];
      const isCurrent = index === currentIndex;
      const meta = LEVEL_META[level];
      const jurisdiction =
        level === 'ward' ? `${complaint.wardLabel}, ${palika}`
        : level === 'palika' ? palika
        : level === 'district' ? `${complaint.districtName} District`
        : complaint.provinceName;
      nodes.push({
        id: `${level}-node`,
        level,
        title: pick(meta.label, meta.labelNe),
        designation: pick(meta.officer, meta.officerNe),
        actorName: (isCurrent && complaint.assignedToName) || latest?.updatedByName || pick(meta.label, meta.labelNe),
        jurisdiction,
        actionText: latest?.note || (isCurrent ? 'Waiting for the office to act' : 'Escalated to the next level'),
        timestamp: latest?.timestamp,
        status: !isCurrent || isFinished ? 'completed' : 'in_progress',
        icon: LEVEL_ICONS[level],
      });
    });

    if (complaint.status === 'resolved' || complaint.status === 'closed') {
      nodes.push({
        id: 'resolution-node',
        level: 'resolution',
        title: complaint.status === 'closed' ? 'Closed' : 'Resolved — waiting for the citizen',
        designation: complaint.status === 'closed' ? 'Confirmed' : 'Office reports the work is done',
        actorName: complaint.assignedToName || pick(LEVEL_META[complaint.currentLevel].label, LEVEL_META[complaint.currentLevel].labelNe),
        jurisdiction: palika,
        actionText: complaint.citizenConfirmedAt
          ? `Citizen confirmed on ${formatDateTime(complaint.citizenConfirmedAt, language)}.`
          : complaint.status === 'closed'
            ? 'Closed automatically after 7 days without a reply from the citizen.'
            : 'The citizen can confirm the fix or reopen the grievance.',
        timestamp: complaint.closedAt || complaint.resolvedAt,
        status: complaint.status === 'closed' ? 'completed' : 'in_progress',
        icon: complaint.status === 'closed' ? 'verified' : 'task_alt',
      });
    }

    return nodes;
  }, [complaint, pick]);

  return (
    <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
            <Icon name="account_tree" size={20} />
          </div>
          <div>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">
              {t('governmentActionChain') || 'Government Action Chain'}
            </h3>
            <p className="text-[11px] text-on-surface-variant">
              {t('participatingAuthorities') || 'Official administrative hierarchy actively engaged on this case'}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono">
          {chainNodes.length} step{chainNodes.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Action Chain Flow */}
      <div className="flex flex-col gap-3">
        {chainNodes.map((node, index) => {
          const isLast = index === chainNodes.length - 1;
          const staggerClass = `stagger-${index + 1}`;

          const levelColorMap = {
            citizen: 'bg-amber-100 text-amber-900 border-amber-300',
            ward: 'bg-sky-100 text-sky-900 border-sky-300',
            palika: 'bg-blue-100 text-blue-900 border-blue-300',
            district: 'bg-purple-100 text-purple-900 border-purple-300',
            province: 'bg-rose-100 text-rose-900 border-rose-300',
            resolution: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          };

          const iconBgMap = {
            citizen: 'bg-amber-600 text-white',
            ward: 'bg-sky-600 text-white',
            palika: 'bg-blue-600 text-white',
            district: 'bg-purple-600 text-white',
            province: 'bg-rose-600 text-white',
            resolution: 'bg-emerald-600 text-white',
          };

          return (
            <div key={node.id} className="relative flex flex-col animate-slide-up">
              <div
                className={`
                  p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
                  ${node.status === 'in_progress' ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30' : 'bg-surface border-outline-variant hover:border-outline'}
                  ${staggerClass}
                `}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${iconBgMap[node.level]}`}>
                    <Icon name={node.icon} size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${levelColorMap[node.level]}`}>
                        {node.level.toUpperCase()}
                      </span>
                      <h4 className="text-sm font-bold text-on-surface">
                        {node.title}
                      </h4>
                      {node.status === 'in_progress' && (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse-subtle" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-on-surface font-semibold truncate">
                      {node.actorName} <span className="text-on-surface-variant font-normal">({node.designation})</span>
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                      {node.actionText}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end shrink-0 text-left sm:text-right border-t sm:border-t-0 border-outline-variant/40 pt-2 sm:pt-0 w-full sm:w-auto">
                  <span className="text-xs font-mono text-on-surface-variant font-medium">
                    {node.jurisdiction}
                  </span>
                  {node.timestamp && (
                    <span className="text-xs font-mono font-semibold text-on-surface mt-0.5">
                      {formatDateTime(node.timestamp, language)}
                    </span>
                  )}
                </div>
              </div>

              {!isLast && (
                <div className="flex items-center justify-center py-1">
                  <Icon name="arrow_downward" size={16} className="text-outline-variant" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
