import { inject, injectable } from 'inversify';
import validator from 'validator';
import logger from '../../logging';
import { HttpError } from '../../middlewares';
import { appIds } from '../../registry/service-identifiers';
import { normalizeNepaliPhone, sendSms } from '../../sms';
import type {
  AppConfig,
  AuthContext,
  CitizenUserAttributes,
  IAuthService,
  OtpPurpose,
  Repositories,
  StaffUserAttributes
} from '../../types';
import {
  assertPasswordStrength,
  generateOtp,
  hashSecret,
  signToken,
  verifySecret,
  verifyToken
} from './helpers';
import { CITIZEN_LANGUAGES, OTP_PURPOSES } from './models';
import { scopeForStaff } from './scope';

const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_WINDOW = 3;
const OTP_WINDOW_MINUTES = 15;

@injectable()
export class AuthService implements IAuthService {

  repositories: Repositories;
  config: AppConfig;

  constructor(
    @inject(appIds.Repositories) repositories: Repositories,
    @inject(appIds.AppConfig) config: AppConfig,
  ) {
    this.repositories = repositories;
    this.config = config;
  }

  async requestOtp(rawPhone: string, purpose: OtpPurpose): Promise<{ expiresAt: Date; devCode?: string }> {
    const { otpCodeRepository, citizenUserRepository } = this.repositories;
    const phone = normalizeNepaliPhone(rawPhone);
    if (!phone) { throw new HttpError(400, 'Enter a valid Nepali mobile number (98XXXXXXXX).'); }
    if (!OTP_PURPOSES.includes(purpose)) { throw new HttpError(400, 'Invalid OTP purpose.'); }

    const now = new Date();
    const windowStart = new Date(now.getTime() - OTP_WINDOW_MINUTES * 60 * 1000);
    if (await otpCodeRepository.countRecent(phone, purpose, windowStart) >= OTP_MAX_PER_WINDOW) {
      throw new HttpError(429, `Too many codes requested. Try again in ${OTP_WINDOW_MINUTES} minutes.`);
    }

    const existing = await citizenUserRepository.findByPhone(phone);
    if (purpose === 'register' && existing) {
      throw new HttpError(409, 'An account with this mobile number already exists.');
    }
    const expiresAt = new Date(now.getTime() + this.config.otpTtlMinutes * 60 * 1000);
    if (purpose !== 'register' && !existing) {
      // Do not reveal whether the number is registered.
      return { expiresAt };
    }

    const code = generateOtp();
    await otpCodeRepository.create({ phone, purpose, codeHash: await hashSecret(code), expiresAt });
    const text = `${this.config.appName}: तपाईंको OTP कोड ${code} हो। ${this.config.otpTtlMinutes} मिनेटभित्र प्रयोग गर्नुहोस्। Your code is ${code}.`;
    try {
      await sendSms(this.config.sparrowSmsToken, phone, this.config.smsFromIdentity, text, undefined);
    } catch (error) {
      logger.error(`Could not send OTP SMS: ${error}`);
      throw new HttpError(502, 'Could not send the verification SMS. Please try again.');
    }
    const exposeCode = this.config.otpExposeInResponse && this.config.env !== 'production';
    return exposeCode ? { expiresAt, devCode: code } : { expiresAt };
  }

