/**
 * History module API — the typed surface returned by the history module's
 * install callback.  Venus delegates undo/redo/canUndo/canRedo/clearHistory
 * to this API when the module is installed.
 */
export interface VenusHistoryApi {
  /** Applies the previous document snapshot. Returns true on success. */
  undo(): boolean
  /** Reapplies the next document snapshot. Returns true on success. */
  redo(): boolean
  /** Whether an undo snapshot is available. */
  canUndo(): boolean
  /** Whether a redo snapshot is available. */
  canRedo(): boolean
  /** Clears undo and redo stacks without modifying the document. */
  clear(): void
}
