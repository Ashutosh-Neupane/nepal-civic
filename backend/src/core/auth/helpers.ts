import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { HttpError } from '../../middlewares';
import type { AppConfig, AuthTokenPayload } from '../../types';

const BCRYPT_ROUNDS = 10;
export const MIN_PASSWORD_LENGTH = 8;

// Used when AUTH_JWT_SECRET is not set outside production: tokens stop working on restart.
let ephemeralSecret: string | null = null;

export function getJwtSecret(config: AppConfig): string {
  if (config.authJwtSecret) { return config.authJwtSecret; }
  if (config.env === 'production') {
    throw new Error('AUTH_JWT_SECRET must be set in production.');
  }
  if (!ephemeralSecret) { ephemeralSecret = crypto.randomBytes(32).toString('hex'); }
  return ephemeralSecret;
}

export async function hashSecret(value: string): Promise<string> {
  return await bcrypt.hash(value, BCRYPT_ROUNDS);
}

export async function verifySecret(value: string, hash: string | undefined | null): Promise<boolean> {
  if (!hash) { return false; }
  return await bcrypt.compare(value, hash);
}

export function assertPasswordStrength(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'Password must contain letters and numbers.');
  }
  return password;
}

export function signToken(config: AppConfig, payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(config), {
    expiresIn: `${config.authTokenTtlHours}h`,
    algorithm: 'HS256',
  });
}

export function verifyToken(config: AppConfig, token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(config), { algorithms: ['HS256'] });
    if (typeof decoded !== 'object' || !decoded) { return null; }
    const { sub, kind } = decoded as Record<string, unknown>;
    if (typeof sub !== 'string' || (kind !== 'staff' && kind !== 'citizen')) { return null; }
    return { sub, kind };
  } catch {
    return null;
  }
}

export function generateOtp(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

export function generateTemporaryPassword(): string {
  // 12 characters, guaranteed to contain letters and digits
  const letters = crypto.randomBytes(6).toString('base64').replace(/[^A-Za-z]/g, '').padEnd(6, 'x').slice(0, 6);
  const digits = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  return `${letters}${digits}`;
}
