import { inject, injectable } from 'inversify';
import logger from '../../logging';
import { HttpError } from '../../middlewares';
import { appIds } from '../../registry/service-identifiers';
import type {
  AppConfig,
  AuditedStateChangeExtraData,
  AuthContext,
  CitizenAuth,
  GovernmentLevel,
  GrievanceCreateData,
  GrievancePriority,
  GrievanceRecord,
  IGrievanceService,
  IServiceRequestHookRunner,
  Repositories,
  ServiceRequestAttributes,
  ServiceRequestStatus,
  Services,
  StaffAuth,
  StaffUserAttributes
} from '../../types';
import { nextLevel, scopeCanActOnGrievance, scopeCoversGrievance, scopeForStaff } from '../auth/scope';
import {
  CATEGORY_KEYS,
  LEVEL_LABELS,
  makeReference,
  NEPAL_BOUNDS,
  OFFICER_STATUS_TRANSITIONS,
  PRIORITY_KEYS,
  serviceIdFor,
  slaDeadline,
  STATUS_LABELS_NE,
  STATUSES_REQUIRING_NOTE,
  SUPER_ADMIN_STATUSES,
  TERMINAL_STATUSES
} from './constants';

const MAX_ATTACHMENTS = 10;
const SWEEP_BATCH = 200;

function cleanText(value: unknown, field: string, min: number, max: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min) { throw new HttpError(400, `${field} must be at least ${min} characters.`); }
  if (text.length > max) { throw new HttpError(400, `${field} must be at most ${max} characters.`); }
  return text;
}

function cleanAttachments(value: unknown, field: string): string[] {
  if (value === undefined || value === null) { return []; }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item || item.length > 500)) {
    throw new HttpError(400, `${field} must be a list of uploaded file names.`);
  }
  if (value.length > MAX_ATTACHMENTS) { throw new HttpError(400, `At most ${MAX_ATTACHMENTS} ${field} are allowed.`); }
  return value as string[];
}

function splitName(fullName: string): [string, string] {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? [parts.slice(0, -1).join(' '), parts[parts.length - 1]] : [parts[0], ''];
}

/** A stand-in "user" so govflow's audit messages name the citizen or the system. */
function actorFor(name: string, id: string): StaffUserAttributes {
  return { id, displayName: name } as StaffUserAttributes;
}

@injectable()
export class GrievanceService implements IGrievanceService {

  repositories: Repositories;
  config: AppConfig;
  hookRunner: IServiceRequestHookRunner;
  services: Partial<Services> = {};

  constructor(
    @inject(appIds.Repositories) repositories: Repositories,
    @inject(appIds.AppConfig) config: AppConfig,
    @inject(appIds.ServiceRequestHookRunner) hookRunner: IServiceRequestHookRunner,
  ) {
    this.repositories = repositories;
    this.config = config;
    this.hookRunner = hookRunner;
  }

  /** Called once all services exist, since this service builds on the others. */
  attachServices(services: Services): void {
    this.services = services;
  }

  private get serviceRequestService() {
    if (!this.services.serviceRequestService) { throw new Error('GrievanceService is not wired.'); }
    return this.services.serviceRequestService;
  }

  private get notificationService() {
    if (!this.services.notificationService) { throw new Error('GrievanceService is not wired.'); }
    return this.services.notificationService;
  }

  private async load(id: string): Promise<GrievanceRecord> {
    const { grievanceRepository } = this.repositories;
    const record = await grievanceRepository.findOne(id);
    if (!record) { throw new HttpError(404, 'Grievance not found.'); }
    return record;
  }

  private reference(record: ServiceRequestAttributes): string {
    return makeReference(record.jurisdictionId, record.publicId);
  }

