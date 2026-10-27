import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Icon } from '@/components/common/Icon';
import { formatNepaliPhone, normalizeNepaliPhone } from '@/lib/phone';
import { AuthError, AuthShell, inputClass, primaryButtonClass } from './AuthShell';

/** Citizens reset their password with a code sent by SMS. Officers ask their administrator. */
export function ForgotPasswordScreen() {
  const { requestOtp, resetPassword, error, clearError } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await requestOtp(phone, 'reset_password');
      setDevCode(result.devCode);
      setStep(2);
    } catch {
      // shown from context
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(phone, otp, password);
      setStep(3);
    } catch {
      // shown from context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-xl font-bold text-slate-900 mb-1">{t('resetPassword')}</h1>
      <p className="text-sm text-slate-500 mb-5">{t('officersCreatedByAdmin')}</p>

      <AuthError message={error} />

      {step === 1 && (
        <form className="flex flex-col gap-4" onSubmit={sendCode}>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">{t('mobileNumber')}</span>
            <input
              className={inputClass}
              type="tel"
              inputMode="numeric"
              placeholder="98XXXXXXXX"
              value={phone}
              onChange={(event) => { setPhone(event.target.value); clearError(); }}
              required
            />
          </label>
          <button type="submit" className={primaryButtonClass} disabled={submitting || !normalizeNepaliPhone(phone)}>
            {submitting ? t('loading') : t('sendCode')}
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <p className="text-sm text-slate-700">{t('codeSent')} <strong>{formatNepaliPhone(phone)}</strong></p>
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
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">{t('newPassword')}</span>
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
          <button type="submit" className={primaryButtonClass} disabled={submitting || otp.length !== 6}>
            {submitting ? t('loading') : t('resetPassword')}
          </button>
        </form>
      )}

      {step === 3 && (
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon name="check" size={26} />
          </div>
          <p className="text-sm text-slate-700 mb-4">Your password has been changed. / तपाईंको पासवर्ड परिवर्तन भयो।</p>
          <Link to="/auth/login" className={primaryButtonClass}>{t('signIn')}</Link>
        </div>
      )}

      {step !== 3 && (
        <p className="mt-6 pt-4 border-t border-slate-100 text-center text-sm">
          <Link to="/auth/login" className="font-semibold text-[#002045] hover:underline">{t('back')}</Link>
        </p>
      )}
    </AuthShell>
  );
}
