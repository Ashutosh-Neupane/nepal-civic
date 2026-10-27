import { api } from './api';
import { levelToEscalation } from './escalationService';
import { getDistrict, getProvince } from './jurisdictionService';
import type {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintUpdate,
  GovernmentLevel,
  Role,
} from '@/types';

export interface ComplaintFilterOptions {
  status?: ComplaintStatus | ComplaintStatus[] | 'all';
  category?: ComplaintCategory | 'all';
  priority?: ComplaintPriority | 'all';
  level?: GovernmentLevel | 'all';
  search?: string;
  provinceId?: number;
  districtId?: number;
  jurisdictionId?: string;
  wardNo?: number;
  isEscalated?: boolean;
  overdue?: boolean;
  mine?: boolean;
  limit?: number;
  offset?: number;
}

/** Grievance as returned by the backend's serializeGrievance. */
interface ApiGrievance {
  id: string;
  reference: string;
  title: string | null;
  description: string;
  category: ComplaintCategory | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  currentLevel: GovernmentLevel;
  jurisdictionId: string;
  jurisdictionName: string | null;
  jurisdictionNameNe: string | null;
  wardNo: number | null;
  districtId: number | null;
  provinceId: number | null;
  lat: number | null;
  lon: number | null;
  address: string | null;
  images: string[];
  videos: string[];
  resolutionImages: string[];
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToDesignation: string | null;
  departmentName: string | null;
  citizenId: string | null;
  submitterName: string | null;
  submitterPhone?: string | null;
  submitterEmail?: string | null;
  escalationCount: number;
  escalatedAt: string | null;
  reopenCount: number;
  slaDueAt: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  citizenConfirmedAt: string | null;
  citizenConfirmationNote: string | null;
  citizenRating: number | null;
  citizenFeedback: string | null;
  comments?: {
    id: string;
    comment: string;
    addedBy?: string;
    addedByName?: string;
    isPublic: boolean;
    newStatus: ComplaintStatus | null;
    level: GovernmentLevel | null;
    images: string[];
    createdAt: string;
  }[];
}

export function mapApiToComplaint(row: ApiGrievance): Complaint {
  // Each timeline entry shows the status the grievance had after it.
  let lastStatus: ComplaintStatus = 'pending';
  const updates: ComplaintUpdate[] = [...(row.comments || [])]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((comment) => {
      if (comment.newStatus) lastStatus = comment.newStatus;
      return {
        id: comment.id,
        complaintId: row.id,
        timestamp: comment.createdAt,
        status: lastStatus,
        note: comment.comment,
        updatedBy: comment.addedBy || '',
        updatedByName: comment.addedByName || 'Office',
        isPublic: comment.isPublic,
        level: comment.level || undefined,
        images: comment.images || [],
      };
    });

  const hasPoint = row.lat !== null && row.lon !== null && !(Number(row.lat) === 0 && Number(row.lon) === 0);
  const district = getDistrict(row.districtId);
  const province = getProvince(row.provinceId);

  return {
    id: row.id,
    referenceId: row.reference,
    title: row.title || row.description.slice(0, 80),
    description: row.description,
    category: row.category || 'other',
    status: row.status,
    priority: row.priority || 'medium',
    citizenId: row.citizenId || '',
    citizenName: row.submitterName || 'Citizen',
    citizenPhone: row.submitterPhone || undefined,
    citizenEmail: row.submitterEmail || undefined,
    location: {
      lat: hasPoint ? Number(row.lat) : NaN,
      lng: hasPoint ? Number(row.lon) : NaN,
      address: row.address || undefined,
    },
    wardNo: row.wardNo || 0,
    wardLabel: row.wardNo ? `Ward ${row.wardNo}` : '',
    jurisdictionId: row.jurisdictionId,
    jurisdictionName: row.jurisdictionName || row.jurisdictionId,
    jurisdictionNameNe: row.jurisdictionNameNe || undefined,
    districtId: row.districtId || 0,
    districtName: district?.name || '',
    provinceId: row.provinceId || 0,
    provinceName: province?.name || '',
    photoUrls: row.images || [],
    videoUrls: row.videos || [],
    resolutionPhotoUrls: row.resolutionImages || [],
    assignedTo: row.assignedTo || undefined,
    assignedToName: row.assignedToName
      ? `${row.assignedToName}${row.assignedToDesignation ? `, ${row.assignedToDesignation}` : ''}`
      : undefined,
    assignedDepartment: row.departmentName || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resolvedAt: row.resolvedAt || undefined,
    closedAt: row.closedAt || undefined,
    citizenConfirmedAt: row.citizenConfirmedAt || undefined,
    citizenConfirmationNote: row.citizenConfirmationNote || undefined,
    currentLevel: row.currentLevel || 'ward',
    escalationLevel: levelToEscalation(row.currentLevel || 'ward'),
    escalationCount: row.escalationCount || 0,
    escalatedAt: row.escalatedAt || undefined,
    slaDueAt: row.slaDueAt || undefined,
    isOverdue: !!row.isOverdue,
    reopenCount: row.reopenCount || 0,
    updates,
    citizenRating: (row.citizenRating || undefined) as Complaint['citizenRating'],
    citizenFeedback: row.citizenFeedback || undefined,
  };
}