  private async addTimelineEntry(
    record: ServiceRequestAttributes,
    comment: string,
    actorName: string,
    actorId: string | undefined,
    newStatus?: ServiceRequestStatus,
    images?: string[],
  ): Promise<void> {
    const { serviceRequestRepository } = this.repositories;
    await serviceRequestRepository.createComment(record.jurisdictionId, record.id, {
      comment,
      addedBy: actorId,
      addedByName: actorName,
      isPublic: true,
      newStatus,
      level: record.currentLevel,
      images: images && images.length ? images : undefined,
    });
  }

  private async setStatus(
    record: ServiceRequestAttributes, status: ServiceRequestStatus, actor: StaffUserAttributes | undefined
  ): Promise<void> {
    await this.serviceRequestService.createAuditedStateChange(
      record.jurisdictionId, record.id, 'status', status, { user: actor } as AuditedStateChangeExtraData
    );
  }

  private assertCanAct(auth: StaffAuth, record: ServiceRequestAttributes): void {
    if (!scopeCoversGrievance(auth.scope, record)) { throw new HttpError(404, 'Grievance not found.'); }
    if (!scopeCanActOnGrievance(auth.scope, record)) {
      throw new HttpError(403, `This grievance is now with the ${LEVEL_LABELS[record.currentLevel].en}.`);
    }
  }

  private assertOwner(auth: CitizenAuth, record: ServiceRequestAttributes): void {
    if (record.citizenId !== auth.id) { throw new HttpError(404, 'Grievance not found.'); }
  }

  /** Notify the officers who should now act: the given level, or the next level up if nobody holds it. */
  private async notifyResponsibleOfficers(
    record: ServiceRequestAttributes, title: string, body: string, type: 'new_complaint' | 'complaint_escalated' | 'complaint_status_update'
  ): Promise<void> {
    const { grievanceRepository } = this.repositories;
    let level: GovernmentLevel | null = record.currentLevel;
    while (level) {
      const staff = await grievanceRepository.findStaffForUnit(level, record);
      if (staff.length) {
        await this.notificationService.notifyStaff(staff.map((s) => s.id), record, type, title, body);
        return;
      }
      level = nextLevel(level);
    }
    logger.warn(`No officer found to notify for grievance ${record.id}`);
  }

