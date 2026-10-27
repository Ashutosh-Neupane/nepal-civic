import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/common/Modal';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/common/Button';
import { addComplaintComment, assignComplaint } from '@/lib/complaintService';
import { getEligibleAssignmentPersonnel, getDepartmentForCategory, type DepartmentalPersonnel } from '@/lib/departmentService';
import { ROLE_META } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Complaint, OfficerRole, Role } from '@/types';

interface AssignOfficerModalProps {
  isOpen: boolean;
  complaint: Complaint | null;
  assigner: { uid: string; fullName: string; role: Role };
  onClose: () => void;
  onSuccess: (updated: Complaint, message: string) => void;
}

const ROLE_GROUP_ORDER: OfficerRole[] = ['ward_officer', 'palika_officer', 'district_officer', 'province_officer', 'super_admin'];

export function AssignOfficerModal({
  isOpen,
  complaint,
  assigner: _assigner,
  onClose,
  onSuccess,
}: AssignOfficerModalProps) {
  const { pick, t } = useLanguage();
  const [personnelList, setPersonnelList] = useState<DepartmentalPersonnel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>('');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEligiblePersonnel = useCallback(async () => {
    if (!complaint) return;
    setLoading(true);
    try {
      const eligible = await getEligibleAssignmentPersonnel(complaint.id);
      setPersonnelList(eligible);
      const current = eligible.find((p) => p.id === complaint.assignedTo);
      setSelectedPersonnelId(current ? current.id : eligible[0]?.id || '');
    } catch (err) {
      setError((err as Error).message || 'Could not load officers for this grievance.');
    } finally {
      setLoading(false);
    }
  }, [complaint]);

  useEffect(() => {
    if (isOpen && complaint) {
      setError(null);
      setInstructions('');
      setSelectedPersonnelId('');
      loadEligiblePersonnel();
    }
  }, [isOpen, complaint, loadEligiblePersonnel]);

  if (!isOpen || !complaint) return null;

  const department = getDepartmentForCategory(complaint.category);
  const selectedPersonnel = personnelList.find((p) => p.id === selectedPersonnelId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnel) {
      setError('Choose an officer.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let updated = await assignComplaint(complaint.id, selectedPersonnel.id);
      if (instructions.trim()) {
        // Instructions are an internal note: visible to officers, not the citizen.
        updated = await addComplaintComment(complaint.id, instructions.trim(), false);
      }
      onSuccess(
        updated,
        `Grievance ${complaint.referenceId} assigned to ${selectedPersonnel.fullName}${selectedPersonnel.designation ? ` (${selectedPersonnel.designation})` : ''}.`
      );
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Could not assign the officer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const groups = ROLE_GROUP_ORDER
    .map((role) => ({ role, people: personnelList.filter((p) => p.role === role) }))
    .filter((group) => group.people.length > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title="Assign an Officer"
      subtitle={
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-primary">{complaint.referenceId}</span>
          <span className="px-2.5 py-0.5 rounded-md bg-primary-container/20 text-primary font-bold text-xs uppercase tracking-wider">
            {complaint.wardLabel}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="p-4 rounded-2xl bg-surface-container/60 border border-outline-variant/40 text-xs flex flex-col gap-2.5">
          <h4 className="font-bold text-on-surface text-base line-clamp-1">{complaint.title}</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant pt-1.5 border-t border-outline-variant/40">
            <div>
              <span className="text-on-surface-variant/70 text-xs">Responsible section</span>
              <p className="font-bold text-primary line-clamp-1 text-xs sm:text-sm">{pick(department.name, department.nameNe)}</p>
            </div>
            <div>
              <span className="text-on-surface-variant/70 text-xs">Location</span>
              <p className="font-semibold text-on-surface text-xs sm:text-sm">
                {complaint.wardLabel}, {pick(complaint.jurisdictionName, complaint.jurisdictionNameNe)}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-on-surface-variant/70 text-xs">Currently assigned</span>
              <p className="font-semibold text-amber-600 text-xs sm:text-sm">
                {complaint.assignedToName || 'Nobody yet'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-sm font-semibold flex items-center gap-2">
              <Icon name="error" size={18} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="assign-officer" className="block text-xs font-bold text-on-surface mb-1.5">
              Officer *
            </label>
            {loading ? (
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low flex items-center justify-center gap-2 text-sm text-on-surface-variant">
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>{t('loading')}</span>
              </div>
            ) : personnelList.length === 0 ? (
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Icon name="warning" size={18} />
                  <span>No officers for this ward yet</span>
                </div>
                <p className="text-xs text-amber-800">
                  Ask your Palika administrator to create an officer account for {complaint.wardLabel}, or escalate the grievance.
                </p>
              </div>
            ) : (
              <select
                id="assign-officer"
                value={selectedPersonnelId}
                onChange={(e) => setSelectedPersonnelId(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-outline-variant bg-surface text-sm font-semibold text-on-surface focus:outline-none focus:border-primary shadow-sm cursor-pointer"
              >
                {groups.map((group) => (
                  <optgroup key={group.role} label={pick(ROLE_META[group.role].label, ROLE_META[group.role].labelNe)}>
                    {group.people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}{p.designation ? ` — ${p.designation}` : ''}{p.wardNo ? ` (Ward ${p.wardNo})` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="assign-instructions" className="block text-xs font-bold text-on-surface mb-1.5">
              Instructions for the officer (optional, not shown to the citizen)
            </label>
            <textarea
              id="assign-instructions"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Inspect the site today and report back with photos."
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface font-medium focus:outline-none focus:border-primary placeholder:text-on-surface-variant/60 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
            <Button type="button" variant="outline" size="md" onClick={onClose} disabled={submitting}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting || personnelList.length === 0 || !selectedPersonnelId}
              icon={submitting ? undefined : 'assignment_ind'}
            >
              {submitting ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
