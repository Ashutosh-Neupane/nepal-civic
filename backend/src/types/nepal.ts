import type { Model, ModelCtor } from 'sequelize/types';
import type {
  AppConfig,
  GovernmentLevel,
  GrievancePriority,
  JurisdictionAttributes,
  Models,
  PluginBase,
  ServiceRequestAttributes,
  ServiceRequestCommentAttributes,
  ServiceRequestStatus,
  StaffRole,
  StaffUserAttributes,
} from '.';

export interface ProvinceAttributes {
  id: number;
  name: string;
  nameNe: string;
  headquarter?: string;
  headquarterNe?: string;
}

export interface DistrictAttributes {
  id: number;
  provinceId: number;
  name: string;
  nameNe: string;
  headquarter?: string;
  headquarterNe?: string;
}

export type CitizenLanguage = 'en' | 'ne';

export interface CitizenUserAttributes {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  passwordHash?: string;
  preferredLanguage: CitizenLanguage;
  provinceId?: number | null;
  districtId?: number | null;
  jurisdictionId?: string | null;
  wardNo?: number | null;
  phoneVerifiedAt?: Date | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OtpPurpose = 'register' | 'reset_password' | 'login';

export interface OtpCodeAttributes {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt?: Date | null;
  createdAt?: Date;
}

export type NotificationRecipientType = 'citizen' | 'staff';

export type NotificationType =
  | 'complaint_status_update'
  | 'complaint_assigned'
  | 'complaint_escalated'
  | 'complaint_resolved'
  | 'new_complaint'
  | 'system';

export interface NotificationAttributes {
  id: string;
  recipientType: NotificationRecipientType;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  serviceRequestId?: string | null;
  serviceRequestPublicId?: string | null;
  isRead: boolean;
  createdAt?: Date;
}

export type ProvinceModel = ModelCtor<Model<ProvinceAttributes, Partial<ProvinceAttributes>>>;
export type DistrictModel = ModelCtor<Model<DistrictAttributes, Partial<DistrictAttributes>>>;
export type CitizenUserModel = ModelCtor<Model<CitizenUserAttributes, Partial<CitizenUserAttributes>>>;
export type OtpCodeModel = ModelCtor<Model<OtpCodeAttributes, Partial<OtpCodeAttributes>>>;
export type NotificationModel = ModelCtor<Model<NotificationAttributes, Partial<NotificationAttributes>>>;

// ------------------------------------------------------------
// Authentication
// ------------------------------------------------------------

export type ScopeLevel = GovernmentLevel | 'national';

/** The part of the federal structure a user is allowed to see and act on. */
export interface AuthScope {
  level: ScopeLevel;
  provinceId?: number | null;
  districtId?: number | null;
  jurisdictionId?: string | null;
  wardNo?: number | null;
}

export interface StaffAuth {
  kind: 'staff';
  id: string;
  role: StaffRole;
  scope: AuthScope;
  staff: StaffUserAttributes;
}

export interface CitizenAuth {
  kind: 'citizen';
  id: string;
  citizen: CitizenUserAttributes;
}

export type AuthContext = StaffAuth | CitizenAuth;

export interface AuthTokenPayload {
  sub: string;
  kind: 'staff' | 'citizen';
}

// ------------------------------------------------------------
// Grievances
// ------------------------------------------------------------

export interface GrievanceFilters {
  status?: ServiceRequestStatus[];
  category?: string[];
  priority?: GrievancePriority[];
  level?: GovernmentLevel[];
  provinceId?: number;
  districtId?: number;
  jurisdictionId?: string;
  wardNo?: number;
  citizenId?: string;
  assignedTo?: string;
  overdue?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface GrievanceListOptions {
  limit?: number;
  offset?: number;
}

export interface GrievanceCreateData {
  title: string;
  description: string;
  category: string;
  priority?: GrievancePriority;
  jurisdictionId: string;
  wardNo: number;
  lat?: number;
  lon?: number;
  address?: string;
  images?: string[];
  videos?: string[];
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export interface GrievanceSummary {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  escalated: number;
  rejected: number;
  closed: number;
  reopened: number;
  overdue: number;
}

export interface GrievanceBreakdownRow {
  key: string;
  count: number;
}

export interface GrievanceUnitRow {
  unitId: string;
  total: number;
  open: number;
  resolved: number;
  overdue: number;
  avgResolutionHours: number | null;
}

export interface GrievanceStats {
  summary: GrievanceSummary;
  byCategory: GrievanceBreakdownRow[];
  byLevel: GrievanceBreakdownRow[];
  dailyTrend: GrievanceBreakdownRow[];
  byUnit: GrievanceUnitRow[];
  unitLevel: GovernmentLevel | null;
  slaComplianceRate: number | null;
  avgResolutionHours: number | null;
  avgRating: number | null;
}

export type GrievanceRecord = ServiceRequestAttributes & {
  jurisdiction?: JurisdictionAttributes;
  comments: ServiceRequestCommentAttributes[];
};

export interface PublicGrievance {
  id: string;
  reference: string;
  title: string | null;
  category: string | null;
  status: ServiceRequestStatus;
  priority: GrievancePriority;
  currentLevel: GovernmentLevel;
  jurisdictionId: string;
  jurisdictionName: string | null;
  jurisdictionNameNe: string | null;
  districtId: number | null;
  provinceId: number | null;
  wardNo: number | null;
  lat: number;
  lon: number;
  createdAt: Date;
  resolvedAt: Date | null;
}

// ------------------------------------------------------------
// Repositories and services
// ------------------------------------------------------------

export interface NepalRepositoryBase extends PluginBase {
  models: Models;
  config: AppConfig;
}

export interface IGeoRepository extends NepalRepositoryBase {
  findProvinces: () => Promise<ProvinceAttributes[]>;
  findProvince: (id: number) => Promise<ProvinceAttributes | null>;
  findDistricts: (provinceId?: number) => Promise<DistrictAttributes[]>;
  findDistrict: (id: number) => Promise<DistrictAttributes | null>;
  findLocalLevels: (districtId: number) => Promise<JurisdictionAttributes[]>;
  findLocalLevel: (id: string) => Promise<JurisdictionAttributes | null>;
}

export interface ICitizenUserRepository extends NepalRepositoryBase {
  create: (data: Partial<CitizenUserAttributes>) => Promise<CitizenUserAttributes>;
  findOne: (id: string) => Promise<CitizenUserAttributes | null>;
  findByPhone: (phone: string, withPassword?: boolean) => Promise<CitizenUserAttributes | null>;
  findByEmail: (email: string, withPassword?: boolean) => Promise<CitizenUserAttributes | null>;
  update: (id: string, data: Partial<CitizenUserAttributes>) => Promise<CitizenUserAttributes>;
}

export interface IOtpCodeRepository extends NepalRepositoryBase {
  create: (data: Partial<OtpCodeAttributes>) => Promise<OtpCodeAttributes>;
  countRecent: (phone: string, purpose: OtpPurpose, since: Date) => Promise<number>;
  findLatestActive: (phone: string, purpose: OtpPurpose, now: Date) => Promise<OtpCodeAttributes | null>;
  recordAttempt: (id: string) => Promise<void>;
  consume: (id: string) => Promise<void>;
}

export interface INotificationRepository extends NepalRepositoryBase {
  createMany: (data: Partial<NotificationAttributes>[]) => Promise<NotificationAttributes[]>;
  findForRecipient: (
    recipientType: NotificationRecipientType, recipientId: string, limit: number
  ) => Promise<[NotificationAttributes[], number]>;
  markRead: (recipientType: NotificationRecipientType, recipientId: string, id: string) => Promise<boolean>;
  markAllRead: (recipientType: NotificationRecipientType, recipientId: string) => Promise<number>;
}

export interface IGrievanceRepository extends NepalRepositoryBase {
  findAll: (
    filters: GrievanceFilters, scope: AuthScope | null, options?: GrievanceListOptions
  ) => Promise<[ServiceRequestAttributes[], number]>;
  findOne: (id: string) => Promise<GrievanceRecord | null>;
  findOneByReference: (reference: string) => Promise<GrievanceRecord | null>;
  findPublic: (filters: GrievanceFilters, limit: number) => Promise<PublicGrievance[]>;
  findOverdue: (now: Date, limit: number) => Promise<ServiceRequestAttributes[]>;
  findResolvedBefore: (cutoff: Date, limit: number) => Promise<ServiceRequestAttributes[]>;
  updateWorkflowFields: (id: string, data: Partial<ServiceRequestAttributes>) => Promise<void>;
  getStats: (filters: GrievanceFilters, scope: AuthScope | null, now: Date) => Promise<GrievanceStats>;
  findStaffForUnit: (
    level: GovernmentLevel, record: ServiceRequestAttributes
  ) => Promise<StaffUserAttributes[]>;
}

export interface IAuthService {
  config: AppConfig;
  requestOtp: (phone: string, purpose: OtpPurpose) => Promise<{ expiresAt: Date; devCode?: string }>;
  registerCitizen: (data: Record<string, unknown>) => Promise<[CitizenUserAttributes, string]>;
  loginCitizen: (identifier: string, password: string) => Promise<[CitizenUserAttributes, string]>;
  loginStaff: (email: string, password: string) => Promise<[StaffUserAttributes, string]>;
  resetCitizenPassword: (phone: string, code: string, password: string) => Promise<void>;
  authenticateToken: (token: string) => Promise<AuthContext | null>;
}

export interface INotificationService {
  notifyCitizen: (
    record: ServiceRequestAttributes, type: NotificationType, title: string, body: string
  ) => Promise<void>;
  notifyStaff: (
    staffIds: string[], record: ServiceRequestAttributes, type: NotificationType, title: string, body: string
  ) => Promise<void>;
  notifyLevel: (
    level: GovernmentLevel, record: ServiceRequestAttributes, type: NotificationType, title: string, body: string
  ) => Promise<void>;
}

export interface IGrievanceService {
  create: (auth: AuthContext, data: GrievanceCreateData) => Promise<GrievanceRecord>;
  changeStatus: (
    auth: StaffAuth, id: string, status: ServiceRequestStatus, note?: string, resolutionImages?: string[]
  ) => Promise<GrievanceRecord>;
  assign: (auth: StaffAuth, id: string, staffUserId: string | null, departmentId?: string | null) => Promise<GrievanceRecord>;
  escalate: (auth: StaffAuth | null, id: string, note?: string) => Promise<GrievanceRecord>;
  confirm: (auth: CitizenAuth, id: string, note?: string) => Promise<GrievanceRecord>;
  reopen: (auth: CitizenAuth, id: string, note: string) => Promise<GrievanceRecord>;
  feedback: (auth: CitizenAuth, id: string, rating: number, feedback?: string) => Promise<GrievanceRecord>;
  addComment: (auth: AuthContext, id: string, comment: string, isPublic: boolean, images?: string[]) => Promise<GrievanceRecord>;
  runEscalationSweep: (now: Date) => Promise<number>;
  runAutoCloseSweep: (now: Date) => Promise<number>;
}

export interface NepalRepositories {
  geoRepository: IGeoRepository;
  citizenUserRepository: ICitizenUserRepository;
  otpCodeRepository: IOtpCodeRepository;
  notificationRepository: INotificationRepository;
  grievanceRepository: IGrievanceRepository;
}

export interface NepalServices {
  authService: IAuthService;
  notificationService: INotificationService;
  grievanceService: IGrievanceService;
}
