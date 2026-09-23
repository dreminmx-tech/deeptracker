import { useState } from 'react';
import type { Habit, HabitKind } from '../types';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { WEEKDAY_ORDER, weekdayName } from '../lib/date';
import { deleteHabit, saveHabit, toggleArchive, type HabitInput } from '../lib/actions';
import { RESIST_MINUTES, resistMinutes } from '../lib/timer';
import Modal from './Modal';

interface HabitFormProps {
  habit: Habit | null;
  onClose: () => void;
}

/**
 * Название, «делать / не делать», дни недели, «в главном» — и всё.
 * Пяти типов с описаниями, цели, единиц и версии на две минуты здесь больше нет:
 * выбор «сколько стаканов» и был тем трением, из-за которого приложением не хочется
 * пользоваться. Привычка — это галочка.
 */
export default function HabitForm({ habit, onClose }: HabitFormProps) {
  const { data, update } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);

  const [name, setName] = useState(habit?.name ?? '');
  const [kind, setKind] = useState<HabitKind>(habit?.kind === 'negative' ? 'negative' : 'check');
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [resist, setResist] = useState<number>(() => resistMinutes(habit ?? {}));
  const [pinned, setPinned] = useState(habit?.pinned ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = name.trim().length > 0;

  function toggleDay(index: number) {
    setDays((current) =>
      current.includes(index) ? current.filter((day) => day !== index) : [...current, index].sort(),
    );
  }

  function save() {
    if (!canSave) return;
    const input: HabitInput = { name, kind, days, pinned, resist };
    update((current) => saveHabit(current, input, habit?.id));
    onClose();
  }

  return (
    <Modal
      title={habit ? dict['habits.edit'] : dict['habits.new']}
      onClose={onClose}
      closeLabel={dict['common.close']}
      footer={
        <>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave}>
            {dict['habits.save']}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {dict['habits.cancel']}
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">{dict['habits.name']}</span>
        <input
          type="text"
          value={name}
          maxLength={80}
          placeholder={dict['habits.namePlaceholder']}
          /* новая привычка начинается с названия — сразу ставим туда курсор */
          autoFocus={!habit}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <div className="field">
        <span className="field-label">{dict['habits.kind']}</span>
        <div className="segmented segmented-wide" role="group">
          <button
            type="button"
            data-active={kind === 'check' ? 'true' : 'false'}
            onClick={() => setKind('check')}
          >
            {dict['habits.kind.check']}
          </button>
          <button
            type="button"
            data-active={kind === 'negative' ? 'true' : 'false'}
            onClick={() => setKind('negative')}
          >
            {dict['habits.kind.negative']}
          </button>
        </div>
      </div>

      <div className="field">
        <span className="field-label">{dict['habits.days']}</span>
        <div className="wick-grid">
          {WEEKDAY_ORDER.map((index) => (
            <button
              key={index}
              type="button"
              className="wick"
              data-on={days.includes(index) ? 'true' : 'false'}
              aria-pressed={days.includes(index)}
              title={weekdayName(index, lang)}
              onClick={() => toggleDay(index)}
            >
              {weekdayName(index, lang)}
            </button>
          ))}
        </div>
      </div>

      {kind === 'negative' ? (
        /* У «не делать» есть только один вопрос с числом: сколько держаться,
           когда накрыло. Пять минут по умолчанию — потому что перетерпеть пять
           минут может каждый, и этого обычно хватает, чтобы тяга отпустила. */
        <div className="field">
          <span className="field-label">{dict['urge.duration']}</span>
          <div className="segmented segmented-wide" role="group">
            {RESIST_MINUTES.map((minutes) => (
              <button
                key={minutes}
                type="button"
                data-active={resist === minutes ? 'true' : 'false'}
                onClick={() => setResist(minutes)}
              >
                {minutes}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <label className="switch">
        <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
        <span>{dict['habits.pin']}</span>
      </label>

      {habit ? (
        <div className="form-danger">
          {confirmDelete ? (
            <div className="confirm">
              <p>{dict['habits.deleteConfirm']}</p>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    update((current) => deleteHabit(current, habit.id));
                    onClose();
                  }}
                >
                  {dict['common.delete']}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                  {dict['common.cancel']}
                </button>
              </div>
            </div>
          ) : (
            <div className="row-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  update((current) => toggleArchive(current, habit.id));
                  onClose();
                }}
              >
                {habit.archived ? dict['habits.unarchive'] : dict['habits.archive']}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(true)}>
                {dict['habits.delete']}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
