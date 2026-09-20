import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastTone = 'plain' | 'ok' | 'warn';

type Notify = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<Notify>(() => {});

/** Короткая плашка на два редких случая: «данные загружены» и «в главном уже три». */
const PLAIN_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const timer = useRef<number | null>(null);

  const notify = useCallback<Notify>((message, tone = 'plain') => {
    setToast({ message, tone });
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), PLAIN_MS);
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
      >
        <span className="toast-text">{toast?.message}</span>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  return useContext(ToastContext);
}
