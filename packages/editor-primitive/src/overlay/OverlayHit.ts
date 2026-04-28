import type {Point2D} from '@venus/lib'

/**
 * Defines generic overlay hit result contract.
 */
export interface OverlayHit<TAction = unknown> {
  /** Stores hit overlay node id. */
  overlayId: string
  /** Stores pointer location used for hit test in screen space. */
  screenPoint: Point2D
  /** Stores optional hit distance in pixels. */
  distancePx?: number
  /** Stores action payload copied from overlay node. */
  action?: TAction
}

