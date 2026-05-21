import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveEngineDegradationDecision } from './degradationLadder.ts'

test('resolveEngineDegradationDecision returns strong degradation in high pressure interaction', () => {
  const decision = resolveEngineDegradationDecision({
    profile: 'editor',
    phase: 'pan',
    pressure: 'high',
    cameraAnimationActive: false,
    predictorConfidence: 0.5,
    interactionElapsedMs: 0,
  })

  assert.equal(decision.level, 'l3-far-field-detail')
  assert.equal(decision.criticalLayerExempt, true)
})
