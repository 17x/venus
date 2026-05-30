import assert from 'node:assert/strict'
import test from 'node:test'

import {
  REMOTE_SCENARIO_DEFINITIONS,
  resolveRemoteScenarioFromRoute,
} from '../demos/remoteScenarioCatalog'
import {PLAYGROUND_SCENARIO_INTERACTION_HARNESSES} from '../scenarios/scenarioInteractionHarnesses'

/**
 * Verifies every scenario route and legacy alias resolves before browser smoke is added.
 */
test('remote scenario routes and aliases resolve to smokeable interaction surfaces', () => {
  REMOTE_SCENARIO_DEFINITIONS.forEach((scenario) => {
    const harness = PLAYGROUND_SCENARIO_INTERACTION_HARNESSES.find((entry) => entry.scenarioId === scenario.id)

    assert.equal(resolveRemoteScenarioFromRoute(scenario.path)?.id, scenario.id)
    const aliases = scenario.aliases ?? []
    aliases.forEach((alias) => {
      assert.equal(resolveRemoteScenarioFromRoute(alias)?.id, scenario.id)
    })
    assert.ok(harness)
    assert.equal(harness.controls.length > 0, true)
    assert.equal(harness.telemetry.includes('nodes'), true)
    assert.equal(harness.telemetry.includes('draw'), true)
  })
})
