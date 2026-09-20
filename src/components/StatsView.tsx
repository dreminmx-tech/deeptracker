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
import TrendStrip from './TrendStrip';

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
        <p className="muted">{dict['stats.empty']}</p>
      ) : (
        <>
          <div className="card stat">
            <div className="stat-main">
              <span className="stat-big">{streak}</span>
              <span className="stat-label">{dict['stats.overall']}</span>
            </div>
            <span className="stat-note">{fill(dict['stats.overallBest'], { n: best })}</span>
          </div>

          <div className="card">
            <TrendStrip
              days={days}
              lang={lang}
              statusFor={(key) => dayHeatStatus(data, actionable, key, today)}
            />
            <ul className="legend">
              {(['done', 'partial', 'missed', 'rest'] as const).map((status) => (
                <li key={status}>
                  <span className="trend-sample" data-status={status} aria-hidden="true" />
                  {dict[`stats.legend.${status}`]}
                </li>
              ))}
            </ul>
            <p className="muted small">{dict['stats.noJudgement']}</p>
          </div>

          <section className="block">
            <p className="label">{dict['stats.perHabit']}</p>
            <div className="rows">
              {habits.map((habit) => {
                const rate = Math.round(completionRate(data, habit, days) * 100);
                const weekly = habit.kind === 'flex' ? weekProgress(data, habit) : null;
                return (
                  <div key={habit.id} className="hstat">
                    <div className="hstat-head">
                      <span className="hrow-name">{habit.name}</span>
                      <span className="hstat-value muted small">
                        {weekly
                          ? fill(dict['today.weekly'], { done: weekly.done, target: weekly.target })
                          : fill(dict['stats.rate'], { n: rate })}
                      </span>
                    </div>
                    <TrendStrip
                      days={days}
                      lang={lang}
                      statusFor={(key) => dayStatus(data, habit, key, today)}
                    />
                    <p className="muted small">
                      {fill(dict['today.streak'], { n: softStreak(data, habit) })} ·{' '}
                      {fill(dict['today.best'], { n: bestStreak(data, habit) })}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
