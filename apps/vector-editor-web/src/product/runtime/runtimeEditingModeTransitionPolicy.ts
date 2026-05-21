import type {
  RuntimeEditingMode,
  RuntimeEditingModeController,
  RuntimeEditingModeTransition,
} from '../../runtime/editing-modes/controller.ts'

/**
 * Declares pointer-down target set allowed by product pointer interaction policy.
 */
const POINTER_DOWN_ALLOWED_TARGETS = new Set<RuntimeEditingMode>([
  'zooming',
  'selecting',
  'directSelecting',
  'dragging',
  'insertingShape',
  'drawingPath',
  'drawingPencil',
])

/**
 * Declares one runtime editing-mode transition validation result.
 */
export interface RuntimeEditingModeTransitionGuardResult {
  /** Stores whether transition is accepted by product transition matrix. */
  accepted: boolean
  /** Stores optional reject reason when transition is denied. */
  rejectReason?: string
}

/**
 * Resolves whether one runtime editing-mode transition is allowed by product matrix.
 * @param from Current editing mode before transition.
 * @param transition Requested transition payload.
 */
export function resolveRuntimeEditingModeTransitionGuard(
  _from: RuntimeEditingMode,
  transition: RuntimeEditingModeTransition,
): RuntimeEditingModeTransitionGuardResult {
  const reason = transition.reason ?? ''

  if (reason.startsWith('pointer-down:')) {
    if (!POINTER_DOWN_ALLOWED_TARGETS.has(transition.to)) {
      return {
        accepted: false,
        rejectReason: `pointer-down transition to ${transition.to} is not allowed`,
      }
    }
    return {accepted: true}
  }

  if (reason === 'pointer-up' || reason === 'pointer-leave') {
    if (transition.to !== 'idle') {
      return {
        accepted: false,
        rejectReason: `${reason} transition must target idle`,
      }
    }
    return {accepted: true}
  }

  if (reason === 'group-isolation:enter') {
    if (transition.to !== 'isolatedGroupEditing') {
      return {
        accepted: false,
        rejectReason: 'group isolation enter must target isolatedGroupEditing',
      }
    }
    return {accepted: true}
  }

  if (reason === 'group-isolation:exit') {
    if (transition.to !== 'selecting' && transition.to !== 'directSelecting') {
      return {
        accepted: false,
        rejectReason: 'group isolation exit must target selecting/directSelecting',
      }
    }
    return {accepted: true}
  }

  return {accepted: true}
}

/**
 * Applies one guarded editing-mode transition to runtime controller.
 * @param controller Editing-mode controller instance.
 * @param transition Requested transition payload.
 */
export function applyRuntimeEditingModeTransition(
  controller: RuntimeEditingModeController | null | undefined,
  transition: RuntimeEditingModeTransition,
): RuntimeEditingModeTransitionGuardResult {
  if (!controller) {
    return {
      accepted: false,
      rejectReason: 'editing mode controller is unavailable',
    }
  }

  const from = controller.getCurrentMode()
  const guard = resolveRuntimeEditingModeTransitionGuard(from, transition)
  if (!guard.accepted) {
    return guard
  }

  controller.transition(transition)
  return {accepted: true}
}