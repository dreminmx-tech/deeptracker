import type { Habit } from '../types';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { todayKey } from '../lib/date';
import { bumpCounter, tapHabit } from '../lib/actions';
import { getEntry, isComplete } from '../lib/habits';
import Checkbox from './Checkbox';
import Icon from './Icon';
import { habitChip, habitDetail, isWeekClosed } from './habitText';

interface HabitCardProps {
  habit: Habit;
  onStartTiny: (habit: Habit) => void;
  onOpenTimer: (habit: Habit) => void;
}

/** Roomy two-line card used only for the pinned "main three". */
export default function HabitCard({ habit, onStartTiny, onOpenTimer }: HabitCardProps) {
  const { data, update } = useStore();
  const dict = t(data.settings.lang);
  const today = todayKey();

  const entry = getEntry(data, today, habit.id);
  const complete = isComplete(habit, entry);
  const chip = habitChip(data, habit, dict);
  const detail = habitDetail(data, habit, data.settings.lang);
  const chipGood = isWeekClosed(data, habit);

  return (
    <article className={`card habit-card${complete ? ' is-done' : ''}`} data-kind={habit.kind}>
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

      <div className="habit-foot">
        <span className="habit-detail">{detail}</span>
        <div className="habit-actions">
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
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenTimer(habit)}>
              <Icon name="timer" size={16} />
              {dict['timer.focusTitle']}
            </button>
          ) : null}

          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onStartTiny(habit)}>
            <Icon name="play" size={15} />
            {dict['today.tiny']}
          </button>
        </div>
      </div>
    </article>
  );
}
