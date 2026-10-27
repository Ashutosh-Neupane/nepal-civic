import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, roleHomeRoute } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Icon } from '@/components/common/Icon';
import { AuthError, AuthShell, inputClass, primaryButtonClass } from './AuthShell';

type LoginKind = 'citizen' | 'staff';

export function LoginScreen() {
  const { login, error, clearError } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname;

  const [kind, setKind] = useState<LoginKind>('citizen');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const switchKind = (next: LoginKind) => {
    setKind(next);
    setIdentifier('');
    clearError();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const user = await login({ identifier, password, kind });
      const home = roleHomeRoute(user.role);
      // Only return to the page they came from if it belongs to their own portal.
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch {
      // The error is shown from the auth context.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="grid grid-cols-2 gap-2 p-1 mb-5 rounded-2xl bg-slate-100" role="tablist">
        {(['citizen', 'staff'] as LoginKind[]).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={kind === option}
            onClick={() => switchKind(option)}
            className={`h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              kind === option ? 'bg-white text-[#002045] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name={option === 'citizen' ? 'person' : 'badge'} size={18} />
            {t(option === 'citizen' ? 'citizenLogin' : 'officerLogin')}
          </button>
        ))}
      </div>

      <h1 className="text-xl font-bold text-slate-900 mb-1">{t('signIn')}</h1>
      <p className="text-sm text-slate-500 mb-5">
        {kind === 'citizen' ? t('reportPotholesDesc') : t('officersCreatedByAdmin')}
      </p>

      <AuthError message={error} />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {kind === 'citizen' ? t('mobileOrEmail') : t('officialEmail')}
          </span>
          <input
            className={inputClass}
            type={kind === 'citizen' ? 'text' : 'email'}
            inputMode={kind === 'citizen' ? 'text' : 'email'}
            autoComplete="username"
            placeholder={kind === 'citizen' ? '98XXXXXXXX' : 'name@palika.gov.np'}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">{t('password')}</span>
          <div className="relative">
            <input
              className={`${inputClass} pr-11`}
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPw ? 'visibility_off' : 'visibility'} size={18} />
            </button>
          </div>
        </label>

        {kind === 'citizen' && (
          <Link to="/auth/forgot-password" className="text-xs font-semibold text-[#002045] hover:underline self-end -mt-2">
            {t('forgotPassword')}
          </Link>
        )}

        <button type="submit" className={primaryButtonClass} disabled={submitting || !identifier || !password}>
          {submitting ? t('loading') : t('signIn')}
          {!submitting && <Icon name="arrow_forward" size={18} />}
        </button>
      </form>

      {kind === 'citizen' && (
        <p className="mt-6 pt-4 border-t border-slate-100 text-center text-sm text-slate-600">
          {t('noAccount')}{' '}
          <Link to="/auth/register" className="font-semibold text-[#002045] hover:underline">
            {t('createAccount')}
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
