import { inject, injectable } from 'inversify';
import { appIds } from '../../registry/service-identifiers';
import type {
  AppConfig,
  INotificationRepository,
  Models,
  NotificationAttributes,
  NotificationRecipientType
} from '../../types';

@injectable()
export class NotificationRepository implements INotificationRepository {

  models: Models;
  config: AppConfig;

  constructor(
    @inject(appIds.Models) models: Models,
    @inject(appIds.AppConfig) config: AppConfig,
  ) {
    this.models = models;
    this.config = config;
  }

  async createMany(data: Partial<NotificationAttributes>[]): Promise<NotificationAttributes[]> {
    const { Notification } = this.models;
    if (data.length === 0) { return []; }
    return await Notification.bulkCreate(data) as unknown as NotificationAttributes[];
  }

  async findForRecipient(
    recipientType: NotificationRecipientType, recipientId: string, limit: number
  ): Promise<[NotificationAttributes[], number]> {
    const { Notification } = this.models;
    const records = await Notification.findAll({
      where: { recipientType, recipientId },
      order: [['createdAt', 'DESC']],
      limit,
    }) as unknown as NotificationAttributes[];
    const unread = await Notification.count({ where: { recipientType, recipientId, isRead: false } });
    return [records, unread];
  }

  async markRead(recipientType: NotificationRecipientType, recipientId: string, id: string): Promise<boolean> {
    const { Notification } = this.models;
    const [count] = await Notification.update({ isRead: true }, { where: { id, recipientType, recipientId } });
    return count > 0;
  }

  async markAllRead(recipientType: NotificationRecipientType, recipientId: string): Promise<number> {
    const { Notification } = this.models;
    const [count] = await Notification.update(
      { isRead: true }, { where: { recipientType, recipientId, isRead: false } }
    );
    return count;
  }

}
