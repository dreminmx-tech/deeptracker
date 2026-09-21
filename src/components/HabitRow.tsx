import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Habit } from '../types';
import Checkbox from './Checkbox';

export interface HabitRowProps {
  habit: Habit;
  /** Optional second line. Only the schedule uses it now. */
  sub?: string;
  /** The main three get a heavier name — the only emphasis in the list. */
  pinned?: boolean;
  /** When set, the row body completes the habit. */
  onToggle?: () => void;
  done?: boolean;
  /** Inline daily actions (icon buttons) — only «не делать» has one. */
  actions?: ReactNode;
  /** Management list: opens the sheet instead. */
  onOpen?: () => void;
  openLabel?: string;
  /**
   * Тап по самому названию (не по квадрату): в списке привычек открывает те же
   * настройки, что и стрелка справа — целиться в неё одну неудобно.
   */
  onOpenMain?: () => void;
}

/**
 * One row pattern for every list: checkbox, name, one action.
 * There is no value column any more: a habit is done or it is not, so the row
 * never asks «сколько?» — that question was the friction, not the answer.
 */
export default function HabitRow({
  habit,
  sub,
  pinned,
  onToggle,
  done,
  actions,
  onOpen,
  openLabel,
  onOpenMain,
}: HabitRowProps) {
  const label = (
    <>
      {onToggle ? <Checkbox checked={Boolean(done)} /> : null}
      <span className="hrow-text">
        <span className="hrow-name">{habit.name}</span>
        {sub ? <span className="hrow-sub">{sub}</span> : null}
      </span>
    </>
  );

  return (
    <div className="hrow" data-done={done ? 'true' : 'false'} data-pinned={pinned ? 'true' : 'false'}>
      {onToggle ? (
        <button
          type="button"
          className="hrow-main"
          onClick={onToggle}
          aria-pressed={Boolean(done)}
          aria-label={habit.name}
        >
          {label}
        </button>
      ) : onOpenMain ? (
        /* В списке привычек строку целиком открывает настройки: квадрата для
           отметки здесь нет, поэтому вся строка — одна кнопка. */
        <button
          type="button"
          className="hrow-main"
          onClick={onOpenMain}
          aria-label={habit.name}
          title={habit.name}
        >
          {label}
        </button>
      ) : (
        <div className="hrow-main hrow-static">{label}</div>
      )}

      {actions ? (
        <div className="hrow-actions">{actions}</div>
      ) : onOpen ? (
        <button type="button" className="row-act" onClick={onOpen} aria-label={openLabel} title={openLabel}>
          <ChevronRight size={20} strokeWidth={1.8} />
        </button>
      ) : null}
    </div>
  );
}
