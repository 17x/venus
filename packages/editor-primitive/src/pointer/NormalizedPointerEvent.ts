import type {Point2D} from '@venus/lib'
import type {ModifierState} from '../input/ModifierState.ts'

/**
 * Defines canonical pointer types used by normalized pointer events.
 */
export type NormalizedPointerType = 'mouse' | 'pen' | 'touch'

/**
 * Defines normalized pointer event consumed by interaction runtime reducers.
 */
export interface NormalizedPointerEvent {
  /** Stores stable pointer identifier. */
  pointerId: number
  /** Stores pointer device type for tool policies. */
  pointerType: NormalizedPointerType
  /** Stores triggering button index. */
  button: number
  /** Stores active button bitmask. */
  buttons: number
  /** Stores browser viewport coordinates. */
  client: Point2D
  /** Stores canvas-local coordinates resolved by adapter. */
  canvas: Point2D
  /** Stores render-screen coordinates used by overlay hit tests. */
  screen: Point2D
  /** Stores world coordinates after viewport inverse transform. */
  world: Point2D
  /** Stores normalized modifier snapshot at event time. */
  modifiers: ModifierState
  /** Stores event timestamp in milliseconds. */
  timestamp: number
  /** Indicates whether this is the primary pointer stream. */
  isPrimary: boolean
  /** Stores pressure when supported by pointer source. */
  pressure?: number
  /** Stores IME composing flag for pointer-triggered context branches. */
  isComposing?: boolean
}

/**
 * Creates minimal normalized pointer event from adapter-provided point payloads.
 */
export function createNormalizedPointerEvent(
  event: Omit<NormalizedPointerEvent, 'pressure'> & {pressure?: number},
): NormalizedPointerEvent {
  return {
    ...event,
  }
}
