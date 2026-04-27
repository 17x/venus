import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveEngineInteractionPreviewConfig,
  shouldQueueDeferredVisualRecovery,
} from './engineRendererRecovery.ts'

test('interactive deferred resources queue one settled recovery pass', () => {
  // Interactive renderer fallbacks must schedule a settled recovery so image
  // uploads and text resolution do not remain incomplete after gestures.
  assert.equal(shouldQueueDeferredVisualRecovery({
    engineFrameQuality: 'interactive',
    deferredImageTextureCount: 2,
    interactiveTextFallbackCount: 0,
  }), true)

  assert.equal(shouldQueueDeferredVisualRecovery({
    engineFrameQuality: 'interactive',
    deferredImageTextureCount: 0,
    interactiveTextFallbackCount: 3,
  }), true)

  assert.equal(shouldQueueDeferredVisualRecovery({
    engineFrameQuality: 'full',
    deferredImageTextureCount: 4,
    interactiveTextFallbackCount: 2,
  }), false)
})

test('pending visual recovery disables cache-only interaction preview', () => {
  // While recovery is pending, preview reuse should allow packet fallback so
  // pan/zoom does not stay blank waiting for a separate settled wakeup.
  assert.deepEqual(resolveEngineInteractionPreviewConfig({
    interactionPreview: {
      enabled: true,
      mode: 'interaction',
      cacheOnly: true,
      maxScaleStep: 8,
      maxTranslatePx: 100_000,
    },
    visualRecoveryPending: true,
  }), {
    enabled: true,
    mode: 'interaction',
    cacheOnly: false,
    maxScaleStep: 8,
    maxTranslatePx: 100_000,
  })

  assert.deepEqual(resolveEngineInteractionPreviewConfig({
    interactionPreview: {
      enabled: true,
      mode: 'interaction',
      cacheOnly: true,
    },
    visualRecoveryPending: false,
  }), {
    enabled: true,
    mode: 'interaction',
    cacheOnly: true,
  })
})