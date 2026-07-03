/**
 * Interaction module API — the typed surface returned by the interaction
 * module's install callback.  Covers selection state, selection commands,
 * and pointer-driven editing (snap, drag).
 */
export interface VenusInteractionApi {
  // ── Selection state ──────────────────────────────────────────────────

  /** Returns a read-only snapshot of the currently selected node ids. */
  readonly selection: ReadonlySet<string>

  /** Selects one or more node ids. Adds to the existing selection. */
  select(ids: string | readonly string[]): void

  /** Deselects one or more node ids. */
  deselect(ids: string | readonly string[]): void

  /** Selects all root-level document nodes. */
  selectAll(): void

  /** Clears the entire selection. */
  clearSelection(): void

  /** Returns whether a node id is currently selected. */
  isSelected(id: string): boolean

  // ── Selection events ─────────────────────────────────────────────────

  /**
   * Registers a callback that fires whenever the selection changes.
   * Returns an unsubscribe function.
   */
  onSelectionChange(handler: (selection: ReadonlySet<string>) => void): () => void
}
