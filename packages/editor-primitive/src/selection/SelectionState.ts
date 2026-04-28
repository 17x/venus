/**
 * Defines generic selection runtime state with ids only and no product semantics.
 */
export interface SelectionState<TId extends string = string> {
  /** Stores selected ids in stable deterministic order. */
  selectedIds: TId[]
  /** Stores focused id when one item has keyboard focus. */
  focusedId: TId | null
  /** Stores anchor id used by range operations. */
  anchorId: TId | null
  /** Stores monotonic selection version incremented on each mutation. */
  version: number
}

/**
 * Creates empty selection runtime state.
 */
export function createSelectionState<TId extends string = string>(): SelectionState<TId> {
  return {
    selectedIds: [],
    focusedId: null,
    anchorId: null,
    version: 0,
  }
}

/**
 * Replaces selection ids and updates focus/anchor defaults.
 */
export function replaceSelection<TId extends string>(
  state: SelectionState<TId>,
  selectedIds: TId[],
): SelectionState<TId> {
  const nextIds = [...selectedIds]
  const nextFocus = nextIds.length > 0 ? nextIds[0] : null

  return {
    ...state,
    selectedIds: nextIds,
    focusedId: nextFocus,
    anchorId: nextFocus,
    version: state.version + 1,
  }
}

/**
 * Adds one id to selection while keeping stable insertion ordering.
 */
export function addSelectionId<TId extends string>(
  state: SelectionState<TId>,
  id: TId,
): SelectionState<TId> {
  if (state.selectedIds.includes(id)) {
    return state
  }

  return {
    ...state,
    selectedIds: [...state.selectedIds, id],
    focusedId: state.focusedId ?? id,
    anchorId: state.anchorId ?? id,
    version: state.version + 1,
  }
}

/**
 * Removes one id from selection and repairs focus/anchor if needed.
 */
export function removeSelectionId<TId extends string>(
  state: SelectionState<TId>,
  id: TId,
): SelectionState<TId> {
  if (!state.selectedIds.includes(id)) {
    return state
  }

  const nextIds = state.selectedIds.filter((item) => item !== id)
  const fallback = nextIds.length > 0 ? nextIds[0] : null

  return {
    ...state,
    selectedIds: nextIds,
    // Keep focus stable when possible, otherwise fall back to first selected id.
    focusedId: state.focusedId === id ? fallback : state.focusedId,
    // Keep anchor stable when possible, otherwise fall back to first selected id.
    anchorId: state.anchorId === id ? fallback : state.anchorId,
    version: state.version + 1,
  }
}

/**
 * Toggles one id in selection while preserving deterministic ordering.
 */
export function toggleSelectionId<TId extends string>(
  state: SelectionState<TId>,
  id: TId,
): SelectionState<TId> {
  return state.selectedIds.includes(id)
    ? removeSelectionId(state, id)
    : addSelectionId(state, id)
}

/**
 * Clears selection and resets focus/anchor state.
 */
export function clearSelection<TId extends string>(state: SelectionState<TId>): SelectionState<TId> {
  if (state.selectedIds.length === 0) {
    return state
  }

  return {
    ...state,
    selectedIds: [],
    focusedId: null,
    anchorId: null,
    version: state.version + 1,
  }
}

/**
 * Updates focused id without mutating selected ids.
 */
export function setSelectionFocusedId<TId extends string>(
  state: SelectionState<TId>,
  focusedId: TId | null,
): SelectionState<TId> {
  if (state.focusedId === focusedId) {
    return state
  }

  return {
    ...state,
    focusedId,
    version: state.version + 1,
  }
}

/**
 * Updates anchor id without mutating selected ids.
 */
export function setSelectionAnchorId<TId extends string>(
  state: SelectionState<TId>,
  anchorId: TId | null,
): SelectionState<TId> {
  if (state.anchorId === anchorId) {
    return state
  }

  return {
    ...state,
    anchorId,
    version: state.version + 1,
  }
}

