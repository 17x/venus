import assert from 'node:assert/strict'
import test from 'node:test'

import { computeEnginePostGaWeek1ObservabilityAudit } from './postGaWeek1ObservabilityAudit.ts'
import { computeEngineEmergencyRollbackDrillV1 } from './emergencyRollbackDrillV1.ts'
import { computeEngineCanaryAutopause } from './canaryAutopausePolicy.ts'
import { computeEngineReleaseDrift } from './releaseDriftDetector.ts'
import { computeEngineProfileSignatureGovernance } from './profileSignatureGovernor.ts'
import { computeEngineDeterministicSnapshotArchive } from './deterministicSnapshotArchive.ts'
import { computeEngineRegressionTriageAutomation } from './regressionTriageAutomation.ts'
import { computeEnginePerfBudgetRecalibrationV1 } from './perfBudgetRecalibrationV1.ts'
import { computeEngineThreeDimensionalCapabilityReadiness } from './threeDimensionalCapabilityReadiness.ts'
import { computeEngineHybridPolicyPack2d3d } from './hybridPolicyPack2d3d.ts'
import { computeEngineSceneLodGovernanceV1 } from './sceneLodGovernanceV1.ts'
import { computeEngineMemoryPressureCircuitBreaker } from './memoryPressureCircuitBreaker.ts'
import { computeEngineGpuFallbackChaosSuite } from './gpuFallbackChaosSuite.ts'
import { computeEngineEdgeSyncConsistencyGate } from './edgeSyncConsistencyGate.ts'
import { computeEngineReleaseNotesQualityGate } from './releaseNotesQualityGate.ts'
import { computeEngineCompatibilityMatrixV2 } from './compatibilityMatrixV2.ts'
import { computeEngineLongRunSoakReportV1 } from './longRunSoakReportV1.ts'
import { computeEnginePostGaHotfixPolicy } from './postGaHotfixPolicy.ts'
import { computeEnginePhaseGAcceptance } from './phaseGAcceptance.ts'
import { computeEnginePhaseGCloseoutPostmortem } from './phaseGCloseoutPostmortem.ts'

test('phase G release contracts compute expected governance verdicts', () => {
  assert.equal(
    computeEnginePostGaWeek1ObservabilityAudit({
      inputToPhotonP95Ms: 24,
      criticalLayerMissingRatio: 0,
      anomalyAttributionReady: true,
    }),
    true,
  )
  assert.equal(
    computeEngineEmergencyRollbackDrillV1({
      triggerThresholdReady: true,
      ownerAssigned: true,
      rehearsalEvidenceReady: true,
    }),
    true,
  )
  assert.equal(
    computeEngineCanaryAutopause({ latencyBreached: false, criticalLayerBreached: true, crashRateBreached: false }),
    true,
  )
  assert.deepEqual(
    computeEngineReleaseDrift([
      { key: 'policy.qos', expectedValue: 'v1', actualValue: 'v1' },
      { key: 'policy.cache', expectedValue: 'v1', actualValue: 'v2' },
    ]),
    [{ key: 'policy.cache', expectedValue: 'v1', actualValue: 'v2' }],
  )
  assert.equal(
    computeEngineProfileSignatureGovernance({ version: 'v1', approver: 'arch', digest: 'abc' }),
    true,
  )
  assert.equal(
    computeEngineDeterministicSnapshotArchive([{ id: 'snap-1', hash: 'h1', schemaVersion: 's1' }]),
    true,
  )
  assert.equal(
    computeEngineRegressionTriageAutomation([{ id: 'r1', severity: 'major', owner: 'team-a' }]),
    true,
  )
  assert.equal(
    computeEnginePerfBudgetRecalibrationV1({ baselineBudgetMs: 16, observedP95Ms: 22, maxAdjustmentRatio: 0.25 }),
    20,
  )
  assert.equal(
    computeEngineThreeDimensionalCapabilityReadiness({
      depthPipelineReady: true,
      cameraProjectionReady: true,
      backendMatrixReady: true,
    }),
    true,
  )
  assert.equal(
    computeEngineHybridPolicyPack2d3d([
      { id: 'sw1', criticalLayerProtected: true, rollbackAnchorReady: true },
    ]),
    true,
  )
  assert.equal(
    computeEngineSceneLodGovernanceV1(
      [
        { id: 'critical-1', critical: true, lodLevel: 0 },
        { id: 'non-critical-1', critical: false, lodLevel: 2 },
      ],
      2,
    ),
    true,
  )
  assert.equal(
    computeEngineMemoryPressureCircuitBreaker({
      pressureScore: 0.9,
      triggerThreshold: 0.8,
      recoverThreshold: 0.5,
      previousActive: false,
    }),
    true,
  )
  assert.equal(
    computeEngineGpuFallbackChaosSuite([{ caseId: 'c1', deterministicChain: true, criticalLayerPreserved: true }]),
    true,
  )
  assert.equal(computeEngineEdgeSyncConsistencyGate([]), true)
  assert.equal(
    computeEngineReleaseNotesQualityGate({ riskSection: true, migrationSection: true, rollbackSection: true }),
    true,
  )
  assert.equal(
    computeEngineCompatibilityMatrixV2([{ profile: 'editor', backend: 'webgl', verified: true }]),
    true,
  )
  assert.equal(
    computeEngineLongRunSoakReportV1({ durationMinutes: 120, memoryDriftStable: true, crashFree: true }),
    true,
  )
  assert.equal(
    computeEnginePostGaHotfixPolicy({ id: 'hf1', riskLevel: 'low', rollbackReady: true, ownerApproved: true }),
    true,
  )
  assert.equal(
    computeEnginePhaseGAcceptance({ reliabilityPassed: true, hybridReadinessPassed: true, governancePassed: true }),
    true,
  )
  assert.equal(
    computeEnginePhaseGCloseoutPostmortem({ timelineComplete: true, incidentSummaryComplete: true, nextStepsComplete: true }),
    true,
  )
})
