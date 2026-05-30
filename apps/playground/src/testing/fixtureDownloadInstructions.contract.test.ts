import assert from 'node:assert/strict'
import test from 'node:test'

import {PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS} from '../scenarios/scenarioFixtureDownloadPlans'

/**
 * Generates deterministic download+checksum commands for all scriptable fixture plans.
 */
function generateDownloadInstructions() {
  return PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS
    .filter((plan) => plan.downloadMode === 'scriptable-after-license-review')
    .map((plan) => {
      const fixtureDir = plan.targetFixturePath.replace('apps/playground/public/', '')
      const url = plan.targetFixturePath
        .replace('apps/playground/public/', '')
        .replace(/^scenario-fixtures\//, '')
      return {
        scenarioId: plan.scenarioId,
        command: `curl -sL https://raw.githubusercontent.com/.../.../main/${url} -o public/${fixtureDir} && sha256sum public/${fixtureDir}`,
        steps: plan.validationPlan,
      }
    })
}

/**
 * Verifies download instructions can be generated deterministically for all scriptable plans.
 */
test('fixture download instructions match all scriptable plans', () => {
  const instructions = generateDownloadInstructions()

  assert.equal(instructions.length >= 10, true)
  const ids = instructions.map((inst) => inst.scenarioId)
  assert.deepEqual(new Set(ids).size, ids.length)

  instructions.forEach((inst) => {
    assert.equal(inst.command.includes('curl'), true)
    assert.equal(inst.command.includes('sha256sum'), true)
    assert.equal(inst.steps.includes('record checksum'), true)
  })
})
