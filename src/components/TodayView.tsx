import { useState } from 'react';
import type { Habit } from '../types';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { formatDay, todayKey } from '../lib/date';
import { addDump, clearDoneDump, removeDump, toggleDump } from '../lib/actions';
import {
  activeHabits,
  dayProgress,
  flexHabits,
  getDay,
  isActionable,
  mainHabits,
  negativeHabits,
  otherHabits,
} from '../lib/habits';
import HabitCard from './HabitCard';
import TimerDialog from './TimerDialog';

interface TodayViewProps {
  onGoToHabits: () => void;
}

export default function TodayView({ onGoToHabits }: TodayViewProps) {
  const { data, update } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const today = todayKey();

  const [dumpText, setDumpText] = useState('');
  const [timer, setTimer] = useState<{ habit: Habit; mode: 'tiny' | 'focus' } | null>(null);

  const active = activeHabits(data);
  const actionable = active.filter(isActionable);
  const main = mainHabits(data);
  const rest = otherHabits(data);
  const flexible = flexHabits(data);
  const negatives = negativeHabits(data);
  const day = getDay(data, today);
  const { done, total } = dayProgress(data, actionable, today);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? dict['today.greeting.night']
      : hour < 12
        ? dict['today.greeting.morning']
        : hour < 18
          ? dict['today.greeting.day']
          : dict['today.greeting.evening'];

  const progressNote =
    total === 0 ? '' : done === total ? dict['today.allDone'] : done === 0 ? dict['today.noneYet'] : '';

  return (
    <div className="stack">
      <header className="today-head">
        <p className="eyebrow">{formatDay(today, lang)}</p>
        <h1>{greeting}</h1>
        {total > 0 ? (
          <>
            <div
              className="bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-label={fill(dict['today.progress'], { done, total })}
            >
              <span className="bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="muted">
              {fill(dict['today.progress'], { done, total })}
              {progressNote ? ` · ${progressNote}` : ''}
            </p>
          </>
        ) : null}
      </header>

      {active.length === 0 ? (
        <section className="card empty">
          <h2>{dict['today.empty.title']}</h2>
          <p className="muted">{dict['today.empty.text']}</p>
          <button type="button" className="btn btn-primary" onClick={onGoToHabits}>
            {dict['today.empty.cta']}
          </button>
        </section>
      ) : null}

      {main.length > 0 ? (
        <section className="section">
          <h2 className="section-title">{dict['today.main']}</h2>
          <div className="cards">
            {main.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                big
                onStartTiny={(target) => setTimer({ habit: target, mode: 'tiny' })}
                onOpenTimer={(target) => setTimer({ habit: target, mode: 'focus' })}
              />
            ))}
          </div>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section className="section">
          <h2 className="section-title">{dict['today.others']}</h2>
          <div className="cards">
            {rest.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onStartTiny={(target) => setTimer({ habit: target, mode: 'tiny' })}
                onOpenTimer={(target) => setTimer({ habit: target, mode: 'focus' })}
              />
            ))}
          </div>
        </section>
      ) : null}

      {flexible.length > 0 ? (
        <section className="section">
          <h2 className="section-title">{dict['habits.kind.flex']}</h2>
          <div className="cards">
            {flexible.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onStartTiny={(target) => setTimer({ habit: target, mode: 'tiny' })}
                onOpenTimer={(target) => setTimer({ habit: target, mode: 'focus' })}
              />
            ))}
          </div>
        </section>
      ) : null}

      {negatives.length > 0 ? (
        <section className="section">
          <h2 className="section-title">{dict['today.negatives']}</h2>
          <p className="banner">{dict['today.negativesHint']}</p>
          <div className="cards">
            {negatives.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onStartTiny={(target) => setTimer({ habit: target, mode: 'tiny' })}
                onOpenTimer={(target) => setTimer({ habit: target, mode: 'focus' })}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="section-title">{dict['today.dump']}</h2>
        <form
          className="dump-form"
          onSubmit={(event) => {
            event.preventDefault();
            update((current) => addDump(current, today, dumpText));
            setDumpText('');
          }}
        >
          <input
            type="text"
            value={dumpText}
            maxLength={280}
            placeholder={dict['today.dumpPlaceholder']}
            aria-label={dict['today.dumpPlaceholder']}
            onChange={(event) => setDumpText(event.target.value)}
          />
          <button type="submit" className="btn" disabled={dumpText.trim().length === 0}>
            {dict['today.dumpAdd']}
          </button>
        </form>

        {day.dump.length === 0 ? (
          <p className="muted small">{dict['today.dumpEmpty']}</p>
        ) : (
          <ul className="dump-list">
            {day.dump.map((item) => (
              <li key={item.id} className={item.done ? 'is-done' : ''}>
                <button
                  type="button"
                  className="dump-item"
                  aria-pressed={item.done}
                  onClick={() => update((current) => toggleDump(current, today, item.id))}
                >
                  <span className="box" data-checked={item.done ? 'true' : 'false'} aria-hidden="true">
                    {item.done ? '✓' : ''}
                  </span>
                  <span className="dump-text">{item.text}</span>
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={dict['common.delete']}
                  onClick={() => update((current) => removeDump(current, today, item.id))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {day.dump.some((item) => item.done) ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => update((current) => clearDoneDump(current, today))}
          >
            {dict['today.dumpClear']}
          </button>
        ) : null}
      </section>

      <p className="muted small center">{dict['today.tapHint']}</p>

      {timer ? (
        <TimerDialog habit={timer.habit} mode={timer.mode} onClose={() => setTimer(null)} />
      ) : null}
    </div>
  );
}
