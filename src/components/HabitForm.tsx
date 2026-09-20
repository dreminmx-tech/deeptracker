import { useState } from 'react';
import type { Habit, HabitKind } from '../types';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { WEEKDAY_ORDER, weekdayName } from '../lib/date';
import { deleteHabit, saveHabit, toggleArchive, type HabitInput } from '../lib/actions';
import Modal from './Modal';

const KINDS: HabitKind[] = ['check', 'counter', 'duration', 'flex', 'negative'];

interface HabitFormProps {
  habit: Habit | null;
  onClose: () => void;
}

export default function HabitForm({ habit, onClose }: HabitFormProps) {
  const { data, update } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);

  const [name, setName] = useState(habit?.name ?? '');
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? 'check');
  const [target, setTarget] = useState(String(habit?.target ?? (habit?.kind === 'duration' ? 20 : 6)));
  const [unit, setUnit] = useState(habit?.unit ?? '');
  const [perWeek, setPerWeek] = useState(String(habit?.perWeek ?? 3));
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [tiny, setTiny] = useState(habit?.tiny ?? '');
  const [pinned, setPinned] = useState(habit?.pinned ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const needsTarget = kind === 'counter' || kind === 'duration';
  const canSave = name.trim().length > 0;

  function toggleDay(index: number) {
    setDays((current) =>
      current.includes(index) ? current.filter((day) => day !== index) : [...current, index].sort(),
    );
  }

  function save() {
    if (!canSave) return;
    const input: HabitInput = {
      name,
      kind,
      target: needsTarget ? Number(target) || 1 : undefined,
      unit: kind === 'counter' || kind === 'duration' ? unit : undefined,
      perWeek: kind === 'flex' ? Number(perWeek) || 3 : undefined,
      days: kind === 'flex' ? undefined : days,
      tiny,
      pinned,
    };
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
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <div className="field">
        <span className="field-label">{dict['habits.kind']}</span>
        <div className="kind-grid">
          {KINDS.map((option) => (
            <button
              key={option}
              type="button"
              className="kind-option"
              data-active={option === kind ? 'true' : 'false'}
              onClick={() => setKind(option)}
            >
              <span className="kind-name">{dict[`habits.kind.${option}`]}</span>
              <span className="kind-desc">{dict[`habits.kind.${option}.desc`]}</span>
            </button>
          ))}
        </div>
      </div>

      {needsTarget ? (
        <div className="field-row">
          <label className="field">
            <span className="field-label">
              {kind === 'duration' ? dict['habits.kind.duration'] : dict['habits.target']}
            </span>
            <input
              type="number"
              min={1}
              max={999}
              inputMode="numeric"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">{dict['habits.unit']}</span>
            <input
              type="text"
              maxLength={16}
              value={unit}
              placeholder={dict['habits.unitPlaceholder']}
              onChange={(event) => setUnit(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {kind === 'flex' ? (
        <label className="field">
          <span className="field-label">{dict['habits.perWeek']}</span>
          <input
            type="number"
            min={1}
            max={7}
            inputMode="numeric"
            value={perWeek}
            onChange={(event) => setPerWeek(event.target.value)}
          />
        </label>
      ) : (
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
          <p className="muted small">{dict['habits.daysHint']}</p>
        </div>
      )}

      <label className="field">
        <span className="field-label">{dict['habits.tiny']}</span>
        <input
          type="text"
          maxLength={120}
          value={tiny}
          placeholder={dict['habits.tinyPlaceholder']}
          onChange={(event) => setTiny(event.target.value)}
        />
      </label>

      {kind === 'check' || kind === 'counter' || kind === 'duration' ? (
        <label className="switch">
          <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
          <span>{dict['habits.pin']}</span>
        </label>
      ) : null}

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
