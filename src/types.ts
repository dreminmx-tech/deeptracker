/** Core domain types for deeptracker. Pure data — no React, no DOM. */

export type HabitKind = 'check' | 'counter' | 'duration' | 'negative' | 'flex';
export type Lang = 'ru' | 'en';
export type Theme = 'dark' | 'light';

export interface Habit {
  id: string;
  name: string;
  kind: HabitKind;
  /** counter: daily target. duration: target minutes. */
  target?: number;
  /** counter unit, e.g. "стаканов" / "glasses". */
  unit?: string;
  /** flex: how many times per week. */
  perWeek?: number;
  /** counter: step used by the +/- buttons (default 1). */
  step?: number;
  /** The 2-minute "just start" version of the habit. */
  tiny?: string;
  /** Shown in the "top 3" block on the Today screen. */
  pinned?: boolean;
  archived?: boolean;
  /** ISO datetime. Days before this date are not counted as missed. */
  createdAt: string;
  order: number;
}

export interface Entry {
  /** counter/duration: accumulated amount. negative: number of slips that day. */
  value?: number;
  /** check/flex: completed. negative: clean day (value === 0). */
  done?: boolean;
  note?: string;
}

export interface DumpItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface DayLog {
  entries: Record<string, Entry>;
  dump: DumpItem[];
}

export interface Settings {
  lang: Lang;
  theme: Theme;
  /** ISO datetime of the last JSON export — the only backup this app has. */
  lastExport?: string;
}

export interface AppData {
  version: number;
  habits: Habit[];
  /** Keyed by local date: YYYY-MM-DD. */
  days: Record<string, DayLog>;
  settings: Settings;
}

export const DATA_VERSION = 1;
export const STORAGE_KEY = 'deeptracker.v1';
export const MAX_PINNED = 3;
