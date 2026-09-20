import { useState } from 'react';
import type { Habit } from '../types';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { moveHabit, toggleArchive, togglePin } from '../lib/actions';
import { activeHabits, archivedHabits, isActionable, mainHabits, targetOf } from '../lib/habits';
import HabitForm from './HabitForm';
import Icon from './Icon';
import { useToast } from './Toast';

function detailText(habit: Habit, lang: 'ru' | 'en'): string {
  const minuteUnit = habit.unit ?? (lang === 'ru' ? 'мин' : 'min');
  switch (habit.kind) {
    case 'counter':
      return `${targetOf(habit)}${habit.unit ? ` ${habit.unit}` : ''}`;
    case 'duration':
      return `${targetOf(habit)} ${minuteUnit}`;
    case 'flex':
      return `${habit.perWeek ?? 3} / 7`;
    default:
      return '';
  }
}

export default function HabitsView() {
  const { data, update } = useStore();
  const dict = t(data.settings.lang);
  const notify = useToast();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const active = activeHabits(data);
  const archived = archivedHabits(data);
  const pinned = new Set(mainHabits(data).map((habit) => habit.id));

  function handlePin(habit: Habit) {
    if (!habit.pinned && pinned.size >= 3) {
      notify(dict['today.pinLimit'], 'warn');
      return;
    }
    update((current) => togglePin(current, habit.id));
  }

  return (
    <div className="stack">
      <header className="view-head">
        <h1>{dict['habits.title']}</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          {dict['habits.add']}
        </button>
      </header>

      <div className="rows">
        {active.map((habit) => {
          const detail = detailText(habit, data.settings.lang);
          return (
            <div key={habit.id} className="row">
              <button type="button" className="row-main" onClick={() => setEditing(habit)}>
                <span className="row-name">{habit.name}</span>
                <span className="row-sub">
                  {dict[`habits.kind.${habit.kind}`]}
                  {detail ? ` · ${detail}` : ''}
                </span>
              </button>
              <div className="row-actions">
                <button
                  type="button"
                  className="icon-btn sm"
                  aria-label={dict['habits.up']}
                  title={dict['habits.up']}
                  onClick={() => update((current) => moveHabit(current, habit.id, -1))}
                >
                  <Icon name="arrow-up" size={17} />
                </button>
                <button
                  type="button"
                  className="icon-btn sm"
                  aria-label={dict['habits.down']}
                  title={dict['habits.down']}
                  onClick={() => update((current) => moveHabit(current, habit.id, 1))}
                >
                  <Icon name="arrow-down" size={17} />
                </button>
                {isActionable(habit) ? (
                  <button
                    type="button"
                    className="icon-btn sm"
                    aria-label={dict['habits.pin']}
                    title={dict['habits.pin']}
                    aria-pressed={habit.pinned === true}
                    data-active={habit.pinned ? 'true' : 'false'}
                    onClick={() => handlePin(habit)}
                  >
                    <Icon name={habit.pinned ? 'star-filled' : 'star'} size={17} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {archived.length > 0 ? (
        <section className="section">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-expanded={showArchive}
            onClick={() => setShowArchive((value) => !value)}
          >
            {dict['habits.archiveSection']} ({archived.length})
          </button>
          {showArchive ? (
            <div className="rows">
              {archived.map((habit) => (
                <div key={habit.id} className="row">
                  <button type="button" className="row-main" onClick={() => setEditing(habit)}>
                    <span className="row-name">{habit.name}</span>
                    <span className="row-sub">{dict[`habits.kind.${habit.kind}`]}</span>
                  </button>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => update((current) => toggleArchive(current, habit.id))}
                    >
                      {dict['habits.unarchive']}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {creating ? <HabitForm habit={null} onClose={() => setCreating(false)} /> : null}
      {editing ? <HabitForm habit={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
