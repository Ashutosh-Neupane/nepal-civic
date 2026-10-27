import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SUPPORTED_LANGUAGES, useLanguage, type SupportedLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/common/Button';
import { ROLE_META } from '@/lib/constants';
import { territoryNames } from '@/lib/jurisdictionService';
import { changePassword } from '@/lib/userService';
import { formatNepaliPhone } from '@/lib/phone';
import type { OfficerRole } from '@/types';

/** What each officer level may do, mirroring the backend's scope rules. */
const PRIVILEGES: Record<OfficerRole, { en: string; ne: string }[]> = {
  ward_officer: [
    { en: 'Receive and inspect grievances filed in your ward', ne: 'आफ्नो वडामा दर्ता भएका गुनासो हेर्ने र निरीक्षण गर्ने' },
    { en: 'Update progress and mark grievances resolved', ne: 'प्रगति अद्यावधिक गर्ने र समाधान भएको जनाउने' },
    { en: 'Escalate to the Palika when the ward cannot resolve it', ne: 'वडाबाट समाधान नभए पालिकामा पठाउने' },
  ],
  palika_officer: [
    { en: 'Oversee grievances in every ward of the Palika', ne: 'पालिकाका सबै वडाका गुनासोको अनुगमन' },
    { en: 'Assign grievances to ward officers and sections', ne: 'वडा अधिकृत र शाखामा गुनासो जिम्मा लगाउने' },
    { en: 'Create and manage ward officer accounts', ne: 'वडा अधिकृतको खाता बनाउने र व्यवस्थापन गर्ने' },
    { en: 'Escalate to the District when needed', ne: 'आवश्यक परे जिल्लामा पठाउने' },
  ],
  district_officer: [
    { en: 'Monitor all Palikas in the district', ne: 'जिल्लाका सबै पालिकाको अनुगमन' },
    { en: 'Act on grievances escalated past their deadline', ne: 'समयसीमा नाघेर माथि आएका गुनासोमा कारबाही' },
    { en: 'Manage Palika and ward officer accounts', ne: 'पालिका र वडा अधिकृतको खाता व्यवस्थापन' },
  ],
  province_officer: [
    { en: 'Province-wide oversight and reporting', ne: 'प्रदेशभरिको अनुगमन र प्रतिवेदन' },
    { en: 'Final level of escalation for the province', ne: 'प्रदेशको अन्तिम तहको कारबाही' },
    { en: 'Manage officer accounts across the province', ne: 'प्रदेशभरिका अधिकृतको खाता व्यवस्थापन' },
  ],
  super_admin: [
    { en: 'Nationwide access to every grievance', ne: 'देशभरका सबै गुनासोमा पहुँच' },
    { en: 'Create officers at any level', ne: 'जुनसुकै तहमा अधिकृत बनाउने' },
  ],
};

const inputClass =
  'h-11 px-3.5 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:border-primary';
const cardClass = 'bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card p-6';

export function OfficerProfileScreen() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t, pick } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user || user.role === 'citizen') return null;

  const role = user.role;
  const roleLabel = pick(ROLE_META[role].label, ROLE_META[role].labelNe);
  const names = territoryNames(user.territory, language);
  const scope = [
    { label: t('province'), value: names.province },
    { label: t('district').replace(' *', ''), value: names.district },
    { label: t('palika'), value: names.palika },
    { label: t('ward'), value: names.ward },
  ].filter((row) => row.value);

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setMessage({ ok: true, text: pick('Password changed.', 'पासवर्ड परिवर्तन भयो।') });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title={t('profile')}
      subtitle={roleLabel}
      headerActions={
        <Button variant="outline" size="sm" onClick={logout} icon="logout">
          {t('logout')}
        </Button>
      }
    >
      <div className="max-w-4xl flex flex-col gap-6">
        <div className={`${cardClass} flex items-center gap-4`}>
          <div className="w-16 h-16 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md flex-shrink-0">
            <Icon name="admin_panel_settings" size={36} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface">{user.fullName}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {t('activeStatus')}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant">
              {roleLabel}
              {user.designation ? ` · ${user.designation}` : ''}
            </p>
            <p className="text-xs text-on-surface-variant mt-1 break-all">
              {[user.email, user.phoneNumber ? formatNepaliPhone(user.phoneNumber) : ''].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <section className={cardClass}>
          <h3 className="text-base sm:text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <Icon name="map" size={20} className="text-primary" />
            {pick('Area of responsibility', 'कार्यक्षेत्र')}
          </h3>
          {scope.length === 0 ? (
            <p className="text-sm text-on-surface-variant">{pick('All of Nepal', 'सम्पूर्ण नेपाल')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {scope.map((row) => (
                <div key={row.label} className="p-3.5 rounded-xl bg-surface-container/60 border border-outline-variant/40">
                  <span className="text-on-surface-variant block text-xs font-semibold uppercase tracking-wider mb-1">{row.label}</span>
                  <strong className="text-on-surface text-sm font-bold block">{row.value}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={cardClass}>
          <h3 className="text-base sm:text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <Icon name="security" size={20} className="text-primary" />
            {t('systemPrivileges')}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRIVILEGES[role].map((item) => (
              <li key={item.en} className="flex items-start gap-2.5 text-sm p-3 rounded-xl bg-surface-container/40">
                <Icon name="check_circle" size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-on-surface font-medium">{pick(item.en, item.ne)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${cardClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
          <label htmlFor="officer-language" className="font-bold text-sm text-on-surface">
            {t('selectLanguage')}
          </label>
          <select
            id="officer-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            className="h-11 px-3.5 rounded-xl border-2 border-primary/40 bg-surface font-bold text-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </section>

        <section className={cardClass}>
          <h3 className="text-base sm:text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <Icon name="lock" size={20} className="text-primary" />
            {pick('Change password', 'पासवर्ड परिवर्तन')}
          </h3>
          {message && (
            <p
              role="status"
              className={`mb-3 p-3 rounded-xl text-sm font-semibold border ${
                message.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {message.text}
            </p>
          )}
          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface-variant">{pick('Current password', 'हालको पासवर्ड')}</span>
              <input type="password" autoComplete="current-password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface-variant">{t('newPassword')}</span>
              <input type="password" autoComplete="new-password" minLength={8} className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </label>
            <Button type="submit" variant="primary" size="md" disabled={saving}>
              {saving ? t('loading') : pick('Update', 'अद्यावधिक')}
            </Button>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
