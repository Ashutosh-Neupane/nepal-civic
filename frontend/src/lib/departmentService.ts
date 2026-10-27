import { api } from './api';
import type { ComplaintCategory, OfficerRole } from '@/types';

/** Standard sections (शाखा) of a Palika office, same as the backend's PALIKA_DEPARTMENTS. */
export interface DepartmentMetadata {
  key: string;
  name: string;
  nameNe: string;
  description: string;
}

export const PALIKA_DEPARTMENTS: Record<string, DepartmentMetadata> = {
  infrastructure: {
    key: 'infrastructure',
    name: 'Infrastructure Development Section',
    nameNe: 'पूर्वाधार विकास शाखा',
    description: 'Roads, bridges, culverts, street lights and public buildings.',
  },
  water_sanitation: {
    key: 'water_sanitation',
    name: 'Drinking Water and Sanitation Section',
    nameNe: 'खानेपानी तथा सरसफाइ शाखा',
    description: 'Drinking water supply, pipelines, taps, drainage and sewerage.',
  },
  environment: {
    key: 'environment',
    name: 'Environment and Disaster Management Section',
    nameNe: 'वातावरण तथा विपद् व्यवस्थापन शाखा',
    description: 'Waste collection, parks, floods, landslides and fire response.',
  },
  health: {
    key: 'health',
    name: 'Health Section',
    nameNe: 'स्वास्थ्य शाखा',
    description: 'Health posts, primary hospitals and public health services.',
  },
  education: {
    key: 'education',
    name: 'Education Section',
    nameNe: 'शिक्षा शाखा',
    description: 'Community schools, teachers and school facilities.',
  },
  administration: {
    key: 'administration',
    name: 'General Administration Section',
    nameNe: 'सामान्य प्रशासन शाखा',
    description: 'Public safety and anything not handled by another section.',
  },
};

const CATEGORY_DEPARTMENT: Record<ComplaintCategory, string> = {
  roads: 'infrastructure',
  water: 'water_sanitation',
  drainage: 'water_sanitation',
  sanitation: 'environment',
  electricity: 'infrastructure',
  parks: 'environment',
  public_safety: 'administration',
  disaster_mgmt: 'environment',
  health: 'health',
  education: 'education',
  other: 'administration',
};

export function getDepartmentForCategory(category: ComplaintCategory): DepartmentMetadata {
  return PALIKA_DEPARTMENTS[CATEGORY_DEPARTMENT[category] || 'administration'];
}

/** An officer who may be assigned a grievance. */
export interface DepartmentalPersonnel {
  id: string;
  fullName: string;
  designation: string;
  role: OfficerRole;
  wardNo?: number | null;
}

/** Officers whose area covers the grievance (the backend decides who is eligible). */
export async function getEligibleAssignmentPersonnel(complaintId: string): Promise<DepartmentalPersonnel[]> {
  const { data } = await api.get<{
    id: string; displayName: string; role: OfficerRole; designation?: string | null; wardNo?: number | null;
  }[]>(`/grievances/${complaintId}/assignable-staff`);
  return data.map((staff) => ({
    id: staff.id,
    fullName: staff.displayName,
    designation: staff.designation || '',
    role: staff.role,
    wardNo: staff.wardNo,
  }));
}
