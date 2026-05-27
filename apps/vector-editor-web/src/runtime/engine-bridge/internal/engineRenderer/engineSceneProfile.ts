// Module responsibility: declare vector-app engine scene profile defaults.
// Non-responsibility: runtime render loop orchestration.

export const VECTOR_ENGINE_RENDER_OVERSCAN_PX = 160

/**
 * Declares scene adapter compatibility defaults used by vector runtime.
 */
export interface VectorEngineSceneAdapterProfile {
  /** Target dimension compatibility mode for diagnostics and bridge integration. */
  dimensionMode: '2d' | 'hybrid-2d3d'
  /** Default node lighting mode applied when source nodes do not provide one. */
  defaultLightingMode: 'inherit' | 'unlit' | 'lit'
  /** Optional shared material binding for mixed 2D/3D rendering experiments. */
  defaultMaterialId?: string
}

/**
 * Declares runtime camera animation profile flags.
 */
export interface VectorEngineCameraAnimationProfile {
  /** Enables interactive zoom interpolation when true. */
  interactiveZoomEnabled: boolean
  /** Enables post-gesture settle interpolation when true. */
  settleEnabled: boolean
  /** Interactive zoom animation duration in milliseconds. */
  interactiveZoomDurationMs: number
  /** Settled animation duration in milliseconds. */
  settleDurationMs: number
}

/**
 * Declares vector runtime engine profile contract.
 */
export interface VectorEngineSceneProfile {
  /** Engine settings profile and preset used during createEngine boot. */
  settings: {
    profile: 'editor'
    preset: 'balanced'
  }
  /** Spatial indexing dimension mode used by engine scene-store bootstrap. */
  spatial: {
    dimension: '2d' | '3d'
  }
  /** Render profile defaults used by engine bridge lifecycle wiring. */
  render: {
    /** Preferred renderer backend for runtime engine boot. */
    backend: 'webgl' | 'webgpu'
    /** Enables model-complete canvas2d composite fallback when true. */
    modelCompleteComposite: boolean
    interactionPreview: {
      enabled: boolean
      mode: 'zoom-only'
      cacheOnly: boolean
      maxScaleStep: number
      maxTranslatePx: number
    }
  }
  /** Scene adapter compatibility defaults for runtime-to-engine payload conversion. */
  sceneAdapter: VectorEngineSceneAdapterProfile
  /** Camera animation profile for viewport commit behavior. */
  cameraAnimation: VectorEngineCameraAnimationProfile
  /** Overscan width in CSS pixels used by viewport and canvas sizing. */
  overscanPx: number
}

/**
 * Intent: expose one deterministic scene profile for vector editor engine boot.
 */
export const VECTOR_ENGINE_SCENE_PROFILE: VectorEngineSceneProfile = {
  settings: {
    profile: 'editor' as const,
    preset: 'balanced' as const,
  },
  spatial: {
    dimension: '2d',
  },
  render: {
    backend: 'webgl',
    modelCompleteComposite: true,
    interactionPreview: {
      enabled: true,
      mode: 'zoom-only' as const,
      cacheOnly: false,
      maxScaleStep: 1.5,
      maxTranslatePx: 3072,
    },
  },
  sceneAdapter: {
    dimensionMode: '2d',
    defaultLightingMode: 'inherit',
  },
  cameraAnimation: {
    // Keep zoom direct-commit to avoid follow-hand lag and input drift.
    interactiveZoomEnabled: false,
    // Disable post-gesture settle animation so stop-to-sharp can happen immediately.
    settleEnabled: false,
    interactiveZoomDurationMs: 0,
    settleDurationMs: 0,
  },
  overscanPx: VECTOR_ENGINE_RENDER_OVERSCAN_PX,
}
