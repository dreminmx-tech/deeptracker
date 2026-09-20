import type { ReactNode } from 'react';
import Modal from './Modal';

export interface SheetAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  /** The single quiet emphasis in the sheet — accent text, no fills. */
  primary?: boolean;
}

interface ActionSheetProps {
  title: string;
  subtitle?: string;
  actions: SheetAction[];
  onClose: () => void;
  closeLabel: string;
}

/** Management list: icon + label rows, no buttons in the list itself. */
export default function ActionSheet({
  title,
  subtitle,
  actions,
  onClose,
  closeLabel,
}: ActionSheetProps) {
  return (
    <Modal title={title} onClose={onClose} closeLabel={closeLabel}>
      {subtitle ? <p className="sheet-sub">{subtitle}</p> : null}
      <div className="actions">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="action"
            data-primary={action.primary ? 'true' : 'false'}
            onClick={action.onSelect}
          >
            {action.icon ? <span className="action-icon">{action.icon}</span> : null}
            {action.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
