/**
 * Canvas State Reducer with Undo/Redo
 */

import type {
  CanvasDocument,
  CanvasElement,
  SelectionState,
  HistoryState,
  HistoryEntry,
  ElementTransform,
  LayerType,
} from '../../types/canvas';
import { DEFAULT_SELECTION } from '../../types/canvas';

// ============ Action Types ============
export type CanvasAction =
  | { type: 'ADD_ELEMENT'; element: CanvasElement }
  | { type: 'REMOVE_ELEMENTS'; ids: string[] }
  | { type: 'UPDATE_ELEMENT'; id: string; updates: Partial<CanvasElement> & Record<string, unknown> }
  | { type: 'UPDATE_TRANSFORM'; id: string; transform: Partial<ElementTransform> }
  | { type: 'SET_LAYER'; id: string; layer: LayerType }
  | { type: 'REORDER_ELEMENTS'; ids: string[] }
  | { type: 'SELECT'; ids: string[]; additive?: boolean }
  | { type: 'SELECT_ALL' }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SELECTION_MODE'; mode: SelectionState['mode'] }
  | { type: 'UPDATE_ARTBOARD'; updates: Partial<CanvasDocument['artboard']> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'COMMIT' }
  | { type: 'RESET'; doc: CanvasDocument };

// ============ Initial State ============
export function createInitialHistory(doc: CanvasDocument): HistoryState {
  return {
    past: [],
    present: {
      doc,
      selection: DEFAULT_SELECTION,
      timestamp: Date.now(),
    },
    future: [],
  };
}

// ============ Reducer ============
export function canvasReducer(
  state: HistoryState,
  action: CanvasAction
): HistoryState {
  const { present } = state;

  switch (action.type) {
    case 'ADD_ELEMENT': {
      const newDoc: CanvasDocument = {
        ...present.doc,
        elements: [...present.doc.elements, action.element],
      };
      const newSelection: SelectionState = {
        selectedIds: [action.element.id],
        activeId: action.element.id,
        mode: 'idle',
      };
      return commitChange(state, newDoc, newSelection);
    }

    case 'REMOVE_ELEMENTS': {
      const idsToRemove = new Set(action.ids);
      const newDoc: CanvasDocument = {
        ...present.doc,
        elements: present.doc.elements.filter(el => !idsToRemove.has(el.id)),
      };
      const newSelection: SelectionState = {
        selectedIds: [],
        activeId: null,
        mode: 'idle',
      };
      return commitChange(state, newDoc, newSelection);
    }

    case 'UPDATE_ELEMENT': {
      const newDoc: CanvasDocument = {
        ...present.doc,
        elements: present.doc.elements.map(el =>
          el.id === action.id ? { ...el, ...action.updates } as CanvasElement : el
        ),
      };
      return updatePresent(state, newDoc, present.selection);
    }

    case 'UPDATE_TRANSFORM': {
      const newDoc: CanvasDocument = {
        ...present.doc,
        elements: present.doc.elements.map(el =>
          el.id === action.id
            ? { ...el, transform: { ...el.transform, ...action.transform } }
            : el
        ),
      };
      return updatePresent(state, newDoc, present.selection);
    }

    case 'SET_LAYER': {
      const newDoc: CanvasDocument = {
        ...present.doc,
        elements: present.doc.elements.map(el =>
          el.id === action.id ? { ...el, layer: action.layer } : el
        ),
      };
      return commitChange(state, newDoc, present.selection);
    }

    case 'REORDER_ELEMENTS': {
      const idOrder = new Map(action.ids.map((id, i) => [id, i]));
      const newElements = [...present.doc.elements].sort((a, b) => {
        const aIdx = idOrder.get(a.id) ?? Infinity;
        const bIdx = idOrder.get(b.id) ?? Infinity;
        return aIdx - bIdx;
      });
      const newDoc: CanvasDocument = {
        ...present.doc,
        elements: newElements,
      };
      return commitChange(state, newDoc, present.selection);
    }

    case 'SELECT': {
      let newSelectedIds: string[];
      if (action.additive) {
        const existing = new Set(present.selection.selectedIds);
        action.ids.forEach(id => {
          if (existing.has(id)) {
            existing.delete(id);
          } else {
            existing.add(id);
          }
        });
        newSelectedIds = Array.from(existing);
      } else {
        newSelectedIds = action.ids;
      }
      const newSelection: SelectionState = {
        selectedIds: newSelectedIds,
        activeId: newSelectedIds[newSelectedIds.length - 1] || null,
        mode: 'idle',
      };
      return updatePresent(state, present.doc, newSelection);
    }

    case 'SELECT_ALL': {
      const allIds = present.doc.elements
        .filter(el => el.visible !== false && el.locked !== true)
        .map(el => el.id);
      const newSelection: SelectionState = {
        selectedIds: allIds,
        activeId: allIds[allIds.length - 1] || null,
        mode: 'idle',
      };
      return updatePresent(state, present.doc, newSelection);
    }

    case 'CLEAR_SELECTION': {
      return updatePresent(state, present.doc, DEFAULT_SELECTION);
    }

    case 'SET_SELECTION_MODE': {
      const newSelection: SelectionState = {
        ...present.selection,
        mode: action.mode,
      };
      return updatePresent(state, present.doc, newSelection);
    }

    case 'UPDATE_ARTBOARD': {
      const newDoc: CanvasDocument = {
        ...present.doc,
        artboard: { ...present.doc.artboard, ...action.updates },
      };
      return commitChange(state, newDoc, present.selection);
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [present, ...state.future],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, present],
        present: next,
        future: state.future.slice(1),
      };
    }

    case 'COMMIT': {
      return commitChange(state, present.doc, present.selection);
    }

    case 'RESET': {
      return createInitialHistory(action.doc);
    }

    default:
      return state;
  }
}

// ============ Helpers ============
function updatePresent(
  state: HistoryState,
  doc: CanvasDocument,
  selection: SelectionState
): HistoryState {
  return {
    ...state,
    present: {
      doc,
      selection,
      timestamp: Date.now(),
    },
  };
}

function commitChange(
  state: HistoryState,
  doc: CanvasDocument,
  selection: SelectionState
): HistoryState {
  const newEntry: HistoryEntry = {
    doc,
    selection,
    timestamp: Date.now(),
  };
  return {
    past: [...state.past.slice(-49), state.present], // Keep max 50 history entries
    present: newEntry,
    future: [],
  };
}

// ============ Selectors ============
export function getSelectedElements(state: HistoryState): CanvasElement[] {
  const ids = new Set(state.present.selection.selectedIds);
  return state.present.doc.elements.filter(el => ids.has(el.id));
}

export function getElementById(state: HistoryState, id: string): CanvasElement | undefined {
  return state.present.doc.elements.find(el => el.id === id);
}

export function canUndo(state: HistoryState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: HistoryState): boolean {
  return state.future.length > 0;
}
