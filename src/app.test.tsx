import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import App from './App';
import { StoreProvider } from './store';
import { ToastProvider } from './components/Toast';
import ActionSheet from './components/ActionSheet';
import TodayView from './components/TodayView';
import HabitsView from './components/HabitsView';
import JournalView from './components/JournalView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import { STORAGE_KEY, type AppData } from './types';
import { addDays, todayKey, weekdayIndex } from './lib/date';
import { freshData } from './lib/storage';
import { addDump, addMinutes, tapHabit } from './lib/actions';
import { commitDraft, setDraft } from './lib/journal';
import { getEntry, isComplete } from './lib/habits';

/** Minimal localStorage so `loadData()` sees exactly the data a test wants. */
function seedStorage(data: AppData) {
  const values = new Map<string, string>([[STORAGE_KEY, JSON.stringify(data)]]);
  const storage: Storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
  (globalThis as unknown as { localStorage: Storage }).localStorage = storage;
}

function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <StoreProvider>
      <ToastProvider>{node}</ToastProvider>
    </StoreProvider>,
  );
}

/** Fresh Russian seed data with a couple of logged days and brain-dump items. */
function dataWithHistory(): AppData {
  let data = freshData('ru');
  const first = data.habits[0];
  if (!first) throw new Error('seeds missing');
  data = tapHabit(data, first.id, todayKey());
  data = tapHabit(data, first.id, addDays(todayKey(), -1));
  data = addDump(data, todayKey(), 'Позвонить в поликлинику');
  data = addMinutes(data, data.habits[2].id, 25, todayKey());
  return data;
}

/** The same history, but the habits are a month old — past days count as expected. */
function agedHistory(): AppData {
  const data = dataWithHistory();
  return {
    ...data,
    habits: data.habits.map((habit) => ({
      ...habit,
      createdAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
    })),
  };
}

/** Два дня журнала: вчерашняя мысль и две сегодняшние, новые сверху. */
function withJournal(): AppData {
  const today = todayKey();
  const yesterday = addDays(today, -1);
  let data = commitDraft(setDraft(freshData('ru'), yesterday, 'Вчерашняя мысль'), yesterday);
  data = commitDraft(setDraft(data, today, 'Первая мысль'), today);
  data = commitDraft(setDraft(data, today, 'Вторая мысль'), today);
  return data;
}

afterEach(() => {
  delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
});

