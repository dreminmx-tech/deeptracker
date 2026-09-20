import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData } from './types';
import { loadData, saveData } from './lib/storage';

export interface Store {
  data: AppData;
  update: (fn: (data: AppData) => AppData) => void;
  replace: (data: AppData) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());

  // localStorage is the single source of truth; every change is persisted immediately.
  useEffect(() => {
    saveData(data);
  }, [data]);

  const value = useMemo<Store>(
    () => ({
      data,
      update: (fn) => setData((prev) => fn(prev)),
      replace: (next) => setData(next),
    }),
    [data],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
