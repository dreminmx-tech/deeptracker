import type { AppData, DayLog, Entry, Habit, HabitKind } from '../types';
import { MAX_PINNED } from '../types';
import type { DateKey } from './date';
import { addDays, dateKey, diffDays, startOfWeek, todayKey } from './date';

/** Kinds that need a daily action from the user (they drive the daily ring). */
export const ACTIONABLE_KINDS: HabitKind[] = ['check', 'counter', 'duration'];
/** Kinds where every single day is tracked (flex habits are tracked weekly). */
export const DAILY_KINDS: HabitKind[] = ['check', 'counter', 'duration', 'negative'];

export function emptyDay(): DayLog {
  return { entries: {}, dump: [] };
}

export function getDay(data: AppData, key: DateKey): DayLog {
  return data.days[key] ?? emptyDay();
}

export function getEntry(data: AppData, key: DateKey, habitId: string): Entry | undefined {
  return data.days[key]?.entries?.[habitId];
}

export function isCounted(habit: Habit): boolean {
  return habit.kind === 'counter' || habit.kind === 'duration';
}

export function isActionable(habit: Habit): boolean {
  return ACTIONABLE_KINDS.includes(habit.kind);
}

export function targetOf(habit: Habit): number {
  return Math.max(1, Math.round(habit.target ?? 1));
}

export function stepOf(habit: Habit): number {
  return Math.max(1, Math.round(habit.step ?? 1));
}

/** Raw amount logged: counters/minutes use `value`, everything else is 0 or 1. */
export function progressOf(habit: Habit, entry?: Entry): number {
  if (!entry) return 0;
  if (isCounted(habit)) return Math.max(0, entry.value ?? 0);
  return entry.done ? 1 : 0;
}

/**
 * Completion rule per kind.
 * Negative habits are "clean by default": no entry means no slip.
 */
export function isComplete(habit: Habit, entry?: Entry): boolean {
  if (habit.kind === 'negative') return (entry?.value ?? 0) === 0;
  if (!entry) return false;
  if (isCounted(habit)) return (entry.value ?? 0) >= targetOf(habit);
  return Boolean(entry.done);
}

export function startKey(habit: Habit): DateKey {
  return dateKey(new Date(habit.createdAt));
}

export function activeHabits(data: AppData): Habit[] {
  return data.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
}

export function archivedHabits(data: AppData): Habit[] {
  return data.habits.filter((h) => h.archived).sort((a, b) => a.order - b.order);
}

export function mainHabits(data: AppData): Habit[] {
  return activeHabits(data)
    .filter((h) => h.pinned && isActionable(h))
    .slice(0, MAX_PINNED);
}

export function otherHabits(data: AppData): Habit[] {
  const main = new Set(mainHabits(data).map((h) => h.id));
  return activeHabits(data).filter((h) => isActionable(h) && !main.has(h.id));
}

export function flexHabits(data: AppData): Habit[] {
  return activeHabits(data).filter((h) => h.kind === 'flex');
}

export function negativeHabits(data: AppData): Habit[] {
  return activeHabits(data).filter((h) => h.kind === 'negative');
}

export function pinnedCount(data: AppData): number {
  return mainHabits(data).length;
}

export function canPinMore(data: AppData): boolean {
  return pinnedCount(data) < MAX_PINNED;
}

export type DayStatus = 'done' | 'partial' | 'missed' | 'rest' | 'future';

/**
 * Status of a single habit on a single day.
 * `rest` = nothing was expected (before the habit existed, or a flex habit's day off).
 */
export function dayStatus(
  data: AppData,
  habit: Habit,
  key: DateKey,
  today: DateKey = todayKey(),
): DayStatus {
  if (key > today) return 'future';
  if (key < startKey(habit)) return 'rest';
  const entry = getEntry(data, key, habit.id);
  if (habit.kind === 'negative') return (entry?.value ?? 0) > 0 ? 'missed' : 'done';
  if (habit.kind === 'flex') return entry?.done ? 'done' : 'rest';
  if (isComplete(habit, entry)) return 'done';
  return progressOf(habit, entry) > 0 ? 'partial' : 'missed';
}

/**
 * Soft streak — "never miss twice".
 * A single missed day is absorbed without resetting; two in a row break the run.
 * Today, while still unchecked, never counts as a miss.
 */
