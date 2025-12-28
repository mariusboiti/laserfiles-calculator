export type SelectionMode = 'idle' | 'dragging' | 'marquee';

export interface SelectionState {
  selectedIds: string[];
  activeId: string | null;
  mode: SelectionMode;
}

export type SelectionAction =
  | { type: 'SELECT_SINGLE'; id: string }
  | { type: 'TOGGLE_SELECT'; id: string }
  | { type: 'SET_SELECTION'; ids: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_ACTIVE'; id: string | null }
  | { type: 'SET_MODE'; mode: SelectionMode };

function uniq(ids: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function normalize(state: SelectionState): SelectionState {
  const selectedIds = uniq(state.selectedIds);
  let activeId = state.activeId;
  if (activeId && !selectedIds.includes(activeId)) {
    activeId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
  }
  return {
    selectedIds,
    activeId: activeId ?? (selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null),
    mode: state.mode,
  };
}

function assertDev(state: SelectionState) {
  if (process.env.NODE_ENV === 'production') return;
  const s = new Set(state.selectedIds);
  if (s.size !== state.selectedIds.length) {
    throw new Error('[selectionReducer] selectedIds contains duplicates');
  }
  if (state.activeId !== null && !s.has(state.activeId)) {
    throw new Error('[selectionReducer] activeId must be null or included in selectedIds');
  }
}

export function createSelectionState(): SelectionState {
  return { selectedIds: [], activeId: null, mode: 'idle' };
}

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  let next: SelectionState = state;

  switch (action.type) {
    case 'SELECT_SINGLE': {
      next = { ...state, selectedIds: [action.id], activeId: action.id };
      break;
    }
    case 'TOGGLE_SELECT': {
      const isSelected = state.selectedIds.includes(action.id);
      if (isSelected) {
        const ids = state.selectedIds.filter(id => id !== action.id);
        next = { ...state, selectedIds: ids, activeId: ids.length > 0 ? ids[ids.length - 1] : null };
      } else {
        next = { ...state, selectedIds: [...state.selectedIds, action.id], activeId: action.id };
      }
      break;
    }
    case 'SET_SELECTION': {
      const ids = uniq(action.ids);
      next = { ...state, selectedIds: ids, activeId: ids.length > 0 ? ids[ids.length - 1] : null };
      break;
    }
    case 'CLEAR_SELECTION': {
      next = { ...state, selectedIds: [], activeId: null };
      break;
    }
    case 'SET_ACTIVE': {
      next = { ...state, activeId: action.id };
      break;
    }
    case 'SET_MODE': {
      next = { ...state, mode: action.mode };
      break;
    }
    default:
      next = state;
  }

  next = normalize(next);
  assertDev(next);
  return next;
}

export function selectSingle(id: string): SelectionAction {
  return { type: 'SELECT_SINGLE', id };
}

export function toggleSelect(id: string): SelectionAction {
  return { type: 'TOGGLE_SELECT', id };
}

export function setSelection(ids: string[]): SelectionAction {
  return { type: 'SET_SELECTION', ids };
}

export function clearSelection(): SelectionAction {
  return { type: 'CLEAR_SELECTION' };
}

export function setActive(id: string | null): SelectionAction {
  return { type: 'SET_ACTIVE', id };
}

export function setMode(mode: SelectionMode): SelectionAction {
  return { type: 'SET_MODE', mode };
}
