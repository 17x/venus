/**
 * Stores pointer capture ownership state for interaction runtimes.
 */
export interface CaptureRuntime {
  /** Indicates whether pointer capture is currently active. */
  pointerCaptured: boolean
  /** Stores captured pointer id when capture is active. */
  pointerId?: number
  /** Stores logical owner label for diagnostics and release routing. */
  capturedBy?: 'canvas' | 'overlay' | 'tool' | 'operation' | string
  /** Indicates whether capture should auto-release on pointerup. */
  releaseOnPointerUp?: boolean
}

/**
 * Creates default inactive capture runtime state.
 */
export function createCaptureRuntime(): CaptureRuntime {
  return {
    pointerCaptured: false,
    pointerId: undefined,
    capturedBy: undefined,
    releaseOnPointerUp: true,
  }
}

