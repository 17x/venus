export type RuntimeRenderPhase =
  | 'static'
  | 'pan'
  | 'zoom'
  | 'drag'
  | 'precision'
  | 'settled'

export interface ResolveRuntimeRenderPolicyInput {
  phase: RuntimeRenderPhase
  lodLevel: 0 | 1 | 2 | 3
  renderQuality?: 'full' | 'interactive'
  targetDpr?: number | 'auto'
}

export interface RuntimeRenderPolicy {
  quality: 'full' | 'interactive'
  dpr: number | 'auto'
  interactionActive: boolean
  overlayMode: 'full' | 'degraded'
}

export interface RuntimeDirtyRegionDiagnosticsPolicy {
  sceneDirtySkipForceRenderFrames: number
  dirtyBoundsSmallAreaPx2: number
  dirtyBoundsMediumAreaPx2: number
}

export interface RuntimeDirtyRegionRiskPolicy {
  watchSkipRateThreshold: number
  highSkipRateThreshold: number
  highForcedPerSecondThreshold: number
  prolongedHighRiskSecondsThreshold: number
  transitionRateWatchThreshold: number
}

export interface RuntimeDirtyRegionTrendPolicy {
  trendWindowFrames: number
  forcedSpikePerSecondThreshold: number
  skipSpikePerSecondThreshold: number
  riskScoreHighThreshold: number
}

export interface RuntimeDirtyRegionRiskScorePolicy {
  skipWeight: number
  forcedWeight: number
  streakWeight: number
  forcedRateScale: number
}

export const DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY: RuntimeDirtyRegionDiagnosticsPolicy = {
  sceneDirtySkipForceRenderFrames: 4,
  dirtyBoundsSmallAreaPx2: 16_000,
  dirtyBoundsMediumAreaPx2: 160_000,
}

export const DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY: RuntimeDirtyRegionRiskPolicy = {
  watchSkipRateThreshold: 65,
  highSkipRateThreshold: 85,
  highForcedPerSecondThreshold: 0.25,
  prolongedHighRiskSecondsThreshold: 8,
  transitionRateWatchThreshold: 5,
}

export const DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY: RuntimeDirtyRegionTrendPolicy = {
  trendWindowFrames: 90,
  forcedSpikePerSecondThreshold: 0.75,
  skipSpikePerSecondThreshold: 2,
  riskScoreHighThreshold: 75,
}

export const DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY: RuntimeDirtyRegionRiskScorePolicy = {
  skipWeight: 0.55,
  forcedWeight: 0.3,
  streakWeight: 0.15,
  forcedRateScale: 120,
}

export function resolveRuntimeRenderPolicy(
  input: ResolveRuntimeRenderPolicyInput,
): RuntimeRenderPolicy {
  // Keep phase ownership explicit so interaction degrade/restore rules live in one place.
  if (
    input.phase === 'pan' ||
    input.phase === 'zoom' ||
    input.phase === 'drag'
  ) {
    return {
      quality:
        input.renderQuality === 'interactive' || input.lodLevel >= 2
          ? 'interactive'
          : 'full',
      dpr: input.targetDpr ?? 'auto',
      interactionActive: true,
      overlayMode: 'degraded',
    }
  }

  if (input.phase === 'precision') {
    // Path/text precision editing should stay full-fidelity even when actively manipulating.
    return {
      quality: 'full',
      dpr: 'auto',
      interactionActive: false,
      overlayMode: 'full',
    }
  }

  return {
    quality: input.renderQuality === 'interactive' ? 'interactive' : 'full',
    dpr: 'auto',
    interactionActive: false,
    overlayMode: 'full',
  }
}
