import type { AppData, Habit, Lang } from '../types';
import type { Dict } from '../lib/i18n';
import { fill } from '../lib/i18n';
import { todayKey } from '../lib/date';
import { getEntry, progressOf, softStreak, targetOf, weekProgress } from '../lib/habits';

function minuteUnit(habit: Habit, lang: Lang): string {
  return habit.unit ?? (lang === 'ru' ? 'мин' : 'min');
}

/** Right-aligned chip: weekly progress for flex habits, streak for the rest. */
export function habitChip(data: AppData, habit: Habit, dict: Dict): string {
  if (habit.kind === 'flex') {
    const weekly = weekProgress(data, habit);
    return fill(weekly.done >= weekly.target ? dict['today.weeklyDone'] : dict['today.weekly'], {
      done: weekly.done,
      target: weekly.target,
    });
  }
  const streak = softStreak(data, habit);
  return streak > 0 ? fill(dict['today.streak'], { n: streak }) : '';
}

export function isWeekClosed(data: AppData, habit: Habit): boolean {
  if (habit.kind !== 'flex') return false;
  const weekly = weekProgress(data, habit);
  return weekly.done >= weekly.target;
}

/** Under the name on a roomy card: how much is done today. */
export function habitDetail(data: AppData, habit: Habit, lang: Lang): string {
  const entry = getEntry(data, todayKey(), habit.id);
  if (habit.kind === 'counter') {
    const value = Math.round(progressOf(habit, entry));
    return `${value}/${targetOf(habit)}${habit.unit ? ` ${habit.unit}` : ''}`;
  }
  if (habit.kind === 'duration') {
    const value = Math.round(progressOf(habit, entry));
    return `${value}/${targetOf(habit)} ${minuteUnit(habit, lang)}`;
  }
  return '';
}

/** Dense one-liner for compact rows: shorter units, abbreviations, no fluff. */
export function habitMeta(data: AppData, habit: Habit, dict: Dict, lang: Lang): string {
  const entry = getEntry(data, todayKey(), habit.id);
  switch (habit.kind) {
    case 'counter': {
      const value = Math.round(progressOf(habit, entry));
      const base = `${value}/${targetOf(habit)}`;
      return habit.unit && habit.unit.length <= 5 ? `${base} ${habit.unit}` : base;
    }
    case 'duration': {
      const value = Math.round(progressOf(habit, entry));
      return `${value}/${targetOf(habit)} ${minuteUnit(habit, lang)}`;
    }
    case 'flex': {
      const weekly = weekProgress(data, habit);
      return fill(dict['today.weeklyShort'], { done: weekly.done, target: weekly.target });
    }
    case 'negative':
      return fill(dict['today.cleanDaysShort'], { n: softStreak(data, habit) });
    case 'check':
    default: {
      const streak = softStreak(data, habit);
      return streak > 0 ? fill(dict['today.streak'], { n: streak }) : '';
    }
  }
}
