import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SUPPORTED_LANGUAGES, useLanguage, type SupportedLanguage } from '@/contexts/LanguageContext';
import { territoryNames } from '@/lib/jurisdictionService';
import { MobileLayout } from '@/layouts/MobileLayout';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/common/Button';

export function CitizenProfileScreen() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const names = territoryNames(user?.territory, language);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const BOTTOM_NAV = [
    { icon: 'home', label: t('home'), href: '/citizen' },
    { icon: 'assignment', label: t('myCases'), href: '/citizen/my-complaints' },
    { icon: 'add_circle', label: t('report'), href: '/citizen/report' },
    { icon: 'map', label: t('explore'), href: '/citizen/map' },
    { icon: 'person', label: t('profile'), active: true, href: '/citizen/profile' },
  ];

  const FAQS = [
    {
      q: t('faq1Q'),
      a: t('faq1A'),
    },
    {
      q: t('faq2Q'),
      a: t('faq2A'),
    },
    {
      q: t('faq3Q'),
      a: t('faq3A'),
    },
  ];

  return (
    <MobileLayout title={t('citizenProfile')} bottomNav={BOTTOM_NAV}>
      <div className="px-4 py-4 pb-6 flex flex-col gap-4">
        {/* User Card */}
        <div className="rounded-3xl bg-primary text-on-primary p-5 shadow-lg flex items-center gap-4 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-on-primary/10 border border-on-primary/20 flex items-center justify-center flex-shrink-0">
            <Icon name="person" size={36} className="text-on-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold truncate">
              {user?.fullName || 'Citizen'}
            </h2>
            <p className="text-xs sm:text-sm text-on-primary/80 truncate mt-0.5">
              {user?.phoneNumber || user?.email}
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">
              <Icon name="verified_user" size={15} /> {t('verifiedCitizen')}
            </div>
          </div>
        </div>

        {/* Territory & Jurisdiction Card */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4.5 flex flex-col gap-3 shadow-sm">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {t('registeredJurisdiction')}
          </h3>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-surface-container">
              <span className="text-on-surface-variant block text-xs uppercase tracking-wider mb-0.5">{t('province')}</span>
              <strong className="text-on-surface font-bold text-sm">{names.province || '—'}</strong>
            </div>
            <div className="p-3 rounded-xl bg-surface-container">
              <span className="text-on-surface-variant block text-xs uppercase tracking-wider mb-0.5">{t('district').replace(' *', '')}</span>
              <strong className="text-on-surface font-bold text-sm">{names.district || '—'}</strong>
            </div>
            <div className="p-3 rounded-xl bg-surface-container">
              <span className="text-on-surface-variant block text-xs uppercase tracking-wider mb-0.5">{t('palika')}</span>
              <strong className="text-on-surface font-bold text-sm">{names.palika || '—'}</strong>
            </div>
            <div className="p-3 rounded-xl bg-surface-container">
              <span className="text-on-surface-variant block text-xs uppercase tracking-wider mb-0.5">{t('ward')}</span>
              <strong className="text-on-surface font-bold text-sm">{names.ward || '—'}</strong>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4.5 flex flex-col gap-3 shadow-sm">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {t('preferencesSettings')}
          </h3>

          <div className="flex items-center justify-between py-1 text-xs">
            <div className="flex items-center gap-2">
              <Icon name="translate" size={20} className="text-primary" />
              <span className="font-bold text-sm text-on-surface">{t('portalLanguage')}</span>
            </div>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as SupportedLanguage)}
              className="h-10 px-3.5 rounded-xl border-2 border-primary/40 bg-surface text-sm text-on-surface font-bold focus:outline-none focus:border-primary shadow-sm cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between py-1 text-xs border-t border-outline-variant/60 pt-3">
            <div className="flex items-center gap-2">
              <Icon name="sms" size={20} className="text-primary" />
              <span className="font-bold text-sm text-on-surface">{t('smsNotifications')}</span>
            </div>
            <input
              type="checkbox"
              checked={smsAlerts}
              onChange={e => setSmsAlerts(e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* FAQs & Support Accordion */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4.5 flex flex-col gap-3 shadow-sm">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {t('helpFaqs')}
          </h3>
          <div className="flex flex-col divide-y divide-outline-variant/60">
            {FAQS.map((faq, index) => (
              <div key={index} className="py-3">
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full flex items-center justify-between text-left text-sm font-semibold text-on-surface gap-2"
                >
                  <span>{faq.q}</span>
                  <Icon
                    name={activeFaq === index ? 'expand_less' : 'expand_more'}
                    size={20}
                    className="text-on-surface-variant flex-shrink-0"
                  />
                </button>
                {activeFaq === index && (
                  <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed animate-slide-down">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-primary-container/10 flex items-center justify-between gap-3 text-xs sm:text-sm mt-1">
            <div className="flex items-center gap-2">
              <Icon name="support_agent" size={20} className="text-primary" />
              <span>{t('helplineText')}</span>
            </div>
            <a href="tel:1902" className="font-bold text-primary hover:underline text-sm sm:text-base">1902</a>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="lg"
          className="w-full text-error border-error/40 hover:bg-error-container/20 mt-2 font-bold"
          onClick={logout}
          icon="logout"
        >
          {t('logout')}
        </Button>
      </div>
    </MobileLayout>
  );
}
