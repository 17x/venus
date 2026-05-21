import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveEngineAutoQualityScalerDecision } from './autoQualityScaler.ts'

test('auto quality scaler shrinks scale under high pressure after cooldown', () => {
  const decision = resolveEngineAutoQualityScalerDecision(
    'high',
    200,
    {
      renderScale: 1,
      lastAdjustedAtMs: 0,
    },
  )

  assert.equal(decision.changed, true)
  assert.equal(decision.reason, 'pressure-high-shrink')
  assert.ok(decision.nextRenderScale < 1)
})

test('auto quality scaler returns cooldown without adjustment during cooldown window', () => {
  const decision = resolveEngineAutoQualityScalerDecision(
    'high',
    50,
    {
      renderScale: 1,
      lastAdjustedAtMs: 0,
    },
  )

  assert.equal(decision.changed, false)
  assert.equal(decision.reason, 'cooldown')
})
