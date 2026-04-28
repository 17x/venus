import type {Point2D} from '@venus/lib'

/**
 * Stores drag threshold and delta state for current interaction.
 */
export interface DragRuntime {
  /** Indicates whether drag session is active. */
  active: boolean
  /** Indicates whether drag has started this frame. */
  started: boolean
  /** Stores drag start pointer in screen space. */
  startScreen: Point2D
  /** Stores current drag pointer in screen space. */
  currentScreen: Point2D
  /** Stores drag delta in screen space. */
  deltaScreen: Point2D
  /** Stores drag start pointer in world space when available. */
  startWorld?: Point2D
  /** Stores current drag pointer in world space when available. */
  currentWorld?: Point2D
  /** Stores drag delta in world space when available. */
  deltaWorld?: Point2D
  /** Stores threshold in screen pixels used to mark started=true. */
  thresholdPx: number
  /** Indicates whether pointer movement crossed threshold. */
  hasPassedThreshold: boolean
}

/**
 * Creates initial drag runtime at a start pointer location.
 */
export function createDragRuntime(input: {
  /** Stores drag start pointer in screen space. */
  startScreen: Point2D
  /** Stores optional drag start pointer in world space. */
  startWorld?: Point2D
  /** Stores threshold used by caller policy. */
  thresholdPx: number
}): DragRuntime {
  return {
    active: true,
    started: false,
    startScreen: input.startScreen,
    currentScreen: input.startScreen,
    deltaScreen: {x: 0, y: 0},
    startWorld: input.startWorld,
    currentWorld: input.startWorld,
    deltaWorld: input.startWorld ? {x: 0, y: 0} : undefined,
    thresholdPx: input.thresholdPx,
    hasPassedThreshold: false,
  }
}

