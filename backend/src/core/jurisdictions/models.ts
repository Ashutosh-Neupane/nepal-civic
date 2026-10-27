import { DataTypes } from 'sequelize';
import type { ModelDefinition } from '../../types';
import { REQUEST_STATUS_KEYS } from '../service-requests';

export const GOVFLOW_USAGE_CONTEXTS = [
  '311',
  '911',
  'Policing',
]

export const JURISDICTION_PREFERRED_BROADCAST_CHANNELS = [
  'email',
  'sms',
]

export const LOCAL_LEVEL_TYPES = [
  'metropolitan',
  'sub_metropolitan',
  'municipality',
  'rural_municipality',
]

export const CX_DATA_SOURCES = [
  'OrganicDataItem',
  'CivicPlusSeeClickFix',
  'CivicPlusRequestTracker',
  'Lucity',
  'PublicStuff',
]

export const JurisdictionModel: ModelDefinition = {
  name: 'Jurisdiction',
  attributes: {
    id: {
      // may come from another system so we want control:
      // not auto-increment, and not necessairly UUID.
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    nameNe: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    localLevelType: {
      allowNull: true,
      type: DataTypes.ENUM(...LOCAL_LEVEL_TYPES),
    },
    wardCount: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    website: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    provinceId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    districtId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    email: {
      allowNull: true,
      type: DataTypes.STRING,
      validate: { isEmail: true },
      set(value) {
        if (value === '') {
          value = null;
        } else if (typeof value === 'string') {
          value = value.toLowerCase();
        }
        this.setDataValue('email', value);
      }
    },
    usageContext: {
      allowNull: false,
      defaultValue: GOVFLOW_USAGE_CONTEXTS[0],
      type: DataTypes.ENUM(...GOVFLOW_USAGE_CONTEXTS),
    },
    preferredBroadcastChannel: {
      defaultValue: JURISDICTION_PREFERRED_BROADCAST_CHANNELS[0],
      type: DataTypes.ENUM(...JURISDICTION_PREFERRED_BROADCAST_CHANNELS),
    },
    enforceAssignmentThroughDepartment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    filterBroadcastsByDepartment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    sendFromPhone: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    sendFromEmail: {
      allowNull: true,
      type: DataTypes.STRING,
      validate: { isEmail: true },
      set(value) {
        if (value === '') {
          value = null;
        } else if (typeof value === 'string') {
          value = value.toLowerCase();
        }
        this.setDataValue('email', value);
      }
    },
    sendFromEmailVerified: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
    replyToEmail: {
      allowNull: true,
      type: DataTypes.STRING,
      validate: { isEmail: true },
      set(value) {
        if (value === '') {
          value = null;
        } else if (typeof value === 'string') {
          value = value.toLowerCase();
        }
        this.setDataValue('email', value);
      }
    },
    replyToServiceRequestEnabled: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
    broadcastToSubmitterOnRequestClosed: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
    workflowEnabled: {
      allowNull: false,
      defaultValue: true,
      type: DataTypes.BOOLEAN,
    },
    workflowBroadcastWindow: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
        max: 71 //sendgrid allows a max of 72 hours out for scheduling
      }
    },
    cxSurveyEnabled: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
    cxSurveyTriggerStatus: {
      allowNull: false,
      defaultValue: 'resolved',
      type: DataTypes.ENUM(...REQUEST_STATUS_KEYS),
    },
    cxSurveyUrl: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    cxSurveyBroadcastWindow: {
      allowNull: false,
      defaultValue: 24,
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
        max: 71 //sendgrid allows a max of 72 hours out for scheduling
      }
    },
    cxDataSource: {
      allowNull: false,
      defaultValue: CX_DATA_SOURCES[0],
      type: DataTypes.ENUM(...CX_DATA_SOURCES),
    },
    address: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    city: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    state: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    country: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    zip: {
      allowNull: true,
      type: DataTypes.STRING,
    },
  },
  options: {
    freezeTableName: true
  }
}
