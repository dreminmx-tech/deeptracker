import { useState, type ReactNode } from 'react';
import { Ban, Play, Undo2, X } from 'lucide-react';
import type { AppData, Habit } from '../types';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { formatDay, todayKey, type DateKey } from '../lib/date';
import {
  addDump,
  bumpCounter,
  clearDoneDump,
  removeDump,
  tapHabit,
  toggleDump,
} from '../lib/actions';
import {
  activeHabits,
  dayHeatStatus,
  dayProgress,
  getDay,
  getEntry,
  habitsUpTo,
  isActionable,
  isComplete,
  mainHabits,
  missedYesterday,
  scheduledOn,
} from '../lib/habits';
import Checkbox from './Checkbox';
import CountStepper from './CountStepper';
import DayStrip from './DayStrip';
import HabitRow from './HabitRow';
import LogDialog, { type LogMode } from './LogDialog';
import { useToast } from './Toast';
import { habitStatus } from './habitText';

interface TodayViewProps {
  onGoToHabits: () => void;
  /** Opens on another day — used by tests and deep links. */
  initialDay?: DateKey;
}

const ICON = 19;

/**
 * One list, any day. Today by default; the week strip lets you look back and fill in
 * what you forgot to mark yesterday. Every action writes to the day that is open.
 */
