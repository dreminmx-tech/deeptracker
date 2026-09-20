import { useEffect, useMemo, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { ToastProvider } from './components/Toast';
import TodayView from './components/TodayView';
import HabitsView from './components/HabitsView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import { t } from './lib/i18n';
import { updateSettings } from './lib/actions';
import { todayKey } from './lib/date';

type Tab = 'today' | 'habits' | 'stats' | 'settings';
const TABS: Tab[] = ['today', 'habits', 'stats', 'settings'];

function Shell() {
  const { data, update } = useStore();
  const dict = useMemo(() => t(data.settings.lang), [data.settings.lang]);
  const [tab, setTab] = useState<Tab>('today');
  // Bumped at midnight / on tab focus so the "today" views roll over without a reload.
  const [day, setDay] = useState(() => todayKey());

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = data.settings.theme;
    root.lang = data.settings.lang;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', data.settings.theme === 'light' ? '#ffffff' : '#141418');
  }, [data.settings.theme, data.settings.lang]);

  useEffect(() => {
    const check = () => setDay(todayKey());
    const id = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  return (
    <div className="app">
      <header className="app-head">
        <div>
          <p className="app-name">deeptracker</p>
          <p className="muted small">{dict['app.tagline']}</p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label={dict['settings.theme']}
            onClick={() =>
              update((current) =>
                updateSettings(current, {
                  theme: current.settings.theme === 'dark' ? 'light' : 'dark',
                }),
              )
            }
          >
            ◐
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={dict['settings.language']}
            onClick={() =>
              update((current) =>
                updateSettings(current, { lang: current.settings.lang === 'ru' ? 'en' : 'ru' }),
              )
            }
          >
            {data.settings.lang.toUpperCase()}
          </button>
        </div>
      </header>

      <main key={day}>
        {tab === 'today' ? <TodayView onGoToHabits={() => setTab('habits')} /> : null}
        {tab === 'habits' ? <HabitsView /> : null}
        {tab === 'stats' ? <StatsView /> : null}
        {tab === 'settings' ? <SettingsView /> : null}
      </main>

      <nav className="tabs">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            data-active={tab === key ? 'true' : 'false'}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}
          >
            {dict[`nav.${key}`]}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  );
}
