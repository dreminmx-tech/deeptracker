interface ValueRowProps {
  label: string;
  /** Optional name before the value; it truncates when the row gets tight. */
  name?: string;
  value: string;
}

/** One line of a summary: quiet label on the left, the number on the right. */
export default function ValueRow({ label, name, value }: ValueRowProps) {
  return (
    <div className="spread">
      <span className="value-label muted small">{label}</span>
      <span className="value">
        {name ? <span className="value-name">{name}</span> : null}
        <span className="value-num">{value}</span>
      </span>
    </div>
  );
}
