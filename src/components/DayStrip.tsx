import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateKey } from '../lib/date';
import { addDays, formatDay, weekDays, weekdayShort } from '../lib/date';
import type { DayStatus } from '../lib/habits';
import type { Lang } from '../types';

interface DayStripProps {
  /** Currently open day. */
  day: DateKey;
  today: DateKey;
  lang: Lang;
  statusFor: (key: DateKey) => DayStatus;
  onSelect: (key: DateKey) => void;
  /** Accessible names, so the strip needs no dictionary of its own. */
  labels: { group: string; current: string; prevWeek: string; nextWeek: string };
}

/**
 * Week strip above the list: one chip per day with its status as a small mark,
 * plus a week back and forward. The past is editable, the future is not.
 */
export default function DayStrip({ day, today, lang, statusFor, onSelect, labels }: DayStripProps) {
  const days = weekDays(day);
  const first = days[0] ?? day;
  const nextWeek = addDays(first, 7);

  return (
    <div className="daystrip">
      <button
        type="button"
        className="daystrip-shift"
        aria-label={labels.prevWeek}
        title={labels.prevWeek}
        onClick={() => onSelect(addDays(first, -7))}
      >
        <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <div className="daystrip-days" role="group" aria-label={labels.group}>
        {days.map((key) => {
          const status = statusFor(key);
          const future = key > today;
          return (
            <button
              key={key}
              type="button"
              className="day-chip"
              data-status={status}
              data-active={key === day ? 'true' : 'false'}
              data-today={key === today ? 'true' : 'false'}
              disabled={future}
              title={formatDay(key, lang)}
              aria-label={`${formatDay(key, lang)}${key === day ? `, ${labels.current}` : ''}`}
              aria-current={key === day ? 'date' : undefined}
              onClick={() => onSelect(key)}
            >
              <span className="day-chip-name">{weekdayShort(key, lang)}</span>
              <span className="day-chip-mark" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="daystrip-shift"
        aria-label={labels.nextWeek}
        title={labels.nextWeek}
        disabled={nextWeek > today}
        onClick={() => onSelect(addDays(first, 7))}
      >
        <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
