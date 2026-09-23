import { describe, expect, it } from 'vitest';
import { RESIST_MINUTES, formatRemaining, resistMinutes } from './timer';
import { freshData, normalizeData } from './storage';
import { saveHabit } from './actions';

describe('timer', () => {
  it('formats the remaining time as a clock', () => {
    expect(formatRemaining(5 * 60_000)).toBe('5:00');
    expect(formatRemaining(4 * 60_000 + 32_000)).toBe('4:32');
    expect(formatRemaining(12 * 60_000 + 5_000)).toBe('12:05');
  });

  it('never shows a second too few and never goes negative', () => {
    // осталось 4:31.4 — на экране ещё 4:32, иначе последняя секунда мигала бы дважды
    expect(formatRemaining(4 * 60_000 + 31_400)).toBe('4:32');
    expect(formatRemaining(0)).toBe('0:00');
    expect(formatRemaining(-5000)).toBe('0:00');
  });

  it('falls back to five minutes for anything not in the list', () => {
    expect(resistMinutes({ resist: 15 })).toBe(15);
    expect(resistMinutes({ resist: 7 })).toBe(RESIST_MINUTES[0]);
    expect(resistMinutes({})).toBe(5);
    expect(resistMinutes(null)).toBe(5);
  });
});

describe('resist in habit data', () => {
  it('keeps a chosen duration on a «не делать» habit', () => {
    const data = saveHabit(freshData('ru'), { name: 'Не курить', kind: 'negative', resist: 30 });
    const habit = data.habits.find((item) => item.name === 'Не курить');
    expect(habit?.resist).toBe(30);
  });

  it('drops the duration from a «делать» habit and from a bad value', () => {
    const useful = saveHabit(freshData('ru'), { name: 'Вода', kind: 'check', resist: 10 });
    expect(useful.habits.find((item) => item.name === 'Вода')?.resist).toBeUndefined();

    const odd = saveHabit(freshData('ru'), { name: 'Не грызть', kind: 'negative', resist: 7 });
    expect(odd.habits.find((item) => item.name === 'Не грызть')?.resist).toBeUndefined();
  });

  it('normalizes a hand-edited export', () => {
    const data = normalizeData({
      habits: [
        { name: 'Не курить', kind: 'negative', resist: 15 },
        { name: 'Не курить дважды', kind: 'negative', resist: 7 },
        { name: 'Вода', kind: 'check', resist: 15 },
      ],
    });
    expect(data.habits.map((habit) => habit.resist)).toEqual([15, undefined, undefined]);
  });
});
