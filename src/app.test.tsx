import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import App from './App';
import { StoreProvider } from './store';
import { ToastProvider } from './components/Toast';
import ActionSheet from './components/ActionSheet';
import LogDialog from './components/LogDialog';
import TodayView from './components/TodayView';
import HabitsView from './components/HabitsView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import { STORAGE_KEY, type AppData } from './types';
import { addDays, todayKey, weekdayIndex } from './lib/date';
import { freshData } from './lib/storage';
import { addDump, addMinutes, tapHabit } from './lib/actions';
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

  it('renders Today with the brain dump and one quiet status per row', () => {
    seedStorage(dataWithHistory());
    const html = render(<TodayView onGoToHabits={() => {}} />);
    expect(html).toContain('Мысли на сегодня');
    expect(html).toContain('Позвонить в поликлинику');
    expect(html).toContain('0/6');
    expect(html).toContain('25/20 мин');
    // ежедневные действия — инлайн-иконки, читать ничего не нужно
    expect(html).toContain('aria-label="Прибавить"');
    expect(html).toContain('aria-label="Просто начни"');
    // у счётчика и минут − значение + собраны в один прибор, а не в три элемента
    expect(html.match(/class="stepper"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="0/6 — изменить"');
    expect(html).toContain('aria-label="25/20 мин — изменить"');
  });

  it('logs a whole amount in one tap instead of twenty', () => {
    const walk = freshData('ru').habits[2];
    if (!walk) throw new Error('seeds missing');
    seedStorage(freshData('ru'));
    const html = render(
      <LogDialog habit={walk} mode="quick" day={todayKey()} onClose={() => {}} />,
    );

    expect(html).toContain('Сколько всего, мин?');
    expect(html).toContain('Цель — 20 мин');
    expect(html).toContain('aria-label="Записать 20 мин"');
    expect(html.match(/class="chip"/g)).toHaveLength(4);
    // в окне есть и точная подстройка по единице, и таймер
    expect(html.match(/class="stepper"/g)).toHaveLength(1);
    expect(html).toContain('Засечь время');
    expect(html).toContain('20:00');
  });

  it('lets a past day be filled in from the week strip', () => {
    seedStorage(agedHistory());
    const past = addDays(todayKey(), -3);
    const html = render(<TodayView onGoToHabits={() => {}} initialDay={past} />);

    expect(html).toContain('Прошлый день');
    expect(html).toContain('Вернуться к сегодня');
    expect(html).toContain('aria-current="date"');
    // неделя целиком: семь дней плюс переходы
    expect(html.match(/class="day-chip"/g)).toHaveLength(7);
    expect(html.match(/class="daystrip-shift"/g)).toHaveLength(2);
  });

  it('says one calm thing about the day', () => {
    seedStorage(agedHistory());
    const atRisk = render(<TodayView onGoToHabits={() => {}} />);
    expect(atRisk).toContain('Вчера был пропуск');

    let closed = agedHistory();
    for (const habit of closed.habits) {
      if (!['check', 'counter', 'duration'].includes(habit.kind)) continue;
      if (isComplete(habit, getEntry(closed, todayKey(), habit.id))) continue;
      closed = tapHabit(closed, habit.id, todayKey());
    }
    seedStorage(closed);
    const html = render(<TodayView onGoToHabits={() => {}} />);
    expect(html).toContain('На сегодня всё');
    expect(html).not.toContain('Вчера был пропуск');
  });

  it('renders the habits list', () => {
    seedStorage(freshData('ru'));
    const html = render(<HabitsView />);
    expect(html).toContain('Привычки');
    expect(html).toContain('Не листать телефон в постели');
    expect(html).toContain('+ Привычка');
  });

  it('renders stats with a trend strip once there is data', () => {
    seedStorage(dataWithHistory());
    const html = render(<StatsView />);
    expect(html).toContain('100% дней');
    expect(html).toContain('class="trend"');
    expect(html).toContain('данные, а не оценка');
    // заголовок — такая же карточка, как всё остальное, а привычки живут одним списком
    expect(html).toContain('class="card stat"');
    expect(html).toContain('class="rows"');
    expect(html).toContain('class="hstat"');
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
    // паста спрятана, а разрушительное действие отделено и подписано
    expect(html).toContain('Paste JSON manually');
    expect(html).toContain('Danger zone');
    expect(html).toContain('btn btn-danger');
    expect(html).toContain('class="segmented segmented-wide"');
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
