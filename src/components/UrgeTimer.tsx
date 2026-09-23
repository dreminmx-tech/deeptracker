import { useEffect, useMemo, useRef, useState } from 'react';
import { Ban, Check, Timer, Undo2 } from 'lucide-react';
import type { Habit } from '../types';
import { useStore } from '../store';
import { t } from '../lib/i18n';
import { tapHabit } from '../lib/actions';
import { getEntry } from '../lib/habits';
import type { DateKey } from '../lib/date';
import { formatRemaining, resistMinutes } from '../lib/timer';
import HabitRow from './HabitRow';
import { habitMeta } from './habitText';
import { useToast } from './Toast';

const ICON = 18;
/** Тик чаще секунды нужен только чтобы не отставать на медленном кадре. */
const TICK = 250;

export interface UrgeTimer {
  /** Какой из таймеров идёт: привычка или никакой. */
  runningId: string | null;
  /** Когда истекает текущий отсчёт; null — таймера нет. */
  endAt: number | null;
  /** Включить таймер привычки или закрыть его, если он уже идёт. */
  toggle: (habit: Habit) => void;
  stop: () => void;
}

/**
 * Один таймер на экран: тяга идёт к одной привычке, а не к трём сразу.
 *
 * Здесь только выбор привычки и момент окончания: сами секунды считает панель,
 * иначе каждый тик перерисовывал бы весь список. Данных хук не трогает — отметку
 * в историю ставит только кнопка в панели.
 */
export function useUrgeTimer(): UrgeTimer {
  const [state, setState] = useState<{ habitId: string; endAt: number } | null>(null);

  return {
    runningId: state?.habitId ?? null,
    endAt: state?.endAt ?? null,
    // Тап по часам второй раз закрывает панель: передумать в середине минуты —
    // это норма, поэтому следующий отсчёт начнётся с полного времени.
    toggle: (habit) =>
      setState((current) =>
        current?.habitId === habit.id
          ? null
          : { habitId: habit.id, endAt: Date.now() + resistMinutes(habit) * 60_000 },
      ),
    stop: () => setState(null),
  };
}

/**
 * Остаток до момента окончания. Считается от часов, а не накоплением тиков:
 * вкладка в фоне может проспать полминуты, и накопленный счёт тогда соврал бы.
 */
function useCountdown(endAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endAt === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK);
    return () => window.clearInterval(id);
  }, [endAt]);

  return useMemo(() => (endAt === null ? 0 : Math.max(0, endAt - now)), [endAt, now]);
}

/**
 * Часы в строке «не делать». Стоят там же, где у остальных строк действие, —
 * поэтому правая колонка списка не разъезжается.
 */
