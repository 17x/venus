import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineProfilePolicyPack } from './profilePolicyPack.ts'
import {
  resolveEngineHybridAutoPolicy,
  type EngineHybridAutoPolicyState,
} from './hybridAutoPolicy.ts'
import { resolveEngineQosDiagnosticsPanel } from './qosDiagnosticsPanel.ts'
import { resolveEngineQosE2EReport } from './qosE2EReport.ts'
import { resolveEngineStrategyConvergence } from './strategyConvergence.ts'

test('resolveEngineProfilePolicyPack enforces profile-specific budget floors', () => {
  const editor = resolveEngineProfilePolicyPack('editor', 'pan', 'medium', {
    drawSubmitBudgetMs: 9,
    textureUploadBudgetBytes: 1,
    textureUploadTotalBudgetBytes: 1,
    imageTextureUploadMaxCount: 1,
    textTextureUploadMaxCount: 1,
    tilePreloadBudgetMs: 1,
    tilePreloadMaxUploads: 1,
    overlayPassBudgetMs: 0,
  })
  const medical = resolveEngineProfilePolicyPack('medical', 'static', 'low', {
    drawSubmitBudgetMs: 10,
    textureUploadBudgetBytes: 1,
    textureUploadTotalBudgetBytes: 1,
    imageTextureUploadMaxCount: 1,
    textTextureUploadMaxCount: 1,
    tilePreloadBudgetMs: 1,
    tilePreloadMaxUploads: 1,
    overlayPassBudgetMs: 1,
  })

  assert.equal(editor.budget.overlayPassBudgetMs, 1)
  assert.equal(editor.budget.textTextureUploadMaxCount, 2)
  assert.equal(medical.budget.drawSubmitBudgetMs, 20)
  assert.equal(medical.budget.imageTextureUploadMaxCount, 2)
})

test('resolveEngineHybridAutoPolicy switches profile after hysteresis frames', () => {
  let state: EngineHybridAutoPolicyState = {
    profile: 'editor',
    lastSwitchAtMs: -1000,
    pendingProfile: null,
    pendingFrameCount: 0,
  }

  let decision = resolveEngineHybridAutoPolicy(state, 'camera', 10)
  state = decision.state
  assert.equal(decision.switched, false)

  decision = resolveEngineHybridAutoPolicy(state, 'camera', 20)
  state = decision.state
  assert.equal(decision.switched, false)

  decision = resolveEngineHybridAutoPolicy(state, 'camera', 30)
  assert.equal(decision.switched, true)
  assert.equal(decision.effectiveProfile, 'game')
})

test('resolveEngineQosDiagnosticsPanel normalizes optional fields', () => {
  const panel = resolveEngineQosDiagnosticsPanel({
    profile: 'editor',
    phase: 'pan',
    pressure: 'high',
    budget: {
      drawSubmitBudgetMs: 10,
      textureUploadBudgetBytes: 100,
      textureUploadTotalBudgetBytes: 120,
      imageTextureUploadMaxCount: 1,
      textTextureUploadMaxCount: 1,
      tilePreloadBudgetMs: 2,
      tilePreloadMaxUploads: 2,
      overlayPassBudgetMs: 1,
    },
    degradationLevel: 'light',
    fallbackReason: null,
    guardTriggers: ['editor-interaction-priority'],
    trace: 'trace',
  })

  assert.equal(panel.fallbackReason, null)
  assert.equal(panel.guardTriggers[0], 'editor-interaction-priority')
})

test('resolveEngineQosE2EReport aggregates replay histograms', () => {
  const report = resolveEngineQosE2EReport([
    { phase: 'pan', pressure: 'medium', degradationLevel: 'light' },
    { phase: 'pan', pressure: 'high', degradationLevel: 'heavy' },
    { phase: 'static', pressure: 'low', degradationLevel: 'none' },
  ])

  assert.equal(report.sampleCount, 3)
  assert.equal(report.phaseHistogram['pan'], 2)
  assert.equal(report.pressureHistogram['high'], 1)
  assert.equal(report.degradationHistogram['none'], 1)
})

test('resolveEngineStrategyConvergence maps legacy aliases', () => {
  const legacy = resolveEngineStrategyConvergence('interactive-pan')
  const unknown = resolveEngineStrategyConvergence('unmapped-phase')

  assert.equal(legacy.phase, 'pan')
  assert.equal(legacy.legacyAliasApplied, true)
  assert.equal(unknown.phase, 'static')
  assert.equal(unknown.legacyAliasApplied, true)
})
