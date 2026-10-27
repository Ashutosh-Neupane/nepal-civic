import type { ReactNode } from 'react';
import { CivicHeroIllustration } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';

/** Shared frame for the login, registration and password reset screens. */
export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#e3f0fb] via-[#edf6fd] to-[#e4f0fa] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 overflow-x-hidden">
      <main className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 py-6 animate-slide-up">
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center max-w-md">
          <CivicHeroIllustration size={340} />
        </div>

        <div className={`w-full ${wide ? 'max-w-[560px]' : 'max-w-[460px]'} flex-shrink-0`}>
          <div className="bg-white rounded-[28px] shadow-[0_25px_60px_rgba(0,32,69,0.12)] border border-slate-100 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#002045] flex items-center justify-center text-white flex-shrink-0">
                  <Icon name="account_balance" size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">{t('appName')}</h3>
                  <p className="text-[11px] text-slate-500 leading-tight">{t('appTagline')}</p>
                </div>
              </div>
              <div className="flex rounded-full border border-slate-200 p-0.5" role="group" aria-label="Language">
                {SUPPORTED_LANGUAGES.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setLanguage(option.code)}
                    aria-pressed={language === option.code}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                      language === option.code ? 'bg-[#002045] text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
            {children}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <Icon name="call" size={14} />
            {t('helplineText')}
          </p>
        </div>
      </main>
    </div>
  );
}

export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
      <Icon name="error" size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm font-semibold text-red-700 leading-relaxed">{message}</p>
    </div>
  );
}

export const inputClass =
  'w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002045]/30';

export const primaryButtonClass =
  'w-full h-12 rounded-xl bg-[#002045] text-white font-semibold text-sm hover:bg-[#0a2f5c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2';
