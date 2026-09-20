/** Local-time date helpers. Everything is keyed by "YYYY-MM-DD" in the user's timezone. */

export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(now: Date = new Date()): DateKey {
  return dateKey(now);
}

export function parseKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function isValidKey(value: unknown): value is DateKey {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseKey(value).getTime());
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  return (parseKey(key).getDay() + 6) % 7;
}

export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -weekdayIndex(key));
}

/** Ascending list of the last `n` days ending at `end` (inclusive). */
export function lastNDays(n: number, end: DateKey = todayKey()): DateKey[] {
  const out: DateKey[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

/**
 * Pads a day list so that the first column starts on Monday.
 * Used to render GitHub-style week columns (7 rows x N columns).
 */
export function padToWeekStart(days: DateKey[]): (DateKey | null)[] {
  if (days.length === 0) return [];
  return [...Array<DateKey | null>(weekdayIndex(days[0])).fill(null), ...days];
}

const LOCALES: Record<'ru' | 'en', string> = { ru: 'ru-RU', en: 'en-US' };

export function formatDay(key: DateKey, lang: 'ru' | 'en', withWeekday = true): string {
  const d = parseKey(key);
  const opts: Intl.DateTimeFormatOptions = withWeekday
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat(LOCALES[lang], opts).format(d);
}

export function formatMonth(key: DateKey, lang: 'ru' | 'en'): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { month: 'short' }).format(parseKey(key));
}

export function weekdayShort(key: DateKey, lang: 'ru' | 'en'): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { weekday: 'short' }).format(parseKey(key));
}

/** 0 = Monday … 6 = Sunday, starting from Monday. */
export const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6];
