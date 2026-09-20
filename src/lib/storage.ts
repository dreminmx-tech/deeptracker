import type { AppData, DayLog, DumpItem, Entry, Habit, HabitKind, Lang, Theme } from '../types';
import { DATA_VERSION, STORAGE_KEY } from '../types';
import { uid } from './actions';
import { SEED_HABITS } from './i18n';
import { isValidKey } from './date';

const KINDS: HabitKind[] = ['check', 'counter', 'duration', 'negative', 'flex'];

function detectLang(): Lang {
  try {
    const tag = typeof navigator !== 'undefined' ? navigator.language : 'ru';
    return tag && tag.toLowerCase().startsWith('en') ? 'en' : 'ru';
  } catch {
    return 'ru';
  }
}

/** First launch (or after a wipe): a small, low-friction starter set. */
export function freshData(lang: Lang = detectLang()): AppData {
  const now = new Date().toISOString();
  const habits: Habit[] = SEED_HABITS[lang].map((seed, index) => ({
    id: `${uid('seed')}_${index}`,
    name: seed.name,
    kind: seed.kind,
    target: seed.target,
    unit: seed.unit,
    perWeek: seed.perWeek,
    tiny: seed.tiny,
    pinned: seed.pinned,
    archived: false,
    createdAt: now,
    order: index,
  }));
  return {
    version: DATA_VERSION,
    habits,
    days: {},
    settings: { lang, theme: 'dark' },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function str(value: unknown, max = 200): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function normalizeEntry(raw: unknown): Entry | undefined {
  const record = asRecord(raw);
  const entry: Entry = {};
  const value = num(record.value);
  if (value !== undefined) entry.value = Math.max(0, Math.round(value));
  if (typeof record.done === 'boolean') entry.done = record.done;
  const note = str(record.note, 280);
  if (note) entry.note = note;
  return Object.keys(entry).length > 0 ? entry : undefined;
}

function normalizeDump(raw: unknown): DumpItem[] {
  if (!Array.isArray(raw)) return [];
  const items: DumpItem[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    const text = str(record.text, 280);
    if (!text) continue;
    items.push({
      id: typeof record.id === 'string' ? record.id : uid('d'),
      text,
      done: record.done === true,
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    });
  }
  return items;
}

function normalizeHabit(raw: unknown, index: number): Habit | null {
  const record = asRecord(raw);
  const name = str(record.name, 80);
  if (!name) return null;
  const kind = KINDS.includes(record.kind as HabitKind) ? (record.kind as HabitKind) : 'check';
  return {
    id: typeof record.id === 'string' && record.id ? record.id : uid(),
    name,
    kind,
    target: num(record.target),
    unit: str(record.unit, 16),
    perWeek: num(record.perWeek),
    step: num(record.step),
    tiny: str(record.tiny, 120),
    pinned: record.pinned === true,
    archived: record.archived === true,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    order: num(record.order) ?? index,
  };
}

/** Defensive normalizer: anything can be thrown at it (old exports, hand-edited JSON). */
export function normalizeData(raw: unknown): AppData {
  const record = asRecord(raw);
  const habits = (Array.isArray(record.habits) ? record.habits : [])
    .map((habit, index) => normalizeHabit(habit, index))
    .filter((habit): habit is Habit => habit !== null);

  const rawDays = asRecord(record.days);
  const days: Record<string, DayLog> = {};
  for (const [key, value] of Object.entries(rawDays)) {
    if (!isValidKey(key)) continue;
    const day = asRecord(value);
    const rawEntries = asRecord(day.entries);
    const entries: Record<string, Entry> = {};
    for (const [habitId, rawEntry] of Object.entries(rawEntries)) {
      const entry = normalizeEntry(rawEntry);
      if (entry) entries[habitId] = entry;
    }
    const dump = normalizeDump(day.dump);
    if (Object.keys(entries).length > 0 || dump.length > 0) days[key] = { entries, dump };
  }

  const settings = asRecord(record.settings);
  const lang: Lang = settings.lang === 'en' ? 'en' : 'ru';
  const theme: Theme = settings.theme === 'light' ? 'light' : 'dark';

  // A file with no habits at all is treated as empty rather than valid-but-broken.
  const habitsWithOrder = habits.map((habit, index) => ({ ...habit, order: index }));

  return { version: DATA_VERSION, habits: habitsWithOrder, days, settings: { lang, theme } };
}

export function loadData(): AppData {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return freshData();
    const parsed = JSON.parse(raw);
    const data = normalizeData(parsed);
    return data.habits.length > 0 ? data : freshData(data.settings.lang);
  } catch {
    return freshData();
  }
}

export function saveData(data: AppData): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked (private mode) — the app keeps working in memory */
  }
}

export function toJson(data: AppData): string {
  return JSON.stringify({ ...data, version: DATA_VERSION }, null, 2);
}

/** Throws when the text is not a usable deeptracker export. */
export function parseImport(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('invalid-json');
  }
  const record = asRecord(parsed);
  if (!Array.isArray(record.habits) || record.habits.length === 0) {
    throw new Error('not-a-tracker-export');
  }
  return normalizeData(parsed);
}

export function downloadJson(data: AppData): void {
  const blob = new Blob([toJson(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `deeptracker-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
