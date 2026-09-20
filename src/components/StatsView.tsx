import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { lastNDays, todayKey } from '../lib/date';
import {
  activeHabits,
  bestStreak,
  completionRate,
  dayHeatStatus,
  dayStatus,
  hasAnyData,
  isActionable,
  overallStreak,
  softStreak,
  weekProgress,
} from '../lib/habits';
import Heatmap from './Heatmap';

/** Longest run using the same "something was done" rule as the headline streak. */
function bestRun(flags: boolean[]): number {
  let best = 0;
  let run = 0;
  let misses = 0;
  flags.forEach((done, index) => {
    if (done) {
      run += 1;
      misses = 0;
      if (run > best) best = run;
      return;
    }
    if (index === flags.length - 1) return; // today is still open
    misses += 1;
    if (misses >= 2) {
      run = 0;
      misses = 0;
    }
  });
  return best;
}

export default function StatsView() {
  const { data } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const [range, setRange] = useState<30 | 90>(30);
  const today = todayKey();
  const days = useMemo(() => lastNDays(range, today), [range, today]);

  const habits = activeHabits(data);
  const actionable = habits.filter(isActionable);
  const streak = overallStreak(data);
  const best = bestRun(days.map((key) => actionable.some((habit) => dayStatus(data, habit, key) === 'done')));
  const anything = hasAnyData(data);

  return (
    <div className="stack">
      <header className="view-head">
        <h1>{dict['stats.title']}</h1>
        <div className="segmented" role="group">
          <button type="button" data-active={range === 30 ? 'true' : 'false'} onClick={() => setRange(30)}>
            {dict['stats.range30']}
          </button>
          <button type="button" data-active={range === 90 ? 'true' : 'false'} onClick={() => setRange(90)}>
            {dict['stats.range90']}
          </button>
        </div>
      </header>

      {!anything ? (
        <section className="card empty">
          <p className="muted">{dict['stats.empty']}</p>
        </section>
      ) : (
        <>
          <section className="card stat-card">
            <span className="stat-big">{streak}</span>
            <span className="stat-label">{dict['stats.overall']}</span>
            <span className="chip">{fill(dict['stats.overallBest'], { n: best })}</span>
          </section>

          <section className="card">
            <Heatmap days={days} lang={lang} statusFor={(key) => dayHeatStatus(data, actionable, key, today)} />
            <ul className="legend">
              {(['done', 'partial', 'missed', 'rest'] as const).map((status) => (
                <li key={status}>
                  <span className="cell" data-status={status} aria-hidden="true" />
                  {dict[`stats.legend.${status}`]}
                </li>
              ))}
            </ul>
            <p className="banner small">{dict['stats.noJudgement']}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{dict['stats.perHabit']}</h2>
            {habits.map((habit) => {
              const rate = Math.round(completionRate(data, habit, days) * 100);
              const weekly = habit.kind === 'flex' ? weekProgress(data, habit) : null;
              return (
                <article key={habit.id} className="card habit-stat">
                  <div className="habit-stat-head">
                    <span className="row-name">{habit.name}</span>
                    <span className="chip">
                      {weekly
                        ? fill(dict['today.weekly'], { done: weekly.done, target: weekly.target })
                        : fill(dict['stats.rate'], { n: rate })}
                    </span>
                  </div>
                  <Heatmap days={days} lang={lang} statusFor={(key) => dayStatus(data, habit, key, today)} />
                  <p className="muted small">
                    {fill(dict['today.streak'], { n: softStreak(data, habit) })} ·{' '}
                    {fill(dict['today.best'], { n: bestStreak(data, habit) })}
                  </p>
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
