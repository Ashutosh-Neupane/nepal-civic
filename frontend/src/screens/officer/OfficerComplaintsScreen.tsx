import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AreaFilter, type AreaSelection } from '@/components/officer/AreaFilter';
import { AssignOfficerModal } from '@/components/common/AssignOfficerModal';
import { BeforeAfterEvidence } from '@/components/common/BeforeAfterEvidence';
import { Button } from '@/components/common/Button';
import { ComplaintJourney } from '@/components/common/ComplaintJourney';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { GovernmentActionChain } from '@/components/common/GovernmentActionChain';
import { Icon } from '@/components/common/Icon';
import { LoadingState } from '@/components/common/LoadingState';
import { Modal } from '@/components/common/Modal';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { ResolutionEvidenceUploader } from '@/components/common/ResolutionEvidenceUploader';
import { SLACard } from '@/components/common/SLACard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  addComplaintComment,
  escalateComplaint,
  getComplaintById,
  getComplaintPage,
  subscribeToComplaints,
  updateComplaintStatus,
  type ComplaintFilterOptions,
} from '@/lib/complaintService';
import { CATEGORY_KEYS, CATEGORY_META, LEVEL_META, PRIORITY_META, STATUS_META } from '@/lib/constants';
import { formatDate, formatDateTime, formatRelative, localizeDigits } from '@/lib/dateUtils';
import { getDepartmentForCategory } from '@/lib/departmentService';
import { getNextLevel } from '@/lib/escalationService';
import { STATUSES_REQUIRING_NOTE, canActAtLevel, getStatusDisplayName, getValidNextStatuses } from '@/lib/statusService';
import type { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus } from '@/types';

const PAGE_SIZE = 25;
const STATUS_FILTERS: ComplaintStatus[] = ['pending', 'assigned', 'in_progress', 'blocked', 'escalated', 'reopened', 'resolved', 'closed', 'rejected'];
const PRIORITIES: ComplaintPriority[] = ['critical', 'high', 'medium', 'low'];
const SELECT_CLASS =
  'h-10 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30';

interface OfficerComplaintsScreenProps {
  /** Show only grievances escalated to this office. */
  escalationsOnly?: boolean;
}

