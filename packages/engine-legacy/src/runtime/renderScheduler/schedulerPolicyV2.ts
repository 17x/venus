// Module responsibility: normalize scheduler admission policy with single-flight and interactive throttle rules.
// Non-responsibility: render task execution.

import type { SchedulerMode } from '@venus/lib/scheduler'

/**
 * Describes scheduler policy input snapshot.
 */
export interface EngineSchedulerPolicyInput {
  /** Requested scheduling mode. */
  mode: SchedulerMode
  /** Whether one render execution is currently in flight. */
  inFlight: boolean
  /** Whether one frame callback is currently pending. */
  pendingFrame: boolean
}

/**
 * Describes scheduler policy decision output.
 */
export interface EngineSchedulerPolicyDecision {
  /** Whether request should be accepted and scheduled. */
  accepted: boolean
  /** Whether incoming request should be coalesced into pending work. */
  coalesced: boolean
  /** Normalized effective mode used for queue admission. */
  effectiveMode: SchedulerMode
}

/**
 * Intent: resolve scheduler admission with anti-storm single-flight semantics.
 * @param input Scheduler policy input snapshot.
 * @returns Scheduler policy decision.
 */
export function resolveEngineSchedulerPolicyV2(
  input: EngineSchedulerPolicyInput,
): EngineSchedulerPolicyDecision {
  if (input.inFlight || input.pendingFrame) {
    return {
      accepted: false,
      coalesced: true,
      effectiveMode: input.mode,
    }
  }

  return {
    accepted: true,
    coalesced: false,
    effectiveMode: input.mode,
  }
}
