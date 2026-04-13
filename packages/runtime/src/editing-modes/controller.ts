export type RuntimeEditingMode =
  | 'idle'
  | 'selecting'
  | 'marqueeSelecting'
  | 'dragging'
  | 'resizing'
  | 'rotating'
  | 'textEditing'
  | 'pathEditing'
  | 'directSelecting'
  | 'panning'
  | 'zooming'
  | 'isolatedGroupEditing'
  | 'insertingShape'
  | 'drawingPath'
  | 'drawingPencil'

export interface RuntimeEditingModeTransition {
  readonly to: RuntimeEditingMode
  readonly reason?: string
  readonly metadata?: Record<string, unknown>
}

export interface RuntimeEditingModeListener {
  onTransition?(payload: {
    from: RuntimeEditingMode
    to: RuntimeEditingMode
    reason?: string
    metadata?: Record<string, unknown>
  }): void
}

export interface RuntimeEditingModeController {
  getCurrentMode(): RuntimeEditingMode
  getLastTransitionReason(): string | null
  transition(payload: RuntimeEditingModeTransition): void
  onTransition(listener: RuntimeEditingModeListener): () => void
}

export function createRuntimeEditingModeController(
  initialMode: RuntimeEditingMode = 'idle',
): RuntimeEditingModeController {
  let currentMode: RuntimeEditingMode = initialMode
  let lastReason: string | null = null
  const listeners = new Set<RuntimeEditingModeListener>()

  return {
    getCurrentMode() {
      return currentMode
    },
    getLastTransitionReason() {
      return lastReason
    },
    transition(payload) {
      if (payload.to === currentMode && !payload.reason && !payload.metadata) {
        return
      }

      const from = currentMode
      currentMode = payload.to
      lastReason = payload.reason ?? null

      for (const listener of listeners) {
        listener.onTransition?.({
          from,
          to: payload.to,
          reason: payload.reason,
          metadata: payload.metadata,
        })
      }
    },
    onTransition(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
