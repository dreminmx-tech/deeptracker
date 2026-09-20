import { describe, expect, it } from 'vitest';
import type { AppData, DayLog, Habit } from '../types';
import { MAX_PINNED } from '../types';
import { addDays, parseKey, todayKey, type DateKey } from './date';
import { addMinutes, bumpCounter, deleteHabit, moveHabit, saveHabit, setProgress, tapHabit } from './actions';
import {
  bestStreak,
  dayProgress,
  dayStatus,
  getEntry,
  isComplete,
  softStreak,
  weekProgress,
} from './habits';
import { freshData, normalizeData, parseImport, toJson } from './storage';
import { quickSteps } from '../components/habitText';

const TODAY = todayKey();

/** Local noon of a date key, so the ISO string maps back to the same local day. */
function isoAt(key: DateKey): string {
  return new Date(parseKey(key).getTime() + 12 * 3600 * 1000).toISOString();
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test habit',
    kind: 'check',
    createdAt: isoAt(addDays(TODAY, -40)),
    order: 0,
    ...overrides,
  };
}

function makeData(habit: Habit | null, days: Record<string, DayLog> = {}): AppData {
  return {
    version: 1,
    habits: habit ? [habit] : [],
    days,
    settings: { lang: 'ru', theme: 'dark' },
  };
}

function logDays(offsets: number[], entry = { done: true, value: 1 }): Record<string, DayLog> {
  const days: Record<string, DayLog> = {};
  for (const offset of offsets) {
    days[addDays(TODAY, -offset)] = { entries: { h1: { ...entry } }, dump: [] };
  }
  return days;
}

describe('tapHabit', () => {
  it('toggles a check habit and prunes the day when it becomes empty', () => {
    const habit = makeHabit();
    let data = makeData(habit);

    data = tapHabit(data, 'h1', TODAY);
    expect(getEntry(data, TODAY, 'h1')?.done).toBe(true);
    expect(dayStatus(data, habit, TODAY)).toBe('done');

    data = tapHabit(data, 'h1', TODAY);
    expect(getEntry(data, TODAY, 'h1')).toBeUndefined();
    expect(data.days[TODAY]).toBeUndefined();
    expect(dayStatus(data, habit, TODAY)).toBe('missed');
  });

  it('fills a counter to its target and resets it on the next tap', () => {
    const habit = makeHabit({ kind: 'counter', target: 6 });
    let data = makeData(habit);

    data = tapHabit(data, 'h1', TODAY);
    expect(getEntry(data, TODAY, 'h1')?.value).toBe(6);
    expect(dayStatus(data, habit, TODAY)).toBe('done');

    data = tapHabit(data, 'h1', TODAY);
    expect(getEntry(data, TODAY, 'h1')).toBeUndefined();
    expect(dayStatus(data, habit, TODAY)).toBe('missed');
  });

  it('treats negative habits as clean by default and logs a slip on tap', () => {
    const habit = makeHabit({ kind: 'negative' });
    let data = makeData(habit);

    expect(isComplete(habit, undefined)).toBe(true);
    expect(dayStatus(data, habit, TODAY)).toBe('done');

    data = tapHabit(data, 'h1', TODAY);
    expect(dayStatus(data, habit, TODAY)).toBe('missed');

    data = tapHabit(data, 'h1', TODAY);
    expect(dayStatus(data, habit, TODAY)).toBe('done');
  });

  it('treats unlogged flex days as rest and counts a tap towards the week', () => {
    const habit = makeHabit({ kind: 'flex', perWeek: 3 });
    let data = makeData(habit);

    expect(dayStatus(data, habit, TODAY)).toBe('rest');

    data = tapHabit(data, 'h1', TODAY);
    expect(dayStatus(data, habit, TODAY)).toBe('done');
    expect(weekProgress(data, habit, TODAY).done).toBe(1);
    expect(weekProgress(data, habit, TODAY).target).toBe(3);
  });
});

