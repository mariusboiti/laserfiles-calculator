'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GlobalDisclaimer } from './GlobalDisclaimer';

const STORAGE_KEY_BASE = 'lfs-disclaimer-accepted';

type DisclaimerContextValue = {
  hasAcceptedDisclaimer: boolean;
  openDisclaimer: () => void;
};

const DisclaimerContext = createContext<DisclaimerContextValue | null>(null);

export type DisclaimerProviderProps = {
  children: React.ReactNode;
  userKey?: string | null;
};

function normalizeUserKey(userKey?: string | null): string | null {
  const raw = String(userKey || '').trim();
  if (!raw) return null;
  return raw.slice(0, 64);
}

function buildStorageKey(userKey?: string | null): string {
  const normalized = normalizeUserKey(userKey);
  return normalized ? `${STORAGE_KEY_BASE}:${normalized}` : STORAGE_KEY_BASE;
}

export function DisclaimerProvider({ children, userKey }: DisclaimerProviderProps) {
  const storageKey = useMemo(() => buildStorageKey(userKey), [userKey]);

  const [acceptedState, setAcceptedState] = useState<'unknown' | 'accepted' | 'notAccepted'>('unknown');
  const [readOnlyOpen, setReadOnlyOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      setAcceptedState(v === 'true' ? 'accepted' : 'notAccepted');
    } catch {
      setAcceptedState('notAccepted');
    }
  }, [storageKey]);

  const acceptDisclaimer = useCallback(() => {
    setAcceptedState('accepted');
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // ignore
    }
  }, [storageKey]);

  const openDisclaimer = useCallback(() => {
    setReadOnlyOpen(true);
  }, []);

  const closeDisclaimer = useCallback(() => {
    setReadOnlyOpen(false);
  }, []);

  const hasAcceptedDisclaimer = acceptedState === 'accepted';

  const value = useMemo<DisclaimerContextValue>(
    () => ({
      hasAcceptedDisclaimer,
      openDisclaimer,
    }),
    [hasAcceptedDisclaimer, openDisclaimer],
  );

  return (
    <DisclaimerContext.Provider value={value}>
      {children}

      {acceptedState === 'notAccepted' && (
        <GlobalDisclaimer mode="blocking" onAccept={acceptDisclaimer} />
      )}

      {readOnlyOpen && (
        <GlobalDisclaimer mode="readOnly" onClose={closeDisclaimer} />
      )}
    </DisclaimerContext.Provider>
  );
}

export function useDisclaimer(): DisclaimerContextValue {
  const ctx = useContext(DisclaimerContext);
  if (!ctx) {
    throw new Error('useDisclaimer must be used within a DisclaimerProvider');
  }
  return ctx;
}
