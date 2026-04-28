import type {Point2D} from '@venus/lib'
import type {InteractionTarget} from './InteractionTarget.ts'

/**
 * Defines the full multi-hit target stack resolved for one pointer sample.
 */
export interface TargetStack {
  /** Stores pointer location used to resolve the hit stack. */
  pointer: Point2D
  /** Stores all resolved targets ordered by descending priority. */
  targets: InteractionTarget[]
  /** Stores primary target selected from the stack. */
  primary: InteractionTarget
}

/**
 * Picks primary target from ordered candidates, falling back to explicit empty target.
 */
export function pickPrimaryTarget(targets: InteractionTarget[]): InteractionTarget {
  return targets[0] ?? {type: 'empty'}
}

/**
 * Creates a stable target stack snapshot from ordered candidates.
 */
export function createTargetStack(pointer: Point2D, targets: InteractionTarget[]): TargetStack {
  return {
    pointer,
    targets,
    primary: pickPrimaryTarget(targets),
  }
}

/**
 * Resolves a target stack from pointer position and ordered targets.
 */
export function resolveTargetStack(pointer: Point2D, targets: InteractionTarget[]): TargetStack {
  return createTargetStack(pointer, targets)
}

/**
 * Picks next target in stack order so callers can implement piercing selection cycling.
 */
export function pickNextTarget(
  stack: TargetStack,
  current: InteractionTarget | null,
): InteractionTarget {
  if (stack.targets.length === 0) {
    return {type: 'empty'}
  }

  if (!current) {
    return stack.primary
  }

  const index = stack.targets.findIndex((candidate) => isSameTarget(candidate, current))

  // Restart from primary target when the current target is not in the stack.
  if (index < 0) {
    return stack.primary
  }

  const nextIndex = (index + 1) % stack.targets.length
  return stack.targets[nextIndex] ?? stack.primary
}

/**
 * Compares two interaction targets by structural identity.
 */
function isSameTarget(left: InteractionTarget, right: InteractionTarget): boolean {
  if (left.type !== right.type) {
    return false
  }

  if (left.type === 'viewport' || left.type === 'empty') {
    return true
  }

  if (left.type === 'scene-node' && right.type === 'scene-node') {
    return left.id === right.id
  }

  if (left.type === 'overlay-bounds' && right.type === 'overlay-bounds') {
    return left.id === right.id
  }

  if (left.type === 'overlay-handle' && right.type === 'overlay-handle') {
    return left.id === right.id && left.handle === right.handle
  }

  return false
}
