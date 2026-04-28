import type {Point2D} from '@venus/lib'
import type {ModifierState} from '../input/ModifierState.ts'

/**
 * Defines normalized wheel event consumed by interaction dispatch.
 */
export interface NormalizedWheelEvent {
  /** Stores horizontal wheel delta in source delta mode units. */
  deltaX: number
  /** Stores vertical wheel delta in source delta mode units. */
  deltaY: number
  /** Stores normalized delta mode. */
  deltaMode: 'pixel' | 'line' | 'page'
  /** Stores browser viewport coordinates. */
  client: Point2D
  /** Stores canvas-local coordinates. */
  canvas: Point2D
  /** Stores render screen coordinates. */
  screen: Point2D
  /** Stores world coordinates resolved by viewport adapter. */
  world: Point2D
  /** Stores normalized modifier snapshot. */
  modifiers: ModifierState
  /** Stores event timestamp in milliseconds. */
  timestamp: number
}

