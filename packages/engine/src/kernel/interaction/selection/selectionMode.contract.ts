/**
 * Declares the selection interaction mode for hit-result interpretation.
 */
export type EngineSelectionMode =
  /** Single selection replaces the current set with the top hit only. */
  | "single"
  /** Additive selection adds hits to the current set (Shift+click). */
  | "additive"
  /** Subtractive selection removes hits from the current set (Ctrl+click toggle). */
  | "subtractive"
  /** Box/marquee selection adds all enclosed hits to the set. */
  | "box"
  /** Lasso selection adds all freeform-enclosed hits to the set. */
  | "lasso";

/**
 * Declares the selection layer filter for hit-target classification.
 * Used to restrict selection to specific node categories.
 */
export type EngineSelectionLayer =
  /** Standard mesh geometry nodes. */
  | "mesh"
  /** Editor helper objects (grid, axis, bounding box). */
  | "helper"
  /** Transform gizmo handles (translate/rotate/scale axes). */
  | "gizmo"
  /** Overlay annotations and measurement tools. */
  | "overlay"
  /** All layers; no filtering applied. */
  | "all";

/**
 * Declares one selection filter contract for layer-scoped hit resolution.
 */
export interface EngineSelectionFilter {
  /** Layers to include in hit-test results. */
  layers: readonly EngineSelectionLayer[];
  /** Whether hidden nodes should be excluded from selection. */
  excludeHidden: boolean;
  /** Whether locked nodes should be excluded from selection. */
  excludeLocked: boolean;
}

/**
 * Declares a selection hit produced by the hit-test pipeline and
 * consumed by the selection state machine.
 */
export interface EngineSelectionHit {
  /** Stable node id from the hit-test result. */
  id: string;
  /** Selection layer classification for the hit node. */
  layer: EngineSelectionLayer;
  /** Whether the node is currently hidden. */
  hidden: boolean;
  /** Whether the node is currently locked. */
  locked: boolean;
}

/**
 * Declares the selection change event emitted when the selected set mutates.
 */
export interface EngineSelectionChangeEvent {
  /** Node ids added to the selection in this change. */
  added: readonly string[];
  /** Node ids removed from the selection in this change. */
  removed: readonly string[];
  /** Full selected set after the change. */
  selected: readonly string[];
}

/**
 * Declares the selection state machine contract for managing the selected node set.
 */
export interface EngineSelectionState {
  /** Returns the current set of selected node ids in stable order. */
  getSelectedIds(): readonly string[];
  /** Applies one hit set to the selection state using the given mode and filter. */
  applySelection(
    hits: readonly EngineSelectionHit[],
    mode: EngineSelectionMode,
    filter: EngineSelectionFilter,
  ): EngineSelectionChangeEvent;
  /** Clears the selection and returns the change event. */
  clearSelection(): EngineSelectionChangeEvent;
  /** Replaces the selection with one explicit id set (bypasses mode/filter). */
  setSelection(ids: readonly string[]): EngineSelectionChangeEvent;
  /** Returns whether one node id is currently selected. */
  isSelected(id: string): boolean;
}
