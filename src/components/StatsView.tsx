import { useMemo } from 'react';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { lastNDays, todayKey, weekdayShort } from '../lib/date';
import {
  activeHabits,
  dayHeatStatus,
  dayStatus,
  hasAnyData,
  isActionable,
  overallStreak,
  softStreak,
} from '../lib/habits';

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

/**
 * Две цифры и семь точек. Никаких полос на тридцать дней, легенд и процентов:
 * «длинные непонятные графики» — это ровно то, из-за чего на статистику не хочется
 * заходить. Точка — это день: была работа или не было.
 */
export default function StatsView() {
  const { data } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const today = todayKey();
  const week = useMemo(() => lastNDays(7, today), [today]);
  // «Лучшая серия» — не про одну неделю: за семь дней она всегда упирается в семь.
  const quarter = useMemo(() => lastNDays(90, today), [today]);

  const habits = activeHabits(data);
  const actionable = habits.filter(isActionable);
  // Как и в списке привычек: «делать» и «не делать» — два разных вопроса.
  const useful = habits.filter((habit) => habit.kind !== 'negative');
  const negatives = habits.filter((habit) => habit.kind === 'negative');
  const streak = overallStreak(data);
  const best = bestRun(
    quarter.map((key) => actionable.some((habit) => dayStatus(data, habit, key) === 'done')),
  );
  const anything = hasAnyData(data);

  /** Одна привычка — одна строка: имя и серия. Считаем серию ровно один раз. */
  function streakRow(habit: (typeof habits)[number]) {
    const streakOf = softStreak(data, habit);
    return (
      <div key={habit.id} className="hstat hstat-one">
        <span className="hstat-name">{habit.name}</span>
        <span className="hstat-streak">
          {streakOf > 0 ? fill(dict['stats.streak'], { n: streakOf }) : ''}
        </span>
      </div>
    );
  }

  const weekDays = week.map((key) => {
    const status = dayHeatStatus(data, actionable, key, today);
    return { key, on: status === 'done' || status === 'partial' };
  });
  const weekDone = weekDays.filter((day) => day.on).length;

  return (
    <div className="stack">
      <header className="view-head">
        <h1>{dict['stats.title']}</h1>
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

          <section className="block">
            <p className="label">{dict['stats.thisWeek']}</p>
            <div className="card">
              <ul className="dots">
                {weekDays.map(({ key, on }) => (
                  <li key={key}>
                    <span
                      className="dot"
                      data-on={on ? 'true' : 'false'}
                      data-now={key === today ? 'true' : 'false'}
                      aria-hidden="true"
                    />
                    <span className="dot-day">{weekdayShort(key, lang)}</span>
                  </li>
                ))}
              </ul>
              <p className="muted small">
                {fill(dict['stats.weekLine'], { done: weekDone, total: week.length })}
              </p>
            </div>
          </section>

          <section className="block">
            <p className="label">{dict['stats.perHabit']}</p>

            {useful.length > 0 ? (
              <div className="block">
                <p className="label">{dict['habits.kind.check']}</p>
                <div className="rows">{useful.map(streakRow)}</div>
              </div>
            ) : null}

            {/* Запреты живут отдельно: у них серия — это чистые дни, и стоять
                в одном ряду с обычными привычками они не должны. */}
            {negatives.length > 0 ? (
              <div className="block">
                <p className="label">{dict['today.negatives']}</p>
                <div className="rows">{negatives.map(streakRow)}</div>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
