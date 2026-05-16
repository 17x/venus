// Module responsibility: declare vector-app engine scene profile defaults.
// Non-responsibility: runtime render loop orchestration.

/**
 * Intent: expose one deterministic scene profile for vector editor engine boot.
 */
export const VECTOR_ENGINE_SCENE_PROFILE = {
  settings: {
    profile: 'editor' as const,
    preset: 'balanced' as const,
  },
  render: {
    interactionPreview: {
      enabled: true,
      mode: 'zoom-only' as const,
      cacheOnly: false,
      maxScaleStep: 1.5,
      maxTranslatePx: 3072,
    },
  },
  cameraAnimation: {
    // Keep zoom direct-commit to avoid follow-hand lag and input drift.
    interactiveZoomEnabled: false,
    // Disable post-gesture settle animation so stop-to-sharp can happen immediately.
    settleEnabled: false,
    interactiveZoomDurationMs: 0,
    settleDurationMs: 0,
  },
}
