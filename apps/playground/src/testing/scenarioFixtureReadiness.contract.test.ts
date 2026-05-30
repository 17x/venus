import assert from 'node:assert/strict'
import test from 'node:test'

import {PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS} from '../scenarios/scenarioFixtureDownloadPlans'

const REVIEW_STATUS_BY_MODE = {
  'manual-review-required': 'manual',
  'scriptable-after-license-review': 'scriptable',
} as const

/**
 * Verifies fixture plans are ready to become pinned fixtures without silent checksum drift.
 */
test('scenario fixture download plans declare review mode and checksum readiness', () => {
  PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS.forEach((plan) => {
    assert.equal(plan.targetFixturePath.includes('/scenario-fixtures/'), true)
    assert.equal(plan.validationPlan.includes('record checksum'), true)
    assert.equal(plan.validationPlan.some((step) => step.includes('license') || step.includes('terms')), true)
    assert.equal(REVIEW_STATUS_BY_MODE[plan.downloadMode].length > 0, true)
  })
})
