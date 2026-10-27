import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { useOfficerLevel } from '@/components/officer/AreaFilter';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Icon } from '@/components/common/Icon';
import { JurisdictionPicker } from '@/components/common/JurisdictionPicker';
import { LoadingState } from '@/components/common/LoadingState';
import { Modal } from '@/components/common/Modal';
import { ROLE_META } from '@/lib/constants';
import { describeTerritory } from '@/lib/jurisdictionService';
import { createOfficer, getOfficers, resetOfficerPassword, updateOfficer } from '@/lib/userService';
import type { AppUser } from '@/types/auth';
import type { GovernmentLevel, OfficerRole, Territory } from '@/types';

/** Roles each level may create: strictly below its own, as the backend enforces. */
const CREATABLE: Record<GovernmentLevel | 'national', OfficerRole[]> = {
  national: ['province_officer', 'district_officer', 'palika_officer', 'ward_officer'],
  province: ['district_officer', 'palika_officer', 'ward_officer'],
  district: ['palika_officer', 'ward_officer'],
  palika: ['ward_officer'],
  ward: [],
};
const ROLE_DEPTH: Record<OfficerRole, GovernmentLevel | null> = {
  province_officer: 'province',
  district_officer: 'district',
  palika_officer: 'palika',
  ward_officer: 'ward',
  super_admin: null,
};
const INPUT_CLASS =
  'w-full h-10 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30';

interface Draft {
  role: OfficerRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  territory: Territory;
}

/** A one-time password shown after creating an officer or resetting a password. */
interface Credential {
  name: string;
  email: string;
  password: string;
}

