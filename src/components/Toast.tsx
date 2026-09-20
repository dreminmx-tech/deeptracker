import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Undo2 } from 'lucide-react';

export type ToastTone = 'plain' | 'ok' | 'warn';

/** One way back from an action that is easy to trigger by accident. */
export interface ToastAction {
  label: string;
  run: () => void;
}

type Notify = (message: string, tone?: ToastTone, action?: ToastAction) => void;

const ToastContext = createContext<Notify>(() => {});

/** An undo has to stay on screen long enough to be read and used. */
const PLAIN_MS = 2600;
const UNDO_MS = 5200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone; action?: ToastAction } | null>(
    null,
  );
  const timer = useRef<number | null>(null);

  const notify = useCallback<Notify>((message, tone = 'plain', action) => {
    setToast({ message, tone, ...(action ? { action } : {}) });
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), action ? UNDO_MS : PLAIN_MS);
  }, []);

  const dismiss = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        className="toast"
        role="status"
        aria-live="polite"
        data-tone={toast?.tone ?? 'plain'}
        data-visible={toast ? 'true' : 'false'}
        data-action={toast?.action ? 'true' : 'false'}
      >
        <span className="toast-text">{toast?.message}</span>
        {toast?.action ? (
          <button
            type="button"
            className="toast-act"
            onClick={() => {
              toast.action?.run();
              dismiss();
            }}
          >
            <Undo2 size={14} strokeWidth={2} aria-hidden="true" />
            {toast.action.label}
          </button>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  return useContext(ToastContext);
}