  private async verifyOtp(phone: string, purpose: OtpPurpose, code: unknown): Promise<void> {
    const { otpCodeRepository } = this.repositories;
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new HttpError(400, 'Enter the 6 digit code sent to your phone.');
    }
    const record = await otpCodeRepository.findLatestActive(phone, purpose, new Date());
    if (!record || record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new HttpError(400, 'The code has expired. Request a new one.');
    }
    if (!await verifySecret(code, record.codeHash)) {
      await otpCodeRepository.recordAttempt(record.id);
      throw new HttpError(400, 'The code is incorrect.');
    }
    await otpCodeRepository.consume(record.id);
  }

  async registerCitizen(data: Record<string, unknown>): Promise<[CitizenUserAttributes, string]> {
    const { citizenUserRepository, geoRepository } = this.repositories;
    const phone = normalizeNepaliPhone(data.phone as string);
    if (!phone) { throw new HttpError(400, 'Enter a valid Nepali mobile number (98XXXXXXXX).'); }
    const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
    if (fullName.length < 2) { throw new HttpError(400, 'Full name is required.'); }
    const password = assertPasswordStrength(data.password);
    const email = typeof data.email === 'string' && data.email.trim() ? data.email.trim().toLowerCase() : null;
    if (email && !validator.isEmail(email)) { throw new HttpError(400, 'Enter a valid email address.'); }
    const preferredLanguage = CITIZEN_LANGUAGES.includes(data.preferredLanguage as string)
      ? data.preferredLanguage as 'en' | 'ne'
      : 'ne';

    if (await citizenUserRepository.findByPhone(phone)) {
      throw new HttpError(409, 'An account with this mobile number already exists.');
    }
    if (email && await citizenUserRepository.findByEmail(email)) {
      throw new HttpError(409, 'An account with this email already exists.');
    }

    let location: Partial<CitizenUserAttributes> = {};
    if (data.jurisdictionId) {
      const localLevel = await geoRepository.findLocalLevel(String(data.jurisdictionId));
      if (!localLevel) { throw new HttpError(400, 'Unknown municipality.'); }
      const wardNo = data.wardNo ? Number(data.wardNo) : null;
      if (wardNo !== null && (!Number.isInteger(wardNo) || wardNo < 1 || wardNo > (localLevel.wardCount || 0))) {
        throw new HttpError(400, `Ward must be between 1 and ${localLevel.wardCount}.`);
      }
      location = {
        jurisdictionId: localLevel.id,
        districtId: localLevel.districtId,
        provinceId: localLevel.provinceId,
        wardNo,
      };
    }

    await this.verifyOtp(phone, 'register', data.otp);

    const citizen = await citizenUserRepository.create({
      fullName,
      phone,
      email,
      passwordHash: await hashSecret(password),
      preferredLanguage,
      phoneVerifiedAt: new Date(),
      lastLoginAt: new Date(),
      ...location,
    });
    const token = signToken(this.config, { sub: citizen.id, kind: 'citizen' });
    return [citizen, token];
  }

  async loginCitizen(identifier: string, password: string): Promise<[CitizenUserAttributes, string]> {
    const { citizenUserRepository } = this.repositories;
    if (!identifier || !password) { throw new HttpError(400, 'Enter your mobile number or email and password.'); }
    const phone = normalizeNepaliPhone(identifier);
    const record = phone
      ? await citizenUserRepository.findByPhone(phone, true)
      : await citizenUserRepository.findByEmail(identifier, true);
    if (!record || !record.isActive || !await verifySecret(password, record.passwordHash)) {
      throw new HttpError(401, 'Incorrect login details.');
    }
    const citizen = await citizenUserRepository.update(record.id, { lastLoginAt: new Date() });
    const token = signToken(this.config, { sub: citizen.id, kind: 'citizen' });
    return [citizen, token];
  }

  async loginStaff(email: string, password: string): Promise<[StaffUserAttributes, string]> {
    const { staffUserRepository } = this.repositories;
    if (!email || !password) { throw new HttpError(400, 'Enter your email and password.'); }
    const record = await staffUserRepository.findByEmail(email, true);
    if (!record || record.isActive === false || !await verifySecret(password, record.passwordHash)) {
      throw new HttpError(401, 'Incorrect login details.');
    }
    const staff = await staffUserRepository.updateById(record.id, { lastLoginAt: new Date() }) as StaffUserAttributes;
    const token = signToken(this.config, { sub: staff.id, kind: 'staff' });
    return [staff, token];
  }

  async resetCitizenPassword(rawPhone: string, code: string, password: string): Promise<void> {
    const { citizenUserRepository } = this.repositories;
    const phone = normalizeNepaliPhone(rawPhone);
    if (!phone) { throw new HttpError(400, 'Enter a valid Nepali mobile number (98XXXXXXXX).'); }
    assertPasswordStrength(password);
    const citizen = await citizenUserRepository.findByPhone(phone);
    if (!citizen) { throw new HttpError(400, 'The code has expired. Request a new one.'); }
    await this.verifyOtp(phone, 'reset_password', code);
    await citizenUserRepository.update(citizen.id, { passwordHash: await hashSecret(password) });
  }

  async authenticateToken(token: string): Promise<AuthContext | null> {
    const { citizenUserRepository, staffUserRepository } = this.repositories;
    const payload = verifyToken(this.config, token);
    if (!payload) { return null; }
    if (payload.kind === 'citizen') {
      const citizen = await citizenUserRepository.findOne(payload.sub);
      if (!citizen || !citizen.isActive) { return null; }
      return { kind: 'citizen', id: citizen.id, citizen };
    }
    const staff = await staffUserRepository.findById(payload.sub);
    if (!staff || staff.isActive === false) { return null; }
    return {
      kind: 'staff',
      id: staff.id,
      role: staff.role || 'palika_officer',
      scope: scopeForStaff(staff),
      staff,
    };
  }

}
