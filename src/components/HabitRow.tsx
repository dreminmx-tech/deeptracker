import type { Habit } from '../types';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { todayKey } from '../lib/date';
import { bumpCounter, tapHabit } from '../lib/actions';
import { getEntry, isComplete } from '../lib/habits';
import Checkbox from './Checkbox';
import Icon from './Icon';
import { habitMeta } from './habitText';

interface HabitRowProps {
  habit: Habit;
  onStartTiny: (habit: Habit) => void;
  onOpenTimer: (habit: Habit) => void;
}

/**
 * Dense single-line row for everything below the main three.
 * Negative habits have no row-wide tap: a slip must be logged on purpose.
 */
export default function HabitRow({ habit, onStartTiny, onOpenTimer }: HabitRowProps) {
  const { data, update } = useStore();
  const dict = t(data.settings.lang);
  const today = todayKey();

  const entry = getEntry(data, today, habit.id);
  const complete = isComplete(habit, entry);
  const meta = habitMeta(data, habit, dict, data.settings.lang);
  const isNegative = habit.kind === 'negative';
  const slipped = isNegative && (entry?.value ?? 0) > 0;

  const label = (
    <>
      <Checkbox checked={complete} small />
      <span className="hrow-name">{habit.name}</span>
    </>
  );

  return (
    <div className={`hrow${complete ? ' is-done' : ''}`} data-kind={habit.kind}>
      {isNegative ? (
        <div className="hrow-main hrow-static">{label}</div>
      ) : (
        <button
          type="button"
          className="hrow-main"
          aria-pressed={complete}
          aria-label={habit.name}
          onClick={() => update((current) => tapHabit(current, habit.id))}
        >
          {label}
        </button>
      )}

      {meta ? <span className="hrow-meta">{meta}</span> : null}

      <div className="hrow-actions">
        {habit.kind === 'counter' ? (
          <>
            <button
              type="button"
              className="icon-btn sm"
              aria-label="-1"
              onClick={() => update((current) => bumpCounter(current, habit.id, today, -1))}
            >
              <Icon name="minus" size={18} />
            </button>
            <button
              type="button"
              className="icon-btn sm"
              aria-label="+1"
              onClick={() => update((current) => bumpCounter(current, habit.id, today, 1))}
            >
              <Icon name="plus" size={18} />
            </button>
          </>
        ) : null}

        {habit.kind === 'duration' ? (
          <button
            type="button"
            className="icon-btn sm"
            aria-label={dict['timer.focusTitle']}
            title={dict['timer.focusTitle']}
            onClick={() => onOpenTimer(habit)}
          >
            <Icon name="timer" size={18} />
          </button>
        ) : null}

        {isNegative ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            data-active={slipped ? 'true' : 'false'}
            onClick={() => update((current) => tapHabit(current, habit.id))}
          >
            {slipped ? dict['today.slipUndo'] : dict['today.slip']}
          </button>
        ) : (
          <button
            type="button"
            className="icon-btn sm"
            aria-label={dict['today.tiny']}
            title={habit.tiny ?? dict['today.tiny']}
            onClick={() => onStartTiny(habit)}
          >
            <Icon name="play" size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
