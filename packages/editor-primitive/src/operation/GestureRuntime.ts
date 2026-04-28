import type {Point2D} from '@venus/lib'

/**
 * Defines normalized gesture type names tracked by the interaction runtime.
 */
export type GestureRuntimeType = 'wheel-zoom' | 'pinch-zoom' | 'pan' | 'drag' | 'none'

/**
 * Stores transient high-level gesture state.
 */
export interface GestureRuntime {
  /** Stores current gesture type. */
  type?: GestureRuntimeType
  /** Indicates whether gesture is currently active. */
  active: boolean
  /** Stores estimated gesture velocity when available. */
  velocity?: Point2D
  /** Stores zoom scale delta for pinch/wheel gestures when available. */
  scaleDelta?: number
  /** Stores gesture center in screen space when available. */
  centerScreen?: Point2D
  /** Stores gesture start timestamp when available. */
  startedAt?: number
  /** Stores last update timestamp when available. */
  updatedAt?: number
}

/**
 * Creates default inactive gesture runtime snapshot.
 */
export function createGestureRuntime(): GestureRuntime {
  return {
    type: 'none',
    active: false,
  }
}

