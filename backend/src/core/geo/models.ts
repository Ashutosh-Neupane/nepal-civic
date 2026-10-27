import { DataTypes } from 'sequelize';
import type { ModelDefinition } from '../../types';

export const ProvinceModel: ModelDefinition = {
  name: 'Province',
  attributes: {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    nameNe: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    headquarter: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    headquarterNe: {
      allowNull: true,
      type: DataTypes.STRING,
    },
  },
  options: {
    freezeTableName: true,
  }
}

export const DistrictModel: ModelDefinition = {
  name: 'District',
  attributes: {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    nameNe: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    headquarter: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    headquarterNe: {
      allowNull: true,
      type: DataTypes.STRING,
    },
  },
  options: {
    freezeTableName: true,
    indexes: [
      {
        unique: false,
        fields: ['provinceId']
      }
    ]
  }
}