describe('views render', () => {
  it('renders the shell with tabs and the seeded habits', () => {
    seedStorage(freshData('ru'));
    const html = render(<App />);
    expect(html).toContain('Сегодня');
    expect(html).toContain('Привычки');
    expect(html).toContain('Статистика');
    expect(html).toContain('Настройки');
    expect(html).toContain('Выпить таблетки');
    expect(html).toContain('Вода');
  });

  it('puts the journal in the middle of five tabs', () => {
    seedStorage(freshData('ru'));
    const html = render(<App />);
    const tabs = html.slice(html.indexOf('class="tabs"'));
    const labels = [...tabs.matchAll(/<span>([^<]+)<\/span>/g)].map((match) => match[1]);
    expect(labels).toEqual(['Сегодня', 'Привычки', 'Журнал', 'Статистика', 'Настройки']);
  });

  it('renders Today as a list of checkboxes and the quick things', () => {
    seedStorage(dataWithHistory());
    const html = render(<TodayView onGoToHabits={() => {}} />);
    expect(html).toContain('Быстрые дела');
    expect(html).toContain('Позвонить в поликлинику');
    // привычка — это галочка: ни «сколько», ни кнопок «+ / −» в строке нет
    expect(html).toContain('class="hrow-main"');
    expect(html).not.toContain('stepper');
    expect(html).not.toContain('Просто начни');
    expect(html).not.toContain('0/6');
  });

  it('renders the journal as a feed of days, newest on top', () => {
    seedStorage(withJournal());
    const html = render(<JournalView />);

    // внутри дня новые заметки сверху, и сегодняшний день выше вчерашнего
    expect(html.indexOf('Вторая мысль')).toBeLessThan(html.indexOf('Первая мысль'));
    expect(html.indexOf('Первая мысль')).toBeLessThan(html.indexOf('Вчерашняя мысль'));
    // у заметки видно время, а не только текст
    expect(html).toContain('class="jnote-time"');
    // поле для новой заметки открыто только у сегодняшнего дня
    expect(html.match(/class="jcomposer"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Добавить запись"');
    expect(html).toContain('data-today="true"');
    // заметку можно править, но нельзя удалить
    expect(html).toContain('aria-label="Править запись"');
    expect(html).not.toContain('Удалить');
  });

  it('never hides what is already typed, even in a past day', () => {
    const today = todayKey();
    seedStorage(setDraft(withJournal(), addDays(today, -1), 'Дописываю вчера'));
    const html = render(<JournalView />);
    // два открытых поля: сегодняшнее и вчерашнее, и текст виден в обоих
    expect(html.match(/class="jcomposer"/g)).toHaveLength(2);
    expect(html).toContain('Дописываю вчера');
  });

  it('keeps yesterday one tap away, whatever yesterday looked like', () => {
    seedStorage(agedHistory());
    const html = render(<TodayView onGoToHabits={() => {}} />);

    // дата написана, шаг по дням на виду: вчера открывается даже если вчера не было пусто
    expect(html).toContain('aria-label="Предыдущий день"');
    expect(html).toMatch(/aria-label="Следующий день"[^>]*disabled/);
    expect(html).not.toContain('day-chip');
  });

  it('lets a past day be filled in', () => {
    seedStorage(agedHistory());
    const past = addDays(todayKey(), -3);
    const html = render(<TodayView onGoToHabits={() => {}} initialDay={past} />);

    expect(html).toContain('Прошлый день');
    // из прошлого есть один тап обратно в сегодня
    expect(html).toContain('>Сегодня<');
    expect(html).not.toContain('day-chip');
  });

  it('says one calm thing about the day', () => {
    seedStorage(agedHistory());
    const atRisk = render(<TodayView onGoToHabits={() => {}} />);
    expect(atRisk).toContain('Вчера было пусто');

    let closed = agedHistory();
    for (const habit of closed.habits) {
      if (!['check', 'counter', 'duration'].includes(habit.kind)) continue;
      if (isComplete(habit, getEntry(closed, todayKey(), habit.id))) continue;
      closed = tapHabit(closed, habit.id, todayKey());
    }
    seedStorage(closed);
    const html = render(<TodayView onGoToHabits={() => {}} />);
    expect(html).toContain('На сегодня всё');
    expect(html).not.toContain('Вчера было пусто');
  });

  it('renders the habits list', () => {
    seedStorage(freshData('ru'));
    const html = render(<HabitsView />);
    expect(html).toContain('Привычки');
    expect(html).toContain('Не листать телефон в постели');
    expect(html).toContain('Добавить');
  });

  it('renders stats as two numbers, a week of dots and a list of streaks', () => {
    seedStorage(dataWithHistory());
    const html = render(<StatsView />);
    expect(html).toContain('Эта неделя');
    // семь точек: точка — это день, расшифровывать нечего
    expect(html.match(/class="dot"/g)).toHaveLength(7);
    expect(html).toContain('class="hstat hstat-one"');
    // заголовок — такая же карточка, как всё остальное
    expect(html).toContain('class="card stat"');
    expect(html).toContain('class="rows"');
    // никаких полос, легенд и процентов
    expect(html).not.toContain('class="trend"');
    expect(html).not.toContain('legend');
    expect(html).toContain('По привычкам');
  });

  it('renders the empty stats state without data', () => {
    seedStorage(freshData('ru'));
    const html = render(<StatsView />);
    expect(html).toContain('Пока нечего считать');
  });

  it('renders settings in English', () => {
    const data = freshData('en');
    seedStorage({ ...data, settings: { ...data.settings, lang: 'en', theme: 'light' } });
    const html = render(<SettingsView />);
    expect(html).toContain('Settings');
    expect(html).toContain('Download JSON');
    expect(html).toContain('Delete all data');
    // разрушительное действие отделено и подписано
    expect(html).toContain('Danger zone');
    expect(html).toContain('btn btn-danger');
    // настройки — тихие строки: подпись слева, маленький переключатель справа
    expect(html).toContain('class="set-row"');
    expect(html).toContain('class="segmented"');
    // про единственный бэкап экран говорит прямо
    expect(html).toContain('No backup yet.');
  });

  it('asks for a backup once there is something to lose', () => {
    seedStorage(dataWithHistory());
    const html = render(<SettingsView />);
    expect(html).toContain('Бэкапа ещё не было.');
    expect(html).toContain('Пора сделать первый.');
  });

  it('hides habits that are not due today and says how many', () => {
    const data = agedHistory();
    const weekdayOnly = {
      ...data,
      habits: data.habits.map((habit) => ({ ...habit, days: [0, 1, 2, 3, 4] })),
    };
    seedStorage(weekdayOnly);

    // ближайшее воскресенье, не позже сегодняшнего дня
    let sunday = todayKey();
    for (let i = 0; i < 7; i += 1) {
      const key = addDays(todayKey(), -i);
      if (weekdayIndex(key) === 6) {
        sunday = key;
        break;
      }
    }

    const html = render(<TodayView onGoToHabits={() => {}} initialDay={sunday} />);
    expect(html).toContain('Показать не по расписанию (5)');
    expect(html).not.toContain('hrow-name');
  });

  it('renders the action sheet as a plain text list', () => {
    seedStorage(freshData('ru'));
    const html = render(
      <ActionSheet
        title="Вода"
        subtitle="Счётчик · 6 стаканов"
        actions={[
          { label: 'Отметить сделанным', onSelect: () => {}, primary: true },
          { label: 'Убавить', onSelect: () => {} },
          { label: 'Прибавить', onSelect: () => {} },
        ]}
        onClose={() => {}}
        closeLabel="Закрыть"
      />,
    );
    expect(html).toContain('Счётчик · 6 стаканов');
    expect(html).toContain('Отметить сделанным');
    expect(html).toContain('Прибавить');
    // одно нажатие — одно действие, без иконок
    expect(html.match(/class="action"/g)).toHaveLength(3);
  });
});
