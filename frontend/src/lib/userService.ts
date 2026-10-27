import { api } from './api';
import { completeTerritory } from './jurisdictionService';
import type { AppUser, AuthScope } from '@/types/auth';
import type { OfficerRole, Role } from '@/types';

interface ApiCitizen {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  preferredLanguage?: 'en' | 'ne';
  jurisdictionId?: string | null;
  districtId?: number | null;
  provinceId?: number | null;
  wardNo?: number | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiStaff {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
  phone?: string | null;
  role?: OfficerRole | null;
  designation?: string | null;
  jurisdictionId?: string | null;
  districtId?: number | null;
  provinceId?: number | null;
  wardNo?: number | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Shape returned by /auth/me and the login endpoints. */
export interface ApiSession {
  kind: 'citizen' | 'staff';
  role: Role;
  user: ApiCitizen | ApiStaff;
  scope: AuthScope | null;
}

export function mapCitizen(citizen: ApiCitizen): AppUser {
  return {
    uid: citizen.id,
    kind: 'citizen',
    fullName: citizen.fullName,
    email: citizen.email || '',
    phoneNumber: citizen.phone,
    role: 'citizen',
    territory: completeTerritory({
      provinceId: citizen.provinceId ?? undefined,
      districtId: citizen.districtId ?? undefined,
      jurisdictionId: citizen.jurisdictionId ?? undefined,
      wardNo: citizen.wardNo ?? undefined,
    }),
    scope: null,
    preferredLanguage: citizen.preferredLanguage,
    status: citizen.isActive === false ? 'suspended' : 'active',
    createdAt: citizen.createdAt,
    updatedAt: citizen.updatedAt,
  };
}

export function mapStaff(staff: ApiStaff, scope: AuthScope | null = null): AppUser {
  return {
    uid: staff.id,
    kind: 'staff',
    fullName: staff.displayName || `${staff.firstName} ${staff.lastName}`.trim(),
    email: staff.email,
    phoneNumber: staff.phone || undefined,
    role: staff.role || 'palika_officer',
    designation: staff.designation || undefined,
    territory: completeTerritory({
      provinceId: staff.provinceId ?? undefined,
      districtId: staff.districtId ?? undefined,
      jurisdictionId: staff.jurisdictionId ?? undefined,
      wardNo: staff.wardNo ?? undefined,
    }),
    scope,
    status: staff.isActive === false ? 'suspended' : 'active',
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
  };
}

export function mapSession(session: ApiSession): AppUser {
  return session.kind === 'citizen'
    ? mapCitizen(session.user as ApiCitizen)
    : mapStaff(session.user as ApiStaff, session.scope);
}

export async function getCurrentUser(): Promise<AppUser> {
  const { data } = await api.get<ApiSession>('/auth/me');
  return mapSession(data);
}

export async function updateUserProfile(update: {
  fullName?: string;
  email?: string;
  preferredLanguage?: 'en' | 'ne';
  jurisdictionId?: string | null;
  wardNo?: number | null;
  phone?: string;
  designation?: string;
}): Promise<AppUser> {
  const { data } = await api.patch<ApiSession>('/auth/me', update);
  return mapSession(data);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/change-password', { currentPassword, newPassword });
}

// ---- officer accounts (Palika officers and above) -------------------------

export async function getOfficers(filter: { role?: OfficerRole; jurisdictionId?: string } = {}): Promise<AppUser[]> {
  const { data } = await api.get<ApiStaff[]>('/admin/staff', filter);
  return data.map((staff) => mapStaff(staff));
}

export interface NewOfficer {
  role: OfficerRole;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation?: string;
  provinceId?: number;
  districtId?: number;
  jurisdictionId?: string;
  wardNo?: number;
}

/** Creates an officer account; the temporary password is returned once only. */
export async function createOfficer(officer: NewOfficer): Promise<{ officer: AppUser; temporaryPassword: string }> {
  const { data } = await api.post<ApiStaff & { temporaryPassword: string }>('/admin/staff', officer);
  return { officer: mapStaff(data), temporaryPassword: data.temporaryPassword };
}

export async function updateOfficer(
  id: string, update: { isActive?: boolean; designation?: string; phone?: string }
): Promise<AppUser> {
  const { data } = await api.patch<ApiStaff>(`/admin/staff/${id}`, update);
  return mapStaff(data);
}

export async function resetOfficerPassword(id: string): Promise<string> {
  const { data } = await api.post<{ temporaryPassword: string }>(`/admin/staff/${id}/reset-password`);
  return data.temporaryPassword;
}
