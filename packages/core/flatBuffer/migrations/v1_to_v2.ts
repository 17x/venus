import type { RuntimeSceneV1, RuntimeSceneV2 } from './types.ts'

export function v1_to_v2(input: RuntimeSceneV1): RuntimeSceneV2 {
  return {
    version: 2,
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
    gradients: input.gradients,
    rootElements: input.rootElements,
    documentId: 'doc-legacy',
  }
}
