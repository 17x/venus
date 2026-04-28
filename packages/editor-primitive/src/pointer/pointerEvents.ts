import type {Point2D} from '@venus/lib'
import {hasPassedDragThreshold, resolveDragDistance, DEFAULT_DRAG_THRESHOLD_PX} from './dragThreshold.ts'
import type {PointerRuntime} from './PointerRuntime.ts'

/**
 * Defines the minimal pointer event contract consumed by pointer reducers.
 */
export interface PointerEventLike {
  /** Stores pointer id for multi-pointer filtering. */
  pointerId: number
  /** Stores active buttons bitmask. */
  buttons: number
  /** Stores triggering button when available. */
  button?: number
  /** Stores event timestamp in milliseconds. */
  timeStamp?: number
}

/**
 * Applies pointerdown transition and seeds drag baseline values.
 */
export function applyPointerDown(
  runtime: PointerRuntime,
  event: PointerEventLike,
  screen: Point2D,
  world?: Point2D,
): PointerRuntime {
  return {
    ...runtime,
    pointerId: event.pointerId,
    buttons: event.buttons,
    button: event.button,
    isDown: true,
    isDragging: false,
    previousScreen: screen,
    screen,
    deltaScreen: {x: 0, y: 0},
    previousWorld: world,
    world,
    deltaWorld: world ? {x: 0, y: 0} : undefined,
    downScreen: screen,
    downWorld: world,
    dragDistancePx: 0,
    dragStartedAt: undefined,
    velocityPxPerMs: {x: 0, y: 0},
  }
}

/**
 * Applies pointermove transition and resolves drag/velocity state.
 */
export function applyPointerMove(
  runtime: PointerRuntime,
  event: PointerEventLike,
  screen: Point2D,
  world?: Point2D,
  options?: {
    /** Stores drag threshold override used by callers with custom gesture policy. */
    dragThresholdPx?: number
    /** Stores previous event timestamp for velocity computation. */
    previousTimeStamp?: number
  },
): PointerRuntime {
  const deltaScreen = {
    x: screen.x - runtime.screen.x,
    y: screen.y - runtime.screen.y,
  }
  const deltaWorld = world && runtime.world
    ? {
      x: world.x - runtime.world.x,
      y: world.y - runtime.world.y,
    }
    : undefined

  const downScreen = runtime.downScreen ?? runtime.screen
  const dragDistancePx = runtime.isDown ? resolveDragDistance(downScreen, screen) : 0
  const dragThresholdPx = options?.dragThresholdPx ?? DEFAULT_DRAG_THRESHOLD_PX
  const crossedThreshold = runtime.isDown && hasPassedDragThreshold(dragDistancePx, dragThresholdPx)

  const previousTimeStamp = options?.previousTimeStamp
  const deltaMs =
    typeof previousTimeStamp === 'number' && typeof event.timeStamp === 'number'
      ? Math.max(1, event.timeStamp - previousTimeStamp)
      : null
  const velocityPxPerMs = deltaMs
    ? {
      x: deltaScreen.x / deltaMs,
      y: deltaScreen.y / deltaMs,
    }
    : runtime.velocityPxPerMs

  return {
    ...runtime,
    pointerId: event.pointerId,
    buttons: event.buttons,
    previousScreen: runtime.screen,
    screen,
    deltaScreen,
    previousWorld: runtime.world,
    world,
    deltaWorld,
    dragDistancePx,
    // Keep dragging sticky after threshold is crossed for stable downstream reducers.
    isDragging: runtime.isDragging || crossedThreshold,
    // Record first drag-start time only once to preserve gesture timing semantics.
    dragStartedAt:
      runtime.dragStartedAt ?? (crossedThreshold && typeof event.timeStamp === 'number' ? event.timeStamp : undefined),
    velocityPxPerMs,
  }
}

/**
 * Applies pointerup transition and clears active drag/capture values.
 */
export function applyPointerUp(
  runtime: PointerRuntime,
  event: PointerEventLike,
  screen: Point2D,
  world?: Point2D,
): PointerRuntime {
  return {
    ...runtime,
    pointerId: event.pointerId,
    buttons: event.buttons,
    button: event.button,
    isDown: false,
    isDragging: false,
    previousScreen: runtime.screen,
    screen,
    deltaScreen: {
      x: screen.x - runtime.screen.x,
      y: screen.y - runtime.screen.y,
    },
    previousWorld: runtime.world,
    world,
    deltaWorld: world && runtime.world
      ? {
        x: world.x - runtime.world.x,
        y: world.y - runtime.world.y,
      }
      : undefined,
    dragDistancePx: 0,
    dragStartedAt: undefined,
  }
}

