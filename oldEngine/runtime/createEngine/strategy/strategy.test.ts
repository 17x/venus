import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineRenderStrategy } from './strategy.ts'

/**
 * Resolve one baseline input snapshot used by strategy tests.
 */
function createBaseInput() {
  return {
    nowMs: 1_000,
    lodEnabled: true,
    cameraAnimationActive: false,
    cameraCachePreviewOnly: false,
    lastInteractionAtMs: 0,
    lastInteractionKind: 'none' as const,
    settleDelayMs: 120,
    interactionHoldMs: 56,
    forceSharpFrame: false,
  }
}

test('resolveEngineRenderStrategy keeps static full-quality when no interaction is active', () => {
  const strategy = resolveEngineRenderStrategy(createBaseInput())

  // Idle frames should keep full quality and no preview override.
  assert.equal(strategy.phase, 'static')
  assert.equal(strategy.interactionActive, false)
  assert.equal(strategy.quality, 'full')
  assert.equal(strategy.interactionPreview, undefined)
})

test('resolveEngineRenderStrategy picks pan interaction lane with cache-only preview', () => {
  const strategy = resolveEngineRenderStrategy({
    ...createBaseInput(),
    lastInteractionAtMs: 950,
    lastInteractionKind: 'pan',
  })

  // Pan interaction should prioritize lightweight cache preview behavior.
  assert.equal(strategy.phase, 'pan')
  assert.equal(strategy.interactionActive, true)
  assert.equal(strategy.quality, 'interactive')
  assert.equal(strategy.interactionPreview?.cacheOnly, true)
})

test('resolveEngineRenderStrategy picks zoom interaction lane with fallback-capable preview', () => {
  const strategy = resolveEngineRenderStrategy({
    ...createBaseInput(),
    lastInteractionAtMs: 950,
    lastInteractionKind: 'zoom',
  })

  // Zoom interaction should keep interactive quality but allow packet fallback.
  assert.equal(strategy.phase, 'zoom')
  assert.equal(strategy.interactionActive, true)
  assert.equal(strategy.quality, 'interactive')
  assert.equal(strategy.interactionPreview?.cacheOnly, false)
})

test('resolveEngineRenderStrategy prioritizes camera lane over viewport interaction history', () => {
  const strategy = resolveEngineRenderStrategy({
    ...createBaseInput(),
    cameraAnimationActive: true,
    cameraCachePreviewOnly: true,
    lastInteractionAtMs: 990,
    lastInteractionKind: 'pan',
  })

  // Camera animation should force interactive strategy regardless of recent pan/zoom tags.
  assert.equal(strategy.phase, 'camera')
  assert.equal(strategy.interactionActive, true)
  assert.equal(strategy.quality, 'interactive')
  assert.equal(strategy.interactionPreview?.cacheOnly, true)
})

test('resolveEngineRenderStrategy bypasses interaction degradation when LOD is disabled', () => {
  const strategy = resolveEngineRenderStrategy({
    ...createBaseInput(),
    lodEnabled: false,
    lastInteractionAtMs: 990,
    lastInteractionKind: 'zoom',
  })

  // LOD-off mode should stay on full quality with no interaction preview override.
  assert.equal(strategy.phase, 'static')
  assert.equal(strategy.interactionActive, false)
  assert.equal(strategy.quality, 'full')
  assert.equal(strategy.interactionPreview, undefined)
})

test('resolveEngineRenderStrategy enters settling phase after interaction hold window', () => {
  const strategy = resolveEngineRenderStrategy({
    ...createBaseInput(),
    lastInteractionAtMs: 920,
    lastInteractionKind: 'pan',
  })

  // After interaction-hold expires but before settle deadline, strategy should
  // recover full quality in the explicit settling lane.
  assert.equal(strategy.phase, 'settling')
  assert.equal(strategy.interactionActive, false)
  assert.equal(strategy.quality, 'full')
  assert.equal(strategy.interactionPreview, undefined)
})

test('resolveEngineRenderStrategy forceSharpFrame overrides interaction history', () => {
  const strategy = resolveEngineRenderStrategy({
    ...createBaseInput(),
    lastInteractionAtMs: 995,
    lastInteractionKind: 'zoom',
    forceSharpFrame: true,
  })

  // Deadline miss recovery must force one full-quality settle frame even when
  // interaction history would otherwise keep interactive quality.
  assert.equal(strategy.phase, 'settling')
  assert.equal(strategy.interactionActive, false)
  assert.equal(strategy.quality, 'full')
  assert.equal(strategy.interactionPreview, undefined)
})
