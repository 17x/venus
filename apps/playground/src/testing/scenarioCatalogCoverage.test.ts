import assert from 'node:assert/strict'
import test from 'node:test'
import {REMOTE_SCENARIO_DEFINITIONS} from '../demos/remoteScenarioCatalog'
import {PLAYGROUND_SCENARIO_DATA_MANIFESTS} from '../scenarios/scenarioDataManifests'
import {PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS} from '../scenarios/scenarioFixtureDownloadPlans'
import {PLAYGROUND_SCENARIO_INTERACTION_HARNESSES} from '../scenarios/scenarioInteractionHarnesses'
import {PLAYGROUND_SCENARIO_MODEL_SPECS} from '../scenarios/scenarioModelSpecs'

const REQUIRED_SCENARIO_TAGS = [
  'S1',
  'S2',
  'S3',
  'S4',
  'S5',
  'S6',
  'S7',
  'S8',
  'S9',
  'S10',
  'S11',
  'S12',
  'S13',
] as const

/**
 * Resolves the primary scenario tag from one remote scenario definition.
 * @param scenario Remote scenario definition with scenario matrix tags.
 */
function resolvePrimaryScenarioTag(scenario: {tags: readonly string[]}): string | undefined {
  return scenario.tags.find((tag) => /^S\d+$/.test(tag))
}

/**
 * Collects duplicate string values while preserving deterministic sorted output.
 * @param values Values to inspect for duplicates.
 */
function collectDuplicateValues(values: readonly string[]): string[] {
  const seenValues = new Set<string>()
  const duplicateValues = new Set<string>()

  values.forEach((value) => {
    if (seenValues.has(value)) {
      duplicateValues.add(value)
      return
    }
    seenValues.add(value)
  })

  return [...duplicateValues].sort()
}

test('remote playground scenarios cover S1-S13 exactly once', () => {
  const tags = REMOTE_SCENARIO_DEFINITIONS.map((scenario) => resolvePrimaryScenarioTag(scenario))
  assert.deepEqual(tags.slice().sort(), REQUIRED_SCENARIO_TAGS.slice().sort())
  assert.deepEqual(collectDuplicateValues(tags.filter((tag): tag is string => typeof tag === 'string')), [])
})

test('remote playground scenarios expose unique route and id contracts', () => {
  const ids = REMOTE_SCENARIO_DEFINITIONS.map((scenario) => scenario.id)
  const paths = REMOTE_SCENARIO_DEFINITIONS.map((scenario) => scenario.path)
  const aliases = REMOTE_SCENARIO_DEFINITIONS.flatMap((scenario) => scenario.aliases ?? [])

  assert.deepEqual(collectDuplicateValues(ids), [])
  assert.deepEqual(collectDuplicateValues(paths), [])
  assert.deepEqual(collectDuplicateValues(aliases), [])

  REMOTE_SCENARIO_DEFINITIONS.forEach((scenario) => {
    assert.equal(scenario.path.startsWith('/'), true)
    assert.equal(scenario.datasetUrl.startsWith('https://'), true)
    assert.equal(['csv', 'json'].includes(scenario.datasetFormat), true)
  })
})

test('remote playground scenarios all have data manifests', () => {
  const scenarioIds = REMOTE_SCENARIO_DEFINITIONS.map((scenario) => scenario.id).sort()
  const manifestIds = PLAYGROUND_SCENARIO_DATA_MANIFESTS.map((manifest) => manifest.scenarioId).sort()

  assert.deepEqual(manifestIds, scenarioIds)

  PLAYGROUND_SCENARIO_DATA_MANIFESTS.forEach((manifest) => {
    const scenario = REMOTE_SCENARIO_DEFINITIONS.find((definition) => definition.id === manifest.scenarioId)
    assert.ok(scenario)
    assert.equal(manifest.sourceUrl, scenario.datasetUrl)
    assert.equal(manifest.format, scenario.datasetFormat)
    assert.equal(manifest.license.length > 0, true)
    assert.equal(manifest.checksum.length > 0, true)
    assert.equal(manifest.adapterOwner.startsWith('playground/scenarios/S'), true)
  })
})

test('remote playground scenarios all have model specs', () => {
  const scenarioIds = REMOTE_SCENARIO_DEFINITIONS.map((scenario) => scenario.id).sort()
  const specIds = PLAYGROUND_SCENARIO_MODEL_SPECS.map((spec) => spec.scenarioId).sort()

  assert.deepEqual(specIds, scenarioIds)

  PLAYGROUND_SCENARIO_MODEL_SPECS.forEach((spec) => {
    assert.equal(spec.sourceData.length > 0, true)
    assert.equal(spec.adapterOutput.length > 0, true)
    assert.equal(spec.engineProjection.includes('generic') || spec.engineProjection.includes('opt-in'), true)
    assert.equal(spec.interactions.length > 0, true)
    assert.equal(spec.mvpLimits.length > 0, true)
    assert.equal(spec.requiredEngineApis.every((api) => api.startsWith('engine.') || api === 'createEngine'), true)
  })
})

test('remote playground scenarios all have pinned fixture download plans', () => {
  const scenarioIds = REMOTE_SCENARIO_DEFINITIONS.map((scenario) => scenario.id).sort()
  const planIds = PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS.map((plan) => plan.scenarioId).sort()

  assert.deepEqual(planIds, scenarioIds)

  PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS.forEach((plan) => {
    assert.equal(plan.targetFixturePath.startsWith('apps/playground/public/scenario-fixtures/'), true)
    assert.equal(plan.validationPlan.includes('record checksum'), true)
    assert.equal(plan.validationPlan.length >= 3, true)
  })
})

test('remote playground scenarios all have interaction harness contracts', () => {
  const scenarioIds = REMOTE_SCENARIO_DEFINITIONS.map((scenario) => scenario.id).sort()
  const harnessIds = PLAYGROUND_SCENARIO_INTERACTION_HARNESSES.map((harness) => harness.scenarioId).sort()

  assert.deepEqual(harnessIds, scenarioIds)

  PLAYGROUND_SCENARIO_INTERACTION_HARNESSES.forEach((harness) => {
    const spec = PLAYGROUND_SCENARIO_MODEL_SPECS.find((entry) => entry.scenarioId === harness.scenarioId)
    assert.ok(spec)
    assert.deepEqual(harness.controls.slice().sort(), spec.interactions.slice().sort())
    assert.equal(harness.telemetry.includes('nodes'), true)
    assert.equal(harness.telemetry.includes('draw'), true)
    assert.equal(harness.deterministicStateKeys.includes('revision'), true)
  })
})
