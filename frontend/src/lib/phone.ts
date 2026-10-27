// Nepali mobile numbers: 10 digits starting with 96, 97 or 98 (same rule as the backend).
const NEPALI_MOBILE = /^9[678]\d{8}$/;

/** Accepts +977 / 977 / 0 prefixes, spaces and dashes. Returns the 10 digit number or null. */
export function normalizeNepaliPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = String(value).replace(/[\s\-()]/g, '');
  // Devanagari digits typed on a Nepali keyboard
  digits = digits.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966));
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('977') && digits.length === 13) digits = digits.slice(3);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return NEPALI_MOBILE.test(digits) ? digits : null;
}

export function formatNepaliPhone(value?: string | null): string {
  const phone = normalizeNepaliPhone(value);
  return phone ? `+977 ${phone.slice(0, 3)}-${phone.slice(3)}` : value || '';
}
