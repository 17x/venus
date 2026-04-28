import type {Point2D} from '@venus/lib'

/**
 * Defines normalized pointer interaction state shared by editor tools.
 */
export interface PointerRuntime {
  /** Stores active pointer id when one is captured. */
  pointerId?: number
  /** Stores the latest pointer location in screen space. */
  screen: Point2D
  /** Stores the previous pointer location in screen space. */
  previousScreen: Point2D
  /** Stores the screen-space movement since the previous event. */
  deltaScreen: Point2D
  /** Stores the latest world-space pointer location when available. */
  world?: Point2D
  /** Stores the previous world-space pointer location when available. */
  previousWorld?: Point2D
  /** Stores world-space movement since the previous event when available. */
  deltaWorld?: Point2D
  /** Stores the current pointer button bitmask. */
  buttons: number
  /** Stores the triggering button for pointerdown/up transitions. */
  button?: number
  /** Indicates whether the active pointer is currently pressed. */
  isDown: boolean
  /** Indicates whether pointer movement has crossed drag threshold. */
  isDragging: boolean
  /** Stores screen-space pointer location at pointerdown. */
  downScreen?: Point2D
  /** Stores world-space pointer location at pointerdown when available. */
  downWorld?: Point2D
  /** Stores drag distance from downScreen to current screen location. */
  dragDistancePx: number
  /** Stores timestamp when drag first crossed threshold. */
  dragStartedAt?: number
  /** Stores screen-space velocity in px/ms when timestamps are available. */
  velocityPxPerMs?: Point2D
}

/**
 * Creates initial pointer runtime state from one measured pointer position.
 */
export function createPointerRuntime(screen: Point2D, world?: Point2D): PointerRuntime {
  return {
    screen,
    previousScreen: screen,
    deltaScreen: {x: 0, y: 0},
    world,
    previousWorld: world,
    deltaWorld: world ? {x: 0, y: 0} : undefined,
    buttons: 0,
    isDown: false,
    isDragging: false,
    dragDistancePx: 0,
  }
}

