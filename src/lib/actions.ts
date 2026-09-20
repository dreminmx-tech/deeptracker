import type { AppData, DumpItem, Entry, Habit, HabitKind, Settings } from '../types';
import type { DateKey } from './date';
import { todayKey } from './date';
import { canPinMore, emptyDay, getEntry, isComplete, isCounted, stepOf, targetOf } from './habits';

export function uid(prefix = 'h'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function prune(data: AppData, key: DateKey): AppData {
  const day = data.days[key];
  if (!day) return data;
  const empty = Object.keys(day.entries).length === 0 && day.dump.length === 0;
  if (!empty) return data;
  const days = { ...data.days };
  delete days[key];
  return { ...data, days };
}

export function withEntry(
  data: AppData,
  key: DateKey,
  habitId: string,
  entry: Entry | null,
): AppData {
  const day = data.days[key] ?? emptyDay();
  const entries = { ...day.entries };
  if (entry && (entry.value !== undefined || entry.done !== undefined || entry.note !== undefined)) {
    entries[habitId] = entry;
  } else {
    delete entries[habitId];
  }
  return prune({ ...data, days: { ...data.days, [key]: { ...day, entries } } }, key);
}

/**
 * One tap on a habit card.
 * check / flex: toggle done. counter / duration: fill to target, tap again to clear.
 * negative: log a slip, tap again to go back to clean.
 */
export function tapHabit(data: AppData, habitId: string, key: DateKey = todayKey()): AppData {
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return data;
  const entry = getEntry(data, key, habitId);

  switch (habit.kind) {
    case 'negative': {
      const slid = (entry?.value ?? 0) > 0;
      return withEntry(data, key, habitId, slid ? { value: 0, done: true } : { value: 1, done: false });
    }
    case 'counter':
    case 'duration': {
      const complete = isComplete(habit, entry);
      // Tapping a finished counter clears the day; tapping an empty one fills it to target.
      return withEntry(
        data,
        key,
        habitId,
        complete ? null : { value: targetOf(habit), done: true },
      );
    }
    case 'flex':
    case 'check':
    default: {
      // Unticking removes the entry, so an untouched day stays truly empty.
      return withEntry(data, key, habitId, entry?.done ? null : { done: true, value: 1 });
    }
  }
}

/** +/- buttons for counter habits. Value is clamped to [0, target]. */
export function bumpCounter(
  data: AppData,
  habitId: string,
  key: DateKey,
  direction: 1 | -1,
): AppData {
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return data;
  const entry = getEntry(data, key, habitId);
  const target = targetOf(habit);
  const next = Math.max(0, Math.min(target, (entry?.value ?? 0) + direction * stepOf(habit)));
  return withEntry(data, key, habitId, next === 0 ? null : { value: next, done: next >= target });
}

/** Adds minutes to a duration habit (timer output, manual logging). */
export function addMinutes(
  data: AppData,
  habitId: string,
  minutes: number,
  key: DateKey = todayKey(),
): AppData {
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return data;
  const entry = getEntry(data, key, habitId);
  const next = Math.max(0, Math.round((entry?.value ?? 0) + minutes));
  return withEntry(
    data,
    key,
    habitId,
    next === 0 ? null : { value: next, done: next >= targetOf(habit) },
  );
}

/**
 * Sets today's amount outright — what the quick-log chips use.
 * One tap says "20 минут" instead of tapping +1 twenty times. Clamped to the goal.
 */
export function setProgress(
  data: AppData,
  habitId: string,
  value: number,
  key: DateKey = todayKey(),
): AppData {
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit || !isCounted(habit)) return data;
  const target = targetOf(habit);
  const next = Math.max(0, Math.min(target, Math.round(value)));
  return withEntry(data, key, habitId, next === 0 ? null : { value: next, done: next >= target });
}

export function addDump(data: AppData, key: DateKey, text: string): AppData {
  const trimmed = text.trim();
  if (!trimmed) return data;
  const day = data.days[key] ?? emptyDay();
  const item: DumpItem = {
    id: uid('d'),
    text: trimmed.slice(0, 280),
    done: false,
    createdAt: new Date().toISOString(),
  };
  return { ...data, days: { ...data.days, [key]: { ...day, dump: [...day.dump, item] } } };
}

export function toggleDump(data: AppData, key: DateKey, id: string): AppData {
  const day = data.days[key] ?? emptyDay();
  return {
    ...data,
    days: {
      ...data.days,
      [key]: {
        ...day,
        dump: day.dump.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
      },
    },
  };
}

