import { DataTypes } from 'sequelize';
import type { ModelDefinition } from '../../types';

export const NOTIFICATION_TYPES = [
  'complaint_status_update',
  'complaint_assigned',
  'complaint_escalated',
  'complaint_resolved',
  'new_complaint',
  'system',
];

export const NotificationModel: ModelDefinition = {
  name: 'Notification',
  attributes: {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    recipientType: {
      allowNull: false,
      type: DataTypes.ENUM('citizen', 'staff'),
    },
    recipientId: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    type: {
      allowNull: false,
      type: DataTypes.ENUM(...NOTIFICATION_TYPES),
    },
    title: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    body: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    serviceRequestId: {
      allowNull: true,
      type: DataTypes.UUID,
    },
    serviceRequestPublicId: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    isRead: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  options: {
    freezeTableName: true,
    indexes: [
      {
        unique: false,
        fields: ['recipientType', 'recipientId', 'isRead']
      },
      {
        unique: false,
        fields: ['createdAt']
      }
    ]
  }
}
