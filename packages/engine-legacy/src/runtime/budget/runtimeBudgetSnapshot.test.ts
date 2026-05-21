import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS,
  resolveEngineDefaultPreset,
  resolveEngineDeviceCapabilityProfile,
  resolveEngineGraphicsSettings,
  resolveEnginePerformanceSettings,
  resolveEngineRuntimeSettings,
} from '../../settings/index.ts'
import { createEngineRuntimePolicy } from '../policy/runtimePolicy.ts'
import { createEngineRuntimeBudgetSnapshot } from './runtimeBudget.ts'

test('createEngineRuntimeBudgetSnapshot serializes deterministic trace and budgets', () => {
  const capability = resolveEngineDeviceCapabilityProfile()
  const policy = createEngineRuntimePolicy(
    'game',
    resolveEngineDefaultPreset('game', capability),
    resolveEngineGraphicsSettings(),
    resolveEnginePerformanceSettings(),
    resolveEngineRuntimeSettings(),
    DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS,
    capability,
  )

  const snapshot = createEngineRuntimeBudgetSnapshot(policy, 12, '2026-05-16T00:00:00.000Z')
  assert.equal(snapshot.trace.frameIndex, 12)
  assert.equal(snapshot.trace.profile, 'game')
  assert.equal(snapshot.frameBudgetMs, DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS.frameBudgetMs)
})