export default function TodayView({ onGoToHabits, initialDay }: TodayViewProps) {
  const { data, update, replace } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const notify = useToast();
  const today = todayKey();

  const [open, setOpen] = useState<DateKey>(initialDay ?? today);
  const [showAll, setShowAll] = useState(false);
  const [dumpText, setDumpText] = useState('');
  const [dialog, setDialog] = useState<{ habit: Habit; mode: LogMode } | null>(null);

  const isToday = open === today;

  const active = activeHabits(data);
  // A habit is not asked for a day before it existed, nor on a day off its schedule.
  const due = habitsUpTo(active, open);
  const shown = showAll ? due : due.filter((habit) => scheduledOn(habit, open));
  const hidden = due.length - shown.length;
  const actionable = shown.filter(isActionable);
  const main = mainHabits(data).filter((habit) => shown.some((item) => item.id === habit.id));
  const mainIds = new Set(main.map((habit) => habit.id));
  const rest = shown.filter((habit) => !mainIds.has(habit.id) && habit.kind !== 'negative');
  const negatives = shown.filter((habit) => habit.kind === 'negative');

  const log = getDay(data, open);
  const { done, total } = dayProgress(data, actionable, open);
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

  const atRisk = isToday ? missedYesterday(data, actionable, today) : 0;
  const notice =
    isToday && total > 0 && done === total
      ? dict['today.allDone']
      : atRisk > 0
        ? dict['today.atRisk']
        : null;

  const startTiny = (habit: Habit) => setDialog({ habit, mode: 'tiny' });
  const openLog = (habit: Habit) => setDialog({ habit, mode: 'quick' });

  /**
   * Acts, then offers one way back. Accidental taps happen — the row is a big target,
   * and a counter tap jumps straight to the goal.
   */
  function act(next: (current: AppData) => AppData, message: string) {
    const before = data;
    update(next);
    notify(message, 'plain', {
      label: dict['common.undo'],
      run: () => replace(before),
    });
  }

  /**
   * One visual element per row on the right. Counter and minutes habits fold `− value +`
   * into a single stepper (and the value opens the quick log); the rest get one icon:
   * `Play` for “just start”, `Ban` for “don't do”.
   */
  function actionsFor(habit: Habit): ReactNode {
    const entry = getEntry(data, open, habit.id);

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
          onClick={() =>
            slipped
              ? update((current) => tapHabit(current, habit.id, open))
              : act((current) => tapHabit(current, habit.id, open), dict['today.slipped'])
          }
        >
          {slipped ? <Undo2 size={ICON} strokeWidth={1.8} /> : <Ban size={ICON} strokeWidth={1.8} />}
        </button>
      );
    }

    // a closed habit has nothing left to start — the row keeps one target, not two
    if (isComplete(habit, entry)) return null;

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
    const status = habitStatus(data, habit, lang, open);
    return (
      <HabitRow
        key={habit.id}
        habit={habit}
        pinned={habit.pinned}
        done={isComplete(habit, getEntry(data, open, habit.id))}
        status={counts ? undefined : status}
        statusSlot={
          counts ? (
            <CountStepper
              lang={lang}
              value={status}
              openLabel={fill(dict['log.open'], { v: status })}
              onOpen={() => openLog(habit)}
              onBump={(direction) =>
                update((current) => bumpCounter(current, habit.id, open, direction))
              }
            />
          ) : undefined
        }
        onToggle={
          isNegative
            ? undefined
            : () => {
                const entry = getEntry(data, open, habit.id);
                const jumpsToGoal = counts && !isComplete(habit, entry);
                // A counter tap fills the whole goal in one go — that is worth an undo.
                if (jumpsToGoal) {
                  act((current) => tapHabit(current, habit.id, open), dict['today.filled']);
                  return;
                }
                update((current) => tapHabit(current, habit.id, open));
              }
        }
        actions={actionsFor(habit)}
      />
    );
  }

  return (
    <div className="stack">
      <header className="day-head">
        <p className="label">{formatDay(open, lang)}</p>
        <div className="day-line">
          <h1>{isToday ? greeting : dict['today.pastTitle']}</h1>
          {total > 0 ? (
            <span className="day-count">{fill(dict['today.progress'], { done, total })}</span>
          ) : null}
        </div>
        {total > 0 ? (
          <div
            className="bar"
            data-complete={done === total ? 'true' : 'false'}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label={fill(dict['today.progress'], { done, total })}
          >
            <span className="bar-fill" style={{ width: `${percent}%` }} />
          </div>
        ) : null}
        {notice ? <p className="muted small">{notice}</p> : null}
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
          <DayStrip
            day={open}
            today={today}
            lang={lang}
            statusFor={(key) => dayHeatStatus(data, actionable, key, today)}
            onSelect={setOpen}
            labels={{
              group: dict['today.week'],
              current: dict['today.openDay'],
              prevWeek: dict['today.prevWeek'],
              nextWeek: dict['today.nextWeek'],
            }}
          />

          {!isToday ? (
            <button type="button" className="link" onClick={() => setOpen(today)}>
              {dict['today.backToToday']}
            </button>
          ) : null}

          {shown.length === 0 ? (
            <p className="muted small">
              {due.length === 0 ? dict['today.pastEmpty'] : dict['today.offSchedule']}
            </p>
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
            </>
          )}

          {hidden > 0 || showAll ? (
            <button type="button" className="link" onClick={() => setShowAll((value) => !value)}>
              {showAll
                ? dict['today.hideOffSchedule']
                : fill(dict['today.showOffSchedule'], { n: hidden })}
            </button>
          ) : null}

          <section className="block">
            <p className="label">{dict['today.dump']}</p>
            <form
              className="dump-form"
              onSubmit={(event) => {
                event.preventDefault();
                update((current) => addDump(current, open, dumpText));
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

            {log.dump.length > 0 ? (
              <ul className="dump-list">
                {log.dump.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="dump-item"
                      aria-pressed={item.done}
                      onClick={() => update((current) => toggleDump(current, open, item.id))}
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
                      onClick={() =>
                        act(
                          (current) => removeDump(current, open, item.id),
                          dict['today.dumpRemoved'],
                        )
                      }
                    >
                      <X size={ICON} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {log.dump.some((item) => item.done) ? (
              <button
                type="button"
                className="link"
                onClick={() => update((current) => clearDoneDump(current, open))}
              >
                {dict['today.dumpClear']}
              </button>
            ) : null}
          </section>
        </>
      )}

      {dialog ? (
        <LogDialog
          habit={dialog.habit}
          mode={dialog.mode}
          day={open}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
