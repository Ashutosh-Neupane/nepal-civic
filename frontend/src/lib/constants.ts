import type { ComplaintCategory, ComplaintStatus, ComplaintPriority, GovernmentLevel, Role } from '@/types';

// Category names match the backend's GRIEVANCE_CATEGORIES.
export const CATEGORY_META: Record<ComplaintCategory, { label: string; labelNe: string; icon: string }> = {
  roads: { label: 'Roads & Bridges', labelNe: 'सडक तथा पुल', icon: 'add_road' },
  water: { label: 'Drinking Water', labelNe: 'खानेपानी', icon: 'water_drop' },
  drainage: { label: 'Drainage', labelNe: 'ढल तथा निकास', icon: 'waves' },
  sanitation: { label: 'Waste & Sanitation', labelNe: 'फोहोरमैला तथा सरसफाइ', icon: 'delete' },
  electricity: { label: 'Electricity & Street Lights', labelNe: 'बिजुली तथा सडक बत्ती', icon: 'bolt' },
  parks: { label: 'Parks & Public Spaces', labelNe: 'पार्क तथा सार्वजनिक स्थल', icon: 'park' },
  public_safety: { label: 'Public Safety', labelNe: 'सार्वजनिक सुरक्षा', icon: 'local_police' },
  disaster_mgmt: { label: 'Disaster', labelNe: 'विपद्', icon: 'emergency' },
  health: { label: 'Health Services', labelNe: 'स्वास्थ्य सेवा', icon: 'local_hospital' },
  education: { label: 'Schools & Education', labelNe: 'विद्यालय तथा शिक्षा', icon: 'school' },
  other: { label: 'Other', labelNe: 'अन्य', icon: 'more_horiz' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_META) as ComplaintCategory[];

export const STATUS_META: Record<ComplaintStatus, {
  label: string;
  labelNe: string;
  colorClass: string;
  bgClass: string;
  dotClass: string;
}> = {
  pending: {
    label: 'Pending',
    labelNe: 'विचाराधीन',
    colorClass: 'text-on-surface-variant',
    bgClass: 'bg-surface-container-high',
    dotClass: 'bg-outline',
  },
  assigned: {
    label: 'Assigned',
    labelNe: 'जिम्मा दिइएको',
    colorClass: 'text-secondary',
    bgClass: 'bg-secondary-fixed',
    dotClass: 'bg-secondary',
  },
  in_progress: {
    label: 'In Progress',
    labelNe: 'काम हुँदै',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    dotClass: 'bg-primary',
  },
  blocked: {
    label: 'On Hold',
    labelNe: 'रोकिएको',
    colorClass: 'text-on-tertiary-container',
    bgClass: 'bg-tertiary-container',
    dotClass: 'bg-tertiary',
  },
  resolved: {
    label: 'Resolved',
    labelNe: 'समाधान भएको',
    colorClass: 'text-[#137333]',
    bgClass: 'bg-[#E6F4EA]',
    dotClass: 'bg-[#137333]',
  },
  escalated: {
    label: 'Escalated',
    labelNe: 'माथिल्लो तहमा पठाइएको',
    colorClass: 'text-error',
    bgClass: 'bg-error-container',
    dotClass: 'bg-error',
  },
  rejected: {
    label: 'Rejected',
    labelNe: 'अस्वीकृत',
    colorClass: 'text-error',
    bgClass: 'bg-error-container',
    dotClass: 'bg-error',
  },
  closed: {
    label: 'Closed',
    labelNe: 'बन्द',
    colorClass: 'text-on-surface-variant',
    bgClass: 'bg-surface-container-highest',
    dotClass: 'bg-outline',
  },
  reopened: {
    label: 'Reopened',
    labelNe: 'पुनः खोलिएको',
    colorClass: 'text-tertiary',
    bgClass: 'bg-tertiary-fixed',
    dotClass: 'bg-tertiary',
  },
};

export const PRIORITY_META: Record<ComplaintPriority, {
  label: string;
  labelNe: string;
  colorClass: string;
  bgClass: string;
  icon: string;
}> = {
  low: {
    label: 'Low',
    labelNe: 'न्यून',
    colorClass: 'text-on-surface-variant',
    bgClass: 'bg-surface-container-high',
    icon: 'radio_button_unchecked',
  },
  medium: {
    label: 'Medium',
    labelNe: 'मध्यम',
    colorClass: 'text-secondary',
    bgClass: 'bg-secondary-fixed',
    icon: 'adjust',
  },
  high: {
    label: 'High',
    labelNe: 'उच्च',
    colorClass: 'text-on-tertiary-container',
    bgClass: 'bg-tertiary-container',
    icon: 'priority_high',
  },
  critical: {
    label: 'Critical',
    labelNe: 'अति जरुरी',
    colorClass: 'text-error',
    bgClass: 'bg-error/10',
    icon: 'warning',
  },
};

export const LEVEL_META: Record<GovernmentLevel, { label: string; labelNe: string; officer: string; officerNe: string }> = {
  ward: { label: 'Ward Office', labelNe: 'वडा कार्यालय', officer: 'Ward Secretary', officerNe: 'वडा सचिव' },
  palika: { label: 'Municipality', labelNe: 'पालिका', officer: 'Municipal Officer', officerNe: 'पालिका अधिकृत' },
  district: { label: 'District Coordination Committee', labelNe: 'जिल्ला समन्वय समिति', officer: 'District Officer', officerNe: 'जिल्ला अधिकृत' },
  province: { label: 'Province', labelNe: 'प्रदेश', officer: 'Province Officer', officerNe: 'प्रदेश अधिकृत' },
};

export const LEVEL_ORDER: GovernmentLevel[] = ['ward', 'palika', 'district', 'province'];

export const ROLE_META: Record<Role, { label: string; labelNe: string }> = {
  citizen: { label: 'Citizen', labelNe: 'नागरिक' },
  ward_officer: { label: 'Ward Officer', labelNe: 'वडा अधिकृत' },
  palika_officer: { label: 'Municipal Officer', labelNe: 'पालिका अधिकृत' },
  district_officer: { label: 'District Officer', labelNe: 'जिल्ला अधिकृत' },
  province_officer: { label: 'Province Officer', labelNe: 'प्रदेश अधिकृत' },
  super_admin: { label: 'National Administrator', labelNe: 'राष्ट्रिय प्रशासक' },
};