export function UrgeButton({
  running,
  onClick,
  label,
}: {
  running: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="row-act"
      data-active={running ? 'true' : 'false'}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Timer size={ICON} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}

interface UrgePanelProps {
  habit: Habit;
  /** Момент, когда время выйдет. */
  endAt: number;
  /** Срыв уже отмечен: предлагать его второй раз нечего. */
  slipped: boolean;
  onHold: () => void;
  onSlip: () => void;
  onClean: () => void;
  onClose: () => void;
  /** Закрыть панель без отметки: держался, но в историю об этом не пишем. */
  onQuiet: () => void;
}

/**
 * Панель под строкой: пока идёт тяга, здесь только время. Внизу одно главное
 * действие и честная тихая строка рядом с ним.
 *
 * Отметка здесь ровно одна запись за раз: «держался» просто закрывает таймер,
 * «сорвался» пишет срыв, а если срыв уже стоит — предлагается вернуть «чисто»,
 * потому что снимать его нечем больше нигде.
 */
export function UrgePanel({
  habit,
  endAt,
  slipped,
  onHold,
  onSlip,
  onClean,
  onClose,
  onQuiet,
}: UrgePanelProps) {
  const dict = t(useStore().data.settings.lang);
  const minutes = resistMinutes(habit);
  const left = useCountdown(endAt);
  const over = left <= 0;
  const timerRef = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  // Человек договорился с собой на пять минут: когда время вышло, первый шаг
  // всё равно за ним — панель просто говорит, что держаться больше не нужно.
  useEffect(() => {
    if (over && !done.current) timerRef.current?.focus();
  }, [over]);

  /** Любая кнопка закрывает панель; `done` не даёт панели уйти дважды. */
  function once(act: () => void) {
    if (done.current) return;
    done.current = true;
    act();
    onClose();
  }

  return (
    <div className="urge" data-over={over ? 'true' : 'false'}>
      <div className="urge-head">
        <span className="label">
          {over ? dict['urge.over'] : `${dict['urge.hold']} · ${minutes} ${dict['urge.min']}`}
        </span>
        <span
          ref={timerRef}
          className="urge-time"
          role="timer"
          aria-live="off"
          tabIndex={-1}
          aria-label={`${dict['urge.left']} ${formatRemaining(left)}`}
        >
          {formatRemaining(left)}
        </span>
      </div>

      {/* Главная кнопка во всю ширину, а рядом с ней и под ней — только то, что
          человек выбирает редко: панель не должна превращаться в три кнопки. */}
      {slipped ? (
        <button type="button" className="btn" onClick={() => once(onClean)}>
          <Undo2 size={ICON} strokeWidth={1.8} aria-hidden="true" />
          {dict['sheet.slipUndo']}
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => once(onHold)}>
          <Check size={ICON} strokeWidth={2} aria-hidden="true" />
          {dict['urge.held']}
        </button>
      )}

      <div className="urge-foot">
        {slipped ? null : (
          /* Срыв не должен ни исчезать, ни выглядеть как приглашение: он тихий,
             тише любой другой надписи на экране, и стоит в стороне от главной. */
          <button type="button" className="link" onClick={() => once(onSlip)}>
            <Ban size={14} strokeWidth={1.8} aria-hidden="true" />
            {dict['urge.slipped']}
          </button>
        )}
        <button type="button" className="link" onClick={onQuiet}>
          {dict['urge.close']}
        </button>
      </div>
    </div>
  );
}

export interface UrgeRowProps {
  habit: Habit;
  /** День, к которому относится отметка. */
  day: DateKey;
  /** Таймер один на весь экран, поэтому живёт в представлении. */
  timer: UrgeTimer;
  /** Строка списка привычек открывает по тапу настройки; на «Сегодня» их нет. */
  onOpen?: () => void;
  openLabel?: string;
}

/**
 * Строка «не делать» целиком: часы вместо отметки и панель под ней.
 *
 * Панель стоит рядом со строкой, а не внутри неё: внутри строки она попала бы в
 * колонку действия шириной сорок пикселей и уехала бы за край списка.
 */
export function UrgeRow({ habit, day, timer, onOpen, openLabel }: UrgeRowProps) {
  const { data, update } = useStore();
  const dict = t(data.settings.lang);
  const notify = useToast();
  const running = timer.runningId === habit.id;
  // Срыв — это единственная запись у «не делать»: стоит день в истории, пока его
  // не снимут, и снять его теперь можно только из панели.
  const slipped = (getEntry(data, day, habit.id)?.value ?? 0) > 0;

  return (
    <>
      <HabitRow
        habit={habit}
        sub={habitMeta(habit, dict, data.settings.lang)}
        onOpenMain={onOpen}
        onOpen={onOpen}
        openLabel={openLabel}
        actions={
          <UrgeButton
            running={running}
            onClick={() => timer.toggle(habit)}
            label={running ? dict['urge.close'] : dict['urge.start']}
          />
        }
      />

      {running ? (
        <UrgePanel
          habit={habit}
          endAt={timer.endAt ?? Date.now()}
          slipped={slipped}
          onHold={() => notify(dict['urge.held'])}
          onSlip={() => {
            update((current) => tapHabit(current, habit.id, day));
            notify(dict['urge.slippedDone']);
          }}
          onClean={() => {
            update((current) => tapHabit(current, habit.id, day));
            notify(dict['urge.cleanDone']);
          }}
          onClose={timer.stop}
          onQuiet={timer.stop}
        />
      ) : null}
    </>
  );
}