  async create(auth: AuthContext, data: GrievanceCreateData): Promise<GrievanceRecord> {
    const { geoRepository, serviceRepository } = this.repositories;
    const title = cleanText(data.title, 'Title', 5, 150);
    const description = cleanText(data.description, 'Description', 10, 5000);
    if (!CATEGORY_KEYS.includes(data.category)) { throw new HttpError(400, 'Choose a valid category.'); }
    let priority: GrievancePriority = PRIORITY_KEYS.includes(data.priority as GrievancePriority)
      ? data.priority as GrievancePriority
      : 'medium';
    // Disasters are never low priority.
    if (data.category === 'disaster_mgmt' && (priority === 'low' || priority === 'medium')) {
      priority = 'high';
    }

    const localLevel = await geoRepository.findLocalLevel(String(data.jurisdictionId || ''));
    if (!localLevel) { throw new HttpError(400, 'Choose a valid municipality.'); }
    const wardNo = Number(data.wardNo);
    if (!Number.isInteger(wardNo) || wardNo < 1 || wardNo > (localLevel.wardCount || 0)) {
      throw new HttpError(400, `Ward must be between 1 and ${localLevel.wardCount}.`);
    }

    const hasPoint = data.lat !== undefined && data.lat !== null && data.lon !== undefined && data.lon !== null;
    const lat = hasPoint ? Number(data.lat) : 0;
    const lon = hasPoint ? Number(data.lon) : 0;
    if (hasPoint && !(lat >= NEPAL_BOUNDS.minLat && lat <= NEPAL_BOUNDS.maxLat
      && lon >= NEPAL_BOUNDS.minLon && lon <= NEPAL_BOUNDS.maxLon)) {
      throw new HttpError(400, 'The location must be inside Nepal.');
    }
    const address = typeof data.address === 'string' && data.address.trim() ? data.address.trim().slice(0, 250) : null;
    if (!hasPoint && !address) { throw new HttpError(400, 'Add a location on the map or an address.'); }

    let submitter: Partial<ServiceRequestAttributes>;
    let actorName: string;
    if (auth.kind === 'citizen') {
      const [firstName, lastName] = splitName(auth.citizen.fullName);
      submitter = {
        citizenId: auth.id,
        firstName,
        lastName,
        phone: auth.citizen.phone,
        email: auth.citizen.email ?? undefined,
      };
      actorName = auth.citizen.fullName;
    } else {
      // An officer registering a walk-in or phone grievance on a citizen's behalf.
      const record = { jurisdictionId: localLevel.id, districtId: localLevel.districtId, provinceId: localLevel.provinceId, wardNo };
      if (!scopeCoversGrievance(auth.scope, record as ServiceRequestAttributes)) {
        throw new HttpError(403, 'You can only register grievances in your own area.');
      }
      submitter = {
        firstName: typeof data.firstName === 'string' ? data.firstName.trim() : undefined,
        lastName: typeof data.lastName === 'string' ? data.lastName.trim() : undefined,
        phone: data.phone,
        email: data.email,
      };
      actorName = auth.staff.displayName;
    }

    const serviceId = serviceIdFor(localLevel.id, data.category);
    const service = await serviceRepository.findOne(localLevel.id, serviceId);
    const now = new Date();
    const created = await this.serviceRequestService.create({
      ...submitter,
      jurisdictionId: localLevel.id,
      provinceId: localLevel.provinceId,
      districtId: localLevel.districtId,
      wardNo,
      title,
      description,
      category: data.category,
      serviceId: service ? serviceId : undefined,
      priority,
      lat,
      lon,
      address: address as string,
      images: cleanAttachments(data.images, 'photos'),
      videos: cleanAttachments(data.videos, 'videos'),
      inputChannel: 'webform',
      status: 'pending',
      currentLevel: 'ward',
      slaDueAt: slaDeadline(priority, now),
    });

    await this.addTimelineEntry(created, 'Grievance registered.', actorName, auth.id, 'pending');
    const reference = this.reference(created);
    await this.notifyResponsibleOfficers(
      created, `New grievance ${reference}`, `${title} — Ward ${wardNo}, ${localLevel.name}`, 'new_complaint'
    );
    await this.notificationService.notifyCitizen(
      created, 'complaint_status_update', `गुनासो ${reference} दर्ता भयो / Grievance ${reference} registered`,
      `तपाईंको गुनासो "${title}" ${localLevel.nameNe} वडा नं. ${wardNo} मा पठाइयो। `
        + `Your grievance was sent to Ward ${wardNo}, ${localLevel.name}.`
    );
    return await this.load(created.id);
  }

  async changeStatus(
    auth: StaffAuth, id: string, status: ServiceRequestStatus, note?: string, resolutionImages?: string[]
  ): Promise<GrievanceRecord> {
    const { grievanceRepository } = this.repositories;
    const record = await this.load(id);
    this.assertCanAct(auth, record);
    if (status === record.status) { throw new HttpError(400, 'The grievance already has this status.'); }
    if (TERMINAL_STATUSES.includes(record.status)) { throw new HttpError(400, 'This grievance is already closed.'); }
    const allowed = auth.scope.level === 'national'
      ? SUPER_ADMIN_STATUSES
      : OFFICER_STATUS_TRANSITIONS[record.status] || [];
    if (!allowed.includes(status)) {
      throw new HttpError(400, `Cannot change status from ${record.status} to ${status}.`);
    }
    const text = typeof note === 'string' ? note.trim() : '';
    if (STATUSES_REQUIRING_NOTE.includes(status) && text.length < 5) {
      throw new HttpError(400, 'Write a short note explaining this change.');
    }
    const images = cleanAttachments(resolutionImages, 'resolution photos');
    if (status === 'resolved' && images.length) {
      await grievanceRepository.updateWorkflowFields(record.id, { resolutionImages: images });
    }

    await this.setStatus(record, status, auth.staff);
    const updated = await this.load(id);
    await this.addTimelineEntry(
      updated, text || `Status changed to ${status.replace('_', ' ')}.`, auth.staff.displayName, auth.id, status,
      status === 'resolved' ? images : undefined,
    );

    const reference = this.reference(updated);
    if (status === 'resolved') {
      await this.notificationService.notifyCitizen(
        updated, 'complaint_resolved', `गुनासो ${reference} समाधान भयो / Grievance ${reference} resolved`,
        `${text} कृपया काम पुष्टि गर्नुहोस्, समस्या बाँकी भए गुनासो पुनः खोल्नुहोस्। `
          + 'Please confirm the work, or reopen the grievance if the problem remains.'
      );
    } else {
      await this.notificationService.notifyCitizen(
        updated, 'complaint_status_update',
        `गुनासो ${reference}: ${STATUS_LABELS_NE[status] ?? status} / ${status.replace('_', ' ')}`,
        text || `तपाईंको गुनासोको स्थिति "${STATUS_LABELS_NE[status] ?? status}" भयो। `
          + `The status of your grievance changed to ${status.replace('_', ' ')}.`
      );
    }
    return await this.load(id);
  }

