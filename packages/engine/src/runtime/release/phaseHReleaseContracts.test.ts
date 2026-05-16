import assert from 'node:assert/strict'
import test from 'node:test'

import { computeEngineGovernanceAuditAutomationV1 } from './governanceAuditAutomationV1.ts'
import { computeEngineReleaseRiskScoringV1 } from './releaseRiskScoringV1.ts'
import { computeEngineHotpathLatencyGuardV1 } from './hotpathLatencyGuardV1.ts'
import { computeEngineStateTransitionAnomalyGate } from './stateTransitionAnomalyGate.ts'
import { computeEngineProfileRolloutFairnessCheck } from './profileRolloutFairnessCheck.ts'
import { computeEngineFallbackStormRateLimiter } from './fallbackStormRateLimiter.ts'
import { computeEngineCriticalLayerProofExportV1 } from './criticalLayerProofExportV1.ts'
import { computeEngineFallbackParityGate2d3d } from './fallbackParityGate2d3d.ts'
import { computeEngineThreeDimensionalRolloutReadinessScoreV1 } from './threeDimensionalRolloutReadinessScoreV1.ts'
import { computeEngineCrossBackendSceneParitySuite } from './crossBackendSceneParitySuite.ts'
import { computeEngineRuntimePolicyConvergenceAuditV2 } from './runtimePolicyConvergenceAuditV2.ts'
import { computeEngineLongTailDeviceReadinessGate } from './longTailDeviceReadinessGate.ts'
import { computeEngineObservabilitySchemaLockV1 } from './observabilitySchemaLockV1.ts'
import { computeEngineReleaseEvidenceBundleGate } from './releaseEvidenceBundleGate.ts'
import { computeEngineRollbackSimulationMatrixV1 } from './rollbackSimulationMatrixV1.ts'
import { computeEngineFinalMigrationDebtBurndown } from './finalMigrationDebtBurndown.ts'
import { computeEngineProgramSloCloseoutGate } from './programSloCloseoutGate.ts'
import { computeEngineRefactorCompletionReadiness } from './refactorCompletionReadiness.ts'
import { computeEnginePhaseHAcceptance } from './phaseHAcceptance.ts'
import { computeEngineProgramCloseoutPostmortem } from './programCloseoutPostmortem.ts'

test('phase H release contracts compute expected completion-control results', () => {
  assert.equal(computeEngineGovernanceAuditAutomationV1([{ key: 'cr-linked', satisfied: true }]), true)
  assert.equal(
    computeEngineReleaseRiskScoringV1({ blockerCount: 1, driftCount: 2, rollbackGapCount: 3 }),
    31,
  )
  assert.equal(computeEngineHotpathLatencyGuardV1({ observedP95Ms: 20, thresholdP95Ms: 32 }), true)
  assert.equal(
    computeEngineStateTransitionAnomalyGate({ from: 'interactive', to: 'settling' }),
    true,
  )
  assert.equal(
    computeEngineProfileRolloutFairnessCheck(
      [
        { cohortId: 'a', exposureRatio: 0.4 },
        { cohortId: 'b', exposureRatio: 0.45 },
      ],
      0.1,
    ),
    true,
  )
  assert.equal(computeEngineFallbackStormRateLimiter({ eventCount: 12, threshold: 10 }), true)
  assert.equal(
    computeEngineCriticalLayerProofExportV1([{ frameId: 'f1', integrityHash: 'h', preserved: true }]),
    true,
  )
  assert.equal(
    computeEngineFallbackParityGate2d3d([{ id: 'p1', reason2d: 'cache-miss', reason3d: 'cache-miss', critical: true }]),
    true,
  )
  assert.equal(
    computeEngineThreeDimensionalRolloutReadinessScoreV1({ capabilityScore: 80, stabilityScore: 70, governanceScore: 90 }),
    80,
  )
  assert.equal(
    computeEngineCrossBackendSceneParitySuite([{ sceneId: 's1', backendPair: 'webgl-webgpu', parityPreserved: true }]),
    true,
  )
  assert.equal(
    computeEngineRuntimePolicyConvergenceAuditV2({ driftScore: 2, maxAllowedDriftScore: 3 }),
    true,
  )
  assert.equal(computeEngineLongTailDeviceReadinessGate([{ tier: 'low', verified: true }]), true)
  assert.equal(
    computeEngineObservabilitySchemaLockV1({ expectedMandatoryFieldCount: 12, observedMandatoryFieldCount: 12 }),
    true,
  )
  assert.equal(computeEngineReleaseEvidenceBundleGate([{ key: 'report', present: true }]), true)
  assert.equal(
    computeEngineRollbackSimulationMatrixV1([{ profile: 'editor', backend: 'webgl', rollbackVerified: true }]),
    true,
  )
  assert.equal(
    computeEngineFinalMigrationDebtBurndown([{ id: 'd1', critical: true, resolved: true }]),
    true,
  )
  assert.equal(
    computeEngineProgramSloCloseoutGate({
      inputToPhotonP95Ms: 24,
      interactiveFpsP95: 58,
      criticalLayerMissingRatio: 0,
      inputToPhotonP95ThresholdMs: 32,
      interactiveFpsP95Threshold: 55,
      criticalLayerMissingRatioThreshold: 0,
    }),
    true,
  )
  assert.equal(
    computeEngineRefactorCompletionReadiness({
      governancePassed: true,
      sloPassed: true,
      migrationPassed: true,
      evidencePassed: true,
    }),
    true,
  )
  assert.equal(computeEnginePhaseHAcceptance({ blockerCount: 0, mandatoryGatesPassed: true }), true)
  assert.equal(
    computeEngineProgramCloseoutPostmortem({
      timelineComplete: true,
      outcomeMetricsComplete: true,
      followUpActionsComplete: true,
    }),
    true,
  )
})
