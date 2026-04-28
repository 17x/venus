import type {Point2D} from '@venus/lib'
import type {CanvasViewportState} from '@venus/lib/viewport'

/**
 * Stores viewport interaction runtime state layered above base viewport matrices.
 */
export interface ViewportInteractionRuntime {
  /** Stores current camera/viewport state consumed by renderer adapters. */
  camera: CanvasViewportState
  /** Indicates whether panning interaction is active. */
  isPanning: boolean
  /** Indicates whether zoom interaction is active. */
  isZooming: boolean
  /** Stores zoom velocity estimate for inertial/diagnostic policy. */
  zoomVelocity?: number
  /** Stores pan velocity estimate in screen space. */
  panVelocity?: Point2D
  /** Stores last zoom center in screen space. */
  lastZoomCenter?: Point2D
  /** Stores last pan delta in screen space. */
  lastPanDelta?: Point2D
}

/**
 * Creates viewport interaction runtime from camera state.
 */
export function createViewportInteractionRuntime(camera: CanvasViewportState): ViewportInteractionRuntime {
  return {
    camera,
    isPanning: false,
    isZooming: false,
  }
}