export function OfficerUsersScreen() {
  const { user } = useAuth();
  const { pick, language } = useLanguage();
  const level = useOfficerLevel();
  const creatable = CREATABLE[level];

  const [officers, setOfficers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<OfficerRole | 'all'>('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOfficers(await getOfficers());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (officers || []).filter((o) => {
      if (o.uid === user?.uid) return false;
      if (roleFilter !== 'all' && o.role !== roleFilter) return false;
      if (!q) return true;
      return [o.fullName, o.email, o.phoneNumber, o.designation].some((v) => v?.toLowerCase().includes(q));
    });
  }, [officers, roleFilter, search, user?.uid]);

  // The officer's own levels stay fixed in the area picker.
  const ownTerritory: Territory = user?.territory || {};
  const locked: Partial<Record<GovernmentLevel, boolean>> = {
    province: level !== 'national',
    district: level === 'district' || level === 'palika' || level === 'ward',
    palika: level === 'palika' || level === 'ward',
  };

  const openCreate = () => {
    setFormError(null);
    setDraft({
      role: creatable[0],
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      designation: '',
      territory: {
        provinceId: locked.province ? ownTerritory.provinceId : undefined,
        districtId: locked.district ? ownTerritory.districtId : undefined,
        jurisdictionId: locked.palika ? ownTerritory.jurisdictionId : undefined,
      },
    });
  };

  const areaComplete = (d: Draft) => {
    const depth = ROLE_DEPTH[d.role];
    if (depth === 'province') return !!d.territory.provinceId;
    if (depth === 'district') return !!d.territory.districtId;
    if (depth === 'palika') return !!d.territory.jurisdictionId;
    if (depth === 'ward') return !!d.territory.jurisdictionId && !!d.territory.wardNo;
    return true;
  };

  const submit = async () => {
    if (!draft) return;
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.email.trim()) {
      setFormError(pick('Name and email are required.', 'नाम र इमेल अनिवार्य छन्।'));
      return;
    }
    if (!areaComplete(draft)) {
      setFormError(pick('Choose the officer’s area of responsibility.', 'अधिकृतको जिम्मेवारी क्षेत्र छान्नुहोस्।'));
      return;
    }
    const depth = ROLE_DEPTH[draft.role];
    const t = draft.territory;
    setSaving(true);
    setFormError(null);
    try {
      const { officer, temporaryPassword } = await createOfficer({
        role: draft.role,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim() || undefined,
        designation: draft.designation.trim() || undefined,
        provinceId: depth === 'province' ? t.provinceId : undefined,
        districtId: depth === 'district' ? t.districtId : undefined,
        jurisdictionId: depth === 'palika' || depth === 'ward' ? t.jurisdictionId : undefined,
        wardNo: depth === 'ward' ? t.wardNo : undefined,
      });
      setDraft(null);
      setCopied(false);
      setCredential({ name: officer.fullName, email: officer.email, password: temporaryPassword });
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (officer: AppUser) => {
    setBusyId(officer.uid);
    try {
      await updateOfficer(officer.uid, { isActive: officer.status !== 'active' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (officer: AppUser) => {
    setBusyId(officer.uid);
    try {
      const password = await resetOfficerPassword(officer.uid);
      setCopied(false);
      setCredential({ name: officer.fullName, email: officer.email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const copyPassword = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential.password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const roleLabel = (role: OfficerRole) => pick(ROLE_META[role].label, ROLE_META[role].labelNe);

  return (
    <DashboardLayout
      title={pick('Officers', 'अधिकृतहरू')}
      subtitle={pick('Accounts for officers in your area', 'तपाईंको क्षेत्रका अधिकृतका खाता')}
      headerActions={creatable.length > 0 && (
        <Button icon="person_add" onClick={openCreate}>{pick('Add officer', 'अधिकृत थप्नुहोस्')}</Button>
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[220px]">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className={`${INPUT_CLASS} pl-10`}
              placeholder={pick('Search by name, email, phone or designation', 'नाम, इमेल, फोन वा पदले खोज्नुहोस्')} />
          </label>
          <select className={`${INPUT_CLASS} w-auto`} value={roleFilter} aria-label={pick('Role', 'भूमिका')}
            onChange={(e) => setRoleFilter(e.target.value as OfficerRole | 'all')}>
            <option value="all">{pick('All roles', 'सबै भूमिका')}</option>
            {creatable.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
          </select>
        </div>

        {error && officers && (
          <div className="rounded-xl bg-error-container text-on-error-container px-4 py-3 text-sm">{error}</div>
        )}

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card overflow-hidden">
          {!officers && error ? (
            <ErrorState title={pick('Could not load officers', 'अधिकृत लोड हुन सकेन')} description={error} onRetry={load} />
          ) : !officers ? (
            <div className="p-5"><LoadingState type="table" /></div>
          ) : visible.length === 0 ? (
            <div className="p-5">
              <EmptyState icon="group" title={pick('No officers yet', 'अहिलेसम्म अधिकृत छैन')}
                description={pick('Add officers so grievances can be assigned to them.', 'गुनासो जिम्मा दिन अधिकृत थप्नुहोस्।')} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low/60 text-left text-xs text-on-surface-variant">
                  <tr>
                    <th className="px-5 py-3 font-semibold">{pick('Officer', 'अधिकृत')}</th>
                    <th className="px-3 py-3 font-semibold">{pick('Role', 'भूमिका')}</th>
                    <th className="px-3 py-3 font-semibold">{pick('Area', 'क्षेत्र')}</th>
                    <th className="px-3 py-3 font-semibold">{pick('Status', 'स्थिति')}</th>
                    <th className="px-5 py-3 font-semibold text-right">{pick('Actions', 'कार्य')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o) => {
                    const active = o.status === 'active';
                    return (
                      <tr key={o.uid} className="border-t border-outline-variant/40">
                        <td className="px-5 py-3">
                          <div className="font-medium text-on-surface">{o.fullName}</div>
                          <div className="text-xs text-on-surface-variant">{[o.designation, o.email, o.phoneNumber].filter(Boolean).join(' · ')}</div>
                        </td>
                        <td className="px-3 py-3 text-on-surface whitespace-nowrap">{roleLabel(o.role as OfficerRole)}</td>
                        <td className="px-3 py-3 text-on-surface-variant">{describeTerritory(o.territory, language) || pick('All of Nepal', 'सम्पूर्ण नेपाल')}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-800' : 'bg-surface-container text-on-surface-variant'}`}>
                            {active ? pick('Active', 'सक्रिय') : pick('Deactivated', 'निष्क्रिय')}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" icon="key" disabled={busyId === o.uid || !active} onClick={() => resetPassword(o)}>
                              {pick('Reset password', 'पासवर्ड रिसेट')}
                            </Button>
                            <Button size="sm" variant={active ? 'ghost' : 'secondary'} icon={active ? 'block' : 'check_circle'}
                              isLoading={busyId === o.uid} onClick={() => toggleActive(o)}>
                              {active ? pick('Deactivate', 'निष्क्रिय गर्नुहोस्') : pick('Activate', 'सक्रिय गर्नुहोस्')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!draft}
        onClose={() => setDraft(null)}
        maxWidth="2xl"
        title={pick('Add officer', 'अधिकृत थप्नुहोस्')}
        subtitle={pick('A temporary password is created; the officer changes it after signing in.', 'अस्थायी पासवर्ड बन्छ; अधिकृतले लगइनपछि परिवर्तन गर्नुहुन्छ।')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>{pick('Cancel', 'रद्द')}</Button>
            <Button icon="person_add" isLoading={saving} onClick={submit}>{pick('Create account', 'खाता बनाउनुहोस्')}</Button>
          </div>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            {formError && <div className="rounded-xl bg-error-container text-on-error-container px-4 py-3 text-sm">{formError}</div>}
            <label className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant">
              {pick('Role', 'भूमिका')}
              <select className={INPUT_CLASS} value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as OfficerRole, territory: { ...draft.territory, wardNo: undefined } })}>
                {creatable.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant">
                {pick('First name', 'पहिलो नाम')}
                <input className={INPUT_CLASS} value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant">
                {pick('Last name', 'थर')}
                <input className={INPUT_CLASS} value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant">
                {pick('Email', 'इमेल')}
                <input type="email" className={INPUT_CLASS} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant">
                {pick('Mobile (optional)', 'मोबाइल (ऐच्छिक)')}
                <input inputMode="tel" className={INPUT_CLASS} placeholder="98XXXXXXXX" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant">
              {pick('Designation', 'पद')}
              <input className={INPUT_CLASS} placeholder={pick('e.g. Ward Secretary', 'जस्तै: वडा सचिव')} value={draft.designation}
                onChange={(e) => setDraft({ ...draft, designation: e.target.value })} />
            </label>
            {ROLE_DEPTH[draft.role] && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-on-surface-variant">{pick('Area of responsibility', 'जिम्मेवारी क्षेत्र')}</span>
                <JurisdictionPicker
                  value={draft.territory}
                  onChange={(territory) => setDraft({ ...draft, territory })}
                  depth={ROLE_DEPTH[draft.role] || 'province'}
                  locked={locked}
                  required
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!credential}
        onClose={() => setCredential(null)}
        maxWidth="md"
        title={pick('Temporary password', 'अस्थायी पासवर्ड')}
        subtitle={credential ? `${credential.name} · ${credential.email}` : undefined}
        footer={<div className="flex justify-end"><Button onClick={() => setCredential(null)}>{pick('Done', 'भयो')}</Button></div>}
      >
        {credential && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-xl bg-surface-container px-4 py-3 font-mono text-base text-on-surface select-all">{credential.password}</code>
              <Button variant="secondary" icon={copied ? 'check' : 'content_copy'} onClick={copyPassword}>
                {copied ? pick('Copied', 'कपी भयो') : pick('Copy', 'कपी')}
              </Button>
            </div>
            <p className="text-sm text-on-surface-variant">
              {pick(
                'This password is shown only once. Share it with the officer privately; they should change it after signing in.',
                'यो पासवर्ड एक पटक मात्र देखिन्छ। अधिकृतलाई गोप्य रूपमा दिनुहोस्; लगइनपछि परिवर्तन गर्न भन्नुहोस्।'
              )}
            </p>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