function toQuery(filters: ComplaintFilterOptions): Record<string, string | number | boolean | undefined> {
  let status: string | undefined;
  if (filters.isEscalated) status = 'escalated';
  else if (Array.isArray(filters.status)) status = filters.status.join(',');
  else if (filters.status && filters.status !== 'all') status = filters.status;
  return {
    status,
    category: filters.category && filters.category !== 'all' ? filters.category : undefined,
    priority: filters.priority && filters.priority !== 'all' ? filters.priority : undefined,
    level: filters.level && filters.level !== 'all' ? filters.level : undefined,
    q: filters.search?.trim() || undefined,
    provinceId: filters.provinceId,
    districtId: filters.districtId,
    jurisdictionId: filters.jurisdictionId,
    wardNo: filters.wardNo,
    overdue: filters.overdue || undefined,
    mine: filters.mine || undefined,
    limit: filters.limit ?? 200,
    offset: filters.offset,
  };
}

/**
 * Grievances visible to the signed-in user: citizens see their own, officers
 * see those inside their ward, Palika, district or province.
 */
export async function getComplaints(filters: ComplaintFilterOptions = {}): Promise<Complaint[]> {
  const { data } = await api.get<ApiGrievance[]>('/grievances', toQuery(filters));
  return data.map(mapApiToComplaint);
}

export async function getComplaintPage(
  filters: ComplaintFilterOptions = {}
): Promise<{ complaints: Complaint[]; total: number }> {
  const response = await api.get<ApiGrievance[]>('/grievances', toQuery(filters));
  return { complaints: response.data.map(mapApiToComplaint), total: response.count ?? response.data.length };
}

/**
 * The backend has no push channel, so "subscriptions" poll. Polling pauses while
 * the tab is hidden and runs once when it becomes visible again.
 */
