import {resolveDragDistance} from '../pointer/dragThreshold.ts'
import type {PointerRuntime} from '../pointer/PointerRuntime.ts'
import type {GesturePolicy} from './GesturePolicy.ts'

/**
 * Defines high-level gesture output intent values used by operation routing.
 */
export type GestureIntent =
  | {type: 'click'}
  | {type: 'double-click'}
  | {type: 'drag-start'}
  | {type: 'drag-move'}
  | {type: 'drag-end'}
  | {type: 'wheel'}
  | {type: 'pinch'}
  | {type: 'none'}

/**
 * Defines pointer lifecycle event names consumed by gesture resolution.
 */
export type PointerLifecycleEvent = 'pointerdown' | 'pointermove' | 'pointerup'

/**
 * Defines inputs required to resolve gesture intent from pointer runtime transitions.
 */
export interface ResolveGestureIntentInput {
  /** Stores previous pointer runtime snapshot. */
  previous: PointerRuntime
  /** Stores next pointer runtime snapshot. */
  next: PointerRuntime
  /** Stores pointer lifecycle transition for the new event. */
  eventType: PointerLifecycleEvent
  /** Stores recognition policy thresholds. */
  policy: GesturePolicy
  /** Stores previous click timestamp for double-click recognition. */
  lastClickAt?: number
  /** Stores current event timestamp for temporal thresholds. */
  timeStamp?: number
}

/**
 * Resolves high-level gesture intent from pointer runtime transitions.
 */
export function resolveGestureIntent(input: ResolveGestureIntentInput): GestureIntent {
  if (input.eventType === 'pointerdown') {
    return {type: 'none'}
  }

  if (input.eventType === 'pointermove') {
    // Detect drag start exactly once when threshold is crossed in this move.
    if (!input.previous.isDragging && input.next.isDragging) {
      return {type: 'drag-start'}
    }

    if (input.next.isDragging) {
      return {type: 'drag-move'}
    }

    return {type: 'none'}
  }

  if (input.previous.isDragging || input.next.isDragging) {
    return {type: 'drag-end'}
  }

  // Keep pointer-up click detection bounded by movement tolerance.
  const downScreen = input.next.downScreen
  const travel = downScreen ? resolveDragDistance(downScreen, input.next.screen) : 0
  if (travel > input.policy.clickTolerance) {
    return {type: 'none'}
  }

  // Emit double-click only when caller provides both timestamps in policy window.
  if (
    typeof input.timeStamp === 'number' &&
    typeof input.lastClickAt === 'number' &&
    input.timeStamp - input.lastClickAt <= input.policy.doubleClickIntervalMs
  ) {
    return {type: 'double-click'}
  }

  return {type: 'click'}
}

