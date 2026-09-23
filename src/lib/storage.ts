import type { AppData, DayLog, DumpItem, Entry, Habit, HabitKind, JournalNote, Lang, Theme } from '../types';
import { DATA_VERSION, STORAGE_KEY } from '../types';
import { uid } from './actions';
import { SEED_HABITS } from './i18n';
import { NOTE_MAX } from './journal';
import { RESIST_MINUTES } from './timer';
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
    pinned: seed.pinned,
    archived: false,
    createdAt: now,
    order: index,
  }));
  return {
    version: DATA_VERSION,
    habits,
    days: {},
    journal: {},
    drafts: {},
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

/** One day of the journal. Notes keep their order: the newest is already first. */
function normalizeNotes(raw: unknown): JournalNote[] {
  if (!Array.isArray(raw)) return [];
  const notes: JournalNote[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    const text = str(record.text, NOTE_MAX);
    if (!text) continue;
    notes.push({
      id: typeof record.id === 'string' && record.id ? record.id : uid('n'),
      text,
      createdAt:
        typeof record.createdAt === 'string' && !Number.isNaN(Date.parse(record.createdAt))
          ? record.createdAt
          : new Date().toISOString(),
    });
  }
  return notes;
}

/** Weekdays a habit is expected (0 = Monday). All seven or none means "every day". */
function normalizeDays(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const days = [
    ...new Set(
      raw.filter(
        (value): value is number =>
          typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6,
      ),
    ),
  ].sort((a, b) => a - b);
  return days.length === 0 || days.length === 7 ? undefined : days;
}

function normalizeHabit(raw: unknown, index: number): Habit | null {
  const record = asRecord(raw);
  const name = str(record.name, 80);
  if (!name) return null;
  const kind = KINDS.includes(record.kind as HabitKind) ? (record.kind as HabitKind) : 'check';
  const resist = num(record.resist);
  return {
    id: typeof record.id === 'string' && record.id ? record.id : uid(),
    name,
    kind,
    target: num(record.target),
    unit: str(record.unit, 16),
    perWeek: num(record.perWeek),
    step: num(record.step),
    days: normalizeDays(record.days),
    tiny: str(record.tiny, 120),
    resist: kind === 'negative' && resist && RESIST_MINUTES.includes(resist) ? resist : undefined,
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

  const rawJournal = asRecord(record.journal);
  const journal: Record<string, JournalNote[]> = {};
  for (const [key, value] of Object.entries(rawJournal)) {
    if (!isValidKey(key)) continue;
    const notes = normalizeNotes(value);
    if (notes.length > 0) journal[key] = notes;
  }

  // A draft key means "the field for that day is open"; its text may be empty.
  const rawDrafts = asRecord(record.drafts);
  const drafts: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawDrafts)) {
    if (!isValidKey(key) || typeof value !== 'string') continue;
    drafts[key] = value.slice(0, NOTE_MAX);
  }

  const settings = asRecord(record.settings);
  const lang: Lang = settings.lang === 'en' ? 'en' : 'ru';
  const theme: Theme = settings.theme === 'light' ? 'light' : 'dark';
  const lastExport =
    typeof settings.lastExport === 'string' && !Number.isNaN(Date.parse(settings.lastExport))
      ? settings.lastExport
      : undefined;

  // A file with no habits at all is treated as empty rather than valid-but-broken.
  const habitsWithOrder = habits.map((habit, index) => ({ ...habit, order: index }));

  return {
    version: DATA_VERSION,
    habits: habitsWithOrder,
    days,
    journal,
    drafts,
    settings: { lang, theme, ...(lastExport ? { lastExport } : {}) },
  };
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
