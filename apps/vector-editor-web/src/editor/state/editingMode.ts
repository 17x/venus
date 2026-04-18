// --- Editing mode definitions ---

/**
 * Editing modes represent the current high-level interaction state of the editor.
 * The product layer uses this to gate tool behavior, panel visibility, shortcut
 * routing, and overlay rendering.
 */
export type EditingMode =
  | 'idle'
  | 'selecting'
  | 'marquee-selecting'
  | 'dragging'
  | 'resizing'
  | 'rotating'
  | 'drawing'
  | 'text-editing'
  | 'path-editing'
  | 'group-isolation'

/** Transition request: the product layer asks the controller to enter a mode */
export interface EditingModeTransition {
  readonly target: EditingMode
  /** Optional context carried into the mode (e.g. isolated group id) */
  readonly context?: Record<string, unknown>
}

/** Lifecycle callbacks for product-layer side effects on mode changes */
export interface EditingModeListener {
  onEnter?(mode: EditingMode, context?: Record<string, unknown>): void
  onExit?(mode: EditingMode): void
}

// --- Controller ---

export interface EditingModeController {
  readonly current: EditingMode
  readonly context: Record<string, unknown> | undefined
  transition(next: EditingModeTransition): void
  addListener(listener: EditingModeListener): () => void
  /** Convenience: returns true if the mode allows canvas panning */
  allowsPan(): boolean
  /** Convenience: returns true if keyboard shortcuts should be suppressed (e.g. text editing) */
  suppressesShortcuts(): boolean
}

export function createEditingModeController(): EditingModeController {
  let currentMode: EditingMode = 'idle'
  let currentContext: Record<string, unknown> | undefined
  const listeners = new Set<EditingModeListener>()

  // Modes where keyboard shortcuts should be suppressed
  const shortcutSuppressed: ReadonlySet<EditingMode> = new Set([
    'text-editing',
    'path-editing',
  ])

  // Modes where canvas panning via gestures is allowed
  const panAllowed: ReadonlySet<EditingMode> = new Set([
    'idle',
    'selecting',
  ])

  function transition(next: EditingModeTransition) {
    const prev = currentMode
    if (prev === next.target && !next.context) return

    // Notify exit
    for (const l of listeners) l.onExit?.(prev)

    currentMode = next.target
    currentContext = next.context

    // Notify enter
    for (const l of listeners) l.onEnter?.(next.target, next.context)
  }

  return {
    get current() { return currentMode },
    get context() { return currentContext },
    transition,
    addListener(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    allowsPan() {
      return panAllowed.has(currentMode)
    },
    suppressesShortcuts() {
      return shortcutSuppressed.has(currentMode)
    },
  }
}
