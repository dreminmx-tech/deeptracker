import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import type { Habit } from '../types';
import { useStore } from '../store';
import { fill, t } from '../lib/i18n';
import { addDays, formatDay, todayKey, type DateKey } from '../lib/date';
import { addDump, clearDoneDump, removeDump, tapHabit, toggleDump } from '../lib/actions';
import {
  activeHabits,
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
import HabitRow from './HabitRow';
import { UrgeRow, useUrgeTimer } from './UrgeTimer';
import { useKeyboardInset } from '../lib/useKeyboardInset';

interface TodayViewProps {
  onGoToHabits: () => void;
  /** Opens on another day — used by tests and deep links. */
  initialDay?: DateKey;
}

const ICON = 19;

/**
 * Один список галочек. Тап по строке = сделано, ещё тап = снять.
 * Никаких «сколько стаканов» и «сколько минут»: приложение спрашивает только
 * «сделал или нет», потому что всё остальное — это трение, а не привычка.
 */
export default function TodayView({ onGoToHabits, initialDay }: TodayViewProps) {
  const { data, update } = useStore();
  const lang = data.settings.lang;
  const dict = t(lang);
  const today = todayKey();

  const [open, setOpen] = useState<DateKey>(initialDay ?? today);
  const [showAll, setShowAll] = useState(false);
  const [dumpText, setDumpText] = useState('');
  // Пока курсор в поле «быстрых дел», нижнее меню уезжает: иначе оно перекрывает
  // то, что человек печатает.
  const [typing, setTyping] = useState(false);
  const dumpForm = useRef<HTMLFormElement>(null);
  const inset = useKeyboardInset(typing);
  /** Один таймер «держусь» на экран: тяга идёт к одной привычке. */
  const urge = useUrgeTimer();

  // Клавиатура поднялась — поле подкручиваем к себе, чтобы оно было видно целиком.
  useEffect(() => {
    if (inset > 0) {
      dumpForm.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [inset]);

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

  /**
   * «Не делать» в строке несёт часы: пока идёт тяга, человеку нужно время, а не
   * ещё один квадрат для отметки. Срыв и «держусь» пишутся из панели под строкой.
   */
  function row(habit: Habit) {
    if (habit.kind === 'negative') return <UrgeRow key={habit.id} habit={habit} day={open} timer={urge} />;
    return (
      <HabitRow
        key={habit.id}
        habit={habit}
        pinned={habit.pinned}
        done={isComplete(habit, getEntry(data, open, habit.id))}
        onToggle={() => update((current) => tapHabit(current, habit.id, open))}
      />
    );
  }

  return (
    <div className="stack">
      <header className="day-head">
        {/* Один день назад — один тап. Стрелки, а не полоса недели: дата всегда
            написана слева, поэтому «какой это день» не загадка, а вчера открывается
            даже тогда, когда вчера не было пусто (полоса дней за это и поплатилась). */}
        <div className="day-nav">
          <p className="label">{formatDay(open, lang)}</p>
          <div className="day-nav-acts">
            {!isToday ? (
              <button type="button" className="link" onClick={() => setOpen(today)}>
                {dict['today.today']}
              </button>
            ) : null}
            <button
              type="button"
              className="icon-btn"
              aria-label={dict['today.prevDay']}
              title={dict['today.prevDay']}
              onClick={() => setOpen(addDays(open, -1))}
            >
              <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={dict['today.nextDay']}
              title={dict['today.nextDay']}
              disabled={isToday}
              onClick={() => setOpen(addDays(open, 1))}
            >
              <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>
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
              ref={dumpForm}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              onSubmit={(event) => {
                event.preventDefault();
                update((current) => addDump(current, open, dumpText));
                setDumpText('');
              }}
            >
              <div className="dump-field">
                <input
                  type="text"
                  value={dumpText}
                  maxLength={280}
                  placeholder={dict['today.dumpPlaceholder']}
                  aria-label={dict['today.dumpPlaceholder']}
                  onChange={(event) => setDumpText(event.target.value)}
                />
                {/* Кнопка живёт внутри поля, как отправка в композере журнала:
                    строка — одно целое, а не поле и отдельный круг рядом. */}
                <button
                  type="submit"
                  className="dump-send"
                  data-ready={dumpText.trim().length > 0 ? 'true' : 'false'}
                  aria-label={dict['today.dumpAdd']}
                  title={dict['today.dumpAdd']}
                  disabled={dumpText.trim().length === 0}
                >
                  <Plus size={ICON} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
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
                      onClick={() => update((current) => removeDump(current, open, item.id))}
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
    </div>
  );
}
