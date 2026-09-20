import type { AppData, Habit, Lang } from '../types';
import type { Dict } from '../lib/i18n';
import type { DateKey } from '../lib/date';
import { todayKey, weekdayName } from '../lib/date';
import { getEntry, progressOf, softStreak, targetOf, weekProgress } from '../lib/habits';

function minuteUnit(habit: Habit, lang: Lang): string {
  return habit.unit ?? (lang === 'ru' ? 'мин' : 'min');
}

/**
 * One quiet value at the right edge of a row: that day's progress, nothing else.
 * Streaks and history live in Статистика — the daily list stays calm.
 */
export function habitStatus(
  data: AppData,
  habit: Habit,
  lang: Lang,
  day: DateKey = todayKey(),
): string {
  if (habit.kind === 'check') return '';
  const entry = getEntry(data, day, habit.id);

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
    const weekly = weekProgress(data, habit, day);
    return `${weekly.done}/${weekly.target}`;
  }

  // negative: clean days in a row, counted up to that day
  const clean = softStreak(data, habit, day);
  return lang === 'ru' ? `${clean} чисто` : `${clean} clean`;
}

/** "пн, ср, пт" — the schedule as it reads in a list. */
export function daysLabel(habit: Habit, dict: Dict, lang: Lang): string | null {
  const days = habit.days;
  if (!days || days.length === 0 || days.length >= 7) return null;
  if (days.length === 5 && days.every((day) => day <= 4)) return dict['habits.onWeekdays'];
  if (days.length === 2 && days.includes(5) && days.includes(6)) return dict['habits.onWeekend'];
  return days.map((day) => weekdayName(day, lang)).join(', ');
}

/** Second line for the management list: kind, goal and schedule. */
export function habitSubtitle(habit: Habit, dict: Dict, lang: Lang): string {
  const kind = dict[`habits.kind.${habit.kind}`];
  const parts: string[] = [];
  if (habit.kind === 'counter' || habit.kind === 'duration') {
    const unit = habit.unit ? ` ${habit.unit}` : habit.kind === 'duration' ? ` ${minuteUnit(habit, lang)}` : '';
    parts.push(`${kind} · ${targetOf(habit)}${unit}`);
  } else if (habit.kind === 'flex') {
    parts.push(`${kind} · ${habit.perWeek ?? 3}/7`);
  } else {
    parts.push(kind);
    if (habit.pinned) parts.push(dict['habits.inMain']);
  }
  const schedule = daysLabel(habit, dict, lang);
  if (schedule) parts.push(schedule);
  return parts.join(' · ');
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
