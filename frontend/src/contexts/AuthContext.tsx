import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, getToken, onUnauthorized, setToken } from '@/lib/api';
import { getCurrentUser, mapSession, type ApiSession } from '@/lib/userService';
import { normalizeNepaliPhone } from '@/lib/phone';
import type { AppUser, RegisterData, LoginData } from '@/types/auth';
import type { Role } from '@/types';

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  login: (data: LoginData) => Promise<AppUser>;
  requestOtp: (phone: string, purpose: 'register' | 'reset_password') => Promise<{ devCode?: string }>;
  register: (data: RegisterData) => Promise<AppUser>;
  resetPassword: (phone: string, otp: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: AppUser) => void;
  roleHomeRoute: (role: Role) => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function roleHomeRoute(role: Role): string {
  switch (role) {
    case 'ward_officer':
    case 'palika_officer':
      return '/palika';
    case 'district_officer':
      return '/district';
    case 'province_officer':
    case 'super_admin':
      return '/province';
    default:
      return '/citizen';
  }
}

/** Base path of the signed-in officer's portal, e.g. "/palika". */
export function rolePortal(role?: Role): string {
  return role ? roleHomeRoute(role) : '/citizen';
}

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fail = (message: string): never => {
    setError(message);
    throw new Error(message);
  };

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      setUser(await getCurrentUser());
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
    return onUnauthorized(() => {
      setToken(null);
      setUser(null);
    });
  }, [refreshUser]);

  const login = useCallback(async ({ identifier, password, kind }: LoginData): Promise<AppUser> => {
    setError(null);
    const id = identifier.trim();
    if (!id || !password) fail('Enter your login details and password.');
    try {
      const { data } = kind === 'citizen'
        ? await api.post<ApiSession & { token: string }>('/auth/citizen/login', { identifier: id, password })
        : await api.post<ApiSession & { token: string }>('/auth/staff/login', { email: id, password });
      setToken(data.token);
      const profile = mapSession(data);
      setUser(profile);
      return profile;
    } catch (err) {
      return fail((err as Error).message);
    }
  }, []);

  const requestOtp = useCallback(async (phone: string, purpose: 'register' | 'reset_password') => {
    setError(null);
    const normalized = normalizeNepaliPhone(phone);
    if (!normalized) fail('Enter a valid Nepali mobile number (98XXXXXXXX).');
    try {
      const { data } = await api.post<{ sent: boolean; devCode?: string }>('/auth/otp', { phone: normalized, purpose });
      return { devCode: data.devCode };
    } catch (err) {
      return fail((err as Error).message);
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<AppUser> => {
    setError(null);
    if (data.fullName.trim().length < 2) fail('Enter your full name.');
    if (!PASSWORD_RULE.test(data.password)) fail('Password must be at least 8 characters with letters and numbers.');
    try {
      const { data: result } = await api.post<ApiSession & { token: string }>('/auth/citizen/register', {
        fullName: data.fullName.trim(),
        phone: normalizeNepaliPhone(data.phoneNumber),
        otp: data.otp.trim(),
        email: data.email?.trim() || undefined,
        password: data.password,
        preferredLanguage: data.preferredLanguage,
        jurisdictionId: data.territory.jurisdictionId,
        wardNo: data.territory.wardNo,
      });
      setToken(result.token);
      const profile = mapSession(result);
      setUser(profile);
      return profile;
    } catch (err) {
      return fail((err as Error).message);
    }
  }, []);

  const resetPassword = useCallback(async (phone: string, otp: string, password: string) => {
    setError(null);
    if (!PASSWORD_RULE.test(password)) fail('Password must be at least 8 characters with letters and numbers.');
    try {
      await api.post('/auth/citizen/reset-password', { phone: normalizeNepaliPhone(phone), otp: otp.trim(), password });
    } catch (err) {
      fail((err as Error).message);
    }
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      error,
      clearError,
      login,
      requestOtp,
      register,
      resetPassword,
      logout,
      refreshUser,
      setUser,
      roleHomeRoute,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
