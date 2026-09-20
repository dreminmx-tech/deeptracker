import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Habit } from '../types';
import Checkbox from './Checkbox';

export interface HabitRowProps {
  habit: Habit;
  /** Right-aligned muted value (today's progress). */
  status?: string;
  /** Makes that value a button — counter and minutes habits open the quick log. */
  onStatus?: () => void;
  /** Accessible name of that button, since the value is just “3/6”. */
  statusLabel?: string;
  /** Optional second line, used by the management list. */
  sub?: string;
  /** The main three get a heavier name — the only emphasis in the list. */
  pinned?: boolean;
  /** When set, the row body completes the habit. */
  onToggle?: () => void;
  done?: boolean;
  /** Inline daily actions (icon buttons) — Today. */
  actions?: ReactNode;
  /** Management list: opens the sheet instead. */
  onOpen?: () => void;
  openLabel?: string;
}

/**
 * One row pattern for every list: checkbox, name, one value, then either inline
 * actions (today) or a chevron into the sheet (management).
 */
export default function HabitRow({
  habit,
  status,
  onStatus,
  statusLabel,
  sub,
  pinned,
  onToggle,
  done,
  actions,
  onOpen,
  openLabel,
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
      ) : (
        <div className="hrow-main hrow-static">{label}</div>
      )}

      {status ? (
        onStatus ? (
          <button
            type="button"
            className="hrow-status hrow-chip"
            onClick={onStatus}
            aria-label={statusLabel ?? status}
          >
            {status}
          </button>
        ) : (
          <span className="hrow-status">{status}</span>
        )
      ) : null}

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
