import type { Lang } from '../types';
import type { DateKey } from '../lib/date';
import { formatDay, padToWeekStart } from '../lib/date';
import type { DayStatus } from '../lib/habits';

interface HeatmapProps {
  days: DateKey[];
  lang: Lang;
  statusFor: (key: DateKey) => DayStatus;
}

/** GitHub-style grid: 7 rows (Mon…Sun), one column per week. */
export default function Heatmap({ days, lang, statusFor }: HeatmapProps) {
  const cells = padToWeekStart(days);
  return (
    <div className="heatmap">
      {cells.map((key, index) => (
        <span
          key={key ?? `pad-${index}`}
          className="cell"
          data-status={key ? statusFor(key) : 'pad'}
          title={key ? formatDay(key, lang) : ''}
        />
      ))}
    </div>
  );
}
