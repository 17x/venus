import test from 'node:test'
import assert from 'node:assert/strict'

import { applyEngineQosHardGuard } from './qosHardGuard.ts'

test('applyEngineQosHardGuard enforces medical guard budget floor', () => {
  const guarded = applyEngineQosHardGuard(
    {
      profile: 'medical',
      phase: 'static',
      pressure: 'high',
      capabilityTier: 'mid',
      degradation: {
        level: 'l1-non-critical-effects',
        criticalLayerExempt: true,
      },
    },
    {
      budget: {
        drawSubmitBudgetMs: 10,
        textureUploadBudgetBytes: 1,
        textureUploadTotalBudgetBytes: 1,
        imageTextureUploadMaxCount: 1,
        textTextureUploadMaxCount: 1,
        tilePreloadBudgetMs: 1,
        tilePreloadMaxUploads: 1,
        overlayPassBudgetMs: 1,
      },
      trace: 'x',
    },
  )

  assert.ok(guarded.decision.budget.drawSubmitBudgetMs >= 20)
  assert.ok(guarded.triggers.includes('medical-integrity-priority'))
})
