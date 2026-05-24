import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveEngineQosControllerDecision } from './qosController.ts'

test('resolveEngineQosControllerDecision returns trace and contracted budget', () => {
  const decision = resolveEngineQosControllerDecision({
    profile: 'editor',
    phase: 'pan',
    pressure: 'high',
    capabilityTier: 'low',
    degradation: {
      level: 'l2-non-critical-detail',
      criticalLayerExempt: true,
    },
  })

  assert.ok(decision.trace.includes('editor|pan|high|low'))
  assert.ok(decision.budget.drawSubmitBudgetMs <= 14)
})
