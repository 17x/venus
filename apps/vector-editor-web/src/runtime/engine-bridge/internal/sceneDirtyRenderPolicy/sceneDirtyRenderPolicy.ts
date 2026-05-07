/**
 * Declares one input contract for scene-dirty render gate resolution.
 */
export interface ResolveSceneDirtyRenderPolicyInput {
  /** Stores current scene dirty render mode selected by runtime bridge. */
  sceneDirtyRenderMode: 'interactive' | 'normal'
  /** Stores whether engine scene is still bootstrapping. */
  shouldBootstrapScene: boolean
  /** Stores whether runtime requested a preview-only full scene reload. */
  shouldForcePreviewOnlySceneReload: boolean
  /** Stores whether render-prep detected scene structure changes. */
  sceneStructureDirty: boolean
  /** Stores dirty ids overlapping previous frame candidates. */
  dirtyCandidateCount: number
  /** Stores candidate count sampled from previous frame diagnostics. */
  previousFrameCandidateCount: number
  /** Stores next offscreen-dirty skip streak count. */
  nextOffscreenSceneDirtySkipConsecutiveCount: number
  /** Stores skip streak threshold that forces one render flush. */
  sceneDirtySkipForceRenderFrames: number
}

/**
 * Declares one resolved policy output for scene-dirty rendering.
 */
export interface ResolveSceneDirtyRenderPolicyOutput {
  /** Stores whether the current dirty scene must render now. */
  shouldRenderSceneDirtyNow: boolean
  /** Stores whether skip streak reached threshold and must force render. */
  shouldForceOffscreenSceneDirtyRender: boolean
}

/**
 * Resolves scene-dirty render policy so editing interactions stay visually live.
 * @param input Policy resolution input payload.
 */
export function resolveSceneDirtyRenderPolicy(
  input: ResolveSceneDirtyRenderPolicyInput,
): ResolveSceneDirtyRenderPolicyOutput {
  const shouldRenderSceneDirtyNow =
    // Editing interactions must render immediately so transform previews are visible without debounce.
    input.sceneDirtyRenderMode === 'interactive' ||
    input.shouldBootstrapScene ||
    input.shouldForcePreviewOnlySceneReload ||
    input.sceneStructureDirty ||
    input.dirtyCandidateCount > 0 ||
    input.previousFrameCandidateCount === 0

  const shouldForceOffscreenSceneDirtyRender =
    !shouldRenderSceneDirtyNow &&
    input.nextOffscreenSceneDirtySkipConsecutiveCount >= input.sceneDirtySkipForceRenderFrames

  return {
    shouldRenderSceneDirtyNow,
    shouldForceOffscreenSceneDirtyRender,
  }
}
