import assert from 'node:assert/strict'
import test from 'node:test'

import {canSkipScenePreparationForViewportOnlyUpdate} from '../engineRenderer/useEngineRendererSceneSync.ts'

test('stable revision and viewport-only interaction phase can skip scene prep', () => {
  assert.equal(canSkipScenePreparationForViewportOnlyUpdate({
    shouldBootstrapScene: false,
    previousRevision: 42,
    nextRevision: 42,
    transformPreviewActive: false,
    effectiveInteractionPhase: 'zoom',
  }), true)
})

test('bootstrap scene never skips scene prep even when revision matches', () => {
  assert.equal(canSkipScenePreparationForViewportOnlyUpdate({
    shouldBootstrapScene: true,
    previousRevision: 42,
    nextRevision: 42,
    transformPreviewActive: false,
    effectiveInteractionPhase: 'pan',
  }), false)
})

test('drag and precision phases never skip scene prep', () => {
  assert.equal(canSkipScenePreparationForViewportOnlyUpdate({
    shouldBootstrapScene: false,
    previousRevision: 8,
    nextRevision: 8,
    transformPreviewActive: false,
    effectiveInteractionPhase: 'drag',
  }), false)

  assert.equal(canSkipScenePreparationForViewportOnlyUpdate({
    shouldBootstrapScene: false,
    previousRevision: 8,
    nextRevision: 8,
    transformPreviewActive: false,
    effectiveInteractionPhase: 'precision',
  }), false)
})
