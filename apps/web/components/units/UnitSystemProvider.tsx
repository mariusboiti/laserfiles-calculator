'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type UnitSystem = 'mm' | 'in';

type UnitSystemContextValue = {
  unitSystem: UnitSystem;
  setUnitSystem: (next: UnitSystem) => void;
};

const UnitSystemContext = createContext<UnitSystemContextValue | null>(null);

const storageKey = 'studioUnitSystem';

export function UnitSystemProvider({ children }: { children: ReactNode }) {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => {
    if (typeof window === 'undefined') return 'mm';
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'mm' || stored === 'in') return stored;
    return 'mm';
  });

  const setUnitSystem = useCallback((next: UnitSystem) => {
    setUnitSystemState(next);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, unitSystem);
    } catch {
      // ignore
    }
  }, [unitSystem]);

  const value = useMemo<UnitSystemContextValue>(() => ({ unitSystem, setUnitSystem }), [unitSystem, setUnitSystem]);

  return <UnitSystemContext.Provider value={value}>{children}</UnitSystemContext.Provider>;
}

export function useUnitSystem() {
  const ctx = useContext(UnitSystemContext);
  if (!ctx) throw new Error('useUnitSystem must be used within UnitSystemProvider');
  return ctx;
}
