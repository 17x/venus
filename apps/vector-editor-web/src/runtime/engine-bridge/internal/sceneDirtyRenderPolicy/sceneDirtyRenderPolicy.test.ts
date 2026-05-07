import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSceneDirtyRenderPolicy } from './sceneDirtyRenderPolicy.ts'

test('resolveSceneDirtyRenderPolicy renders immediately for interactive scene-dirty updates', () => {
  const output = resolveSceneDirtyRenderPolicy({
    sceneDirtyRenderMode: 'interactive',
    shouldBootstrapScene: false,
    shouldForcePreviewOnlySceneReload: false,
    sceneStructureDirty: false,
    dirtyCandidateCount: 0,
    previousFrameCandidateCount: 12,
    nextOffscreenSceneDirtySkipConsecutiveCount: 1,
    sceneDirtySkipForceRenderFrames: 3,
  })

  assert.equal(output.shouldRenderSceneDirtyNow, true)
  assert.equal(output.shouldForceOffscreenSceneDirtyRender, false)
})

test('resolveSceneDirtyRenderPolicy forces render after skip streak in normal mode', () => {
  const output = resolveSceneDirtyRenderPolicy({
    sceneDirtyRenderMode: 'normal',
    shouldBootstrapScene: false,
    shouldForcePreviewOnlySceneReload: false,
    sceneStructureDirty: false,
    dirtyCandidateCount: 0,
    previousFrameCandidateCount: 10,
    nextOffscreenSceneDirtySkipConsecutiveCount: 4,
    sceneDirtySkipForceRenderFrames: 4,
  })

  assert.equal(output.shouldRenderSceneDirtyNow, false)
  assert.equal(output.shouldForceOffscreenSceneDirtyRender, true)
})
