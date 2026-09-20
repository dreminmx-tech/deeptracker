import type { Habit, Lang } from '../types';
import type { Dict } from '../lib/i18n';
import { weekdayName } from '../lib/date';

/**
 * «пн, ср, пт» — расписание так, как оно читается в списке.
 * Больше о привычке приложение ничего не рассказывает: ни типа, ни цели, ни единиц.
 * Привычка — это вопрос «сделал сегодня или нет», и ответ на него один тап.
 */
export function habitDays(habit: Habit, dict: Dict, lang: Lang): string | null {
  const days = habit.days;
  if (!days || days.length === 0 || days.length >= 7) return null;
  if (days.length === 5 && days.every((day) => day <= 4)) return dict['habits.onWeekdays'];
  if (days.length === 2 && days.includes(5) && days.includes(6)) return dict['habits.onWeekend'];
  return days.map((day) => weekdayName(day, lang)).join(', ');
}

/** Вторая строка строки списка: только расписание, и только если оно не «каждый день». */
export function habitMeta(habit: Habit, dict: Dict, lang: Lang): string | undefined {
  return habitDays(habit, dict, lang) ?? undefined;
}
