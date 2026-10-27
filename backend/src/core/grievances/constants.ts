import type { GovernmentLevel, GrievancePriority, ServiceRequestStatus } from '../../types';

export interface DepartmentDefinition {
  key: string;
  name: string;
  nameNe: string;
}

/** Standard sections (शाखा) of a Palika office that handle grievances. */
export const PALIKA_DEPARTMENTS: DepartmentDefinition[] = [
  { key: 'infrastructure', name: 'Infrastructure Development Section', nameNe: 'पूर्वाधार विकास शाखा' },
  { key: 'water_sanitation', name: 'Drinking Water and Sanitation Section', nameNe: 'खानेपानी तथा सरसफाइ शाखा' },
  { key: 'environment', name: 'Environment and Disaster Management Section', nameNe: 'वातावरण तथा विपद् व्यवस्थापन शाखा' },
  { key: 'health', name: 'Health Section', nameNe: 'स्वास्थ्य शाखा' },
  { key: 'education', name: 'Education Section', nameNe: 'शिक्षा शाखा' },
  { key: 'administration', name: 'General Administration Section', nameNe: 'सामान्य प्रशासन शाखा' },
];

export interface CategoryDefinition {
  key: string;
  name: string;
  nameNe: string;
  group: string;
  departmentKey: string;
}

export const GRIEVANCE_CATEGORIES: CategoryDefinition[] = [
  { key: 'roads', name: 'Roads and Bridges', nameNe: 'सडक तथा पुल', group: 'infrastructure', departmentKey: 'infrastructure' },
  { key: 'water', name: 'Drinking Water', nameNe: 'खानेपानी', group: 'utilities', departmentKey: 'water_sanitation' },
  { key: 'drainage', name: 'Drainage and Sewerage', nameNe: 'ढल तथा निकास', group: 'utilities', departmentKey: 'water_sanitation' },
  { key: 'sanitation', name: 'Waste and Sanitation', nameNe: 'फोहोरमैला तथा सरसफाइ', group: 'environment', departmentKey: 'environment' },
  { key: 'electricity', name: 'Electricity and Street Lights', nameNe: 'बिजुली तथा सडक बत्ती', group: 'utilities', departmentKey: 'infrastructure' },
  { key: 'parks', name: 'Parks and Public Spaces', nameNe: 'पार्क तथा सार्वजनिक स्थल', group: 'environment', departmentKey: 'environment' },
  { key: 'public_safety', name: 'Public Safety', nameNe: 'सार्वजनिक सुरक्षा', group: 'safety', departmentKey: 'administration' },
  { key: 'disaster_mgmt', name: 'Disaster (Flood, Landslide, Fire)', nameNe: 'विपद् (बाढी, पहिरो, आगलागी)', group: 'safety', departmentKey: 'environment' },
  { key: 'health', name: 'Health Services', nameNe: 'स्वास्थ्य सेवा', group: 'social', departmentKey: 'health' },
  { key: 'education', name: 'Schools and Education', nameNe: 'विद्यालय तथा शिक्षा', group: 'social', departmentKey: 'education' },
  { key: 'other', name: 'Other', nameNe: 'अन्य', group: 'other', departmentKey: 'administration' },
];

export const CATEGORY_KEYS = GRIEVANCE_CATEGORIES.map((category) => category.key);

export const PRIORITY_KEYS: GrievancePriority[] = ['low', 'medium', 'high', 'critical'];

/** Hours an office has to resolve a grievance before it escalates to the next level. */
export const PRIORITY_SLA_HOURS: Record<GrievancePriority, number> = {
  critical: 24,
  high: 48,
  medium: 72,
  low: 120,
};

export const LEVEL_LABELS: Record<GovernmentLevel, { en: string; ne: string }> = {
  ward: { en: 'Ward Office', ne: 'वडा कार्यालय' },
  palika: { en: 'Municipality', ne: 'पालिका' },
  district: { en: 'District Coordination Committee', ne: 'जिल्ला समन्वय समिति' },
  province: { en: 'Province', ne: 'प्रदेश' },
};

/** Nepali status names for citizen notifications. */
export const STATUS_LABELS_NE: Partial<Record<ServiceRequestStatus, string>> = {
  pending: 'दर्ता भएको',
  assigned: 'जिम्मा लगाइएको',
  in_progress: 'काम हुँदै',
  blocked: 'रोकिएको',
  resolved: 'समाधान भएको',
  escalated: 'माथि पठाइएको',
  rejected: 'अस्वीकृत',
  closed: 'बन्द',
  reopened: 'पुनः खोलिएको',
};

export const TERMINAL_STATUSES: ServiceRequestStatus[] = ['closed', 'rejected', 'moved', 'junk'];

/** Status changes an officer may make. Escalation, closing and reopening have their own actions. */
export const OFFICER_STATUS_TRANSITIONS: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
  pending: ['assigned', 'in_progress', 'blocked', 'rejected', 'moved', 'junk'],
  assigned: ['in_progress', 'blocked', 'resolved', 'rejected'],
  in_progress: ['blocked', 'resolved', 'rejected'],
  blocked: ['in_progress', 'resolved', 'rejected'],
  escalated: ['assigned', 'in_progress', 'blocked', 'resolved', 'rejected'],
  reopened: ['assigned', 'in_progress', 'blocked', 'resolved', 'rejected'],
  resolved: [],
  closed: [],
  rejected: [],
  moved: [],
  junk: [],
};

/** A super admin may also close a grievance or set any working status on an open one. */
export const SUPER_ADMIN_STATUSES: ServiceRequestStatus[] = [
  'assigned', 'in_progress', 'blocked', 'resolved', 'rejected', 'closed',
];

/** Statuses that need a written note from the officer. */
export const STATUSES_REQUIRING_NOTE: ServiceRequestStatus[] = ['resolved', 'rejected', 'blocked', 'moved'];

// Approximate bounding box of Nepal, used to reject obviously wrong coordinates.
export const NEPAL_BOUNDS = { minLat: 26.3, maxLat: 30.5, minLon: 80.0, maxLon: 88.25 };

export function slaDeadline(priority: GrievancePriority, from: Date): Date {
  return new Date(from.getTime() + PRIORITY_SLA_HOURS[priority] * 60 * 60 * 1000);
}

/** Human reference for a grievance, e.g. LG307-261012 for Kathmandu Metropolitan City. */
export function makeReference(jurisdictionId: string, publicId: string): string {
  const match = /^lg-(\d+)$/.exec(jurisdictionId);
  return match ? `LG${match[1]}-${publicId}` : `${jurisdictionId}-${publicId}`;
}

export function parseReference(reference: string): { jurisdictionId: string; publicId: string } | null {
  const trimmed = reference.trim();
  const lg = /^LG(\d+)-(\w+)$/i.exec(trimmed);
  if (lg) { return { jurisdictionId: `lg-${lg[1]}`, publicId: lg[2] }; }
  const index = trimmed.lastIndexOf('-');
  if (index <= 0 || index === trimmed.length - 1) { return null; }
  return { jurisdictionId: trimmed.slice(0, index), publicId: trimmed.slice(index + 1) };
}

export function serviceIdFor(jurisdictionId: string, category: string): string {
  return `${jurisdictionId}:${category}`;
}
