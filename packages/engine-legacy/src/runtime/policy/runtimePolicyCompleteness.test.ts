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
import {
  createEngineRuntimePolicy,
  resolveCapabilityAwareEngineRuntimePolicy,
} from './runtimePolicy.ts'

test('createEngineRuntimePolicy builds complete phase table', () => {
  const capability = resolveEngineDeviceCapabilityProfile()
  const policy = createEngineRuntimePolicy(
    'editor',
    resolveEngineDefaultPreset('editor', capability),
    resolveEngineGraphicsSettings(),
    resolveEnginePerformanceSettings(),
    resolveEngineRuntimeSettings(),
    DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS,
    capability,
  )

  assert.ok(policy.phaseOverrides.interactive)
  assert.ok(policy.phaseOverrides.settling)
  assert.ok(policy.phaseOverrides.static)
  assert.ok(policy.phaseOverrides.camera)
  assert.equal(policy.criticalLayer.visibilityGuaranteed, true)
})

test('resolveCapabilityAwareEngineRuntimePolicy adjusts low-tier interactive scale', () => {
  const lowCapability = resolveEngineDeviceCapabilityProfile({ gpuTier: 'low', memoryTier: 'low' })
  const baseline = createEngineRuntimePolicy(
    'editor',
    resolveEngineDefaultPreset('editor', lowCapability),
    resolveEngineGraphicsSettings({ renderScale: 1 }),
    resolveEnginePerformanceSettings(),
    resolveEngineRuntimeSettings(),
    DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS,
    lowCapability,
  )

  const adjusted = resolveCapabilityAwareEngineRuntimePolicy(baseline)
  assert.ok(adjusted.phaseOverrides.interactive.renderScale <= baseline.phaseOverrides.interactive.renderScale)
})
