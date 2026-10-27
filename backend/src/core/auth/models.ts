import { DataTypes } from 'sequelize';
import type { ModelDefinition } from '../../types';

export const CITIZEN_LANGUAGES = ['en', 'ne'];

export const OTP_PURPOSES = ['register', 'reset_password', 'login'];

export const CitizenUserModel: ModelDefinition = {
  name: 'CitizenUser',
  attributes: {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    fullName: {
      allowNull: false,
      type: DataTypes.STRING,
      validate: { len: [2, 120] },
    },
    phone: {
      allowNull: false,
      unique: true,
      type: DataTypes.STRING,
    },
    email: {
      allowNull: true,
      unique: true,
      type: DataTypes.STRING,
      validate: { isEmail: true },
      set(value) {
        if (value === '') {
          value = null;
        } else if (typeof value === 'string') {
          value = value.trim().toLowerCase();
        }
        this.setDataValue('email', value);
      }
    },
    passwordHash: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    preferredLanguage: {
      allowNull: false,
      type: DataTypes.ENUM(...CITIZEN_LANGUAGES),
      defaultValue: 'ne',
    },
    provinceId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    districtId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    jurisdictionId: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    wardNo: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    phoneVerifiedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    isActive: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLoginAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
  },
  options: {
    freezeTableName: true,
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },
    scopes: {
      withPassword: { attributes: { include: ['passwordHash'] } },
    },
  }
}

export const OtpCodeModel: ModelDefinition = {
  name: 'OtpCode',
  attributes: {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    phone: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    purpose: {
      allowNull: false,
      type: DataTypes.ENUM(...OTP_PURPOSES),
    },
    codeHash: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    expiresAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    attempts: {
      allowNull: false,
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    consumedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
  },
  options: {
    freezeTableName: true,
    indexes: [
      {
        unique: false,
        fields: ['phone', 'purpose']
      }
    ]
  }
}
