import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineMedicalCriticalLayerPolicy } from './medicalCriticalLayerPolicy.ts'
import { resolveEngineMedicalRoiPriority } from './medicalRoiPolicy.ts'
import { shouldLoadMassiveProgressiveChunkNow } from './massiveProgressivePolicy.ts'
import { resolveEngineMassiveThroughputUnits } from './massiveThroughputPolicy.ts'
import { resolveEngineThermalAwareMode } from './thermalAwarePolicyExperiment.ts'

test('medical critical-layer policy forces critical layers to no degradation', () => {
  const result = resolveEngineMedicalCriticalLayerPolicy([
    { id: 'critical', critical: true, degradationLevel: 'heavy' },
    { id: 'normal', critical: false, degradationLevel: 'light' },
  ])

  assert.equal(result['critical'], 'none')
  assert.equal(result['normal'], 'light')
})

test('medical ROI and massive policies are deterministic', () => {
  const roiOrder = resolveEngineMedicalRoiPriority([
    { id: 'n', critical: false, distancePx: 1 },
    { id: 'c', critical: true, distancePx: 100 },
  ])
  assert.deepEqual(roiOrder, ['c', 'n'])

  assert.equal(shouldLoadMassiveProgressiveChunkNow({ viewportVisible: false, predicted: true, pressureScore: 0.5 }), true)
  assert.equal(resolveEngineMassiveThroughputUnits({ requestedUnits: 10, pressureScore: 1 }), 3)
})

test('thermal-aware mode escalates to battery saver at low battery', () => {
  assert.equal(resolveEngineThermalAwareMode({ thermalScore: 0.9, batteryLevel: 0.1 }), 'battery-saver')
})
