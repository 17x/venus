import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineProfileConsistencyDeltas } from './profileConsistencyChecker.ts'
import { resolveEngineTuningAdvisorRecommendations } from './tuningAdvisor.ts'
import { resolveEngineRegressionRedlineResult } from './regressionRedlinePolicy.ts'
import { resolveEngineDeviceTierRecommendations } from './deviceTierPerformanceReport.ts'
import { resolveEngineScenarioRound1Summary } from './scenarioSpecializationRound1.ts'
import { passEngineDeterministicGuardV2 } from './deterministicGuardV2.ts'
import { passEngineInputStormGuard } from './inputStormGuard.ts'
import { passEngineBlankFrameGuard } from './blankFrameGuard.ts'
import { passEngineSharpenSlaGate } from './sharpenSlaGate.ts'
import { passEngineCriticalLayerIntegrityGate } from './criticalLayerIntegrityGate.ts'
import { passEngineMemoryCacheGate } from './memoryCacheGate.ts'

test('analyzers return explainable outputs', () => {
  const deltas = resolveEngineProfileConsistencyDeltas([
    { profile: 'a', metrics: { fps: 60 } },
    { profile: 'b', metrics: { fps: 40 } },
  ])
  assert.equal(deltas[0]?.metric, 'fps')

  const recs = resolveEngineTuningAdvisorRecommendations([
    { tag: 'gpu', severity: 0.8 },
  ])
  assert.equal(recs.length, 1)

  const redline = resolveEngineRegressionRedlineResult({
    inputToPhotonP95Ms: 60,
    interactiveFpsP95: 45,
    criticalLayerMissingRatio: 0,
  })
  assert.equal(redline.pass, false)

  const tiers = resolveEngineDeviceTierRecommendations()
  assert.equal(tiers.length, 3)

  const round1 = resolveEngineScenarioRound1Summary([
    { scenario: 'editor', pass: true },
    { scenario: 'medical', pass: false },
  ])
  assert.equal(round1.pass, false)
  assert.deepEqual(round1.failed, ['medical'])
})

test('gates evaluate threshold rules correctly', () => {
  assert.equal(passEngineDeterministicGuardV2({ baseline: 1, candidate: 1.01, tolerance: 0.02 }), true)
  assert.equal(passEngineInputStormGuard({ coalescedRequests: 100, droppedFrames: 2 }), true)
  assert.equal(passEngineBlankFrameGuard({ totalFrames: 100, blankFrames: 1, blackFrames: 1 }, 0.05), true)
  assert.equal(passEngineSharpenSlaGate({ p95Ms: 200, p99Ms: 300 }, 220, 350), true)
  assert.equal(passEngineCriticalLayerIntegrityGate({ missingRatio: 0, blurRatio: 0.005 }), true)
  assert.equal(passEngineMemoryCacheGate({ cacheBytes: 1024, memoryPressure: 0.5, recovered: false }, 2048, 0.8), true)
})
