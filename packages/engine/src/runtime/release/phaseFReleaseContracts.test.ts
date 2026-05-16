import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineScenarioSpecializationRound2 } from './scenarioSpecializationRound2.ts'
import { passEnginePhaseEAcceptance } from './phaseEAcceptance.ts'
import { validateEngineMigrationMappings } from './migrationGuideV1.ts'
import { validateEngineRolloutPlanV1 } from './rolloutPlanV1.ts'
import { resolveEngineProductionAlerts } from './productionDashboardPolicy.ts'
import { validateEngineIncidentRunbook } from './incidentRunbook.ts'
import { validateEngineProfileGovernanceRecord } from './profileGovernancePolicy.ts'
import { isEngineAbDeltaSignificant } from './runtimeAbFramework.ts'
import { validateEngineAiTuningProposalV1 } from './aiTuningProposalV1.ts'
import { validateEngineCloudEdgeProfileExtension } from './cloudEdgeProfileExtension.ts'
import { validateEngineInternalWhitepaper } from './internalWhitepaper.ts'
import { validateEngineTechDebtLedger } from './techDebtLedger.ts'
import { validateEngineQuarterlyAuditTemplates } from './quarterlyAuditTemplates.ts'
import { validateEngineV2RoadmapDraft } from './v2RoadmapDraft.ts'
import { passEngineRcValidation } from './rcValidation.ts'
import { validateEngineGaReadiness } from './gaReadinessChecklist.ts'
import { validateEngineGaPostmortem } from './gaPostmortem.ts'

test('phase E/F release contract validators behave as expected', () => {
  const round2 = resolveEngineScenarioSpecializationRound2([
    { gate: 'g1', pass: true },
    { gate: 'g2', pass: false },
  ])
  assert.equal(round2.pass, false)
  assert.deepEqual(round2.failedGates, ['g2'])

  assert.equal(passEnginePhaseEAcceptance({ architectureReviewSigned: true, prereleaseAuditPassed: true }), true)
  assert.equal(validateEngineMigrationMappings([{ legacyApi: 'a', newApi: 'b' }]), true)
  assert.equal(validateEngineRolloutPlanV1([{ id: 'b1', trafficPercent: 10 }, { id: 'b2', trafficPercent: 100 }]), true)
  assert.deepEqual(resolveEngineProductionAlerts({ inputToPhotonP95Ms: 60, criticalLayerMissingRatio: 0 }), ['slo-latency'])
  assert.equal(validateEngineIncidentRunbook({ diagnosisTree: true, rollbackSteps: true, traceQueries: true }), true)
  assert.equal(validateEngineProfileGovernanceRecord({ version: 'v1', approver: 'arch', rationale: 'stability' }), true)
  assert.equal(isEngineAbDeltaSignificant({ baseline: 10, candidate: 12 }, 1), true)
  assert.equal(validateEngineAiTuningProposalV1({ id: 'p1', explanation: 'offline only', offlineOnly: true }), true)
  assert.equal(validateEngineCloudEdgeProfileExtension({ id: 'ext', backwardCompatible: true, bandwidthPolicyDefined: true }), true)
  assert.equal(validateEngineInternalWhitepaper({ scenarioSummary: true, tradeOffs: true, antiPatterns: true }), true)
  assert.equal(validateEngineTechDebtLedger([{ id: 'd1', scheduled: true }]), true)
  assert.equal(validateEngineQuarterlyAuditTemplates([
    { name: 'perf', baselineDefined: true, archiveDefined: true },
    { name: 'visual', baselineDefined: true, archiveDefined: true },
    { name: 'stability', baselineDefined: true, archiveDefined: true },
  ]), true)
  assert.equal(validateEngineV2RoadmapDraft({ capabilityGaps: true, milestones: true, riskAndInvestment: true }), true)
  assert.equal(passEngineRcValidation({ phase: 'rc1', blockerDefectCount: 0 }), true)
  assert.equal(validateEngineGaReadiness({ docsFrozen: true, changelogReady: true, opsHandoffReady: true }), true)
  assert.equal(validateEngineGaPostmortem({ timeline: true, week1Review: true, nextBacklog: true }), true)
})
