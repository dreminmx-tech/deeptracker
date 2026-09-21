/**
 * Журнал: короткие заметки по дням. Мысль пишется за один Enter, живёт в тот день,
 * когда она пришла, и лежит в ленте сверху — над вчерашними.
 *
 * Никаких папок, тегов, поиска и удаления: всё это — трение перед тем, как записать
 * строчку. Единственная защита от промаха — заметку нельзя стереть подчистую,
 * поэтому случайное «выделить всё и удалить» ничего не ломает.
 *
 * Чистая логика: ни React, ни DOM.
 */
import type { AppData, JournalNote } from '../types';
import type { DateKey } from './date';
import { isValidKey, todayKey } from './date';
import { uid } from './actions';

/** Длинной мысли хватает с запасом, а роман пишут не здесь. */
export const NOTE_MAX = 2000;

function note(text: string, createdAt: string): JournalNote {
  return { id: uid('n'), text, createdAt };
}

/** Заметки дня, новые сверху. */
export function notesOn(data: AppData, key: DateKey): JournalNote[] {
  return data.journal[key] ?? [];
}

/** Текст в открытом поле этого дня, или undefined, если поле закрыто. */
export function draftOn(data: AppData, key: DateKey): string | undefined {
  return Object.prototype.hasOwnProperty.call(data.drafts, key) ? data.drafts[key] : undefined;
}

function hasContent(data: AppData, key: DateKey, today: DateKey): boolean {
  return key === today || notesOn(data, key).length > 0 || draftOn(data, key) !== undefined;
}

/**
 * Дни ленты: сегодня, дни с заметками и дни с открытым полем. Сверху новые, так
 * что сегодняшняя заметка всегда первая — искать её не нужно.
 */
export function journalDays(data: AppData, today: DateKey = todayKey()): DateKey[] {
  const keys = new Set<DateKey>([today, ...Object.keys(data.journal), ...Object.keys(data.drafts)]);
  return [...keys]
    .filter((key) => isValidKey(key) && hasContent(data, key, today))
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

/** Каждое нажатие клавиши — сразу в данные: закрытое приложение не теряет мысль. */
export function setDraft(data: AppData, key: DateKey, text: string): AppData {
  return { ...data, drafts: { ...data.drafts, [key]: text.slice(0, NOTE_MAX) } };
}

/** Enter: пустое поле просто закрывается, текст становится заметкой сверху дня. */
export function commitDraft(
  data: AppData,
  key: DateKey,
  at: string = new Date().toISOString(),
): AppData {
  const text = (draftOn(data, key) ?? '').trim();
  const drafts = { ...data.drafts };
  delete drafts[key];
  if (!text) return { ...data, drafts };
  return {
    ...data,
    drafts,
    journal: { ...data.journal, [key]: [note(text.slice(0, NOTE_MAX), at), ...notesOn(data, key)] },
  };
}

/**
 * Правка заметки. Пустой текст не сохраняется и заметку не убирает: удаления в
 * журнале нет, поэтому стёртое подчистую просто возвращается на место.
 */
export function editNote(data: AppData, key: DateKey, id: string, text: string): AppData {
  const notes = notesOn(data, key);
  const trimmed = text.trim().slice(0, NOTE_MAX);
  if (!trimmed || !notes.some((item) => item.id === id)) return data;
  return {
    ...data,
    journal: {
      ...data.journal,
      [key]: notes.map((item) => (item.id === id ? { ...item, text: trimmed } : item)),
    },
  };
}
