// ============================================================
// Core Domain Types — Nepal Civic
// ============================================================

// Nepal's federal structure: Ward → Palika (local level) → District → Province.
export type Role =
  | 'citizen'
  | 'ward_officer'
  | 'palika_officer'
  | 'district_officer'
  | 'province_officer'
  | 'super_admin';

export type OfficerRole = Exclude<Role, 'citizen'>;

export type GovernmentLevel = 'ward' | 'palika' | 'district' | 'province';

export type LocalLevelType = 'metropolitan' | 'sub_metropolitan' | 'municipality' | 'rural_municipality';

export interface Territory {
  provinceId?: number;
  provinceName?: string;
  districtId?: number;
  districtName?: string;
  /** Local level (Palika) id, e.g. "lg-307" */
  jurisdictionId?: string;
  jurisdictionName?: string;
  wardNo?: number;
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  role: Role;
  territory: Territory;
  avatarUrl?: string;
  createdAt: string; // ISO string
  lastLoginAt?: string;
}

// ============================================================
// Complaint (grievance / गुनासो) Enums
// ============================================================

export type ComplaintStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'blocked'
  | 'resolved'
  | 'escalated'
  | 'rejected'
  | 'closed'
  | 'reopened';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintCategory =
  | 'roads'
  | 'water'
  | 'drainage'
  | 'sanitation'
  | 'electricity'
  | 'parks'
  | 'public_safety'
  | 'disaster_mgmt'
  | 'health'
  | 'education'
  | 'other';

// ============================================================
// Complaint
// ============================================================

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface ComplaintUpdate {
  id: string;
  complaintId: string;
  timestamp: string; // ISO
  status: ComplaintStatus;
  note: string;
  updatedBy: string; // user uid
  updatedByName: string;
  isPublic: boolean;
  level?: GovernmentLevel;
  images?: string[];
}

/** 0 = ward, 1 = palika, 2 = district, 3 = province */
export type EscalationLevel = 0 | 1 | 2 | 3;

export interface Complaint {
  id: string;
  referenceId: string; // e.g. "LG307-1042"
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  // Submitter
  citizenId: string;
  citizenName: string;
  citizenPhone?: string;
  citizenEmail?: string;
  // Location hierarchy
  location: GeoLocation;
  wardNo: number;
  /** "Ward 10" */
  wardLabel: string;
  jurisdictionId: string;
  jurisdictionName: string;
  jurisdictionNameNe?: string;
  districtId: number;
  districtName: string;
  provinceId: number;
  provinceName: string;
  // Evidence (storage keys; resolve with getEvidenceUrls)
  photoUrls: string[];
  videoUrls: string[];
  resolutionPhotoUrls?: string[];
  // Assignment
  assignedTo?: string;
  assignedToName?: string;
  assignedDepartment?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  citizenConfirmedAt?: string;
  citizenConfirmationNote?: string;
  // Escalation and SLA
  currentLevel: GovernmentLevel;
  escalationLevel: EscalationLevel;
  escalationCount: number;
  escalatedAt?: string;
  slaDueAt?: string;
  isOverdue: boolean;
  reopenCount: number;
  // Updates timeline
  updates: ComplaintUpdate[];
  // Feedback
  citizenRating?: 1 | 2 | 3 | 4 | 5;
  citizenFeedback?: string;
}

// ============================================================
// Notification
// ============================================================

export type NotificationType =
  | 'complaint_status_update'
  | 'complaint_assigned'
  | 'complaint_escalated'
  | 'complaint_resolved'
  | 'new_complaint'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  complaintId?: string;
  complaintRef?: string;
  isRead: boolean;
  createdAt: string;
}

// ============================================================
// Dashboard KPI types
// ============================================================

export interface KPISummary {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  escalated: number;
  rejected: number;
  closed: number;
  overdue?: number;
}

export interface CategoryBreakdown {
  category: ComplaintCategory;
  count: number;
  percentage: number;
}

export interface DailyTrend {
  date: string; // e.g. 'Mon', 'Tue'
  count: number;
}

export interface UnitBreakdown {
  id: string;
  name: string;
  total: number;
  open: number;
  resolved: number;
  overdue: number;
}
