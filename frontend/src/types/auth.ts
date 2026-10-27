import type { GovernmentLevel, Role, Territory } from './index';

export interface AuthScope {
  level: GovernmentLevel | 'national';
  provinceId?: number | null;
  districtId?: number | null;
  jurisdictionId?: string | null;
  wardNo?: number | null;
}

export interface AppUser {
  uid: string;
  kind: 'citizen' | 'staff';
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: Role;
  designation?: string;
  territory: Territory;
  scope: AuthScope | null;
  preferredLanguage?: 'en' | 'ne';
  status?: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  error: string | null;
}

export interface RegisterData {
  fullName: string;
  phoneNumber: string;
  otp: string;
  email?: string;
  password: string;
  territory: Territory;
  preferredLanguage?: 'en' | 'ne';
}

export interface LoginData {
  /** Citizens: mobile number or email. Officers: email. */
  identifier: string;
  password: string;
  kind: 'citizen' | 'staff';
}
