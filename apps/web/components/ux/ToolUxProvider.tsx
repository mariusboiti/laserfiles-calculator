'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { ToolEmptyStateAction, ToolEmptyStateQuickAction } from './ToolEmptyState';
import type { AIImageAsset } from '@/lib/ai/aiImageLibrary';

export type ToolSessionAdapter = {
  version: number;
  restore: (state: unknown) => void | Promise<void>;
};

export type AIImageData = {
  dataUrl: string;
  mime?: 'image/png' | 'image/jpeg' | 'image/webp';
  prompt?: string;
  provider?: string;
  width?: number;
  height?: number;
};

export type AIImageIntegration = {
  getCurrentImage: () => AIImageData | null;
  applyImage?: (asset: AIImageAsset) => void;
};

type ToolUxState = {
  isEmpty: boolean;
  hasInteracted: boolean;
  primaryAction?: ToolEmptyStateAction;
  secondaryAction?: ToolEmptyStateAction;
  quickActions?: ToolEmptyStateQuickAction[];
  sessionAdapter?: ToolSessionAdapter;
  sessionState?: unknown;
  canUndo?: boolean;
  onUndo?: () => void;
  aiImageIntegration?: AIImageIntegration;
};

type ToolUxApi = {
  setIsEmpty: (isEmpty: boolean) => void;
  markInteracted: () => void;
  setPrimaryAction: (action?: ToolEmptyStateAction) => void;
  setSecondaryAction: (action?: ToolEmptyStateAction) => void;
  setQuickActions: (actions?: ToolEmptyStateQuickAction[]) => void;
  setSessionAdapter: (adapter?: ToolSessionAdapter) => void;
  setSessionState: (state?: unknown) => void;
  setUndo: (opts?: { canUndo?: boolean; onUndo?: () => void }) => void;
  setAIImageIntegration: (integration?: AIImageIntegration) => void;
};

type ToolUxContextValue = {
  state: ToolUxState;
  api: ToolUxApi;
};

const ToolUxContext = createContext<ToolUxContextValue | null>(null);

export function ToolUxProvider({ children }: { children: ReactNode }) {
  const [isEmpty, setIsEmptyState] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [primaryAction, setPrimaryAction] = useState<ToolEmptyStateAction | undefined>(undefined);
  const [secondaryAction, setSecondaryAction] = useState<ToolEmptyStateAction | undefined>(undefined);
  const [quickActions, setQuickActions] = useState<ToolEmptyStateQuickAction[] | undefined>(undefined);
  const [sessionAdapter, setSessionAdapter] = useState<ToolSessionAdapter | undefined>(undefined);
  const [sessionState, setSessionState] = useState<unknown>(undefined);
  const [canUndo, setCanUndo] = useState<boolean | undefined>(undefined);
  const [onUndo, setOnUndo] = useState<(() => void) | undefined>(undefined);
  const [aiImageIntegration, setAIImageIntegration] = useState<AIImageIntegration | undefined>(undefined);

  const interactedOnceRef = useRef(false);

  const markInteracted = useCallback(() => {
    if (interactedOnceRef.current) return;
    interactedOnceRef.current = true;
    setHasInteracted(true);
  }, []);

  const setIsEmpty = useCallback((next: boolean) => {
    setIsEmptyState(next);
  }, []);

  const setUndo = useCallback((opts?: { canUndo?: boolean; onUndo?: () => void }) => {
    setCanUndo(opts?.canUndo);
    setOnUndo(() => opts?.onUndo);
  }, []);

  const value = useMemo<ToolUxContextValue>(() => {
    return {
      state: {
        isEmpty,
        hasInteracted,
        primaryAction,
        secondaryAction,
        quickActions,
        sessionAdapter,
        sessionState,
        canUndo,
        onUndo,
        aiImageIntegration,
      },
      api: {
        setIsEmpty,
        markInteracted,
        setPrimaryAction,
        setSecondaryAction,
        setQuickActions,
        setSessionAdapter,
        setSessionState,
        setUndo,
        setAIImageIntegration,
      },
    };
  }, [
    aiImageIntegration,
    canUndo,
    hasInteracted,
    isEmpty,
    markInteracted,
    onUndo,
    primaryAction,
    quickActions,
    secondaryAction,
    sessionAdapter,
    sessionState,
    setIsEmpty,
    setUndo,
  ]);

  return <ToolUxContext.Provider value={value}>{children}</ToolUxContext.Provider>;
}

export function useToolUx() {
  const ctx = useContext(ToolUxContext);
  if (!ctx) throw new Error('useToolUx must be used within ToolUxProvider');
  return ctx;
}
