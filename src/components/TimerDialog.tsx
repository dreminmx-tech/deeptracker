import { useEffect, useRef, useState } from 'react';
import type { Habit } from '../types';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { todayKey } from '../lib/date';
import { addMinutes, tapHabit } from '../lib/actions';
import { getEntry, isComplete, targetOf } from '../lib/habits';
import Modal from './Modal';

interface TimerDialogProps {
  habit: Habit;
  mode: 'tiny' | 'focus';
  onClose: () => void;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerDialog({ habit, mode, onClose }: TimerDialogProps) {
  const { data, update } = useStore();
  const dict = t(data.settings.lang);
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
  const isDuration = habit.kind === 'duration';

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
    setTotal((value) => value + seconds);
    setRemaining((value) => value + seconds);
    setFinished(false);
  }

  return (
    <Modal
      title={mode === 'tiny' ? dict['timer.tinyTitle'] : dict['timer.focusTitle']}
      onClose={onClose}
      closeLabel={dict['common.close']}
      footer={
        <>
          <button type="button" className="btn btn-primary" onClick={isDuration ? logWork : markDone}>
            {isDuration ? fill(dict['timer.log'], { n: minutes }) : dict['timer.logDone']}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => extend(120)}>
            {dict['timer.keepGoing']}
          </button>
        </>
      }
    >
      <p className="timer-name">{habit.name}</p>
      {mode === 'tiny' && habit.tiny ? <p className="timer-hint">{habit.tiny}</p> : null}
      {mode === 'tiny' ? <p className="timer-hint">{dict['timer.tinyHint']}</p> : null}

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
          <button type="button" className="btn" onClick={() => setRunning(true)} disabled={remaining === 0}>
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
    </Modal>
  );
}
