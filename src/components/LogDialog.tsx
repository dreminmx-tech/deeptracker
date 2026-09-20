import { useEffect, useRef, useState } from 'react';
import type { Habit } from '../types';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { todayKey } from '../lib/date';
import { addMinutes, bumpCounter, setProgress, tapHabit } from '../lib/actions';
import { getEntry, isComplete, progressOf, targetOf } from '../lib/habits';
import CountStepper from './CountStepper';
import Modal from './Modal';
import { useToast } from './Toast';
import { quickSteps, unitOf } from './habitText';

export type LogMode = 'quick' | 'tiny';

interface LogDialogProps {
  habit: Habit;
  mode: LogMode;
  onClose: () => void;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * One dialog for every "how much did you do" question.
 * Top half: the goal broken into chips, so "20 минут" is a single tap.
 * Bottom half (minutes habits): the stopwatch, for when you would rather time it.
 * `tiny` mode is the two-minute nudge for check-off habits.
 */
export default function LogDialog({ habit, mode, onClose }: LogDialogProps) {
  const { data, update } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const notify = useToast();

  const isDuration = habit.kind === 'duration';
  const initial = mode === 'tiny' ? 120 : Math.max(1, targetOf(habit)) * 60;

  const [total, setTotal] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const endAt = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + remaining * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        setFinished(true);
        try {
          navigator.vibrate?.(220);
        } catch {
          /* vibration is optional */
        }
      }
    }, 250);
    return () => window.clearInterval(id);
    // `remaining` is captured on purpose: the countdown is driven by the wall clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const elapsed = Math.max(0, total - remaining);
  const minutes = Math.max(1, Math.round(elapsed / 60));

  const value = Math.round(progressOf(habit, getEntry(data, todayKey(), habit.id)));
  const target = targetOf(habit);
  const unit = unitOf(habit, lang);
  const withUnit = (amount: number) => (unit ? `${amount} ${unit}` : String(amount));

  /** A chip is the whole interaction: pick the amount, the dialog is done. */
  function choose(amount: number) {
    update((current) => setProgress(current, habit.id, amount));
    notify(fill(dict['log.saved'], { v: withUnit(amount) }), 'ok');
    onClose();
  }

  /** The stepper stays open — it is for getting the number exactly right. */
  function bump(direction: 1 | -1) {
    update((current) => bumpCounter(current, habit.id, todayKey(), direction));
  }

  function logWork() {
    update((current) => addMinutes(current, habit.id, minutes));
    onClose();
  }

  function markDone() {
    update((current) => {
      const entry = getEntry(current, todayKey(), habit.id);
      return isComplete(habit, entry) ? current : tapHabit(current, habit.id);
    });
    onClose();
  }

  function extend(seconds: number) {
    // While running the countdown is anchored to a wall-clock timestamp, so it moves too.
    if (running) endAt.current += seconds * 1000;
    setTotal((current) => current + seconds);
    setRemaining((current) => current + seconds);
    setFinished(false);
  }

  const clock = (
    <>
      <p className="timer-clock" aria-live="off">
        {formatClock(remaining)}
      </p>
      {finished ? <p className="timer-note">{dict['timer.finished']}</p> : null}
      <div className="timer-actions">
        {running ? (
          <button type="button" className="btn" onClick={() => setRunning(false)}>
            {dict['timer.pause']}
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => setRunning(true)}
            disabled={remaining === 0}
          >
            {remaining === total ? dict['timer.start'] : dict['timer.resume']}
          </button>
        )}
        <button type="button" className="btn" onClick={() => extend(120)}>
          {dict['timer.plus2']}
        </button>
        <button type="button" className="btn" onClick={() => extend(300)}>
          {dict['timer.plus5']}
        </button>
      </div>
    </>
  );

  if (mode === 'tiny') {
    return (
      <Modal
        title={dict['timer.tinyTitle']}
        onClose={onClose}
        closeLabel={dict['common.close']}
        footer={
          <>
            <button type="button" className="btn btn-primary" onClick={markDone}>
              {dict['timer.logDone']}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => extend(120)}>
              {dict['timer.keepGoing']}
            </button>
          </>
        }
      >
        <p className="timer-name">{habit.name}</p>
        {habit.tiny ? <p className="timer-hint">{habit.tiny}</p> : null}
        <p className="timer-hint">{dict['timer.tinyHint']}</p>
        {clock}
      </Modal>
    );
  }

  return (
    <Modal
      title={habit.name}
      onClose={onClose}
      closeLabel={dict['common.close']}
      footer={
        /* only offer to log timed minutes once there is something to log */
        isDuration && (running || elapsed > 0) ? (
          <button type="button" className="btn btn-primary" onClick={logWork}>
            {fill(dict['timer.log'], { n: minutes })}
          </button>
        ) : undefined
      }
    >
      <div className="spread">
        <p className="label">{unit ? fill(dict['log.titleUnit'], { unit }) : dict['log.title']}</p>
        <span className="muted small">{fill(dict['log.goal'], { v: withUnit(target) })}</span>
      </div>

      <CountStepper lang={lang} value={withUnit(value)} onBump={bump} />

      <div className="chips">
        {quickSteps(target).map((step) => (
          <button
            key={step}
            type="button"
            className="chip"
            data-active={step === value ? 'true' : 'false'}
            aria-label={fill(dict['log.set'], { v: withUnit(step) })}
            onClick={() => choose(step)}
          >
            {step}
          </button>
        ))}
      </div>

      {value > 0 ? (
        <button type="button" className="link" onClick={() => choose(0)}>
          {dict['log.clear']}
        </button>
      ) : null}

      {isDuration ? (
        <div className="zone">
          <p className="label">{dict['log.timer']}</p>
          {clock}
        </div>
      ) : null}
    </Modal>
  );
}
