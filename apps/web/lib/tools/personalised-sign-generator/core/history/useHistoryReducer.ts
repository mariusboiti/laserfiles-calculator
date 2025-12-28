import { useCallback, useMemo, useReducer } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  interactionBase: T | null;
}

type HistoryAction<T> =
  | { type: 'SET_PRESENT'; present: T; commit?: boolean }
  | { type: 'COMMIT_PRESENT' }
  | { type: 'BEGIN_INTERACTION' }
  | { type: 'END_INTERACTION' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; present: T };

function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
  switch (action.type) {
    case 'SET_PRESENT': {
      const next = action.present;
      if (action.commit) {
        return {
          past: [...state.past, state.present],
          present: next,
          future: [],
          interactionBase: null,
        };
      }
      return {
        ...state,
        present: next,
      };
    }
    case 'COMMIT_PRESENT': {
      if (state.past.length > 0 && state.past[state.past.length - 1] === state.present) {
        return state;
      }
      return {
        past: [...state.past, state.present],
        present: state.present,
        future: [],
        interactionBase: null,
      };
    }
    case 'BEGIN_INTERACTION': {
      if (state.interactionBase) return state;
      return {
        ...state,
        interactionBase: state.present,
      };
    }
    case 'END_INTERACTION': {
      if (!state.interactionBase) return state;
      if (state.interactionBase === state.present) {
        return { ...state, interactionBase: null };
      }
      return {
        past: [...state.past, state.interactionBase],
        present: state.present,
        future: [],
        interactionBase: null,
      };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
        interactionBase: null,
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
        interactionBase: null,
      };
    }
    case 'RESET': {
      return { past: [], present: action.present, future: [], interactionBase: null };
    }
    default:
      return state;
  }
}

export function useHistoryReducer<T>(initialPresent: T) {
  const [state, dispatch] = useReducer(historyReducer<T>, {
    past: [],
    present: initialPresent,
    future: [],
    interactionBase: null,
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const setPresent = useCallback((present: T, commit: boolean = false) => {
    dispatch({ type: 'SET_PRESENT', present, commit });
  }, []);

  const commit = useCallback(() => {
    dispatch({ type: 'COMMIT_PRESENT' });
  }, []);

  const beginInteraction = useCallback(() => {
    dispatch({ type: 'BEGIN_INTERACTION' });
  }, []);

  const endInteraction = useCallback(() => {
    dispatch({ type: 'END_INTERACTION' });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const reset = useCallback((present: T) => {
    dispatch({ type: 'RESET', present });
  }, []);

  return useMemo(
    () => ({
      state,
      present: state.present,
      setPresent,
      commit,
      beginInteraction,
      endInteraction,
      undo,
      redo,
      canUndo,
      canRedo,
      reset,
    }),
    [state, setPresent, commit, beginInteraction, endInteraction, undo, redo, canUndo, canRedo, reset]
  );
}
