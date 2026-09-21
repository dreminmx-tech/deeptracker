import type { HabitKind, Lang } from '../types';

/**
 * UI dictionary. `ru` is the source of truth: the `Dict` type is derived from it,
 * so a missing or misspelled key in another language fails the type check.
 *
 * Держим словарь коротким. Каждая фраза в интерфейсе — это то, что человек читает
 * вместо того, чтобы закрыть привычку, поэтому длинных объяснений здесь нет.
 */
const ru = {
  'nav.today': 'Сегодня',
  'nav.habits': 'Привычки',
  'nav.journal': 'Журнал',
  'nav.stats': 'Статистика',
  'nav.settings': 'Настройки',

  'today.greeting.morning': 'Доброе утро',
  'today.greeting.day': 'Добрый день',
  'today.greeting.evening': 'Добрый вечер',
  'today.greeting.night': 'Поздний вечер',
  'today.progress': '{done} из {total}',
  'today.allDone': 'На сегодня всё.',
  'today.atRisk': 'Вчера было пусто. Один пропуск прощается.',
  'today.pastTitle': 'Прошлый день',
  'today.pastEmpty': 'В этот день привычек ещё не было.',
  'today.offSchedule': 'По расписанию на сегодня ничего.',
  'today.today': 'Сегодня',
  'today.prevDay': 'Предыдущий день',
  'today.nextDay': 'Следующий день',
  'today.showOffSchedule': 'Показать не по расписанию ({n})',
  'today.hideOffSchedule': 'Скрыть не по расписанию',
  'today.negatives': 'Не делать',
  'today.dump': 'Быстрые дела',
  'today.dumpPlaceholder': 'Дело или идея',
  'today.dumpAdd': 'Добавить',
  'today.dumpClear': 'Убрать выполненные',
  'today.empty.text': 'Начни с одной.',
  'today.empty.cta': 'Создать привычку',
  'today.pinLimit': 'В «Главном» уже три привычки',

  'journal.placeholder': 'Что происходит?',
  'journal.add': 'Добавить запись',
  'journal.done': 'Готово',
  'journal.note': 'Править запись',
  'journal.send': 'Отправить',

  'habits.title': 'Привычки',
  'habits.add': 'Добавить',
  'habits.new': 'Новая привычка',
  'habits.edit': 'Изменить привычку',
  'habits.name': 'Название',
  'habits.namePlaceholder': 'Например: выпить таблетки',
  'habits.kind': 'Тип',
  'habits.kind.check': 'Делать',
  'habits.kind.negative': 'Не делать',
  'habits.days': 'Дни недели',
  'habits.onWeekdays': 'по будням',
  'habits.onWeekend': 'по выходным',
  'habits.pin': 'Показывать в «Главном»',
  'habits.archive': 'В архив',
  'habits.unarchive': 'Вернуть из архива',
  'habits.archiveSection': 'Архив',
  'habits.delete': 'Удалить',
  'habits.deleteConfirm': 'Удалить привычку вместе с историей?',
  'habits.save': 'Сохранить',
  'habits.cancel': 'Отмена',

  'sheet.more': 'Действия',
  'sheet.slip': 'Отметить срыв',
  'sheet.slipUndo': 'Вернуть «чисто»',
  'sheet.edit': 'Изменить привычку',
  'sheet.up': 'Переместить выше',
  'sheet.down': 'Переместить ниже',
  'sheet.pin': 'Показывать в главных',
  'sheet.unpin': 'Убрать из главных',

  'stats.title': 'Статистика',
  'stats.overall': 'Дней подряд с делами',
  'stats.overallBest': 'Лучшая серия: {n}',
  'stats.thisWeek': 'Эта неделя',
  'stats.weekLine': 'Дней с делами: {done} из {total}',
  'stats.perHabit': 'По привычкам',
  'stats.streak': 'серия {n}',
  'stats.empty': 'Пока нечего считать.',

  'settings.title': 'Настройки',
  'settings.general': 'Интерфейс',
  'settings.language': 'Язык',
  'settings.theme': 'Тема',
  'settings.theme.dark': 'Чёрная',
  'settings.theme.light': 'Белая',
  'settings.data': 'Данные',
  'settings.export': 'Скачать JSON',
  'settings.importFile': 'Загрузить из файла',
  'settings.importOk': 'Данные загружены',
  'settings.importBad': 'Не получилось прочитать этот JSON',
  'settings.lastExport': 'Последний бэкап: {date}',
  'settings.neverExported': 'Бэкапа ещё не было.',
  'settings.backupNeverCta': 'Пора сделать первый.',
  'settings.backupStaleCta': 'Пора обновить.',
  'settings.dangerZone': 'Опасная зона',
  'settings.wipe': 'Удалить все данные',
  'settings.wipeConfirm': 'Удалить все привычки и всю историю? Это необратимо.',
  'settings.wipeYes': 'Да, удалить',
  'settings.wipeNo': 'Оставить',
  'settings.install': 'Установить на устройство',
  'settings.installed': 'Приложение установлено',
  'settings.installIos': 'iPhone: «Поделиться» → «На экран „Домой“».',
  'settings.about': 'О приложении',
  'settings.aboutText': 'Данные только в этом браузере. Ничего никуда не отправляется.',
  'settings.version': 'Версия {v}',

  'common.close': 'Закрыть',
  'common.cancel': 'Отмена',
  'common.delete': 'Удалить',
};

export type Dict = typeof ru;