describe('dayStatus', () => {
  it('marks days before the habit existed as rest and future days as future', () => {
    const habit = makeHabit({ createdAt: isoAt(TODAY) });
    const data = makeData(habit);

    expect(dayStatus(data, habit, addDays(TODAY, -1))).toBe('rest');
    expect(dayStatus(data, habit, addDays(TODAY, 1))).toBe('future');
  });
});

describe('soft streaks', () => {
  const habit = makeHabit({ createdAt: isoAt(addDays(TODAY, -10)) });

  it('absorbs a single missed day and keeps counting', () => {
    const data = makeData(habit, logDays([1, 2, 4, 5, 6]));
    expect(softStreak(data, habit, TODAY)).toBe(5);
    expect(bestStreak(data, habit, TODAY)).toBe(5);
  });

  it('breaks the run after two consecutive misses', () => {
    const data = makeData(habit, logDays([1, 2, 5]));
    expect(softStreak(data, habit, TODAY)).toBe(2);
  });

  it('does not punish an incomplete today', () => {
    const data = makeData(habit, logDays([1, 2, 3]));
    expect(softStreak(data, habit, TODAY)).toBe(3);
    expect(dayStatus(data, habit, TODAY)).toBe('missed');
  });
});

describe('counters and durations', () => {
  it('clamps counter taps to the target', () => {
    const habit = makeHabit({ kind: 'counter', target: 3 });
    let data = makeData(habit);

    data = bumpCounter(data, 'h1', TODAY, 1);
    expect(getEntry(data, TODAY, 'h1')?.value).toBe(1);
    expect(dayStatus(data, habit, TODAY)).toBe('partial');

    for (let i = 0; i < 10; i += 1) data = bumpCounter(data, 'h1', TODAY, 1);
    expect(getEntry(data, TODAY, 'h1')?.value).toBe(3);

    data = bumpCounter(data, 'h1', TODAY, -1);
    expect(getEntry(data, TODAY, 'h1')?.value).toBe(2);

    for (let i = 0; i < 5; i += 1) data = bumpCounter(data, 'h1', TODAY, -1);
    expect(getEntry(data, TODAY, 'h1')).toBeUndefined();
    expect(dayStatus(data, habit, TODAY)).toBe('missed');
  });

  it('accumulates logged minutes', () => {
    const habit = makeHabit({ kind: 'duration', target: 20 });
    let data = makeData(habit);

    data = addMinutes(data, 'h1', 5, TODAY);
    expect(getEntry(data, TODAY, 'h1')?.value).toBe(5);
    expect(dayStatus(data, habit, TODAY)).toBe('partial');

    data = addMinutes(data, 'h1', 20, TODAY);
    expect(getEntry(data, TODAY, 'h1')?.value).toBe(25);
    expect(dayStatus(data, habit, TODAY)).toBe('done');
  });

  it('sets the whole amount at once, so 20 minutes is one tap', () => {
    const habit = makeHabit({ kind: 'duration', target: 20 });
    let data = makeData(habit);

    data = setProgress(data, 'h1', 20, TODAY);
    expect(getEntry(data, TODAY, 'h1')?.value).toBe(20);
    expect(dayStatus(data, habit, TODAY)).toBe('done');

    // a value cannot run past the goal, and zero clears the day again
    data = setProgress(data, 'h1', 99, TODAY);
    expect(getEntry(data, TODAY, 'h1')?.value).toBe(20);

    data = setProgress(data, 'h1', 0, TODAY);
    expect(getEntry(data, TODAY, 'h1')).toBeUndefined();
    expect(dayStatus(data, habit, TODAY)).toBe('missed');
  });

  it('ignores quick-log calls for habits without an amount', () => {
    const habit = makeHabit({ kind: 'check' });
    const data = makeData(habit);
    expect(setProgress(data, 'h1', 5, TODAY)).toBe(data);
  });
});

