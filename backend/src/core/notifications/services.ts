import { inject, injectable } from 'inversify';
import logger from '../../logging';
import { appIds } from '../../registry/service-identifiers';
import type {
  AppConfig,
  GovernmentLevel,
  INotificationService,
  NotificationType,
  Repositories,
  ServiceRequestAttributes
} from '../../types';

@injectable()
export class NotificationService implements INotificationService {

  repositories: Repositories;
  config: AppConfig;

  constructor(
    @inject(appIds.Repositories) repositories: Repositories,
    @inject(appIds.AppConfig) config: AppConfig,
  ) {
    this.repositories = repositories;
    this.config = config;
  }

  async notifyCitizen(
    record: ServiceRequestAttributes, type: NotificationType, title: string, body: string
  ): Promise<void> {
    if (!record.citizenId) { return; }
    await this.save('citizen', [record.citizenId], record, type, title, body);
  }

  async notifyStaff(
    staffIds: string[], record: ServiceRequestAttributes, type: NotificationType, title: string, body: string
  ): Promise<void> {
    await this.save('staff', staffIds, record, type, title, body);
  }

  /** Notify every active officer responsible for the grievance's area at a given level. */
  async notifyLevel(
    level: GovernmentLevel, record: ServiceRequestAttributes, type: NotificationType, title: string, body: string
  ): Promise<void> {
    const { grievanceRepository } = this.repositories;
    const staff = await grievanceRepository.findStaffForUnit(level, record);
    await this.save('staff', staff.map((s) => s.id), record, type, title, body);
  }

  private async save(
    recipientType: 'citizen' | 'staff',
    recipientIds: string[],
    record: ServiceRequestAttributes,
    type: NotificationType,
    title: string,
    body: string,
  ): Promise<void> {
    const { notificationRepository } = this.repositories;
    const unique = [...new Set(recipientIds.filter(Boolean))];
    try {
      await notificationRepository.createMany(unique.map((recipientId) => ({
        recipientType,
        recipientId,
        type,
        title,
        body,
        serviceRequestId: record.id,
        serviceRequestPublicId: record.publicId,
      })));
    } catch (error) {
      // In-app notifications must never block the grievance workflow.
      logger.error(`Could not save notifications: ${error}`);
    }
  }

}
