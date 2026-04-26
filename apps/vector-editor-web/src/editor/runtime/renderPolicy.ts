export type RuntimeRenderPhase =
  | 'static'
  | 'pan'
  | 'zoom'
  | 'drag'
  | 'precision'
  | 'settled'

export type RuntimeLodLevel = 0 | 1 | 2 | 3

export interface RuntimeInteractionPreviewConfig {
  enabled?: boolean
  mode?: 'interaction' | 'zoom-only'
  // Cache-only preview skips expensive packet fallback during active gestures.
  cacheOnly?: boolean
  maxScaleStep?: number
  maxTranslatePx?: number
}

export interface RuntimeLodInteractionCapability {
  quality?: 'full' | 'interactive'
  dpr?: number | 'auto'
  interactionActive?: boolean
  interactiveIntervalMs?: number
  interactionPreview?: RuntimeInteractionPreviewConfig | false
}

export interface RuntimeLodConfig {
  lodLevelCapabilities?: Partial<Record<RuntimeLodLevel, RuntimeLodInteractionCapability>>
  interactionCapabilities?: Partial<Record<RuntimeRenderPhase, RuntimeLodInteractionCapability>>
}

export interface ResolveRuntimeRenderPolicyInput {
  phase: RuntimeRenderPhase
  lodLevel: RuntimeLodLevel
  viewportScale: number
  deviceDpr?: number
  lodConfig?: RuntimeLodConfig
}

export interface RuntimeRenderPolicy {
  quality: 'full' | 'interactive'
  dpr: number | 'auto'
  interactionActive: boolean
  interactiveIntervalMs: number
  interactionPreview: RuntimeInteractionPreviewConfig | false
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

function resolveRuntimeDprByViewportScale(input: {
  viewportScale: number
  deviceDpr: number
  phase: RuntimeRenderPhase
}): number {
  // Follow LOD doc DPR ladder by projected zoom scale so low-scale frames stay cheap.
  const scale = Math.max(0, input.viewportScale)
  const systemDpr = Math.max(0.5, input.deviceDpr)
  let resolvedDpr = systemDpr

  if (scale < 0.05) {
    resolvedDpr = 0.5
  } else if (scale < 0.125) {
    resolvedDpr = 0.75
  } else if (scale < 0.25) {
    resolvedDpr = 1
  } else if (scale < 1) {
    resolvedDpr = Math.min(systemDpr, 1.5)
  }

  if (input.phase === 'pan' || input.phase === 'zoom' || input.phase === 'drag') {
    // Interaction override: cap base scene DPR to 1 to keep frame pacing stable.
    resolvedDpr = Math.min(resolvedDpr, 1)
  }

  return resolvedDpr
}

function resolveRuntimeLodInteractionCapability(input: {
  config?: RuntimeLodConfig
  lodLevel: RuntimeLodLevel
  phase: RuntimeRenderPhase
  fallback?: RuntimeLodInteractionCapability
}) {
  const baseCapability = {
    ...resolveDefaultRuntimeLodLevelCapability(input.lodLevel),
    ...input.config?.lodLevelCapabilities?.[input.lodLevel],
  }
  const capability = input.config?.interactionCapabilities?.[input.phase]

  return {
    quality: capability?.quality ?? input.fallback?.quality ?? baseCapability.quality,
    dpr: capability?.dpr ?? input.fallback?.dpr ?? baseCapability.dpr,
    interactionActive:
      capability?.interactionActive ?? input.fallback?.interactionActive ?? baseCapability.interactionActive,
    interactiveIntervalMs:
      capability?.interactiveIntervalMs
      ?? input.fallback?.interactiveIntervalMs
      ?? baseCapability.interactiveIntervalMs,
    interactionPreview:
      capability?.interactionPreview ?? input.fallback?.interactionPreview ?? baseCapability.interactionPreview,
  }
}

function resolveDefaultRuntimeLodLevelCapability(
  lodLevel: RuntimeLodLevel,
): Required<RuntimeLodInteractionCapability> {
  if (lodLevel === 0) {
    return {
      quality: 'full',
      dpr: 'auto',
      interactionActive: false,
      interactiveIntervalMs: 8,
      interactionPreview: false,
    }
  }

  if (lodLevel === 1) {
    return {
      quality: 'full',
      dpr: 'auto',
      interactionActive: false,
      interactiveIntervalMs: 10,
      interactionPreview: false,
    }
  }

  if (lodLevel === 2) {
    return {
      quality: 'interactive',
      dpr: 1.25,
      interactionActive: false,
      interactiveIntervalMs: 12,
      interactionPreview: false,
    }
  }

  return {
    quality: 'interactive',
    dpr: 1,
    interactionActive: false,
    interactiveIntervalMs: 16,
    interactionPreview: false,
  }
}

export function resolveRuntimeRenderPolicy(
  input: ResolveRuntimeRenderPolicyInput,
): RuntimeRenderPolicy {
  // Keep DPR derivation centralized so all phases follow one visibility policy.
  const resolvedDpr = resolveRuntimeDprByViewportScale({
    viewportScale: input.viewportScale,
    deviceDpr: input.deviceDpr ?? 1,
    phase: input.phase,
  })

  // Keep phase ownership explicit so interaction degrade/restore rules live in one place.
  if (input.phase === 'pan') {
    const capability = resolveRuntimeLodInteractionCapability({
      config: input.lodConfig,
      lodLevel: input.lodLevel,
      phase: 'pan',
      fallback: {
        quality: 'interactive',
        interactionActive: true,
      },
    })
    return {
      ...capability,
      dpr: resolvedDpr,
      overlayMode: 'degraded',
    }
  }

  if (input.phase === 'zoom') {
    const capability = resolveRuntimeLodInteractionCapability({
      config: input.lodConfig,
      lodLevel: input.lodLevel,
      phase: 'zoom',
      fallback: {
        quality: 'interactive',
        interactionActive: true,
      },
    })
    return {
      ...capability,
      dpr: resolvedDpr,
      overlayMode: 'degraded',
    }
  }

  if (
    input.phase === 'drag'
  ) {
    const capability = resolveRuntimeLodInteractionCapability({
      config: input.lodConfig,
      lodLevel: input.lodLevel,
      phase: 'drag',
      fallback: {
        quality: 'interactive',
        interactionActive: true,
      },
    })
    return {
      ...capability,
      dpr: resolvedDpr,
      overlayMode: 'degraded',
    }
  }

  if (input.phase === 'precision') {
    const capability = resolveRuntimeLodInteractionCapability({
      config: input.lodConfig,
      lodLevel: input.lodLevel,
      phase: 'precision',
      fallback: {
        quality: 'full',
        interactionActive: false,
      },
    })
    // Path/text precision editing should stay full-fidelity even when actively manipulating.
    return {
      ...capability,
      dpr: resolvedDpr,
      overlayMode: 'full',
    }
  }

  const capability = resolveRuntimeLodInteractionCapability({
    config: input.lodConfig,
    lodLevel: input.lodLevel,
    phase: input.phase === 'static' ? 'static' : 'settled',
  })

  return {
    ...capability,
    dpr: resolvedDpr,
    overlayMode: 'full',
  }
}
