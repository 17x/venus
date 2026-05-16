import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineStreamingPressurePolicy } from './streamingPressurePolicy.ts'
import { resolveEngineAnimationCachePolicy } from './animationCachePolicy.ts'
import { resolveEngineCameraRuntimePolicy } from './cameraRuntimePolicy.ts'
import { resolveEngineMedicalMultiResolutionOrder } from './medicalMultiResolutionPolicy.ts'
import { resolveEngineScenarioTuningPack } from './scenarioTuningPacks.ts'

test('streaming pressure policy preserves critical lane capacity', () => {
  const decision = resolveEngineStreamingPressurePolicy({
    pressureScore: 0.9,
    critical: true,
    requestedConcurrency: 8,
  })

  assert.ok(decision.allowedConcurrency >= 1)
  assert.equal(decision.deferNonCritical, false)
})

test('animation/cache/camera policy contracts are deterministic', () => {
  const animation = resolveEngineAnimationCachePolicy({
    seek: true,
    keyframeDistance: 8,
    interpolationComplexity: 1,
  })
  const camera = resolveEngineCameraRuntimePolicy('medical')

  assert.equal(animation.useKeyframeCache, true)
  assert.equal(animation.useInterpolationCache, false)
  assert.ok(camera.smoothing > 0)
  assert.ok(camera.inertia >= 0)
})

test('medical ordering and scenario tuning packs resolve stable outputs', () => {
  const ordered = resolveEngineMedicalMultiResolutionOrder([
    { regionId: 'normal-high', critical: false, resolutionLevel: 3 },
    { regionId: 'critical-mid', critical: true, resolutionLevel: 2 },
  ])
  const tuning = resolveEngineScenarioTuningPack('T0080')

  assert.deepEqual(ordered, ['critical-mid', 'normal-high'])
  assert.equal(tuning.id, 'animation-complex-track')
  assert.equal(tuning.strictSemantics, true)
})