export function removeDump(data: AppData, key: DateKey, id: string): AppData {
  const day = data.days[key] ?? emptyDay();
  return prune(
    {
      ...data,
      days: { ...data.days, [key]: { ...day, dump: day.dump.filter((item) => item.id !== id) } },
    },
    key,
  );
}

export function clearDoneDump(data: AppData, key: DateKey): AppData {
  const day = data.days[key] ?? emptyDay();
  return prune(
    { ...data, days: { ...data.days, [key]: { ...day, dump: day.dump.filter((item) => !item.done) } } },
    key,
  );
}

export interface HabitInput {
  name: string;
  kind: HabitKind;
  target?: number;
  unit?: string;
  perWeek?: number;
  step?: number;
  tiny?: string;
  pinned?: boolean;
}

/** Keeps `order` dense and unique (0..n-1) after any list mutation. */
function normalizeOrder(habits: Habit[]): Habit[] {
  return [...habits]
    .sort((a, b) => a.order - b.order)
    .map((habit, index) => ({ ...habit, order: index }));
}

/** Creates a habit when `id` is omitted, otherwise updates it in place. */
export function saveHabit(data: AppData, input: HabitInput, id?: string): AppData {
  const name = input.name.trim().slice(0, 80) || '—';
  const base: Omit<Habit, 'id' | 'createdAt' | 'order'> = {
    name,
    kind: input.kind,
    target: input.kind === 'counter' || input.kind === 'duration' ? Math.max(1, Math.round(input.target ?? 1)) : undefined,
    unit: input.unit?.trim().slice(0, 16) || undefined,
    perWeek: input.kind === 'flex' ? Math.max(1, Math.min(7, Math.round(input.perWeek ?? 3))) : undefined,
    step: input.kind === 'counter' ? Math.max(1, Math.round(input.step ?? 1)) : undefined,
    tiny: input.tiny?.trim().slice(0, 120) || undefined,
    pinned: input.pinned,
    archived: false,
  };

  if (id) {
    const existing = data.habits.find((h) => h.id === id);
    if (!existing) return data;
    const wantsPin = base.pinned ?? existing.pinned ?? false;
    const updated: Habit = {
      ...existing,
      ...base,
      archived: existing.archived,
      pinned: wantsPin && (existing.pinned || canPinMore(data)),
    };
    return { ...data, habits: normalizeOrder(data.habits.map((h) => (h.id === id ? updated : h))) };
  }

  const created: Habit = {
    ...base,
    pinned: Boolean(base.pinned) && canPinMore(data),
    id: uid(),
    createdAt: new Date().toISOString(),
    order: data.habits.length,
  };
  return { ...data, habits: normalizeOrder([...data.habits, created]) };
}

export function deleteHabit(data: AppData, id: string): AppData {
  const days: AppData['days'] = {};
  for (const [key, day] of Object.entries(data.days)) {
    const entries = { ...day.entries };
    delete entries[id];
    // Drop the day entirely when nothing else is left in it.
    if (Object.keys(entries).length === 0 && day.dump.length === 0) continue;
    days[key] = { ...day, entries };
  }
  return {
    ...data,
    habits: normalizeOrder(data.habits.filter((h) => h.id !== id)),
    days,
  };
}

export function toggleArchive(data: AppData, id: string): AppData {
  const habits = data.habits.map((h) =>
    h.id === id ? { ...h, archived: !h.archived, pinned: h.archived ? h.pinned : false } : h,
  );
  return { ...data, habits: normalizeOrder(habits) };
}

/** Pins/unpins; refuses to pin a 4th habit (returns data unchanged). */
export function togglePin(data: AppData, id: string): AppData {
  const habit = data.habits.find((h) => h.id === id);
  if (!habit) return data;
  if (!habit.pinned && !canPinMore(data)) return data;
  return {
    ...data,
    habits: data.habits.map((h) => (h.id === id ? { ...h, pinned: !h.pinned } : h)),
  };
}

export function moveHabit(data: AppData, id: string, direction: -1 | 1): AppData {
  const list = data.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
  const index = list.findIndex((h) => h.id === id);
  const target = list[index + direction];
  if (index < 0 || !target) return data;
  const current = list[index];
  const habits = data.habits.map((h) =>
    h.id === current.id ? { ...h, order: target.order } : h.id === target.id ? { ...h, order: current.order } : h,
  );
  return { ...data, habits: normalizeOrder(habits) };
}

export function updateSettings(data: AppData, patch: Partial<Settings>): AppData {
  return { ...data, settings: { ...data.settings, ...patch } };
}
