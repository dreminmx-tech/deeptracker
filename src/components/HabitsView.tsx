import { useState } from 'react';
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Pencil, Plus, Star, StarOff } from 'lucide-react';
import type { Habit } from '../types';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { moveHabit, toggleArchive, togglePin } from '../lib/actions';
import { activeHabits, archivedHabits, isActionable, mainHabits } from '../lib/habits';
import ActionSheet, { type SheetAction } from './ActionSheet';
import HabitForm from './HabitForm';
import HabitRow from './HabitRow';
import { useToast } from './Toast';
import { habitMeta } from './habitText';

const ICON = 18;

export default function HabitsView() {
  const { data, update } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const notify = useToast();

  const [openHabit, setOpenHabit] = useState<Habit | null>(null);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);

  const active = activeHabits(data);
  const archived = archivedHabits(data);
  const pinnedCount = mainHabits(data).length;

  function actionsFor(habit: Habit): SheetAction[] {
    const actions: SheetAction[] = [
      {
        label: dict['sheet.edit'],
        icon: <Pencil size={ICON} strokeWidth={1.8} />,
        onSelect: () => {
          setOpenHabit(null);
          setEditing(habit);
        },
      },
    ];

    if (habit.archived) {
      actions.push({
        label: dict['habits.unarchive'],
        icon: <ArchiveRestore size={ICON} strokeWidth={1.8} />,
        onSelect: () => {
          update((current) => toggleArchive(current, habit.id));
          setOpenHabit(null);
        },
      });
      return actions;
    }

    actions.push({
      label: dict['sheet.up'],
      icon: <ArrowUp size={ICON} strokeWidth={1.8} />,
      onSelect: () => update((current) => moveHabit(current, habit.id, -1)),
    });
    actions.push({
      label: dict['sheet.down'],
      icon: <ArrowDown size={ICON} strokeWidth={1.8} />,
      onSelect: () => update((current) => moveHabit(current, habit.id, 1)),
    });

    if (isActionable(habit)) {
      actions.push({
        label: habit.pinned ? dict['sheet.unpin'] : dict['sheet.pin'],
        icon: habit.pinned ? <StarOff size={ICON} strokeWidth={1.8} /> : <Star size={ICON} strokeWidth={1.8} />,
        onSelect: () => {
          if (!habit.pinned && pinnedCount >= 3) {
            notify(dict['today.pinLimit'], 'warn');
            return;
          }
          update((current) => togglePin(current, habit.id));
          setOpenHabit(null);
        },
      });
    }

    actions.push({
      label: dict['habits.archive'],
      icon: <Archive size={ICON} strokeWidth={1.8} />,
      onSelect: () => {
        update((current) => toggleArchive(current, habit.id));
        setOpenHabit(null);
      },
    });

    return actions;
  }

  return (
    <div className="stack">
      <header className="view-head">
        <h1>{dict['habits.title']}</h1>
        <button type="button" className="btn btn-sm" onClick={() => setCreating(true)}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          {dict['habits.add']}
        </button>
      </header>

      <div className="rows">
        {active.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            pinned={habit.pinned}
            sub={habitMeta(habit, dict, lang)}
            onOpen={() => setOpenHabit(habit)}
            openLabel={dict['sheet.more']}
          />
        ))}
      </div>

      {archived.length > 0 ? (
        <section className="block">
          <p className="label">{dict['habits.archiveSection']}</p>
          <div className="rows">
            {archived.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                sub={habitMeta(habit, dict, lang)}
                onOpen={() => setOpenHabit(habit)}
                openLabel={dict['sheet.more']}
              />
            ))}
          </div>
        </section>
      ) : null}

      {openHabit ? (
        <ActionSheet
          title={openHabit.name}
          subtitle={habitMeta(openHabit, dict, lang)}
          actions={actionsFor(openHabit)}
          onClose={() => setOpenHabit(null)}
          closeLabel={dict['common.close']}
        />
      ) : null}

      {creating ? <HabitForm habit={null} onClose={() => setCreating(false)} /> : null}
      {editing ? <HabitForm habit={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
