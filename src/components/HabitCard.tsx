import type { Habit } from '../types';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { todayKey } from '../lib/date';
import { bumpCounter, tapHabit } from '../lib/actions';
import {
  getEntry,
  isComplete,
  isCounted,
  progressOf,
  softStreak,
  targetOf,
  weekProgress,
} from '../lib/habits';

interface HabitCardProps {
  habit: Habit;
  big?: boolean;
  onStartTiny: (habit: Habit) => void;
  onOpenTimer: (habit: Habit) => void;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span className="box" data-checked={checked ? 'true' : 'false'} aria-hidden="true">
      {checked ? '✓' : ''}
    </span>
  );
}

export default function HabitCard({ habit, big, onStartTiny, onOpenTimer }: HabitCardProps) {
  const { data, update } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const today = todayKey();

  const entry = getEntry(data, today, habit.id);
  const complete = isComplete(habit, entry);
  const counted = isCounted(habit);
  const streak = softStreak(data, habit);
  const weekly = habit.kind === 'flex' ? weekProgress(data, habit) : null;
  const slid = habit.kind === 'negative' && (entry?.value ?? 0) > 0;
  const minuteUnit = habit.unit ?? (lang === 'ru' ? 'мин' : 'min');

  let detail = '';
  if (habit.kind === 'counter') {
    detail = `${Math.round(progressOf(habit, entry))}/${targetOf(habit)}${habit.unit ? ` ${habit.unit}` : ''}`;
  } else if (habit.kind === 'duration') {
    detail = `${Math.round(progressOf(habit, entry))}/${targetOf(habit)} ${minuteUnit}`;
  } else if (habit.kind === 'negative') {
    detail = fill(dict['today.cleanDays'], { n: streak });
  } else if (habit.tiny) {
    detail = habit.tiny;
  }

  const chip = weekly
    ? fill(weekly.done >= weekly.target ? dict['today.weeklyDone'] : dict['today.weekly'], {
        done: weekly.done,
        target: weekly.target,
      })
    : streak > 0
      ? fill(dict['today.streak'], { n: streak })
      : '';
  const chipGood = Boolean(weekly && weekly.done >= weekly.target);

  return (
    <article
      className={`card habit-card${big ? ' is-main' : ''}${complete ? ' is-done' : ''}`}
      data-kind={habit.kind}
    >
      <div className="habit-top">
        <button
          type="button"
          className="habit-toggle"
          onClick={() => update((current) => tapHabit(current, habit.id))}
          aria-pressed={complete}
          aria-label={habit.name}
        >
          <Checkbox checked={complete} />
          <span className="habit-name">{habit.name}</span>
        </button>
        {chip ? <span className={chipGood ? 'chip is-good' : 'chip'}>{chip}</span> : null}
      </div>

      {detail ? <p className="habit-detail">{detail}</p> : null}

      <div className="habit-actions">
        {counted && habit.kind === 'counter' ? (
          <div className="stepper">
            <button
              type="button"
              className="btn btn-step"
              onClick={() => update((current) => bumpCounter(current, habit.id, today, -1))}
              aria-label="-1"
            >
              −
            </button>
            <button
              type="button"
              className="btn btn-step"
              onClick={() => update((current) => bumpCounter(current, habit.id, today, 1))}
              aria-label="+1"
            >
              +
            </button>
          </div>
        ) : null}

        {habit.kind === 'duration' ? (
          <button type="button" className="btn btn-ghost" onClick={() => onOpenTimer(habit)}>
            {dict['timer.focusTitle']}
          </button>
        ) : null}

        <button type="button" className="btn btn-ghost" onClick={() => onStartTiny(habit)}>
          {dict['today.tiny']}
        </button>

        {habit.kind === 'negative' ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => update((current) => tapHabit(current, habit.id))}
            data-active={slid ? 'true' : 'false'}
          >
            {slid ? dict['today.slipUndo'] : dict['today.slip']}
          </button>
        ) : null}
      </div>
    </article>
  );
}
