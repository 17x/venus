import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {
  REMOTE_SCENARIO_DEFINITIONS,
} from '../demos/remoteScenarioCatalog'
import {
  applyS1MedicalVolumeControl,
  type S1MedicalVolumeState,
} from '../demos/s1MedicalVolumeInteractions'
import {PLAYGROUND_SCENARIO_DATA_MANIFESTS} from '../scenarios/scenarioDataManifests'
import {PLAYGROUND_SCENARIO_INTERACTION_HARNESSES} from '../scenarios/scenarioInteractionHarnesses'
import {PLAYGROUND_SCENARIO_MODEL_SPECS} from '../scenarios/scenarioModelSpecs'
import type {PlaygroundSceneSnapshot} from '../types/playgroundScene'

const S1_ID = 's1-medical-volume-slice-runtime'
const readFixture = (): string => readFileSync(join(process.cwd(), 'public/scenario-fixtures/s1/volcano.csv'), 'utf8')

function s1Scenario() {
  const scenario = REMOTE_SCENARIO_DEFINITIONS.find((entry) => entry.id === S1_ID)
  assert.ok(scenario, 'S1 scenario must exist')
  return scenario
}

function initialState(): S1MedicalVolumeState {
  return {sliceIndex: 0, transferPreset: 'soft-tissue', selectedRoiId: null, captureId: 0}
}

function findNode(snapshot: PlaygroundSceneSnapshot, id: string): Record<string, unknown> {
  const node = snapshot.nodes.find((item) => item.id === id) as Record<string, unknown> | undefined
  assert.ok(node, `${id} must exist`)
  return node
}

test('S1 medical volume scenario uses local volume-like fixture as canonical source', () => {
  const scenario = s1Scenario()
  assert.equal(scenario.datasetUrl, '/scenario-fixtures/s1/volcano.csv')
  assert.equal(scenario.tags.includes('local-fixture'), true)
  assert.equal(scenario.summary.includes('local volume-like scalar fixture'), true)

  const manifest = PLAYGROUND_SCENARIO_DATA_MANIFESTS.find((entry) => entry.scenarioId === S1_ID)
  assert.ok(manifest)
  assert.equal(manifest.sourceUrl, '/scenario-fixtures/s1/volcano.csv')
  assert.equal(manifest.fallbackPolicy, 'local-fixture-primary')

  const spec = PLAYGROUND_SCENARIO_MODEL_SPECS.find((entry) => entry.scenarioId === S1_ID)
  assert.ok(spec)
  assert.equal(spec.sourceData.includes('Local volume-like scalar grid fixture'), true)
  assert.equal(spec.interactions.includes('transfer function'), true)
  assert.equal(spec.interactions.includes('ROI pick'), true)
  assert.equal(spec.interactions.includes('capture frame'), true)
})

test('S1 medical volume scene exposes slice cells transfer labels ROI and capture nodes', () => {
  const scene = s1Scenario().buildScene(7, readFixture())
  const cells = scene.nodes.filter((node) => node.id.startsWith('s1-cell-')) as Array<Record<string, unknown>>
  assert.equal(scene.revision, 7)
  assert.equal(cells.length > 0, true)
  assert.equal(cells.every((cell) => typeof cell.volumeIntensity === 'number'), true)
  assert.equal(cells.every((cell) => cell.volumeTransferPreset === 'soft-tissue'), true)
  assert.equal(typeof findNode(scene, 's1-roi-core').stroke, 'string')
  assert.equal(findNode(scene, 's1-transfer-label').text, 'transfer: soft-tissue')
  assert.equal(findNode(scene, 's1-slice-label').text, 'slice: 0')
  assert.equal(findNode(scene, 's1-roi-label').text, 'roi: none')
  assert.equal(findNode(scene, 's1-capture-status').text, 'capture: 0')
})

test('S1 medical volume controls mutate deterministically', () => {
  const scene = s1Scenario().buildScene(1, readFixture())
  const sliceA = applyS1MedicalVolumeControl(scene, initialState(), 'slice scrub')
  const sliceB = applyS1MedicalVolumeControl(scene, initialState(), 'slice scrub')
  assert.deepEqual(sliceA, sliceB)
  assert.equal(sliceA.state.sliceIndex, 1)
  assert.equal(findNode(sliceA.snapshot, 's1-slice-label').text, 'slice: 1')

  const transfer = applyS1MedicalVolumeControl(sliceA.snapshot, sliceA.state, 'transfer function')
  assert.equal(transfer.state.transferPreset, 'bone')
  assert.equal(findNode(transfer.snapshot, 's1-transfer-label').text, 'transfer: bone')

  const roi = applyS1MedicalVolumeControl(transfer.snapshot, transfer.state, 'ROI pick')
  assert.equal(roi.state.selectedRoiId, 's1-roi-margin')
  assert.equal(findNode(roi.snapshot, 's1-roi-label').text, 'roi: s1-roi-margin')
  assert.equal(findNode(roi.snapshot, 's1-roi-margin').stroke, '#f59e0b')

  const capture = applyS1MedicalVolumeControl(roi.snapshot, roi.state, 'capture frame')
  assert.equal(capture.state.captureId, 1)
  assert.equal(findNode(capture.snapshot, 's1-capture-status').text, 'capture: 1')
})

test('S1 medical volume harness declares slice transfer ROI and capture controls', () => {
  const harness = PLAYGROUND_SCENARIO_INTERACTION_HARNESSES.find((entry) => entry.scenarioId === S1_ID)
  assert.ok(harness)
  assert.deepEqual(
    harness.controls,
    ['slice scrub', 'transfer function', 'ROI pick', 'capture frame', 'fit view'],
  )
  assert.equal(harness.deterministicStateKeys.includes('transferPreset'), true)
  assert.equal(harness.deterministicStateKeys.includes('selectedRoiId'), true)
  assert.equal(harness.deterministicStateKeys.includes('captureId'), true)
})