  async assign(
    auth: StaffAuth, id: string, staffUserId: string | null, departmentId?: string | null
  ): Promise<GrievanceRecord> {
    const { staffUserRepository, departmentRepository } = this.repositories;
    const record = await this.load(id);
    this.assertCanAct(auth, record);
    if (TERMINAL_STATUSES.includes(record.status) || record.status === 'resolved') {
      throw new HttpError(400, 'Closed or resolved grievances cannot be reassigned.');
    }
    let assignee: StaffUserAttributes | null = null;
    if (staffUserId) {
      assignee = await staffUserRepository.findById(staffUserId);
      if (!assignee || assignee.isActive === false || !scopeCoversGrievance(scopeForStaff(assignee), record)) {
        throw new HttpError(400, 'This officer cannot be assigned to this grievance.');
      }
    }
    if (departmentId) {
      const department = await departmentRepository.findOne(record.jurisdictionId, departmentId);
      if (!department) { throw new HttpError(400, 'Unknown department.'); }
    }

    const result = await this.serviceRequestService.createAuditedStateChange(
      record.jurisdictionId, record.id, 'assignedTo', staffUserId || '',
      { user: auth.staff, departmentId: departmentId || undefined } as AuditedStateChangeExtraData
    );
    if (!result) {
      throw new HttpError(400, 'In this municipality, officers must be assigned through their department.');
    }
    if (assignee && ['pending', 'escalated', 'reopened'].includes(record.status)) {
      await this.setStatus(record, 'assigned', auth.staff);
    }
    const updated = await this.load(id);
    if (assignee) {
      await this.addTimelineEntry(
        updated, `Assigned to ${assignee.displayName}${assignee.designation ? `, ${assignee.designation}` : ''}.`,
        auth.staff.displayName, auth.id, updated.status
      );
      await this.notificationService.notifyStaff(
        [assignee.id], updated, 'complaint_assigned', `Grievance ${this.reference(updated)} assigned to you`,
        updated.title || updated.description.slice(0, 120)
      );
      await this.notificationService.notifyCitizen(
        updated, 'complaint_assigned', `गुनासो ${this.reference(updated)} जिम्मा लगाइयो / Grievance assigned`,
        'तपाईंको गुनासोमा अधिकृत तोकिनुभएको छ। An officer has been assigned to your grievance.'
      );
    }
    return updated;
  }

