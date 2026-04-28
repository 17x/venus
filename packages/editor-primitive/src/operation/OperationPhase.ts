import {resolveDragDistance} from '../pointer/dragThreshold.ts'
import type {ActiveOperation} from './ActiveOperation.ts'

/**
 * Defines explicit operation lifecycle phases for robust interaction routing.
 */
export type OperationPhase =
  | 'idle'
  | 'pending'
  | 'active'
  | 'committing'
  | 'cancelled'
  | 'completed'

/**
 * Resolves next phase from pointer updates and drag threshold policy.
 */
export function resolveOperationPhaseFromUpdate(
  currentPhase: OperationPhase,
  operation: ActiveOperation | null,
  dragThresholdPx: number,
): OperationPhase {
  if (!operation) {
    return 'idle'
  }

  if (currentPhase === 'cancelled' || currentPhase === 'completed' || currentPhase === 'committing') {
    return currentPhase
  }

  const dragDistance = resolveDragDistance(operation.startScreen, operation.currentScreen)

  // Keep operation pending until pointer travel passes configured threshold.
  if (dragDistance < dragThresholdPx) {
    return 'pending'
  }

  return 'active'
}

/**
 * Defines normalized pointer lifecycle phases used by operation transitions.
 */
export type OperationPointerPhase = 'pointer-down' | 'pointer-move' | 'pointer-up' | 'pointer-cancel'

/**
 * Transitions operation phase from one pointer lifecycle event.
 */
export function transitionOperationPhase(
  currentPhase: OperationPhase,
  pointerPhase: OperationPointerPhase,
  isDragging: boolean,
): OperationPhase {
  if (pointerPhase === 'pointer-down') {
    return 'pending'
  }

  if (pointerPhase === 'pointer-move') {
    if (currentPhase === 'pending' && isDragging) {
      return 'active'
    }
    return currentPhase
  }

  if (pointerPhase === 'pointer-up') {
    if (currentPhase === 'active' || currentPhase === 'pending' || currentPhase === 'committing') {
      return 'completed'
    }
    return 'idle'
  }

  return 'cancelled'
}
