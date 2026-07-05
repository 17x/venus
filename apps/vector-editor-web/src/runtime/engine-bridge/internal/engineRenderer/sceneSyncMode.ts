export interface ResolveSceneSyncModeInput {
  shouldBootstrapScene: boolean
  sceneStructureDirty: boolean
  hasPreviousFrame: boolean
  shouldForcePreviewOnlySceneReload: boolean
}

/**
 * Decides whether the current scene mutation should replace the whole engine
 * snapshot instead of using an incremental patch.
 */
export function shouldUseFullSceneLoad(input: ResolveSceneSyncModeInput) {
  return input.shouldBootstrapScene ||
    input.sceneStructureDirty ||
    !input.hasPreviousFrame ||
    input.shouldForcePreviewOnlySceneReload
}