  async escalate(auth: StaffAuth | null, id: string, note?: string): Promise<GrievanceRecord> {
    const { grievanceRepository } = this.repositories;
    const record = await this.load(id);
    if (auth) { this.assertCanAct(auth, record); }
    if (TERMINAL_STATUSES.includes(record.status) || record.status === 'resolved') {
      throw new HttpError(400, 'Only open grievances can be escalated.');
    }
    const target = nextLevel(record.currentLevel);
    if (!target) { throw new HttpError(400, 'This grievance is already at the province level.'); }
    const text = typeof note === 'string' ? note.trim() : '';
    if (auth && text.length < 5) { throw new HttpError(400, 'Write a short reason for escalating.'); }

    const now = new Date();
    await grievanceRepository.updateWorkflowFields(record.id, {
      currentLevel: target,
      escalationCount: (record.escalationCount || 0) + 1,
      escalatedAt: now,
      slaDueAt: slaDeadline(record.priority, now),
      assignedTo: null,
    } as unknown as Partial<ServiceRequestAttributes>);
    const actor = auth ? auth.staff : undefined;
    if (record.status !== 'escalated') {
      await this.setStatus(record, 'escalated', actor);
    }
    const updated = await this.load(id);
    const label = LEVEL_LABELS[target];
    const reason = text || 'The deadline passed without resolution.';
    await this.addTimelineEntry(
      updated, `Escalated to ${label.en} (${label.ne}). ${reason}`,
      auth ? auth.staff.displayName : 'System', auth?.id, 'escalated'
    );
    const reference = this.reference(updated);
    await this.notifyResponsibleOfficers(
      updated, `Grievance ${reference} escalated to you`, `${updated.title ?? ''} — ${reason}`, 'complaint_escalated'
    );
    await this.notificationService.notifyCitizen(
      updated, 'complaint_escalated', `गुनासो ${reference} माथि पठाइयो / Grievance ${reference} escalated`,
      `तपाईंको गुनासो ${label.ne}मा पठाइयो। Your grievance was escalated to the ${label.en}.`
    );
    return updated;
  }

  async confirm(auth: CitizenAuth, id: string, note?: string): Promise<GrievanceRecord> {
    const { grievanceRepository } = this.repositories;
    const record = await this.load(id);
    this.assertOwner(auth, record);
    if (record.status !== 'resolved') { throw new HttpError(400, 'Only resolved grievances can be confirmed.'); }
    const text = typeof note === 'string' ? note.trim().slice(0, 2000) : '';
    await grievanceRepository.updateWorkflowFields(record.id, {
      citizenConfirmedAt: new Date(),
      citizenConfirmationNote: text || null,
    });
    await this.setStatus(record, 'closed', actorFor(auth.citizen.fullName, auth.id));
    const updated = await this.load(id);
    await this.addTimelineEntry(
      updated, text || 'Citizen confirmed the grievance is resolved.', auth.citizen.fullName, auth.id, 'closed'
    );
    if (updated.assignedTo) {
      await this.notificationService.notifyStaff(
        [updated.assignedTo], updated, 'complaint_status_update',
        `Grievance ${this.reference(updated)} confirmed by citizen`, text || 'The citizen confirmed the resolution.'
      );
    }
    return updated;
  }

  async reopen(auth: CitizenAuth, id: string, note: string): Promise<GrievanceRecord> {
    const { grievanceRepository } = this.repositories;
    const record = await this.load(id);
    this.assertOwner(auth, record);
    if (record.status !== 'resolved') { throw new HttpError(400, 'Only resolved grievances can be reopened.'); }
    const text = cleanText(note, 'Reason', 5, 2000);
    const now = new Date();
    await grievanceRepository.updateWorkflowFields(record.id, {
      reopenCount: (record.reopenCount || 0) + 1,
      slaDueAt: slaDeadline(record.priority, now),
    });
    await this.setStatus(record, 'reopened', actorFor(auth.citizen.fullName, auth.id));
    const updated = await this.load(id);
    await this.addTimelineEntry(updated, text, auth.citizen.fullName, auth.id, 'reopened');
    const reference = this.reference(updated);
    if (updated.assignedTo) {
      await this.notificationService.notifyStaff(
        [updated.assignedTo], updated, 'complaint_status_update', `Grievance ${reference} reopened`, text
      );
    }
    await this.notifyResponsibleOfficers(updated, `Grievance ${reference} reopened`, text, 'complaint_status_update');
    return updated;
  }

