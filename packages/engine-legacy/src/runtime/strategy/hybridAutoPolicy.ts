// Module responsibility: resolve hybrid profile tendency with hysteresis and cooldown.
// Non-responsibility: budget shaping and hard guard enforcement.

import type { EngineProfileName } from '../../settings/index.ts'
import type { EngineRenderStrategyPhase } from '../createEngine/strategy/strategy.ts'

/**
 * Describes one hybrid auto-policy state snapshot.
 */
export interface EngineHybridAutoPolicyState {
  /** Current effective profile tendency for hybrid mode. */
  profile: Exclude<EngineProfileName, 'hybrid'>
  /** Last frame timestamp in ms when profile tendency changed. */
  lastSwitchAtMs: number
  /** Pending target profile waiting for hysteresis confirmation. */
  pendingProfile: Exclude<EngineProfileName, 'hybrid'> | null
  /** Number of consecutive frames for pending target profile. */
  pendingFrameCount: number
}

/**
 * Describes one hybrid auto-policy decision.
 */
export interface EngineHybridAutoPolicyDecision {
  /** Next hybrid state snapshot. */
  state: EngineHybridAutoPolicyState
  /** Effective profile tendency consumed by profile pack. */
  effectiveProfile: Exclude<EngineProfileName, 'hybrid'>
  /** Whether profile tendency switched in this frame. */
  switched: boolean
  /** Decision trace for diagnostics panel payload. */
  trace: string
}

const HYBRID_COOLDOWN_MS = 300
const HYBRID_HYSTERESIS_FRAMES = 3

/**
 * Intent: map runtime phase to one hybrid target profile tendency.
 * @param phase Current strategy phase.
 * @returns Target profile tendency.
 */
function resolveHybridTargetProfile(phase: EngineRenderStrategyPhase): Exclude<EngineProfileName, 'hybrid'> {
  if (phase === 'pan' || phase === 'zoom') {
    return 'editor'
  }

  if (phase === 'camera') {
    return 'game'
  }

  return 'animation'
}

/**
 * Intent: resolve hybrid effective profile with cooldown and hysteresis.
 * @param state Previous hybrid auto-policy state.
 * @param phase Current strategy phase.
 * @param nowMs Current frame timestamp in ms.
 * @returns Hybrid policy decision snapshot.
 */
export function resolveEngineHybridAutoPolicy(
  state: EngineHybridAutoPolicyState,
  phase: EngineRenderStrategyPhase,
  nowMs: number,
): EngineHybridAutoPolicyDecision {
  const targetProfile = resolveHybridTargetProfile(phase)

  if (targetProfile === state.profile) {
    return {
      state: {
        ...state,
        pendingProfile: null,
        pendingFrameCount: 0,
      },
      effectiveProfile: state.profile,
      switched: false,
      trace: `hold:${state.profile}`,
    }
  }

  if (nowMs - state.lastSwitchAtMs < HYBRID_COOLDOWN_MS) {
    return {
      state: {
        ...state,
        pendingProfile: null,
        pendingFrameCount: 0,
      },
      effectiveProfile: state.profile,
      switched: false,
      trace: `cooldown:${state.profile}`,
    }
  }

  const pendingProfile = state.pendingProfile === targetProfile
    ? state.pendingProfile
    : targetProfile
  const pendingFrameCount = state.pendingProfile === targetProfile
    ? state.pendingFrameCount + 1
    : 1

  if (pendingFrameCount < HYBRID_HYSTERESIS_FRAMES) {
    return {
      state: {
        ...state,
        pendingProfile,
        pendingFrameCount,
      },
      effectiveProfile: state.profile,
      switched: false,
      trace: `pending:${targetProfile}:${pendingFrameCount}`,
    }
  }

  return {
    state: {
      profile: targetProfile,
      lastSwitchAtMs: nowMs,
      pendingProfile: null,
      pendingFrameCount: 0,
    },
    effectiveProfile: targetProfile,
    switched: true,
    trace: `switch:${state.profile}->${targetProfile}`,
  }
}
