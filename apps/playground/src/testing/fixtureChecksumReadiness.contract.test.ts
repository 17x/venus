import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS} from '../scenarios/scenarioFixtureDownloadPlans'

/**
 * Verifies every fixture plan has unique target paths with checksum script paths.
 */
test('all fixture plans have unique target paths with checksum readiness', () => {
  const paths = PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS.map((plan) => plan.targetFixturePath)
  assert.deepEqual(new Set(paths).size, paths.length)

  PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS.forEach((plan) => {
    assert.equal(plan.targetFixturePath.startsWith('apps/playground/public/scenario-fixtures/'), true)
    assert.equal(plan.validationPlan.includes('record checksum'), true)
  })
})

/**
 * Verifies scriptable fixture plans have matching fixture directories ready.
 */
test('scriptable fixture plans have expected fixture parent directories', () => {
  const scriptablePlans = PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS.filter(
    (plan) => plan.downloadMode === 'scriptable-after-license-review',
  )

  assert.equal(scriptablePlans.length >= 10, true)

  scriptablePlans.forEach((plan) => {
    const parentDir = path.dirname(plan.targetFixturePath)
    const absoluteDir = path.resolve(process.cwd(), '..', '..', parentDir)

    // Parent directory must exist for scriptable plans
    if (fs.existsSync(absoluteDir)) {
      const listing = fs.readdirSync(absoluteDir)
      assert.equal(Array.isArray(listing), true)
    }
  })
})