export function OfficerComplaintsScreen({ escalationsOnly = false }: OfficerComplaintsScreenProps) {
  const { user } = useAuth();
  const { pick, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ComplaintStatus | 'open' | 'all'>(escalationsOnly ? 'all' : 'open');
  const [priority, setPriority] = useState<ComplaintPriority | 'all'>('all');
  const [category, setCategory] = useState<ComplaintCategory | 'all'>('all');
  const [area, setArea] = useState<AreaSelection>({});
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Complaint | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(0), [query, status, priority, category, area, overdueOnly]);

  const filters = useMemo<ComplaintFilterOptions>(() => ({
    search: query || undefined,
    status: status === 'open' ? ['pending', 'assigned', 'in_progress', 'blocked', 'escalated', 'reopened'] : status,
    priority,
    category,
    ...area,
    overdue: overdueOnly || undefined,
    isEscalated: escalationsOnly || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }), [query, status, priority, category, area, overdueOnly, escalationsOnly, page]);

  const load = useCallback(async () => {
    try {
      const result = await getComplaintPage(filters);
      setRows(result.complaints);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    load();
    return subscribeToComplaints(load);
  }, [load]);

  // Deep link: /complaints?ref=LG307-1042 opens that grievance.
  const ref = searchParams.get('ref');
  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    getComplaintById(ref).then((complaint) => {
      if (!cancelled && complaint) setSelected(complaint);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [ref]);

  const closeDetail = () => {
    setSelected(null);
    if (ref) {
      searchParams.delete('ref');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const onUpdated = (updated: Complaint) => {
    setSelected(updated);
    setRows((list) => list.map((row) => (row.id === updated.id ? updated : row)));
    load();
  };

  const n = (value: number) => localizeDigits(value, language);
  const title = escalationsOnly ? pick('Escalated grievances', 'माथि पठाइएका गुनासो') : pick('Grievances', 'गुनासोहरू');
  const subtitle = escalationsOnly
    ? pick('Grievances sent up to your office from the level below', 'तल्लो तहबाट तपाईंको कार्यालयमा पठाइएका गुनासो')
    : pick('Every grievance in your area', 'तपाईंको क्षेत्रका सबै गुनासो');
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout title={title} subtitle={subtitle}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[220px]">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={pick('Search by reference, title or description', 'सन्दर्भ नम्बर, शीर्षक वा विवरणले खोज्नुहोस्')}
              className="w-full h-10 rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <select className={SELECT_CLASS} value={status} aria-label={pick('Status', 'स्थिति')}
            onChange={(e) => setStatus(e.target.value as ComplaintStatus | 'open' | 'all')}>
            <option value="open">{pick('All open', 'सबै खुला')}</option>
            <option value="all">{pick('All statuses', 'सबै स्थिति')}</option>
            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{getStatusDisplayName(s, language)}</option>)}
          </select>
          <select className={SELECT_CLASS} value={priority} aria-label={pick('Priority', 'प्राथमिकता')}
            onChange={(e) => setPriority(e.target.value as ComplaintPriority | 'all')}>
            <option value="all">{pick('All priorities', 'सबै प्राथमिकता')}</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{pick(PRIORITY_META[p].label, PRIORITY_META[p].labelNe)}</option>)}
          </select>
          <select className={SELECT_CLASS} value={category} aria-label={pick('Category', 'वर्ग')}
            onChange={(e) => setCategory(e.target.value as ComplaintCategory | 'all')}>
            <option value="all">{pick('All categories', 'सबै वर्ग')}</option>
            {CATEGORY_KEYS.map((c) => <option key={c} value={c}>{pick(CATEGORY_META[c].label, CATEGORY_META[c].labelNe)}</option>)}
          </select>
          <AreaFilter value={area} onChange={setArea} />
          <label className="inline-flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="w-4 h-4 accent-primary" />
            {pick('Overdue only', 'समय नाघेका मात्र')}
          </label>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="p-5"><LoadingState type="table" /></div>
          ) : error ? (
            <ErrorState title={pick('Could not load grievances', 'गुनासो लोड हुन सकेन')} description={error} onRetry={load} />
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState icon="inbox" title={pick('No grievances match', 'मिल्ने गुनासो छैन')} description={pick('Try clearing some filters.', 'केही फिल्टर हटाएर हेर्नुहोस्।')} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low/60 text-left text-xs text-on-surface-variant">
                  <tr>
                    <th className="px-5 py-3 font-semibold">{pick('Reference', 'सन्दर्भ')}</th>
                    <th className="px-3 py-3 font-semibold">{pick('Grievance', 'गुनासो')}</th>
                    <th className="px-3 py-3 font-semibold">{pick('Area', 'क्षेत्र')}</th>
                    <th className="px-3 py-3 font-semibold">{pick('Priority', 'प्राथमिकता')}</th>
                    <th className="px-3 py-3 font-semibold">{pick('Status', 'स्थिति')}</th>
                    <th className="px-3 py-3 font-semibold">{pick('Held at', 'हाल रहेको तह')}</th>
                    <th className="px-5 py-3 font-semibold">{pick('Registered', 'दर्ता')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} onClick={() => setSelected(c)} className="border-t border-outline-variant/40 hover:bg-surface-container-low/40 cursor-pointer">
                      <td className="px-5 py-3 font-mono text-primary whitespace-nowrap">{c.referenceId}</td>
                      <td className="px-3 py-3 max-w-[320px]">
                        <div className="font-medium text-on-surface truncate">{c.title}</div>
                        <div className="text-xs text-on-surface-variant">{pick(CATEGORY_META[c.category]?.label || c.category, CATEGORY_META[c.category]?.labelNe)}</div>
                      </td>
                      <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">
                        {pick(c.jurisdictionName, c.jurisdictionNameNe)}
                        {c.wardNo ? ` · ${pick(`Ward ${c.wardNo}`, `वडा ${n(c.wardNo)}`)}` : ''}
                      </td>
                      <td className="px-3 py-3"><PriorityBadge priority={c.priority} /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={c.status} size="sm" />
                          {c.isOverdue && <Icon name="timer_off" size={16} className="text-error" />}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-on-surface-variant">{pick(LEVEL_META[c.currentLevel].label, LEVEL_META[c.currentLevel].labelNe)}</td>
                      <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{formatRelative(c.createdAt, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/60 text-sm text-on-surface-variant">
              <span>
                {pick(
                  `${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} of ${total}`,
                  `${n(total)} मध्ये ${n(page * PAGE_SIZE + 1)}–${n(Math.min(total, (page + 1) * PAGE_SIZE))}`
                )}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon="chevron_left" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  {pick('Previous', 'अघिल्लो')}
                </Button>
                <Button variant="ghost" size="sm" iconRight="chevron_right" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                  {pick('Next', 'अर्को')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && user && (
        <GrievanceDetailModal complaint={selected} onClose={closeDetail} onUpdated={onUpdated} />
      )}
    </DashboardLayout>
  );
}

interface GrievanceDetailModalProps {
  complaint: Complaint;
  onClose: () => void;
  onUpdated: (complaint: Complaint) => void;
}

function GrievanceDetailModal({ complaint, onClose, onUpdated }: GrievanceDetailModalProps) {
  const { user } = useAuth();
  const { pick, language } = useLanguage();
  const [assignOpen, setAssignOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<ComplaintStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [note, setNote] = useState('');
  const [notePublic, setNotePublic] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setNextStatus('');
    setStatusNote('');
    setEvidence([]);
  }, [complaint.id, complaint.status]);

  if (!user) return null;
  const canAct = canActAtLevel(user.role, complaint.currentLevel);
  const nextStatuses = canAct ? getValidNextStatuses(complaint.status, user.role) : [];
  const nextLevel = getNextLevel(complaint.currentLevel);
  const canEscalate = canAct && !!nextLevel && !['resolved', 'closed', 'rejected'].includes(complaint.status);
  const needsNote = nextStatus !== '' && STATUSES_REQUIRING_NOTE.includes(nextStatus);
  const department = getDepartmentForCategory(complaint.category);

  const run = async (key: string, action: () => Promise<Complaint>, success: string) => {
    setBusy(key);
    setMessage(null);
    try {
      onUpdated(await action());
      setMessage({ kind: 'ok', text: success });
      return true;
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const submitStatus = async () => {
    if (!nextStatus) return;
    const ok = await run(
      'status',
      () => updateComplaintStatus(complaint.id, nextStatus, statusNote, undefined, nextStatus === 'resolved' ? evidence : undefined),
      pick(`Status changed to ${getStatusDisplayName(nextStatus, 'en')}.`, `स्थिति "${getStatusDisplayName(nextStatus, 'ne')}" मा परिवर्तन भयो।`)
    );
    if (ok) setNextStatus('');
  };

  const submitEscalation = async () => {
    const ok = await run(
      'escalate',
      () => escalateComplaint(complaint.id, escalateReason.trim()),
      pick('Grievance escalated to the next level.', 'गुनासो माथिल्लो तहमा पठाइयो।')
    );
    if (ok) {
      setEscalateOpen(false);
      setEscalateReason('');
    }
  };

  const submitNote = async () => {
    const ok = await run(
      'note',
      () => addComplaintComment(complaint.id, note.trim(), notePublic),
      notePublic ? pick('Update shared with the citizen.', 'अद्यावधिक नागरिकलाई देखाइयो।') : pick('Internal note saved.', 'आन्तरिक टिप्पणी सुरक्षित भयो।')
    );
    if (ok) setNote('');
  };

  const field = (label: string, value?: string | null) => (
    <div>
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="text-sm text-on-surface font-medium break-words">{value || '—'}</dd>
    </div>
  );

  const textareaClass = 'w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        maxWidth="3xl"
        title={complaint.title}
        subtitle={<span className="font-mono">{complaint.referenceId}</span>}
        headerRight={<div className="flex gap-2"><PriorityBadge priority={complaint.priority} /><StatusBadge status={complaint.status} size="sm" /></div>}
      >
        <div className="flex flex-col gap-6">
          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm ${message.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-error-container text-on-error-container'}`}>
              {message.text}
            </div>
          )}

          <p className="text-sm text-on-surface whitespace-pre-wrap">{complaint.description}</p>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {field(pick('Category', 'वर्ग'), pick(CATEGORY_META[complaint.category]?.label || complaint.category, CATEGORY_META[complaint.category]?.labelNe))}
            {field(pick('Section', 'शाखा'), pick(department.name, department.nameNe))}
            {field(pick('Held at', 'हाल रहेको तह'), pick(LEVEL_META[complaint.currentLevel].label, LEVEL_META[complaint.currentLevel].labelNe))}
            {field(pick('Palika', 'पालिका'), pick(complaint.jurisdictionName, complaint.jurisdictionNameNe))}
            {field(pick('Ward', 'वडा'), complaint.wardNo ? localizeDigits(complaint.wardNo, language) : '')}
            {field(pick('District', 'जिल्ला'), complaint.districtName)}
            {field(pick('Address', 'ठेगाना'), complaint.location?.address)}
            {field(pick('Registered', 'दर्ता मिति'), formatDateTime(complaint.createdAt, language))}
            {field(pick('Assigned to', 'जिम्मेवार'), complaint.assignedToName || pick('Not yet assigned', 'अझै जिम्मा लगाइएको छैन'))}
            {field(pick('Citizen', 'नागरिक'), complaint.citizenName)}
            {field(pick('Phone', 'फोन'), complaint.citizenPhone)}
            {field(pick('Email', 'इमेल'), complaint.citizenEmail)}
          </dl>

          {!['resolved', 'closed', 'rejected'].includes(complaint.status) && (
            <SLACard createdAt={complaint.createdAt} priority={complaint.priority} escalationLevel={complaint.escalationLevel} slaDueAt={complaint.slaDueAt} compact />
          )}

          {canAct ? (
            <section className="rounded-2xl border border-outline-variant p-4 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-on-surface">{pick('Take action', 'कारबाही गर्नुहोस्')}</h3>
              <div className="flex flex-wrap gap-2">
                {!['resolved', 'closed', 'rejected'].includes(complaint.status) && (
                  <Button variant="secondary" size="sm" icon="person_add" onClick={() => setAssignOpen(true)}>
                    {complaint.assignedTo ? pick('Reassign', 'पुनः जिम्मा') : pick('Assign officer', 'अधिकृत तोक्नुहोस्')}
                  </Button>
                )}
                {canEscalate && nextLevel && (
                  <Button variant="secondary" size="sm" icon="trending_up" onClick={() => setEscalateOpen(true)}>
                    {pick(`Escalate to ${LEVEL_META[nextLevel].label}`, `${LEVEL_META[nextLevel].labelNe}मा पठाउनुहोस्`)}
                  </Button>
                )}
              </div>

              {nextStatuses.length > 0 && (
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-semibold text-on-surface-variant" htmlFor="next-status">{pick('Change status', 'स्थिति परिवर्तन')}</label>
                  <select id="next-status" className={SELECT_CLASS} value={nextStatus} onChange={(e) => setNextStatus(e.target.value as ComplaintStatus | '')}>
                    <option value="">{pick('Choose a new status', 'नयाँ स्थिति छान्नुहोस्')}</option>
                    {nextStatuses.map((s) => <option key={s} value={s}>{getStatusDisplayName(s, language)}</option>)}
                  </select>
                  {nextStatus && (
                    <>
                      <textarea
                        rows={3}
                        className={textareaClass}
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder={needsNote
                          ? pick('Explain what was done or why (required)', 'के गरियो वा किन, लेख्नुहोस् (अनिवार्य)')
                          : pick('Note for the citizen (optional)', 'नागरिकका लागि टिप्पणी (ऐच्छिक)')}
                      />
                      {nextStatus === 'resolved' && (
                        <ResolutionEvidenceUploader
                          complaintRef={complaint.referenceId}
                          uploadedUrls={evidence}
                          onUploaded={(key) => setEvidence((list) => [...list, key])}
                          onRemoveUrl={(key) => setEvidence((list) => list.filter((k) => k !== key))}
                        />
                      )}
                      <div>
                        <Button size="sm" icon="check" isLoading={busy === 'status'} disabled={needsNote && !statusNote.trim()} onClick={submitStatus}>
                          {pick('Save status', 'स्थिति सुरक्षित गर्नुहोस्')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-on-surface-variant" htmlFor="officer-note">{pick('Add an update', 'अद्यावधिक थप्नुहोस्')}</label>
                <textarea id="officer-note" rows={2} className={textareaClass} value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder={pick('Progress update or internal note', 'प्रगति विवरण वा आन्तरिक टिप्पणी')} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-on-surface">
                    <input type="checkbox" className="w-4 h-4 accent-primary" checked={notePublic} onChange={(e) => setNotePublic(e.target.checked)} />
                    {pick('Visible to the citizen', 'नागरिकले देख्ने')}
                  </label>
                  <Button size="sm" variant="secondary" icon="send" isLoading={busy === 'note'} disabled={!note.trim()} onClick={submitNote}>
                    {pick('Post', 'पठाउनुहोस्')}
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <div className="rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
              {pick(
                `This grievance is held at the ${LEVEL_META[complaint.currentLevel].label} level, so your office can view it but not act on it.`,
                `यो गुनासो ${LEVEL_META[complaint.currentLevel].labelNe} तहमा छ, त्यसैले तपाईंको कार्यालयले हेर्न मात्र सक्छ।`
              )}
            </div>
          )}

          <BeforeAfterEvidence beforePhotos={complaint.photoUrls} afterPhotos={complaint.resolutionPhotoUrls} />
          <ComplaintJourney complaint={complaint} compact />
          <GovernmentActionChain complaint={complaint} />

          <section>
            <h3 className="text-sm font-bold text-on-surface mb-3">{pick('Updates', 'अद्यावधिकहरू')}</h3>
            {complaint.updates.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{pick('No updates yet.', 'अहिलेसम्म अद्यावधिक छैन।')}</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {[...complaint.updates].reverse().map((u) => (
                  <li key={u.id} className="rounded-xl border border-outline-variant/60 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                      <span className="font-semibold text-on-surface">{u.updatedByName || pick('System', 'प्रणाली')}</span>
                      <span>·</span>
                      <span>{formatDateTime(u.timestamp, language)}</span>
                      {!u.isPublic && (
                        <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-semibold">{pick('Internal', 'आन्तरिक')}</span>
                      )}
                      <span className={`ml-auto ${STATUS_META[u.status]?.colorClass || ''}`}>{getStatusDisplayName(u.status, language)}</span>
                    </div>
                    {u.note && <p className="mt-1 text-sm text-on-surface whitespace-pre-wrap">{u.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <p className="text-xs text-on-surface-variant">
            {pick('Last updated', 'पछिल्लो अद्यावधिक')} {formatDate(complaint.updatedAt, language)}
          </p>
        </div>
      </Modal>

      <AssignOfficerModal
        isOpen={assignOpen}
        complaint={complaint}
        assigner={{ uid: user.uid, fullName: user.fullName, role: user.role }}
        onClose={() => setAssignOpen(false)}
        onSuccess={(updated, text) => {
          setAssignOpen(false);
          onUpdated(updated);
          setMessage({ kind: 'ok', text });
        }}
      />

      <Modal
        isOpen={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        maxWidth="lg"
        title={pick('Escalate grievance', 'गुनासो माथि पठाउनुहोस्')}
        subtitle={nextLevel ? pick(`It will move to the ${LEVEL_META[nextLevel].label} level.`, `यो ${LEVEL_META[nextLevel].labelNe} तहमा जानेछ।`) : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEscalateOpen(false)}>{pick('Cancel', 'रद्द')}</Button>
            <Button icon="trending_up" isLoading={busy === 'escalate'} disabled={!escalateReason.trim()} onClick={submitEscalation}>
              {pick('Escalate', 'माथि पठाउनुहोस्')}
            </Button>
          </div>
        }
      >
        <textarea rows={4} className={textareaClass} value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)}
          placeholder={pick('Why does this need the next level? (required)', 'माथिल्लो तह किन चाहियो? (अनिवार्य)')} />
      </Modal>
    </>
  );
}
