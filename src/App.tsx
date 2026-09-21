import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarCheck,
  ListChecks,
  NotebookPen,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import { StoreProvider, useStore } from './store';
import { ToastProvider } from './components/Toast';
import TodayView from './components/TodayView';
import HabitsView from './components/HabitsView';
import JournalView from './components/JournalView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import { t } from './lib/i18n';
import { todayKey } from './lib/date';

type Tab = 'today' | 'habits' | 'journal' | 'stats' | 'settings';
/** Five tabs, the journal in the middle: writing a thought is as daily as ticking a box. */
const TABS: Tab[] = ['today', 'habits', 'journal', 'stats', 'settings'];
const TAB_ICONS: Record<Tab, LucideIcon> = {
  today: CalendarCheck,
  habits: ListChecks,
  journal: NotebookPen,
  stats: BarChart3,
  settings: SettingsIcon,
};

/** Deep links: /#stats, /#habits … (handy for bookmarks and screenshots). */
function tabFromHash(): Tab {
  if (typeof window === 'undefined') return 'today';
  const raw = window.location.hash.replace(/^#\/?/, '');
  return (TABS as string[]).includes(raw) ? (raw as Tab) : 'today';
}

function Shell() {
  const { data } = useStore();
  const dict = useMemo(() => t(data.settings.lang), [data.settings.lang]);
  const [tab, setTab] = useState<Tab>(() => tabFromHash());
  // Bumped at midnight / on focus so the "today" views roll over without a reload.
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

  function selectTab(next: Tab) {
    setTab(next);
    try {
      window.history.replaceState(null, '', next === 'today' ? window.location.pathname : `#${next}`);
    } catch {
      /* file:// and friends — the tab still switches */
    }
  }

  return (
    <div className="app">
      <main key={day}>
        {tab === 'today' ? <TodayView onGoToHabits={() => selectTab('habits')} /> : null}
        {tab === 'habits' ? <HabitsView /> : null}
        {tab === 'journal' ? <JournalView /> : null}
        {tab === 'stats' ? <StatsView /> : null}
        {tab === 'settings' ? <SettingsView /> : null}
      </main>

      <nav className="tabs">
        {TABS.map((key) => {
          const TabIcon = TAB_ICONS[key];
          return (
            <button
              key={key}
              type="button"
              data-active={tab === key ? 'true' : 'false'}
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => selectTab(key)}
            >
              <TabIcon size={20} strokeWidth={1.8} aria-hidden="true" />
              <span>{dict[`nav.${key}`]}</span>
            </button>
          );
        })}
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
