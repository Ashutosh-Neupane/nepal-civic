import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AppConfig } from '../../types';
import { getJwtSecret } from '../auth/helpers';

/**
 * Local disk storage with presigned URLs, for offices that do not run an
 * S3 compatible object store. URLs carry an expiry and an HMAC signature.
 */

const UPLOAD_URL_TTL_SECONDS = 15 * 60;

export const ALLOWED_UPLOAD_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'mp4', 'mov', 'webm', 'pdf'];

export const UPLOAD_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  pdf: 'application/pdf',
};

/** A storage key the client cannot choose, e.g. 2026/10/0b8c....jpg */
export function makeStorageKey(filename: string): string | null {
  const ext = path.extname(String(filename)).slice(1).toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext)) { return null; }
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}/${month}/${crypto.randomUUID()}.${ext}`;
}

export function isValidStorageKey(key: string): boolean {
  return /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(key);
}

function sign(config: AppConfig, method: 'GET' | 'PUT', key: string, expires: number): string {
  return crypto
    .createHmac('sha256', getJwtSecret(config))
    .update(`${method}\n${key}\n${expires}`)
    .digest('hex');
}

export function presignLocal(config: AppConfig, method: 'GET' | 'PUT', key: string, ttlSeconds?: number): string {
  const ttl = ttlSeconds ?? (method === 'PUT' ? UPLOAD_URL_TTL_SECONDS : config.storageSignedGetExpiry);
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const base = config.appPublicUrl.replace(/\/$/, '');
  return `${base}/storage/local/${key}?expires=${expires}&signature=${sign(config, method, key, expires)}`;
}

export function verifyLocalSignature(
  config: AppConfig, method: 'GET' | 'PUT', key: string, expires: unknown, signature: unknown
): boolean {
  const expiresAt = Number(expires);
  if (!Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) { return false; }
  if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/.test(signature)) { return false; }
  const expected = Buffer.from(sign(config, method, key, expiresAt), 'hex');
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export function localPath(config: AppConfig, key: string): string {
  return path.resolve(config.storageLocalDir, key);
}

export async function writeLocalFile(config: AppConfig, key: string, data: Buffer): Promise<void> {
  const target = localPath(config, key);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await fs.promises.writeFile(target, data, { flag: 'wx' });
}
