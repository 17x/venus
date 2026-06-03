import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {REMOTE_SCENARIO_DEFINITIONS} from '../demos/remoteScenarioCatalog'
import {
  applyS2PathSimulationControl,
  type S2PathSimulationState,
} from '../demos/s2PathSimulationInteractions'
import {PLAYGROUND_SCENARIO_DATA_MANIFESTS} from '../scenarios/scenarioDataManifests'
import {PLAYGROUND_SCENARIO_INTERACTION_HARNESSES} from '../scenarios/scenarioInteractionHarnesses'
import {PLAYGROUND_SCENARIO_MODEL_SPECS} from '../scenarios/scenarioModelSpecs'
import type {PlaygroundSceneSnapshot} from '../types/playgroundScene'

const S2_ID = 's2-preop-path-simulation'
const readFixture = (): string => readFileSync(join(process.cwd(), 'public/scenario-fixtures/s2/airports.csv'), 'utf8')
const readSource = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')

function s2Scenario() {
  const scenario = REMOTE_SCENARIO_DEFINITIONS.find((entry) => entry.id === S2_ID)
  assert.ok(scenario, 'S2 scenario must exist')
  return scenario
}

function initialState(): S2PathSimulationState {
  return {stepIndex: 0, editIndex: 0, selectedWaypointId: null, clearanceQueryId: null, clearanceDistance: Number.POSITIVE_INFINITY}
}

function findNode(snapshot: PlaygroundSceneSnapshot, id: string): Record<string, unknown> {
  const node = snapshot.nodes.find((item) => item.id === id) as Record<string, unknown> | undefined
  assert.ok(node, `${id} must exist`)
  return node
}

test('S2 path simulation uses local path fixture as canonical source', () => {
  const scenario = s2Scenario()
  assert.equal(scenario.datasetUrl, '/scenario-fixtures/s2/airports.csv')
  assert.equal(scenario.tags.includes('local-fixture'), true)
  assert.equal(scenario.summary.includes('local path, constraint, and risk-zone fixture'), true)

  const manifest = PLAYGROUND_SCENARIO_DATA_MANIFESTS.find((entry) => entry.scenarioId === S2_ID)
  assert.ok(manifest)
  assert.equal(manifest.sourceUrl, '/scenario-fixtures/s2/airports.csv')
  assert.equal(manifest.fallbackPolicy, 'local-fixture-primary')

  const spec = PLAYGROUND_SCENARIO_MODEL_SPECS.find((entry) => entry.scenarioId === S2_ID)
  assert.ok(spec)
  assert.equal(spec.sourceData.includes('Local path, constraint, and risk-zone'), true)
  assert.equal(spec.interactions.includes('edit path'), true)
  assert.equal(spec.interactions.includes('clearance query'), true)
})

test('S2 path scene exposes waypoints constraints risk zones and status labels', () => {
  const scene = s2Scenario().buildScene(3, readFixture())
  const waypoints = scene.nodes.filter((node) => node.id.startsWith('s2-waypoint-')) as Array<Record<string, unknown>>
  assert.equal(scene.revision, 3)
  assert.equal(waypoints.length > 0, true)
  assert.equal(waypoints.every((node) => node.pathWaypoint === true), true)
  assert.equal(findNode(scene, 's2-constraint-corridor').constraintType, 'corridor')
  assert.equal(findNode(scene, 's2-risk-zone-0').riskZone, true)
  assert.equal(findNode(scene, 's2-risk-zone-1').riskZone, true)
  assert.equal(findNode(scene, 's2-edit-label').text, 'edit: none')
  assert.equal(findNode(scene, 's2-replay-label').text, 'replay step: 0')
  assert.equal(findNode(scene, 's2-clearance-label').text, 'clearance: none n/a')
})

test('S2 edit replay and clearance controls mutate deterministically', () => {
  const scene = s2Scenario().buildScene(1, readFixture())
  const editA = applyS2PathSimulationControl(scene, initialState(), 'edit path')
  const editB = applyS2PathSimulationControl(scene, initialState(), 'edit path')
  assert.deepEqual(editA, editB)
  assert.equal(editA.state.editIndex, 1)
  assert.equal(editA.state.selectedWaypointId, 's2-waypoint-3')
  assert.equal(findNode(editA.snapshot, 's2-edit-label').text, 'edit: s2-waypoint-3')
  assert.equal(findNode(editA.snapshot, 's2-waypoint-3').pathEdited, true)

  const replay = applyS2PathSimulationControl(editA.snapshot, editA.state, 'path step replay')
  assert.equal(replay.state.stepIndex, 1)
  assert.equal(findNode(replay.snapshot, 's2-replay-label').text, 'replay step: 1')
  assert.equal(findNode(replay.snapshot, 's2-replay-marker').text, 'step 1')

  const clearance = applyS2PathSimulationControl(replay.snapshot, replay.state, 'clearance query')
  assert.equal(typeof clearance.state.clearanceQueryId, 'string')
  assert.equal(Number.isFinite(clearance.state.clearanceDistance), true)
  assert.match(String(findNode(clearance.snapshot, 's2-clearance-label').text), /^clearance: s2-risk-zone-/)
})

test('S2 path simulation harness and route page expose required controls', () => {
  const harness = PLAYGROUND_SCENARIO_INTERACTION_HARNESSES.find((entry) => entry.scenarioId === S2_ID)
  assert.ok(harness)
  assert.deepEqual(
    harness.controls,
    ['edit path', 'path step replay', 'clearance query', 'pick waypoint', 'fit view'],
  )
  assert.equal(harness.deterministicStateKeys.includes('editIndex'), true)
  assert.equal(harness.deterministicStateKeys.includes('clearanceQueryId'), true)

  const source = readSource('src/demos/remoteScenarioPage.ts')
  assert.match(source, /applyS2PathSimulationControl\(sceneSnapshot, s2PathState/)
  assert.match(source, /s2Clearance/)
})
