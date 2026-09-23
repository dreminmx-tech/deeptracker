/**
 * Таймер «держусь» — единственная механика для привычек «не делать».
 *
 * Тяга живёт минутами: пока она идёт, человек не отмечает «сорвался» и не считает
 * дни — он просто держится. Поэтому здесь нет данных, только время: таймер ничего
 * не пишет в историю, пока не нажата одна из двух кнопок в панели.
 */

/** Длительности на выбор. Список закрытый: кнопка не должна встречать «7 минут». */
export const RESIST_MINUTES = [5, 10, 15, 30];

/** Длительность таймера для привычки: только из списка, иначе пять минут. */
export function resistMinutes(habit?: { resist?: number } | null): number {
  const value = habit?.resist;
  return value && RESIST_MINUTES.includes(value) ? value : RESIST_MINUTES[0];
}

/**
 * Остаток как «4:32» или «12:05» — как на любом таймере, без слова «осталось»:
 * рядом с цифрами уже написано, что происходит.
 */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
