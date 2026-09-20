import { useMemo } from 'react';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { lastNDays, todayKey, weekdayName, weekdayShort } from '../lib/date';
import {
  activeHabits,
  dayHeatStatus,
  dayStatus,
  hasAnyData,
  isActionable,
  overallStreak,
  softStreak,
  weekProgress,
  weekReview,
  weekdayRates,
} from '../lib/habits';
import TrendStrip from './TrendStrip';
import ValueRow from './ValueRow';

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
 * Статистика отвечает на три вопроса и молчит про остальное:
 * сколько держится серия, как прошла эта неделя и что именно отстаёт.
 * Никаких окон 30/90 и стены из тридцати столбиков на каждую привычку —
 * за неделю видно ровно то, на что ещё можно повлиять.
 */
export default function StatsView() {
  const { data } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const today = todayKey();
  const week = useMemo(() => lastNDays(7, today), [today]);
  // Дни недели смотрятся на месяце: за семь дней каждый день встречается один раз.
  const month = useMemo(() => lastNDays(30, today), [today]);
  // «Лучшая серия» — не про одну неделю: за семь дней она всегда упирается в семь.
  const quarter = useMemo(() => lastNDays(90, today), [today]);

  const habits = activeHabits(data);
  const actionable = habits.filter(isActionable);
  const streak = overallStreak(data);
  const best = bestRun(
    quarter.map((key) => actionable.some((habit) => dayStatus(data, habit, key) === 'done')),
  );
  const anything = hasAnyData(data);

  const weekRates = weekdayRates(data, actionable, month, today);
  /** The weekday that most often ends up empty — the one insight worth saying out loud. */
  let worstWeekday: number | null = null;
  let lowest = 1;
  weekRates.forEach((rate, index) => {
    if (rate.total < 2) return;
    const share = rate.done / rate.total;
    if (share < lowest) {
      lowest = share;
      worstWeekday = index;
    }
  });

  const review = weekReview(data, habits, week, today);
  const reviewTone =
    review.totalDays === 0
      ? null
      : review.activeDays / review.totalDays >= 0.7
        ? dict['stats.review.good']
        : review.activeDays / review.totalDays >= 0.4
          ? dict['stats.review.mid']
          : dict['stats.review.low'];

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
              <TrendStrip
                days={week}
                lang={lang}
                now={today}
                statusFor={(key) => dayHeatStatus(data, actionable, key, today)}
              />
              <ul className="weekday-labels">
                {week.map((key) => (
                  <li key={key}>{weekdayShort(key, lang)}</li>
                ))}
              </ul>
              {reviewTone ? <p className="muted small">{reviewTone}</p> : null}
              {review.totalDays > 0 ? (
                <ValueRow
                  label={dict['stats.review.days']}
                  value={fill(dict['stats.review.daysValue'], {
                    done: review.activeDays,
                    total: review.totalDays,
                  })}
                />
              ) : null}
              {review.best ? (
                <ValueRow
                  label={dict['stats.review.best']}
                  name={review.best.habit.name}
                  value={`${review.best.done}/${review.best.total}`}
                />
              ) : null}
              {review.worst ? (
                <ValueRow
                  label={dict['stats.review.worst']}
                  name={review.worst.habit.name}
                  value={`${review.worst.done}/${review.worst.total}`}
                />
              ) : null}
              {worstWeekday !== null ? (
                <p className="muted small">
                  {fill(dict['stats.weekdayWorst'], { day: weekdayName(worstWeekday, lang) })}
                </p>
              ) : null}
            </div>
          </section>

          <section className="block">
            <p className="label">{dict['stats.perHabit']}</p>
            <div className="rows">
              {habits.map((habit) => {
                const weekly = habit.kind === 'flex' ? weekProgress(data, habit) : null;
                const streakOf = softStreak(data, habit);
                return (
                  <div key={habit.id} className="hstat">
                    <div className="hstat-head">
                      <span className="hstat-name">{habit.name}</span>
                      <span className="hstat-streak">
                        {weekly
                          ? fill(dict['today.weekly'], { done: weekly.done, target: weekly.target })
                          : streakOf > 0
                            ? fill(dict['today.streak'], { n: streakOf })
                            : ''}
                      </span>
                    </div>
                    <TrendStrip
                      compact
                      days={week}
                      lang={lang}
                      statusFor={(key) => dayStatus(data, habit, key, today)}
                    />
                  </div>
                );
              })}
            </div>
            <p className="muted small">{dict['stats.noJudgement']}</p>
          </section>
        </>
      )}
    </div>
  );
}
