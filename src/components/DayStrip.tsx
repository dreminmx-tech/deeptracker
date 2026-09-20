import type { DateKey } from '../lib/date';
import { formatDay, lastNDays, weekdayShort } from '../lib/date';
import type { DayStatus } from '../lib/habits';
import type { Lang } from '../types';

interface DayStripProps {
  /** Currently open day. */
  day: DateKey;
  today: DateKey;
  lang: Lang;
  statusFor: (key: DateKey) => DayStatus;
  onSelect: (key: DateKey) => void;
  /** Accessible name for the group, so the strip needs no dictionary of its own. */
  groupLabel: string;
}

/**
 * The last seven days, ending today: no week flipping, no future days, no «а какая
 * это неделя?». Looking back has exactly one purpose — filling in a day you forgot.
 * Today is always the last chip, so the right edge of the strip is always «сейчас».
 */
export default function DayStrip({ day, today, lang, statusFor, onSelect, groupLabel }: DayStripProps) {
  const days = lastNDays(7, today);

  return (
    <div className="daystrip" role="group" aria-label={groupLabel}>
      {days.map((key) => {
        const status = statusFor(key);
        return (
          <button
            key={key}
            type="button"
            className="day-chip"
            data-status={status}
            data-active={key === day ? 'true' : 'false'}
            data-today={key === today ? 'true' : 'false'}
            title={formatDay(key, lang)}
            aria-label={formatDay(key, lang)}
            aria-current={key === day ? 'date' : undefined}
            onClick={() => onSelect(key)}
          >
            <span className="day-chip-name">{weekdayShort(key, lang)}</span>
            <span className="day-chip-mark" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
