import axios from 'axios';
import logger from '../logging';
import { SmsAttributes } from '../types';

export const SPARROW_SMS_API_URL = 'https://api.sparrowsms.com/v2/sms/';

// Nepali mobile numbers: 10 digits starting with 96, 97 or 98 (NTC, Ncell, Smart).
const NEPALI_MOBILE = /^9[678]\d{8}$/;

/**
 * Normalize a Nepali mobile number to its 10 digit form, accepting
 * +977 / 977 / 0 prefixes, spaces and dashes. Returns null if invalid.
 */
export function normalizeNepaliPhone(value: string | null | undefined): string | null {
  if (!value) { return null; }
  let digits = String(value).replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) { digits = digits.slice(1); }
  if (digits.startsWith('977') && digits.length === 13) { digits = digits.slice(3); }
  if (digits.startsWith('0') && digits.length === 11) { digits = digits.slice(1); }
  return NEPALI_MOBILE.test(digits) ? digits : null;
}

export async function sendSms(
  token: string,
  toPhone: string,
  fromIdentity: string,
  body: string,
  sendAt: Date | undefined,
): Promise<Record<string, string>> {
  const to = normalizeNepaliPhone(toPhone);
  if (!to) {
    const errorMessage = `Cant send sms to invalid Nepali mobile number '${toPhone}'.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  const message = { to, from: fromIdentity, body } as SmsAttributes;
  if (sendAt && sendAt.getTime() > Date.now()) {
    // Sparrow SMS has no scheduled delivery, so messages inside a broadcast
    // window are sent straight away.
    logger.info(`Sparrow SMS does not support scheduling; sending now instead of ${sendAt.toUTCString()}`);
  }
  if (process.env.COMMUNICATIONS_TO_CONSOLE) {
    return sendSmsToConsole(message);
  } else {
    return sendSmsToSparrow(message, token);
  }
}

async function sendSmsToSparrow(message: SmsAttributes, token: string): Promise<Record<string, string>> {
  logger.info(`Routing sms to Sparrow SMS for ${message.to}`, { to: message.to, from: message.from });
  const apiUrl = process.env.SPARROW_SMS_API_URL || SPARROW_SMS_API_URL;
  const form = new URLSearchParams({ token, from: message.from, to: message.to, text: message.body });
  try {
    const response = await axios.post(apiUrl, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
      validateStatus: () => true,
    });
    const data = response.data || {};
    if (response.status !== 200 || Number(data.response_code) !== 200) {
      throw new Error(`HTTP ${response.status}, response_code ${data.response_code}: ${data.response}`);
    }
    return { to: message.to, from: message.from, response: String(data.response), count: String(data.count) };
  } catch (error) {
    const errorMessage = `Error from sms transport: ${error}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}

async function sendSmsToConsole(message: SmsAttributes): Promise<Record<string, string>> {
  logger.info(
    `Routing sms to console for ${message.to}`,
    { message }
  )
  return message as unknown as Record<string, string>;
}
