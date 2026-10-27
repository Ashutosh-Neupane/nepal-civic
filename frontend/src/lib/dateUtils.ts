import NepaliDate from 'nepali-date-converter';

const TIME_ZONE = 'Asia/Kathmandu';
const DEVANAGARI_DIGITS = '०१२३४५६७८९';

function toNepaliDigits(text: string): string {
  return text.replace(/\d/g, (d) => DEVANAGARI_DIGITS[Number(d)]);
}

/** The calendar day in Nepal for an instant, regardless of the browser's time zone. */
function kathmanduDay(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

function parse(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Bikram Sambat date: "10 Kartik 2083" or "१० कार्तिक २०८३". */
export function formatDate(value?: string | Date | null, language = 'en'): string {
  const date = parse(value);
  if (!date) return '—';
  const bs = new NepaliDate(kathmanduDay(date));
  const text = bs.format('DD MMMM YYYY', language === 'ne' ? 'np' : 'en').replace(/^[0०]/, '');
  return language === 'ne' ? text : `${text} BS`;
}

/** Short BS date for chart axes: "10 Kartik" / "१० कार्तिक". Accepts a YYYY-MM-DD day key. */
export function formatShortDate(value?: string | Date | null, language = 'en'): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new NepaliDate(new Date(y, m - 1, d)).format('DD MMMM', language === 'ne' ? 'np' : 'en').replace(/^[0०]/, '');
  }
  const date = parse(value);
  if (!date) return '—';
  return new NepaliDate(kathmanduDay(date)).format('DD MMMM', language === 'ne' ? 'np' : 'en').replace(/^[0०]/, '');
}

/** Nepal time of day, 24-hour. */
export function formatTime(value?: string | Date | null, language = 'en'): string {
  const date = parse(value);
  if (!date) return '';
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  return language === 'ne' ? toNepaliDigits(time) : time;
}

export function formatDateTime(value?: string | Date | null, language = 'en'): string {
  const date = parse(value);
  if (!date) return '—';
  return `${formatDate(date, language)}, ${formatTime(date, language)}`;
}

/** Gregorian date for officials who need it alongside BS: "27 Oct 2026". */
export function formatAdDate(value?: string | Date | null): string {
  const date = parse(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** "5 min ago" / "५ मिनेट अघि". Falls back to the BS date after a week. */
export function formatRelative(value?: string | Date | null, language = 'en'): string {
  const date = parse(value);
  if (!date) return '—';
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  const ne = language === 'ne';
  const say = (n: number, en: string, np: string) => (ne ? `${toNepaliDigits(String(n))} ${np} अघि` : `${n} ${en} ago`);
  if (minutes < 1) return ne ? 'भर्खरै' : 'just now';
  if (minutes < 60) return say(minutes, 'min', 'मिनेट');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return say(hours, hours === 1 ? 'hour' : 'hours', 'घण्टा');
  const days = Math.round(hours / 24);
  if (days < 7) return say(days, days === 1 ? 'day' : 'days', 'दिन');
  return formatDate(date, language);
}

export function localizeDigits(value: string | number, language = 'en'): string {
  return language === 'ne' ? toNepaliDigits(String(value)) : String(value);
}