  async feedback(auth: CitizenAuth, id: string, rating: number, feedback?: string): Promise<GrievanceRecord> {
    const { grievanceRepository } = this.repositories;
    const record = await this.load(id);
    this.assertOwner(auth, record);
    if (!['resolved', 'closed'].includes(record.status)) {
      throw new HttpError(400, 'Feedback can be given once the grievance is resolved.');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) { throw new HttpError(400, 'Rating must be 1 to 5.'); }
    await grievanceRepository.updateWorkflowFields(record.id, {
      citizenRating: rating,
      citizenFeedback: typeof feedback === 'string' ? feedback.trim().slice(0, 2000) || null : null,
    });
    return await this.load(id);
  }

  async addComment(
    auth: AuthContext, id: string, comment: string, isPublic: boolean, images?: string[]
  ): Promise<GrievanceRecord> {
    const { serviceRequestRepository } = this.repositories;
    const record = await this.load(id);
    const text = cleanText(comment, 'Comment', 1, 2000);
    const attachments = cleanAttachments(images, 'photos');
    let actorName: string;
    let visibleToCitizen = isPublic;
    if (auth.kind === 'citizen') {
      this.assertOwner(auth, record);
      actorName = auth.citizen.fullName;
      visibleToCitizen = true;
    } else {
      if (!scopeCoversGrievance(auth.scope, record)) { throw new HttpError(404, 'Grievance not found.'); }
      actorName = auth.staff.displayName;
    }
    await serviceRequestRepository.createComment(record.jurisdictionId, record.id, {
      comment: text,
      addedBy: auth.id,
      addedByName: actorName,
      isPublic: visibleToCitizen,
      level: record.currentLevel,
      images: attachments.length ? attachments : undefined,
    });
    const reference = this.reference(record);
    if (auth.kind === 'citizen') {
      if (record.assignedTo) {
        await this.notificationService.notifyStaff(
          [record.assignedTo], record, 'complaint_status_update', `New message on grievance ${reference}`, text
        );
      } else {
        await this.notifyResponsibleOfficers(record, `New message on grievance ${reference}`, text, 'complaint_status_update');
      }
    } else if (visibleToCitizen) {
      await this.notificationService.notifyCitizen(
        record, 'complaint_status_update', `गुनासो ${reference} मा अद्यावधिक / Update on grievance ${reference}`, text
      );
    }
    return await this.load(id);
  }

  async runEscalationSweep(now: Date): Promise<number> {
    const { grievanceRepository } = this.repositories;
    const overdue = await grievanceRepository.findOverdue(now, SWEEP_BATCH);
    let escalated = 0;
    for (const record of overdue) {
      try {
        await this.escalate(null, record.id);
        escalated++;
      } catch (error) {
        logger.error(`Automatic escalation failed for ${record.id}: ${error}`);
      }
    }
    if (escalated) { logger.info(`Escalated ${escalated} overdue grievances.`); }
    return escalated;
  }

  async runAutoCloseSweep(now: Date): Promise<number> {
    const { grievanceRepository } = this.repositories;
    const days = this.config.resolvedAutoCloseDays;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const stale = await grievanceRepository.findResolvedBefore(cutoff, SWEEP_BATCH);
    let closed = 0;
    for (const record of stale) {
      try {
        await this.setStatus(record, 'closed', undefined);
        const updated = await this.load(record.id);
        await this.addTimelineEntry(
          updated, `Closed automatically: no response from the citizen within ${days} days of resolution.`,
          'System', undefined, 'closed'
        );
        closed++;
      } catch (error) {
        logger.error(`Automatic close failed for ${record.id}: ${error}`);
      }
    }
    if (closed) { logger.info(`Closed ${closed} resolved grievances without citizen response.`); }
    return closed;
  }

}
