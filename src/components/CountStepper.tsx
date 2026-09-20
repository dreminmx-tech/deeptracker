import { Minus, Plus } from 'lucide-react';
import type { Lang } from '../types';
import { t } from '../lib/i18n';

interface CountStepperProps {
  lang: Lang;
  /** Готовое значение: «0/6», «25/20 мин». */
  value: string;
  /** Если задано, значение становится кнопкой (открывает быстрый ввод). */
  openLabel?: string;
  onOpen?: () => void;
  onBump: (direction: 1 | -1) => void;
}

/**
 * `− значение +` внутри одной пилюли.
 * Три отдельных элемента в строке читались как перегруз: минус, значение и плюс
 * — это один прибор, а не три кнопки, поэтому у него одна рамка и один ритм.
 */
export default function CountStepper({ lang, value, openLabel, onOpen, onBump }: CountStepperProps) {
  const dict = t(lang);

  return (
    <span className="stepper">
      <button
        type="button"
        className="stepper-act"
        aria-label={dict['sheet.minus']}
        title={dict['sheet.minus']}
        onClick={() => onBump(-1)}
      >
        <Minus size={16} strokeWidth={2} aria-hidden="true" />
      </button>

      {onOpen ? (
        <button
          type="button"
          className="stepper-value"
          aria-label={openLabel ?? value}
          title={openLabel ?? value}
          onClick={onOpen}
        >
          {value}
        </button>
      ) : (
        <span className="stepper-value">{value}</span>
      )}

      <button
        type="button"
        className="stepper-act"
        aria-label={dict['sheet.plus']}
        title={dict['sheet.plus']}
        onClick={() => onBump(1)}
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </span>
  );
}
