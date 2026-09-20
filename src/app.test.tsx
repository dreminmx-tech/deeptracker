import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import App from './App';
import { StoreProvider } from './store';
import { ToastProvider } from './components/Toast';
import TodayView from './components/TodayView';
import HabitsView from './components/HabitsView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import { STORAGE_KEY, type AppData } from './types';
import { addDays, todayKey } from './lib/date';
import { freshData } from './lib/storage';
import { addDump, addMinutes, tapHabit } from './lib/actions';

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

afterEach(() => {
  delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
});

describe('views render', () => {
  it('renders the shell with tabs and the seeded habits', () => {
    seedStorage(freshData('ru'));
    const html = render(<App />);
    expect(html).toContain('deeptracker');
    expect(html).toContain('Сегодня');
    expect(html).toContain('Статистика');
    expect(html).toContain('Выпить таблетки');
    expect(html).toContain('Главное сегодня');
  });

  it('renders Today with the brain dump', () => {
    seedStorage(dataWithHistory());
    const html = render(<TodayView onGoToHabits={() => {}} />);
    expect(html).toContain('Мысли на сегодня');
    expect(html).toContain('Позвонить в поликлинику');
    expect(html).toContain('Просто начни');
  });

  it('renders the habits list', () => {
    seedStorage(freshData('ru'));
    const html = render(<HabitsView />);
    expect(html).toContain('Привычки');
    expect(html).toContain('Не листать телефон в постели');
    expect(html).toContain('+ Привычка');
  });

  it('renders stats with a heatmap once there is data', () => {
    seedStorage(dataWithHistory());
    const html = render(<StatsView />);
    expect(html).toContain('По привычкам');
    expect(html).toContain('heatmap');
    expect(html).toContain('данные, а не оценка');
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
  });
});
