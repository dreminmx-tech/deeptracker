import type { AppData, Habit, Lang } from '../types';
import type { Dict } from '../lib/i18n';
import { todayKey } from '../lib/date';
import { getEntry, progressOf, softStreak, targetOf, weekProgress } from '../lib/habits';

function minuteUnit(habit: Habit, lang: Lang): string {
  return habit.unit ?? (lang === 'ru' ? 'мин' : 'min');
}

/**
 * One quiet value at the right edge of a row: today's progress, nothing else.
 * Streaks and history live in Статистика — the daily list stays calm.
 */
export function habitStatus(data: AppData, habit: Habit, lang: Lang): string {
  if (habit.kind === 'check') return '';
  const entry = getEntry(data, todayKey(), habit.id);

  if (habit.kind === 'counter') {
    const value = Math.round(progressOf(habit, entry));
    const base = `${value}/${targetOf(habit)}`;
    return habit.unit && habit.unit.length <= 5 ? `${base} ${habit.unit}` : base;
  }

  if (habit.kind === 'duration') {
    const value = Math.round(progressOf(habit, entry));
    return `${value}/${targetOf(habit)} ${minuteUnit(habit, lang)}`;
  }

  if (habit.kind === 'flex') {
    const weekly = weekProgress(data, habit);
    return `${weekly.done}/${weekly.target}`;
  }

  // negative: clean days in a row
  const clean = softStreak(data, habit);
  return lang === 'ru' ? `${clean} чисто` : `${clean} clean`;
}

/** Second line for the management list: kind and target. */
export function habitSubtitle(habit: Habit, dict: Dict, lang: Lang): string {
  const kind = dict[`habits.kind.${habit.kind}`];
  if (habit.kind === 'counter' || habit.kind === 'duration') {
    const unit = habit.unit ? ` ${habit.unit}` : habit.kind === 'duration' ? ` ${minuteUnit(habit, lang)}` : '';
    return `${kind} · ${targetOf(habit)}${unit}`;
  }
  if (habit.kind === 'flex') return `${kind} · ${habit.perWeek ?? 3}/7`;
  if (habit.pinned) return `${kind} · ${dict['habits.inMain']}`;
  return kind;
}

/** Units for the chips: 5/10/15/20 beats tapping +1 twenty times. */
const STEP_CHOICES = [1, 2, 5, 10, 15, 30, 60];

/**
 * Chip values for the quick log: every unit up to ten, then even jumps
 * (a 20-minute walk gets 5 · 10 · 15 · 20, always ending exactly on the goal).
 */
export function quickSteps(target: number): number[] {
  const goal = Math.max(1, Math.round(target));
  if (goal <= 10) return Array.from({ length: goal }, (_, index) => index + 1);
  const step = STEP_CHOICES.find((value) => goal / value <= 4) ?? 60;
  const marks: number[] = [];
  for (let value = step; value < goal; value += step) marks.push(value);
  marks.push(goal);
  return marks;
}

/** The unit as it should read next to a number: "20 мин", "6 стаканов". */
export function unitOf(habit: Habit, lang: Lang): string {
  if (habit.kind === 'duration') return minuteUnit(habit, lang);
  return habit.unit ?? '';
}
