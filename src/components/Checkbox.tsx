interface CheckboxProps {
  checked: boolean;
  small?: boolean;
}

/** Square monochrome checkbox: the single most tapped element in the app. */
export default function Checkbox({ checked, small }: CheckboxProps) {
  return (
    <span
      className={small ? 'box box-sm' : 'box'}
      data-checked={checked ? 'true' : 'false'}
      aria-hidden="true"
    >
      {checked ? '✓' : ''}
    </span>
  );
}
