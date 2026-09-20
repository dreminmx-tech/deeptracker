export type IconName =
  | 'check'
  | 'play'
  | 'timer'
  | 'plus'
  | 'minus'
  | 'arrow-up'
  | 'arrow-down'
  | 'star'
  | 'star-filled'
  | 'moon'
  | 'sun'
  | 'x';

const PATHS: Record<IconName, string> = {
  check: 'M4.5 12.5l5 5 10-11',
  play: 'M8 5.5l10 6.5-10 6.5z',
  timer: 'M12 21a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.5V12l3 2M9 2.5h6',
  plus: 'M12 5.5v13M5.5 12h13',
  minus: 'M5.5 12h13',
  'arrow-up': 'M12 19.5V4.5M5.5 11L12 4.5 18.5 11',
  'arrow-down': 'M12 4.5v15M18.5 13L12 19.5 5.5 13',
  star: 'M12 4l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z',
  'star-filled': 'M12 4l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4',
  x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
};

const FILLED: IconName[] = ['play', 'star-filled'];

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Monochrome stroke icons — no icon font, no external requests. */
export default function Icon({ name, size = 20, className }: IconProps) {
  const filled = FILLED.includes(name);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
