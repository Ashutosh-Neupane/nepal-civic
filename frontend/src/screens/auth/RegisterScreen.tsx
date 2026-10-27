import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Icon } from '@/components/common/Icon';
import { JurisdictionPicker } from '@/components/common/JurisdictionPicker';
import { formatNepaliPhone, normalizeNepaliPhone } from '@/lib/phone';
import type { Territory } from '@/types';
import { AuthError, AuthShell, inputClass, primaryButtonClass } from './AuthShell';

const RESEND_SECONDS = 60;

export function RegisterScreen() {
  const { requestOtp, register, error, clearError } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Step 1: verify the mobile number. Step 2: account details.
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [resendIn, setResendIn] = useState(0);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [territory, setTerritory] = useState<Territory>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitting(true);
    try {
      const result = await requestOtp(phone, 'register');
      setDevCode(result.devCode);
      setResendIn(RESEND_SECONDS);
      setStep(2);
    } catch {
      // shown from context
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await register({
        fullName,
        phoneNumber: phone,
        otp,
        email,
        password,
        territory,
        preferredLanguage: language,
      });
      navigate('/citizen', { replace: true });
    } catch {
      // shown from context
    } finally {
      setSubmitting(false);
    }
  };

  const phoneValid = !!normalizeNepaliPhone(phone);

  return (
    <AuthShell wide={step === 2}>
      <h1 className="text-xl font-bold text-slate-900 mb-1">{t('createAccount')}</h1>
      <p className="text-sm text-slate-500 mb-5">{t('reportPotholesDesc')}</p>

      <AuthError message={error} />

      {step === 1 ? (
        <form className="flex flex-col gap-4" onSubmit={sendCode}>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">{t('mobileNumber')}</span>
            <div className="flex">
              <span className="h-11 px-3 flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-sm text-slate-600">
                +977
              </span>
              <input
                className={`${inputClass} rounded-l-none`}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98XXXXXXXX"
                value={phone}
                onChange={(event) => { setPhone(event.target.value); clearError(); }}
                required
              />
            </div>
          </label>
          <button type="submit" className={primaryButtonClass} disabled={submitting || !phoneValid}>
            {submitting ? t('loading') : t('sendCode')}
            {!submitting && <Icon name="sms" size={18} />}
          </button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 flex items-center justify-between gap-2">
            <span>
              {t('codeSent')} <strong>{formatNepaliPhone(phone)}</strong>
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-[#002045] disabled:text-slate-400"
              disabled={resendIn > 0 || submitting}
              onClick={() => sendCode()}
            >
              {resendIn > 0 ? `${t('resendCode')} (${resendIn})` : t('resendCode')}
            </button>
          </div>
          {devCode && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Development mode: the code is <strong>{devCode}</strong>
            </p>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">{t('verificationCode')}</span>
            <input
              className={`${inputClass} tracking-[0.4em] font-semibold`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
              required
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">{t('fullName')}</span>
              <input
                className={inputClass}
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                minLength={2}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">{t('emailOptional')}</span>
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">{t('password')}</span>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
            <span className="text-[11px] text-slate-500">{t('passwordRule')}</span>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-semibold text-slate-600 mb-1">{t('yourAddress')}</legend>
            <JurisdictionPicker value={territory} onChange={setTerritory} />
          </fieldset>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep(1); setOtp(''); clearError(); }}
              className="h-12 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('back')}
            </button>
            <button type="submit" className={primaryButtonClass} disabled={submitting || otp.length !== 6}>
              {submitting ? t('loading') : t('createAccount')}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 pt-4 border-t border-slate-100 text-center text-sm text-slate-600">
        {t('haveAccount')}{' '}
        <Link to="/auth/login" className="font-semibold text-[#002045] hover:underline">{t('signIn')}</Link>
      </p>
    </AuthShell>
  );
}