describe('quickSteps', () => {
  it('offers every unit for small goals', () => {
    expect(quickSteps(6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(quickSteps(1)).toEqual([1]);
  });

  it('offers even jumps that always end on the goal', () => {
    expect(quickSteps(20)).toEqual([5, 10, 15, 20]);
    expect(quickSteps(30)).toEqual([10, 20, 30]);
    expect(quickSteps(90)).toEqual([30, 60, 90]);
    expect(quickSteps(120)).toEqual([30, 60, 90, 120]);
  });
});

describe('dayProgress', () => {
  it('counts only the habits that expect a daily action', () => {
    const check = makeHabit({ id: 'h1' });
    const negative = makeHabit({ id: 'h2', kind: 'negative' });
    let data: AppData = { ...makeData(check), habits: [check, negative] };
    data = tapHabit(data, 'h1', TODAY);

    expect(dayProgress(data, [check], TODAY)).toEqual({ done: 1, total: 1 });
    expect(dayProgress(data, [], TODAY)).toEqual({ done: 0, total: 0 });
    // Negative habits stay out of the daily ring: they are done by default.
    expect(dayStatus(data, negative, TODAY)).toBe('done');
  });
});

describe('habit management', () => {
  it('never pins more than MAX_PINNED habits', () => {
    let data = makeData(null);
    for (const name of ['a', 'b', 'c', 'd']) {
      data = saveHabit(data, { name, kind: 'check', pinned: true });
    }
    expect(data.habits.filter((habit) => habit.pinned)).toHaveLength(MAX_PINNED);
  });

  it('reorders habits', () => {
    const a = makeHabit({ id: 'a', order: 0 });
    const b = makeHabit({ id: 'b', order: 1 });
    let data: AppData = { ...makeData(a), habits: [a, b] };

    data = moveHabit(data, 'b', -1);
    expect(data.habits.find((habit) => habit.id === 'b')?.order).toBe(0);
    expect(data.habits.find((habit) => habit.id === 'a')?.order).toBe(1);
  });

  it('deletes the habit together with its history', () => {
    const habit = makeHabit();
    let data = tapHabit(makeData(habit), 'h1', TODAY);
    data = deleteHabit(data, 'h1');

    expect(data.habits).toHaveLength(0);
    expect(data.days[TODAY]).toBeUndefined();
  });
});

describe('storage', () => {
  it('seeds a small starter set', () => {
    const data = freshData('ru');
    expect(data.habits.length).toBeGreaterThan(0);
    expect(data.habits.filter((habit) => habit.pinned).length).toBeLessThanOrEqual(MAX_PINNED);
    expect(data.settings.theme).toBe('dark');
  });

  it('round-trips through export and import', () => {
    const data = freshData('en');
    const restored = parseImport(toJson(data));
    expect(restored.habits.map((habit) => habit.name)).toEqual(data.habits.map((habit) => habit.name));
    expect(restored.settings.lang).toBe('en');
  });

  it('rejects broken or foreign JSON', () => {
    expect(() => parseImport('{')).toThrow();
    expect(() => parseImport('{"hello":1}')).toThrow();
    expect(() => parseImport('{"habits":[]}')).toThrow();
  });

  it('normalizes unknown fields and bad kinds', () => {
    const data = normalizeData({
      habits: [{ name: '  X  ', kind: 'nonsense', target: 'lots', pinned: 'yes' }],
      days: { 'not-a-date': { entries: { h: { value: -5 } } } },
    });
    expect(data.habits).toHaveLength(1);
    expect(data.habits[0].name).toBe('X');
    expect(data.habits[0].kind).toBe('check');
    expect(data.habits[0].pinned).toBe(false);
    expect(Object.keys(data.days)).toHaveLength(0);
  });

  it('keeps raw entries and assigns an id to habits that arrive without one', () => {
    const data = normalizeData({ habits: [{ name: 'A' }], days: { [TODAY]: { entries: { ghost: { value: 3 } } } } });
    expect(data.days[TODAY].entries.ghost).toEqual({ value: 3 });
    expect(data.habits[0].id).toBeTruthy();
    expect(data.habits[0].id).not.toBe('ghost');
  });
});
