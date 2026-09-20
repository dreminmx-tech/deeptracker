import type { DateKey } from '../lib/date';
import { formatDay } from '../lib/date';
import type { DayStatus } from '../lib/habits';
import type { Lang } from '../types';

interface TrendStripProps {
  days: DateKey[];
  lang: Lang;
  statusFor: (key: DateKey) => DayStatus;
}

/** Bar height per day status: full, a bit over half, a thin mark, or nothing at all. */
const HEIGHT: Record<DayStatus, string> = {
  done: '100%',
  partial: '55%',
  missed: '3px',
  rest: '0',
  future: '0',
};

/**
 * Full-width trend strip — one bar per day, height = how much of the day was closed.
 * Replaces the 7×N grid: 30 or 90 days fill the card instead of leaving half of it empty.
 */
export default function TrendStrip({ days, lang, statusFor }: TrendStripProps) {
  return (
    <div className="trend">
      {days.map((key) => {
        const status = statusFor(key);
        return (
          <span
            key={key}
            className="trend-day"
            data-status={status}
            style={{ height: HEIGHT[status] }}
            title={formatDay(key, lang)}
          />
        );
      })}
    </div>
  );
}
