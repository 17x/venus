import type {
  EngineSelectionChangeEvent,
  EngineSelectionFilter,
  EngineSelectionHit,
  EngineSelectionMode,
  EngineSelectionState,
} from "./selectionMode.contract";

/**
 * Creates a selection state machine with mode-aware mutation semantics.
 * Maintains a deterministic sorted set of selected node ids.
 */
export function createEngineSelectionState(): EngineSelectionState {
  let selectedIds: string[] = [];

  /**
   * Filters hits through layer and visibility policy before selection application.
   * @param hits Raw selection hits from the hit-test pipeline.
   * @param filter Layer and visibility filter to apply.
   */
  function filterHits(
    hits: readonly EngineSelectionHit[],
    filter: EngineSelectionFilter,
  ): readonly string[] {
    const layerSet = new Set(filter.layers);
    const acceptAll = layerSet.has("all");

    return hits
      .filter((hit) => {
        if (filter.excludeHidden && hit.hidden) {
          return false;
        }
        if (filter.excludeLocked && hit.locked) {
          return false;
        }
        if (!acceptAll && !layerSet.has(hit.layer)) {
          return false;
        }
        return true;
      })
      .map((hit) => hit.id);
  }

  /**
    * Applies one set of hit ids to the selection using the given mode.
    * @param hits Raw hit list ordered by hit priority (nearest first).
   * @param mode Selection interaction mode.
    * @param filter Layer and visibility filter to apply before mode transition.
   */
  function applySelection(
    hits: readonly EngineSelectionHit[],
    mode: EngineSelectionMode,
    filter: EngineSelectionFilter,
  ): EngineSelectionChangeEvent {
    const hitIds = filterHits(hits, filter);

    if (mode === "single") {
      // Single selection: replace entire set with top hit only.
      const topHit = hitIds.length > 0 ? [hitIds[0]] : [];
      return transitionTo(topHit);
    }

    if (mode === "additive") {
      // Additive: union current set with new hits.
      const nextSet = new Set(selectedIds);
      for (const id of hitIds) {
        nextSet.add(id);
      }
      return transitionTo([...nextSet].sort());
    }

    if (mode === "subtractive") {
      // Subtractive: toggle each hit - add if absent, remove if present.
      const nextSet = new Set(selectedIds);
      for (const id of hitIds) {
        if (nextSet.has(id)) {
          nextSet.delete(id);
        } else {
          nextSet.add(id);
        }
      }
      return transitionTo([...nextSet].sort());
    }

    if (mode === "box" || mode === "lasso") {
      // Box/lasso: additive by default (shift-drag for subtractive handled by caller).
      const nextSet = new Set(selectedIds);
      for (const id of hitIds) {
        nextSet.add(id);
      }
      return transitionTo([...nextSet].sort());
    }

    return { added: [], removed: [], selected: selectedIds };
  }

  /**
   * Transitions the selected set to a new id list and computes the delta.
   * @param nextIds Sorted array of next selected ids.
   */
  function transitionTo(nextIds: readonly string[]): EngineSelectionChangeEvent {
    const previousSet = new Set(selectedIds);
    const nextSet = new Set(nextIds);

    const added: string[] = [];
    const removed: string[] = [];

    for (const id of nextIds) {
      if (!previousSet.has(id)) {
        added.push(id);
      }
    }
    for (const id of selectedIds) {
      if (!nextSet.has(id)) {
        removed.push(id);
      }
    }

    selectedIds = [...nextIds].sort();
    return {
      added: added.sort(),
      removed: removed.sort(),
      selected: selectedIds,
    };
  }

  return {
    getSelectedIds: () => selectedIds,
    applySelection,
    clearSelection: () => transitionTo([]),
    setSelection: (ids) => transitionTo(ids),
    isSelected: (id) => selectedIds.includes(id),
  };
}