export function softStreak(data: AppData, habit: Habit, endKey: DateKey = todayKey()): number {
  const start = startKey(habit);
  if (endKey < start) return 0;
  let streak = 0;
  let misses = 0;
  const max = diffDays(start, endKey);
  for (let i = 0; i <= max; i++) {
    const key = addDays(endKey, -i);
    if (key < start) break;
    const status = dayStatus(data, habit, key);
    if (status === 'future' || status === 'rest') continue;
    if (status === 'done') {
      streak += 1;
      misses = 0;
      continue;
    }
    if (i === 0) continue; // today is still open
    misses += 1;
    if (misses >= 2) break;
  }
  return streak;
}

/** Longest soft streak ever recorded for this habit. */
export function bestStreak(data: AppData, habit: Habit, endKey: DateKey = todayKey()): number {
  const start = startKey(habit);
  if (endKey < start) return 0;
  let best = 0;
  let run = 0;
  let misses = 0;
  const max = diffDays(start, endKey);
  for (let i = 0; i <= max; i++) {
    const key = addDays(start, i);
    const status = dayStatus(data, habit, key);
    if (status === 'future' || status === 'rest') continue;
    if (status === 'done') {
      run += 1;
      misses = 0;
      if (run > best) best = run;
      continue;
    }
    if (key === endKey) continue; // today is still open
    misses += 1;
    if (misses >= 2) {
      run = 0;
      misses = 0;
    }
  }
  return best;
}

/** Days in a row (soft rule) where at least one actionable habit was completed. */
export function overallStreak(
  data: AppData,
  endKey: DateKey = todayKey(),
  habits: Habit[] = activeHabits(data).filter(isActionable),
): number {
  if (habits.length === 0) return 0;
  const earliest = habits
    .map(startKey)
    .reduce((a, b) => (a < b ? a : b), endKey);
  let streak = 0;
  let misses = 0;
  const max = diffDays(earliest, endKey);
  for (let i = 0; i <= max; i++) {
    const key = addDays(endKey, -i);
    const done = habits.some((h) => dayStatus(data, h, key) === 'done');
    if (done) {
      streak += 1;
      misses = 0;
      continue;
    }
    if (i === 0) continue;
    misses += 1;
    if (misses >= 2) break;
  }
  return streak;
}

/** Flex habit progress for the calendar week that contains `endKey`. */
export function weekProgress(
  data: AppData,
  habit: Habit,
  endKey: DateKey = todayKey(),
): { done: number; target: number } {
  const target = Math.max(1, Math.round(habit.perWeek ?? 3));
  const start = startOfWeek(endKey);
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const key = addDays(start, i);
    if (key > endKey) break;
    if (dayStatus(data, habit, key) === 'done') done += 1;
  }
  return { done, target };
}

/** Daily ring: actionable habits only (negative/flex habits live elsewhere). */
export function dayProgress(
  data: AppData,
  habits: Habit[] = activeHabits(data).filter(isActionable),
  key: DateKey = todayKey(),
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const habit of habits) {
    const status = dayStatus(data, habit, key);
    if (status === 'future') continue;
    total += 1;
    if (status === 'done') done += 1;
  }
  return { done, total };
}

export function completionRate(data: AppData, habit: Habit, days: DateKey[]): number {
  let done = 0;
  let total = 0;
  for (const key of days) {
    const status = dayStatus(data, habit, key);
    if (status === 'future' || status === 'rest') continue;
    total += 1;
    if (status === 'done') done += 1;
  }
  return total === 0 ? 0 : done / total;
}

/** Aggregated status of the whole day, used by the overall heatmap. */
export function dayHeatStatus(
  data: AppData,
  habits: Habit[],
  key: DateKey,
  today: DateKey = todayKey(),
): DayStatus {
  if (key > today) return 'future';
  const counted = habits.filter((h) => dayStatus(data, h, key) !== 'rest');
  if (counted.length === 0) return 'rest';
  let done = 0;
  let partial = 0;
  for (const habit of counted) {
    const status = dayStatus(data, habit, key, today);
    if (status === 'done') done += 1;
    else if (status === 'partial') partial += 1;
  }
  if (done === counted.length) return 'done';
  if (done > 0 || partial > 0) return 'partial';
  return 'missed';
}

/** Counts how many habits have any logged data (used for the "nothing yet" state). */
export function hasAnyData(data: AppData): boolean {
  return Object.values(data.days).some(
    (day) => Object.keys(day.entries ?? {}).length > 0 || (day.dump ?? []).length > 0,
  );
}

/** Human readable "1/6" style progress for a counter/duration habit. */
export function formatProgress(habit: Habit, entry?: Entry): string {
  if (isCounted(habit)) {
    const value = Math.round(progressOf(habit, entry));
    return `${value}/${targetOf(habit)}`;
  }
  return isComplete(habit, entry) ? '✓' : '';
}
