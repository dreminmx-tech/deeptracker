import { useState, type ReactNode } from 'react';
import { Ban, Play, Undo2, X } from 'lucide-react';
import type { Habit } from '../types';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { formatDay, todayKey } from '../lib/date';
import { addDump, bumpCounter, clearDoneDump, removeDump, tapHabit, toggleDump } from '../lib/actions';
import {
  activeHabits,
  dayProgress,
  getDay,
  getEntry,
  isActionable,
  isComplete,
  mainHabits,
} from '../lib/habits';
import Checkbox from './Checkbox';
import CountStepper from './CountStepper';
import HabitRow from './HabitRow';
import LogDialog, { type LogMode } from './LogDialog';
import { habitStatus } from './habitText';

interface TodayViewProps {
  onGoToHabits: () => void;
}

const ICON = 19;

export default function TodayView({ onGoToHabits }: TodayViewProps) {
  const { data, update } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const today = todayKey();

  const [dumpText, setDumpText] = useState('');
  const [dialog, setDialog] = useState<{ habit: Habit; mode: LogMode } | null>(null);

  const active = activeHabits(data);
  const actionable = active.filter(isActionable);
  const main = mainHabits(data);
  const mainIds = new Set(main.map((habit) => habit.id));
  const rest = active.filter((habit) => !mainIds.has(habit.id) && habit.kind !== 'negative');
  const negatives = active.filter((habit) => habit.kind === 'negative');

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

  const startTiny = (habit: Habit) => setDialog({ habit, mode: 'tiny' });
  const openLog = (habit: Habit) => setDialog({ habit, mode: 'quick' });

  /**
   * One visual element per row on the right. Counter and minutes habits fold `− value +`
   * into a single stepper (and the value opens the quick log); the rest get one icon:
   * `Play` for “just start”, `Ban` for “don't do”.
   */
  function actionsFor(habit: Habit): ReactNode {
    const entry = getEntry(data, today, habit.id);

    if (habit.kind === 'counter' || habit.kind === 'duration') return null;

    if (habit.kind === 'negative') {
      const slipped = (entry?.value ?? 0) > 0;
      const label = slipped ? dict['sheet.slipUndo'] : dict['sheet.slip'];
      return (
        <button
          type="button"
          className="row-act"
          data-active={slipped ? 'true' : 'false'}
          aria-label={label}
          title={label}
          onClick={() => update((current) => tapHabit(current, habit.id))}
        >
          {slipped ? <Undo2 size={ICON} strokeWidth={1.8} /> : <Ban size={ICON} strokeWidth={1.8} />}
        </button>
      );
    }

    return (
      <button
        type="button"
        className="row-act"
        aria-label={dict['today.tiny']}
        title={dict['today.tiny']}
        onClick={() => startTiny(habit)}
      >
        <Play size={ICON} strokeWidth={1.8} />
      </button>
    );
  }

  function row(habit: Habit) {
    const isNegative = habit.kind === 'negative';
    const counts = habit.kind === 'counter' || habit.kind === 'duration';
    const status = habitStatus(data, habit, lang);
    return (
      <HabitRow
        key={habit.id}
        habit={habit}
        pinned={habit.pinned}
        done={isComplete(habit, getEntry(data, today, habit.id))}
        status={counts ? undefined : status}
        statusSlot={
          counts ? (
            <CountStepper
              lang={lang}
              value={status}
              openLabel={fill(dict['log.open'], { v: status })}
              onOpen={() => openLog(habit)}
              onBump={(direction) =>
                update((current) => bumpCounter(current, habit.id, today, direction))
              }
            />
          ) : undefined
        }
        onToggle={
          isNegative
            ? undefined
            : () => update((current) => tapHabit(current, habit.id))
        }
        actions={actionsFor(habit)}
      />
    );
  }

  return (
    <div className="stack">
      <header className="day-head">
        <p className="label">{formatDay(today, lang)}</p>
        <div className="day-line">
          <h1>{greeting}</h1>
          {total > 0 ? (
            <span className="day-count">{fill(dict['today.progress'], { done, total })}</span>
          ) : null}
        </div>
        {total > 0 ? (
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
        ) : null}
      </header>

      {active.length === 0 ? (
        <div className="empty">
          <p className="muted">{dict['today.empty.text']}</p>
          <button type="button" className="btn btn-primary" onClick={onGoToHabits}>
            {dict['today.empty.cta']}
          </button>
        </div>
      ) : (
        <>
          <div className="rows">
            {main.map(row)}
            {rest.map(row)}
          </div>

          {negatives.length > 0 ? (
            <section className="block">
              <p className="label">{dict['today.negatives']}</p>
              <div className="rows">{negatives.map(row)}</div>
            </section>
          ) : null}

          <section className="block">
            <p className="label">{dict['today.dump']}</p>
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

            {day.dump.length > 0 ? (
              <ul className="dump-list">
                {day.dump.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="dump-item"
                      aria-pressed={item.done}
                      onClick={() => update((current) => toggleDump(current, today, item.id))}
                    >
                      <Checkbox checked={item.done} small />
                      <span className="dump-text" data-done={item.done ? 'true' : 'false'}>
                        {item.text}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="dump-remove"
                      aria-label={dict['common.delete']}
                      title={dict['common.delete']}
                      onClick={() => update((current) => removeDump(current, today, item.id))}
                    >
                      <X size={ICON} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {day.dump.some((item) => item.done) ? (
              <button
                type="button"
                className="link"
                onClick={() => update((current) => clearDoneDump(current, today))}
              >
                {dict['today.dumpClear']}
              </button>
            ) : null}
          </section>
        </>
      )}

      {dialog ? (
        <LogDialog habit={dialog.habit} mode={dialog.mode} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}
