import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {shouldUseFullSceneLoad} from './sceneSyncMode.ts'

describe('engine renderer scene sync mode', () => {
  it('keeps flat stable scene updates eligible for incremental patches', () => {
    assert.equal(shouldUseFullSceneLoad({
      shouldBootstrapScene: false,
      sceneStructureDirty: false,
      hasPreviousFrame: true,
      shouldForcePreviewOnlySceneReload: false,
    }), false)
  })

  it('keeps tree stable scene updates eligible for adapter-owned incremental patches', () => {
    assert.equal(shouldUseFullSceneLoad({
      shouldBootstrapScene: false,
      sceneStructureDirty: false,
      hasPreviousFrame: true,
      shouldForcePreviewOnlySceneReload: false,
    }), false)
  })
})
