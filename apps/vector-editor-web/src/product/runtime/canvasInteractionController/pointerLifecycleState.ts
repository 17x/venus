/**
 * Declares pointer lifecycle phases tracked by canvas interaction controller.
 */
export type PointerLifecyclePhase = 'idle' | 'pressed'

/**
 * Declares input lifecycle event names consumed by lifecycle transition helper.
 */
export type PointerLifecycleEvent =
  | 'input.pointer.down'
  | 'input.pointer.move'
  | 'input.pointer.up'
  | 'input.pointer.leave'

/**
 * Declares one pointer lifecycle transition result.
 */
export interface PointerLifecycleTransition {
  /** Stores next lifecycle phase after applying one event. */
  next: PointerLifecyclePhase
  /** Stores whether the event is valid for current phase. */
  accepted: boolean
}

/**
 * Resolves next pointer lifecycle phase from current phase and one event.
 * @param current Current pointer lifecycle phase.
 * @param event Incoming lifecycle event.
 */
export function resolvePointerLifecycleTransition(
  current: PointerLifecyclePhase,
  event: PointerLifecycleEvent,
): PointerLifecycleTransition {
  if (event === 'input.pointer.move') {
    return {next: current, accepted: true}
  }

  if (event === 'input.pointer.down') {
    if (current === 'pressed') {
      return {next: current, accepted: false}
    }
    return {next: 'pressed', accepted: true}
  }

  if (event === 'input.pointer.up') {
    if (current === 'idle') {
      return {next: current, accepted: false}
    }
    return {next: 'idle', accepted: true}
  }

  if (event === 'input.pointer.leave') {
    if (current === 'idle') {
      return {next: current, accepted: false}
    }
    return {next: 'idle', accepted: true}
  }

  return {next: current, accepted: false}
}