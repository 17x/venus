import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveEngineStrategyInputV2 } from './strategyInputV2.ts'

test('resolveEngineStrategyInputV2 clamps predictor confidence and interaction elapsed', () => {
  const resolved = resolveEngineStrategyInputV2({
    profile: 'editor',
    phase: 'pan',
    pressure: 'medium',
    cameraAnimationActive: false,
    predictorConfidence: 2,
    interactionElapsedMs: -10,
  })

  assert.equal(resolved.predictorConfidence, 1)
  assert.equal(resolved.interactionElapsedMs, 0)
})
