import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveEnginePressureSample } from './pressureMonitor.ts'

test('pressure monitor keeps high tier until score crosses highLeave threshold', () => {
  const sample = resolveEnginePressureSample(
    {
      cpuLoad: 0.64,
      gpuLoad: 0.61,
      memoryLoad: 0.55,
      visibilityLoad: 0.52,
      streamingLoad: 0.5,
    },
    'high',
  )

  assert.equal(sample.tier, 'high')
})

test('pressure monitor suppresses medium flapping with hysteresis', () => {
  const first = resolveEnginePressureSample(
    {
      cpuLoad: 0.5,
      gpuLoad: 0.5,
      memoryLoad: 0.5,
      visibilityLoad: 0.5,
      streamingLoad: 0.5,
    },
    'low',
  )
  assert.equal(first.tier, 'medium')

  const second = resolveEnginePressureSample(
    {
      cpuLoad: 0.42,
      gpuLoad: 0.42,
      memoryLoad: 0.42,
      visibilityLoad: 0.42,
      streamingLoad: 0.42,
    },
    first.tier,
  )
  assert.equal(second.tier, 'medium')
})
