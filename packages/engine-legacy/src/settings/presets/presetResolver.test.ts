import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveEngineDeviceCapabilityProfile } from '../device/deviceCapabilityProfile.ts'
import { resolveEngineDefaultPreset } from './qualityPresetRegistry.ts'

test('resolveEngineDefaultPreset clamps high preset for low capability', () => {
  const preset = resolveEngineDefaultPreset(
    'medical',
    resolveEngineDeviceCapabilityProfile({ gpuTier: 'low', memoryTier: 'low' }),
  )
  assert.equal(preset, 'medium')
})

test('resolveEngineDefaultPreset upgrades medium for high capability', () => {
  const preset = resolveEngineDefaultPreset(
    'massive-data',
    resolveEngineDeviceCapabilityProfile({ gpuTier: 'high', memoryTier: 'high' }),
  )
  assert.equal(preset, 'high')
})
