import type { EngineNodeId, EngineSceneSnapshot } from '../../scene/types/types.ts'
import type { EngineCanvasViewportState } from '../../interaction/viewport/viewport.ts'
import type { EngineFramePlan } from '../../scene/framePlan.ts'
import type { EngineVisibleSet } from '../../visibility/index.ts'
import { buildEngineFramePlan, resolveEngineFramePlanSignature } from './planning.ts'
import { resolveShortlistCandidateNodeIds } from './shortlist.ts'

/**
 * Mutable shortlist planner state tracked across frames.
 */
export interface EngineShortlistPlannerState {
  latestFramePlan: EngineFramePlan | null
  latestFramePlanSignature: string
  shortlistActive: boolean
  shortlistCandidateRatio: number
  shortlistAppliedCandidateCount: number
  shortlistPendingState: boolean | null
  shortlistPendingFrameCount: number
  shortlistToggleCount: number
  shortlistDebounceBlockedToggleCount: number
  shortlistEnterRatioThreshold: number
  shortlistLeaveRatioThreshold: number
}

/**
 * Constants controlling shortlist activation hysteresis and stability.
 */
export interface EngineShortlistPlannerThresholds {
  ratioThreshold: number
  hysteresisRatio: number
  minSceneNodes: number
  stableFrameCount: number
}

/**
 * Resolves one frame of shortlist planning and candidate-id wiring.
 * @param options Shortlist planning dependencies and mutable state.
 * @returns Updated shortlist planner state and frame-plan candidate payload.
 */
export function resolveEngineShortlistFramePlanning(options: {
  enabled: boolean
  scene: EngineSceneSnapshot
  viewport: EngineCanvasViewportState
  framePlanPadding: number
  thresholds: EngineShortlistPlannerThresholds
  state: EngineShortlistPlannerState
  protectedNodeIds?: readonly EngineNodeId[]
  queryCandidates: (bounds: {x: number; y: number; width: number; height: number}) => EngineNodeId[]
  resolveVisibleSet: (bounds: {x: number; y: number; width: number; height: number}) => EngineVisibleSet
}) {
  if (!options.enabled) {
    return {
      ...options.state,
      shortlistActive: false,
      shortlistCandidateRatio: 1,
      shortlistAppliedCandidateCount: 0,
      shortlistPendingState: null,
      shortlistPendingFrameCount: 0,
      shortlistToggleCount: 0,
      shortlistDebounceBlockedToggleCount: 0,
      framePlanCandidateIds: undefined as readonly EngineNodeId[] | undefined,
      framePlanVersion: undefined as number | undefined,
    }
  }

  const framePlanSignature = resolveEngineFramePlanSignature(options.scene, options.viewport)
  let latestFramePlan = options.state.latestFramePlan
  let latestFramePlanSignature = options.state.latestFramePlanSignature

  if (!latestFramePlan || latestFramePlanSignature !== framePlanSignature) {
    latestFramePlan = buildEngineFramePlan(
      options.scene,
      options.viewport,
      options.queryCandidates,
      options.framePlanPadding,
      {
        resolveVisibleSet: (bounds) => options.resolveVisibleSet(bounds),
      },
    )
    latestFramePlanSignature = framePlanSignature
  }

  const candidateRatio = latestFramePlan.sceneNodeCount > 0
    ? latestFramePlan.candidateCount / latestFramePlan.sceneNodeCount
    : 1
  const shortlistEnterRatioThreshold = options.thresholds.ratioThreshold - options.thresholds.hysteresisRatio
  const shortlistLeaveRatioThreshold = options.thresholds.ratioThreshold + options.thresholds.hysteresisRatio
  const canUseShortlist =
    latestFramePlan.sceneNodeCount >= options.thresholds.minSceneNodes &&
    latestFramePlan.candidateCount > 0

  const resolveTargetShortlistState = () => {
    if (!canUseShortlist) {
      return false
    }

    if (options.state.shortlistActive) {
      return candidateRatio <= shortlistLeaveRatioThreshold
    }

    return candidateRatio <= shortlistEnterRatioThreshold
  }

  const targetShortlistState = resolveTargetShortlistState()
  let shortlistActive = options.state.shortlistActive
  let shortlistPendingState = options.state.shortlistPendingState
  let shortlistPendingFrameCount = options.state.shortlistPendingFrameCount
  let shortlistToggleCount = options.state.shortlistToggleCount
  let shortlistDebounceBlockedToggleCount = options.state.shortlistDebounceBlockedToggleCount

  if (!canUseShortlist) {
    shortlistActive = false
    shortlistPendingState = null
    shortlistPendingFrameCount = 0
  } else if (targetShortlistState === shortlistActive) {
    if (shortlistPendingState !== null && shortlistPendingFrameCount > 0) {
      shortlistDebounceBlockedToggleCount += 1
    }
    shortlistPendingState = null
    shortlistPendingFrameCount = 0
  } else {
    if (shortlistPendingState !== targetShortlistState) {
      shortlistPendingState = targetShortlistState
      shortlistPendingFrameCount = 1
    } else {
      shortlistPendingFrameCount += 1
    }

    if (shortlistPendingFrameCount >= options.thresholds.stableFrameCount) {
      shortlistActive = targetShortlistState
      shortlistToggleCount += 1
      shortlistPendingState = null
      shortlistPendingFrameCount = 0
    }
  }

  const framePlanCandidateIds = shortlistActive
    ? resolveShortlistCandidateNodeIds(options.scene, latestFramePlan, options.protectedNodeIds)
    : undefined

  return {
    ...options.state,
    latestFramePlan,
    latestFramePlanSignature,
    shortlistActive,
    shortlistCandidateRatio: candidateRatio,
    shortlistAppliedCandidateCount: framePlanCandidateIds?.length ?? 0,
    shortlistPendingState,
    shortlistPendingFrameCount,
    shortlistToggleCount,
    shortlistDebounceBlockedToggleCount,
    shortlistEnterRatioThreshold,
    shortlistLeaveRatioThreshold,
    framePlanCandidateIds,
    framePlanVersion: latestFramePlan.planVersion,
  }
}
