import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// legacy request status -> grievance status
const STATUS_RENAMES: [string, string][] = [
  ['inbox', 'pending'],
  ['todo', 'assigned'],
  ['doing', 'in_progress'],
  ['done', 'resolved'],
  ['invalid', 'rejected'],
];
const STATUS_ADDITIONS = ['escalated', 'closed', 'reopened'];
const STATUS_ENUMS = ['enum_ServiceRequest_status', 'enum_Jurisdiction_cxSurveyTriggerStatus'];

const timestamps = {
  createdAt: { allowNull: false, type: DataTypes.DATE },
  updatedAt: { allowNull: false, type: DataTypes.DATE },
};

export async function up({ context: queryInterface }: Record<string, QueryInterface>): Promise<void> {
  const q = queryInterface.sequelize;

  for (const enumName of STATUS_ENUMS) {
    for (const [from, to] of STATUS_RENAMES) {
      await q.query(`ALTER TYPE "${enumName}" RENAME VALUE '${from}' TO '${to}'`);
    }
    for (const value of STATUS_ADDITIONS) {
      await q.query(`ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${value}'`);
    }
  }
  await q.query(`ALTER TYPE "enum_Jurisdiction_cxSurveyTriggerStatus" ADD VALUE IF NOT EXISTS 'junk'`);

  await queryInterface.createTable('Province', {
    id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    nameNe: { type: DataTypes.STRING, allowNull: false },
    headquarter: { type: DataTypes.STRING, allowNull: true },
    headquarterNe: { type: DataTypes.STRING, allowNull: true },
    ...timestamps,
  });

  await queryInterface.createTable('District', {
    id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    provinceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Province', key: 'id' },
      onDelete: 'CASCADE',
    },
    name: { type: DataTypes.STRING, allowNull: false },
    nameNe: { type: DataTypes.STRING, allowNull: false },
    headquarter: { type: DataTypes.STRING, allowNull: true },
    headquarterNe: { type: DataTypes.STRING, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex('District', ['provinceId']);

  await queryInterface.addColumn('Jurisdiction', 'nameNe', { type: DataTypes.STRING, allowNull: true });
  await queryInterface.addColumn('Jurisdiction', 'localLevelType', {
    type: DataTypes.ENUM('metropolitan', 'sub_metropolitan', 'municipality', 'rural_municipality'),
    allowNull: true,
  });
  await queryInterface.addColumn('Jurisdiction', 'wardCount', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.addColumn('Jurisdiction', 'website', { type: DataTypes.STRING, allowNull: true });
  await queryInterface.addColumn('Jurisdiction', 'provinceId', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Province', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.addColumn('Jurisdiction', 'districtId', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'District', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.addIndex('Jurisdiction', ['districtId']);
  await queryInterface.addIndex('Jurisdiction', ['provinceId']);

  await queryInterface.addColumn('StaffUser', 'role', {
    type: DataTypes.ENUM('ward_officer', 'palika_officer', 'district_officer', 'province_officer', 'super_admin'),
    allowNull: true,
  });
  await queryInterface.addColumn('StaffUser', 'designation', { type: DataTypes.STRING, allowNull: true });
  await queryInterface.addColumn('StaffUser', 'passwordHash', { type: DataTypes.STRING, allowNull: true });
  await queryInterface.addColumn('StaffUser', 'isActive', {
    type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,
  });
  await queryInterface.addColumn('StaffUser', 'wardNo', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.addColumn('StaffUser', 'provinceId', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Province', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.addColumn('StaffUser', 'districtId', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'District', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.addColumn('StaffUser', 'lastLoginAt', { type: DataTypes.DATE, allowNull: true });
  await q.query(`CREATE UNIQUE INDEX "staff_user_email_unique" ON "StaffUser" (lower("email"))`);

  await queryInterface.createTable('CitizenUser', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: true, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    preferredLanguage: { type: DataTypes.ENUM('en', 'ne'), allowNull: false, defaultValue: 'ne' },
    provinceId: {
      type: DataTypes.INTEGER, allowNull: true, references: { model: 'Province', key: 'id' }, onDelete: 'SET NULL',
    },
    districtId: {
      type: DataTypes.INTEGER, allowNull: true, references: { model: 'District', key: 'id' }, onDelete: 'SET NULL',
    },
    jurisdictionId: {
      type: DataTypes.STRING, allowNull: true, references: { model: 'Jurisdiction', key: 'id' }, onDelete: 'SET NULL',
    },
    wardNo: { type: DataTypes.INTEGER, allowNull: true },
    phoneVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  });

  await queryInterface.createTable('OtpCode', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
    phone: { type: DataTypes.STRING, allowNull: false },
    purpose: { type: DataTypes.ENUM('register', 'reset_password', 'login'), allowNull: false },
    codeHash: { type: DataTypes.STRING, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex('OtpCode', ['phone', 'purpose']);

  await queryInterface.addColumn('ServiceRequest', 'title', { type: DataTypes.STRING, allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'category', { type: DataTypes.STRING, allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'priority', {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), allowNull: false, defaultValue: 'medium',
  });
  await queryInterface.addColumn('ServiceRequest', 'wardNo', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'provinceId', {
    type: DataTypes.INTEGER, allowNull: true, references: { model: 'Province', key: 'id' }, onDelete: 'SET NULL',
  });
  await queryInterface.addColumn('ServiceRequest', 'districtId', {
    type: DataTypes.INTEGER, allowNull: true, references: { model: 'District', key: 'id' }, onDelete: 'SET NULL',
  });
  await queryInterface.addColumn('ServiceRequest', 'currentLevel', {
    type: DataTypes.ENUM('ward', 'palika', 'district', 'province'), allowNull: false, defaultValue: 'ward',
  });
  await queryInterface.addColumn('ServiceRequest', 'slaDueAt', { type: DataTypes.DATE, allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'escalationCount', {
    type: DataTypes.INTEGER, allowNull: false, defaultValue: 0,
  });
  await queryInterface.addColumn('ServiceRequest', 'escalatedAt', { type: DataTypes.DATE, allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'citizenId', {
    type: DataTypes.UUID, allowNull: true, references: { model: 'CitizenUser', key: 'id' }, onDelete: 'SET NULL',
  });
  await queryInterface.addColumn('ServiceRequest', 'videos', { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'resolutionImages', {
    type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true,
  });
  await queryInterface.addColumn('ServiceRequest', 'resolvedAt', { type: DataTypes.DATE, allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'citizenConfirmedAt', { type: DataTypes.DATE, allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'citizenConfirmationNote', { type: DataTypes.TEXT, allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'citizenRating', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'citizenFeedback', { type: DataTypes.TEXT, allowNull: true });
  await queryInterface.addColumn('ServiceRequest', 'reopenCount', {
    type: DataTypes.INTEGER, allowNull: false, defaultValue: 0,
  });
  await queryInterface.addIndex('ServiceRequest', ['citizenId']);
  await queryInterface.addIndex('ServiceRequest', ['districtId']);
  await queryInterface.addIndex('ServiceRequest', ['provinceId']);
  await queryInterface.addIndex('ServiceRequest', ['jurisdictionId', 'wardNo']);
  await queryInterface.addIndex('ServiceRequest', ['currentLevel']);
  await queryInterface.addIndex('ServiceRequest', ['slaDueAt']);
  await queryInterface.addIndex('ServiceRequest', ['category']);

  await queryInterface.addColumn('ServiceRequestComment', 'isPublic', {
    type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
  });
  await queryInterface.addColumn('ServiceRequestComment', 'addedByName', { type: DataTypes.STRING, allowNull: true });
  await queryInterface.addColumn('ServiceRequestComment', 'newStatus', { type: DataTypes.STRING, allowNull: true });
  await queryInterface.addColumn('ServiceRequestComment', 'level', { type: DataTypes.STRING, allowNull: true });

  await queryInterface.createTable('Notification', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
    recipientType: { type: DataTypes.ENUM('citizen', 'staff'), allowNull: false },
    recipientId: { type: DataTypes.STRING, allowNull: false },
    type: {
      type: DataTypes.ENUM(
        'complaint_status_update',
        'complaint_assigned',
        'complaint_escalated',
        'complaint_resolved',
        'new_complaint',
        'system',
      ),
      allowNull: false,
    },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    serviceRequestId: {
      type: DataTypes.UUID, allowNull: true, references: { model: 'ServiceRequest', key: 'id' }, onDelete: 'CASCADE',
    },
    serviceRequestPublicId: { type: DataTypes.STRING, allowNull: true },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ...timestamps,
  });
  await queryInterface.addIndex('Notification', ['recipientType', 'recipientId', 'isRead']);
  await queryInterface.addIndex('Notification', ['createdAt']);
}

export async function down({ context: queryInterface }: Record<string, QueryInterface>): Promise<void> {
  const q = queryInterface.sequelize;
  await queryInterface.dropTable('Notification');
  for (const column of ['isPublic', 'addedByName', 'newStatus', 'level']) {
    await queryInterface.removeColumn('ServiceRequestComment', column);
  }
  for (const column of [
    'title', 'category', 'priority', 'wardNo', 'provinceId', 'districtId', 'currentLevel', 'slaDueAt',
    'escalationCount', 'escalatedAt', 'citizenId', 'videos', 'resolutionImages', 'resolvedAt',
    'citizenConfirmedAt', 'citizenConfirmationNote', 'citizenRating', 'citizenFeedback', 'reopenCount',
  ]) {
    await queryInterface.removeColumn('ServiceRequest', column);
  }
  await queryInterface.dropTable('OtpCode');
  await queryInterface.dropTable('CitizenUser');
  await q.query(`DROP INDEX IF EXISTS "staff_user_email_unique"`);
  for (const column of [
    'role', 'designation', 'passwordHash', 'isActive', 'wardNo', 'provinceId', 'districtId', 'lastLoginAt',
  ]) {
    await queryInterface.removeColumn('StaffUser', column);
  }
  for (const column of ['nameNe', 'localLevelType', 'wardCount', 'website', 'provinceId', 'districtId']) {
    await queryInterface.removeColumn('Jurisdiction', column);
  }
  await queryInterface.dropTable('District');
  await queryInterface.dropTable('Province');
  for (const enumName of STATUS_ENUMS) {
    for (const [from, to] of STATUS_RENAMES) {
      await q.query(`ALTER TYPE "${enumName}" RENAME VALUE '${to}' TO '${from}'`);
    }
  }
}