const en: Dict = {
  'nav.today': 'Today',
  'nav.habits': 'Habits',
  'nav.journal': 'Log',
  'nav.stats': 'Stats',
  'nav.settings': 'Settings',

  'today.greeting.morning': 'Good morning',
  'today.greeting.day': 'Good afternoon',
  'today.greeting.evening': 'Good evening',
  'today.greeting.night': 'Late night',
  'today.progress': '{done} of {total}',
  'today.allDone': 'Done for today.',
  'today.atRisk': 'Yesterday was empty. One miss is forgiven.',
  'today.today': 'Today',
  'today.prevDay': 'Previous day',
  'today.nextDay': 'Next day',
  'today.pastTitle': 'A past day',
  'today.pastEmpty': 'No habits existed on that day yet.',
  'today.offSchedule': 'Nothing scheduled for today.',
  'today.showOffSchedule': 'Show off-schedule habits ({n})',
  'today.hideOffSchedule': 'Hide off-schedule habits',
  'today.negatives': "Don't do",
  'today.dump': 'Quick things',
  'today.dumpPlaceholder': 'A task or an idea',
  'today.dumpAdd': 'Add',
  'today.dumpClear': 'Clear done items',
  'today.empty.text': 'Start with one.',
  'today.empty.cta': 'Create a habit',
  'today.pinLimit': 'The main three are already full',

  'journal.placeholder': "What's going on?",
  'journal.add': 'Add a note',
  'journal.done': 'Done',
  'journal.note': 'Edit note',
  'journal.send': 'Send',

  'habits.title': 'Habits',
  'habits.add': 'Add',
  'habits.new': 'New habit',
  'habits.edit': 'Edit habit',
  'habits.name': 'Name',
  'habits.namePlaceholder': 'e.g. take meds',
  'habits.kind': 'Type',
  'habits.kind.check': 'Do',
  'habits.kind.negative': "Don't do",
  'habits.days': 'Weekdays',
  'habits.onWeekdays': 'weekdays',
  'habits.onWeekend': 'weekends',
  'habits.pin': 'Show in the main three',
  'habits.archive': 'Archive',
  'habits.unarchive': 'Restore from archive',
  'habits.archiveSection': 'Archive',
  'habits.delete': 'Delete',
  'habits.deleteConfirm': 'Delete the habit together with its history?',
  'habits.save': 'Save',
  'habits.cancel': 'Cancel',

  'sheet.more': 'Actions',
  'sheet.slip': 'Log a slip',
  'sheet.slipUndo': 'Back to clean',
  'sheet.edit': 'Edit habit',
  'sheet.up': 'Move up',
  'sheet.down': 'Move down',
  'sheet.pin': 'Show in the main three',
  'sheet.unpin': 'Remove from the main three',

  'stats.title': 'Stats',
  'stats.overall': 'Days in a row with progress',
  'stats.overallBest': 'Best streak: {n}',
  'stats.thisWeek': 'This week',
  'stats.weekLine': 'Days with progress: {done} of {total}',
  'stats.perHabit': 'By habit',
  'stats.streak': '{n} in a row',
  'stats.empty': 'Nothing to count yet.',

  'settings.title': 'Settings',
  'settings.general': 'Interface',
  'settings.language': 'Language',
  'settings.theme': 'Theme',
  'settings.theme.dark': 'Black',
  'settings.theme.light': 'White',
  'settings.data': 'Data',
  'settings.export': 'Download JSON',
  'settings.importFile': 'Load from file',
  'settings.importOk': 'Data loaded',
  'settings.importBad': 'Could not read that JSON',
  'settings.lastExport': 'Last backup: {date}',
  'settings.neverExported': 'No backup yet.',
  'settings.backupNeverCta': 'Time to make the first one.',
  'settings.backupStaleCta': 'Time to refresh it.',
  'settings.dangerZone': 'Danger zone',
  'settings.wipe': 'Delete all data',
  'settings.wipeConfirm': 'Delete every habit and all history? This cannot be undone.',
  'settings.wipeYes': 'Yes, delete',
  'settings.wipeNo': 'Keep it',
  'settings.install': 'Install on device',
  'settings.installed': 'The app is installed',
  'settings.installIos': 'iPhone: Share → Add to Home Screen.',
  'settings.about': 'About',
  'settings.aboutText': 'Data lives in this browser only. Nothing is sent anywhere.',
  'settings.version': 'Version {v}',

  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
};

export const STRINGS: Record<Lang, Dict> = { ru, en };

export function t(lang: Lang): Dict {
  return STRINGS[lang] ?? ru;
}

/** Replaces {placeholders} in a template string. */
export function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}

export interface HabitSeed {
  name: string;
  kind: HabitKind;
  pinned?: boolean;
}

/**
 * Starter set created on first launch. Every habit here is one tap, including
 * «Вода»: the app used to seed a six-glass counter and a twenty-minute walk,
 * and that choice of amount was the friction it was supposed to remove.
 */
export const SEED_HABITS: Record<Lang, HabitSeed[]> = {
  ru: [
    { name: 'Выпить таблетки', kind: 'check', pinned: true },
    { name: 'Вода', kind: 'check', pinned: true },
    { name: 'Прогулка', kind: 'check', pinned: true },
    { name: 'Спорт', kind: 'check' },
    { name: 'Не листать телефон в постели', kind: 'negative' },
  ],
  en: [
    { name: 'Take meds', kind: 'check', pinned: true },
    { name: 'Water', kind: 'check', pinned: true },
    { name: 'Walk', kind: 'check', pinned: true },
    { name: 'Workout', kind: 'check' },
    { name: 'No phone in bed', kind: 'negative' },
  ],
};
