import { inject, injectable } from 'inversify';
import { Op } from 'sequelize';
import { appIds } from '../../registry/service-identifiers';
import type {
  AppConfig,
  CitizenUserAttributes,
  ICitizenUserRepository,
  IOtpCodeRepository,
  Models,
  OtpCodeAttributes,
  OtpPurpose
} from '../../types';

function toPlain(record: unknown, keepPassword = false): CitizenUserAttributes | null {
  if (!record) { return null; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plain = (record as any).get ? (record as any).get({ plain: true }) : { ...(record as object) };
  if (!keepPassword) { delete plain.passwordHash; }
  return plain as CitizenUserAttributes;
}

@injectable()
export class CitizenUserRepository implements ICitizenUserRepository {

  models: Models;
  config: AppConfig;

  constructor(
    @inject(appIds.Models) models: Models,
    @inject(appIds.AppConfig) config: AppConfig,
  ) {
    this.models = models;
    this.config = config;
  }

  async create(data: Partial<CitizenUserAttributes>): Promise<CitizenUserAttributes> {
    const { CitizenUser } = this.models;
    const record = await CitizenUser.create(data);
    return toPlain(record) as CitizenUserAttributes;
  }

  async findOne(id: string): Promise<CitizenUserAttributes | null> {
    const { CitizenUser } = this.models;
    return toPlain(await CitizenUser.findByPk(id));
  }

  async findByPhone(phone: string, withPassword = false): Promise<CitizenUserAttributes | null> {
    const { CitizenUser } = this.models;
    const model = withPassword ? CitizenUser.scope('withPassword') : CitizenUser;
    return toPlain(await model.findOne({ where: { phone } }), withPassword);
  }

  async findByEmail(email: string, withPassword = false): Promise<CitizenUserAttributes | null> {
    const { CitizenUser } = this.models;
    const model = withPassword ? CitizenUser.scope('withPassword') : CitizenUser;
    return toPlain(await model.findOne({ where: { email: email.trim().toLowerCase() } }), withPassword);
  }

  async update(id: string, data: Partial<CitizenUserAttributes>): Promise<CitizenUserAttributes> {
    const { CitizenUser } = this.models;
    await CitizenUser.update(data, { where: { id } });
    return await this.findOne(id) as CitizenUserAttributes;
  }

}

@injectable()
export class OtpCodeRepository implements IOtpCodeRepository {

  models: Models;
  config: AppConfig;

  constructor(
    @inject(appIds.Models) models: Models,
    @inject(appIds.AppConfig) config: AppConfig,
  ) {
    this.models = models;
    this.config = config;
  }

  async create(data: Partial<OtpCodeAttributes>): Promise<OtpCodeAttributes> {
    const { OtpCode } = this.models;
    return await OtpCode.create(data) as unknown as OtpCodeAttributes;
  }

  async countRecent(phone: string, purpose: OtpPurpose, since: Date): Promise<number> {
    const { OtpCode } = this.models;
    return await OtpCode.count({ where: { phone, purpose, createdAt: { [Op.gte]: since } } });
  }

  async findLatestActive(phone: string, purpose: OtpPurpose, now: Date): Promise<OtpCodeAttributes | null> {
    const { OtpCode } = this.models;
    return await OtpCode.findOne({
      where: { phone, purpose, consumedAt: null, expiresAt: { [Op.gt]: now } },
      order: [['createdAt', 'DESC']],
    }) as unknown as OtpCodeAttributes | null;
  }

  async recordAttempt(id: string): Promise<void> {
    const { OtpCode } = this.models;
    await OtpCode.increment('attempts', { where: { id } });
  }

  async consume(id: string): Promise<void> {
    const { OtpCode } = this.models;
    await OtpCode.update({ consumedAt: new Date() }, { where: { id } });
  }

}