export function subscribeToComplaints(onUpdate: () => void, intervalMs = 30000): () => void {
  const timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') onUpdate();
  }, intervalMs);
  const onVisible = () => {
    if (document.visibilityState === 'visible') onUpdate();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Looks up a grievance by id or by reference (e.g. LG307-1042). */
export async function getComplaintById(idOrRef: string): Promise<Complaint | null> {
  try {
    const path = UUID.test(idOrRef)
      ? `/grievances/${idOrRef}`
      : `/grievances/reference/${encodeURIComponent(idOrRef)}`;
    const { data } = await api.get<ApiGrievance>(path);
    return mapApiToComplaint(data);
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
}

export interface CreateComplaintData {
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  jurisdictionId: string;
  wardNo: number;
  location?: { lat: number; lng: number; address?: string };
  address?: string;
  photoUrls?: string[];
  videoUrls?: string[];
  /** Officers registering a walk-in grievance on a citizen's behalf. */
  submitter?: { firstName?: string; lastName?: string; phone?: string; email?: string };
}

export async function createComplaint(data: CreateComplaintData): Promise<Complaint> {
  const hasPoint = data.location && Number.isFinite(data.location.lat) && Number.isFinite(data.location.lng);
  const { data: created } = await api.post<ApiGrievance>('/grievances', {
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    priority: data.priority,
    jurisdictionId: data.jurisdictionId,
    wardNo: data.wardNo,
    lat: hasPoint ? data.location?.lat : undefined,
    lon: hasPoint ? data.location?.lng : undefined,
    address: data.address || data.location?.address || undefined,
    images: data.photoUrls || [],
    videos: data.videoUrls || [],
    ...(data.submitter || {}),
  });
  return mapApiToComplaint(created);
}

type Actor = { uid: string; fullName: string; role: Role };

export async function updateComplaintStatus(
  complaintId: string,
  targetStatus: ComplaintStatus,
  note: string,
  _user?: Actor,
  resolutionPhotoUrls?: string[]
): Promise<Complaint> {
  const { data } = await api.post<ApiGrievance>(`/grievances/${complaintId}/status`, {
    status: targetStatus,
    note: note?.trim() || undefined,
    resolutionImages: resolutionPhotoUrls,
  });
  return mapApiToComplaint(data);
}

export async function assignComplaint(
  complaintId: string,
  officerId: string | null,
  _officerName?: string,
  _assigner?: Actor,
  _actionNote?: string,
  departmentId?: string
): Promise<Complaint> {
  const { data } = await api.post<ApiGrievance>(`/grievances/${complaintId}/assign`, {
    staffUserId: officerId,
    departmentId: departmentId || undefined,
  });
  return mapApiToComplaint(data);
}

export async function escalateComplaint(complaintId: string, reason: string, _escalator?: Actor): Promise<Complaint> {
  const { data } = await api.post<ApiGrievance>(`/grievances/${complaintId}/escalate`, { note: reason });
  return mapApiToComplaint(data);
}

export async function confirmComplaintResolution(
  complaintId: string,
  _citizenUser?: { uid: string; fullName: string },
  confirmationNote?: string
): Promise<Complaint> {
  const { data } = await api.post<ApiGrievance>(`/grievances/${complaintId}/confirm`, { note: confirmationNote });
  return mapApiToComplaint(data);
}

export async function reopenComplaint(
  complaintId: string,
  reason: string,
  _citizenUser?: { uid: string; fullName: string }
): Promise<Complaint> {
  const { data } = await api.post<ApiGrievance>(`/grievances/${complaintId}/reopen`, { note: reason });
  return mapApiToComplaint(data);
}

export async function submitComplaintFeedback(
  complaintId: string,
  rating: 1 | 2 | 3 | 4 | 5,
  feedbackText: string,
  _citizenUser?: { uid: string; fullName: string }
): Promise<Complaint> {
  const { data } = await api.post<ApiGrievance>(`/grievances/${complaintId}/feedback`, {
    rating,
    feedback: feedbackText,
  });
  return mapApiToComplaint(data);
}

export async function addComplaintComment(
  complaintId: string,
  comment: string,
  isPublic = true,
  images?: string[]
): Promise<Complaint> {
  const { data } = await api.post<ApiGrievance>(`/grievances/${complaintId}/comments`, { comment, isPublic, images });
  return mapApiToComplaint(data);
}

// ---- public map (no login, no personal details) ---------------------------

export interface PublicComplaint {
  id: string;
  reference: string;
  title: string | null;
  category: ComplaintCategory | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  currentLevel: GovernmentLevel;
  jurisdictionId: string;
  jurisdictionName: string | null;
  wardNo: number | null;
  lat: number;
  lon: number;
  createdAt: string;
}

export async function getPublicComplaints(filters: ComplaintFilterOptions = {}): Promise<PublicComplaint[]> {
  const { data } = await api.get<PublicComplaint[]>('/grievances/public', toQuery({ ...filters, limit: filters.limit ?? 500 }));
  return data;
}
