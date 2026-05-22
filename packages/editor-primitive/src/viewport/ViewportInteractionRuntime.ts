import type {Point2D} from '@venus/lib'
import type {Mat3} from '@venus/lib/math'

/**
 * Declares viewport camera state consumed by interaction runtime adapters.
 */
export interface CanvasViewportState {
  /** Stores screen-to-world matrix used by hit-test projection. */
  inverseMatrix: Mat3
  /** Stores world-to-screen matrix used by renderer projection. */
  matrix: Mat3
  /** Stores x-axis viewport translation in screen space. */
  offsetX: number
  /** Stores y-axis viewport translation in screen space. */
  offsetY: number
  /** Stores viewport zoom scale. */
  scale: number
  /** Stores measured viewport width in pixels. */
  viewportWidth: number
  /** Stores measured viewport height in pixels. */
  viewportHeight: number
}

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

