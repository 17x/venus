import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'
import {createEngine, createTestSurface} from '@venus/engine'
import {
  applyS10PickNode,
  applyS10PreviewControl,
  applyS10PreviewStep,
  compileS10AuthoringRuntimePreview,
  S10_GAME_PREVIEW_FIXED_TICK_MS,
} from '../demos/s10GameRuntimeInteractions'
import {PLAYGROUND_SCENARIO_INTERACTION_HARNESSES} from '../scenarios/scenarioInteractionHarnesses'
import type {PlaygroundSceneSnapshot} from '../types/playgroundScene'

const readSource = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')

function createS10SnapshotFixture(): PlaygroundSceneSnapshot {
  return {
    revision: 1,
    width: 1280,
    height: 760,
    nodes: [
      {id: 's10-node-0', type: 'shape', shape: 'ellipse', x: 100, y: 120, z: 8, depth: 8, stroke: '#cffafe', strokeWidth: 1},
      {id: 's10-node-1', type: 'shape', shape: 'ellipse', x: 180, y: 220, z: 12, depth: 8, stroke: '#cffafe', strokeWidth: 1},
      {id: 's10-link-0', type: 'shape', shape: 'line', x: 100, y: 120, width: 80, height: 100, stroke: '#67e8f9', strokeWidth: 1},
    ],
  }
}

test('s10 preview step increases deterministic step state and mutates node depth fields', () => {
  const snapshot = createS10SnapshotFixture()
  const result = applyS10PreviewStep(snapshot, {
    previewStep: 0,
    selectedNodeId: null,
    isPlaying: false,
  })

  assert.equal(result.state.previewStep, 1)
  const node0 = result.snapshot.nodes.find((node) => node.id === 's10-node-0') as Record<string, unknown> | undefined
  assert.ok(node0)
  assert.equal(typeof node0.y, 'number')
  assert.equal(typeof node0.z, 'number')
  assert.equal(typeof node0.depth, 'number')
})

test('s10 pick node highlights deterministic node by current preview step', () => {
  const snapshot = createS10SnapshotFixture()
  const result = applyS10PickNode(snapshot, {
    previewStep: 1,
    selectedNodeId: null,
    isPlaying: false,
  })

  assert.equal(result.state.selectedNodeId, 's10-node-1')
  const selected = result.snapshot.nodes.find((node) => node.id === 's10-node-1') as Record<string, unknown> | undefined
  const unselected = result.snapshot.nodes.find((node) => node.id === 's10-node-0') as Record<string, unknown> | undefined
  assert.ok(selected)
  assert.ok(unselected)
  assert.equal(selected.stroke, '#f59e0b')
  assert.equal(selected.strokeWidth, 3)
  assert.equal(unselected.stroke, '#cffafe')
  assert.equal(unselected.strokeWidth, 1)
})

test('s10 preview controls support play step stop and reset on fixed tick contract', () => {
  const snapshot = createS10SnapshotFixture()
  const initialState = {previewStep: 0, selectedNodeId: null, isPlaying: false}
  const play = applyS10PreviewControl(snapshot, initialState, 'play preview')
  assert.equal(S10_GAME_PREVIEW_FIXED_TICK_MS, 600)
  assert.equal(play.state.isPlaying, true)
  assert.equal(play.state.previewStep, 0)

  const step = applyS10PreviewControl(play.snapshot, play.state, 'runtime preview step')
  assert.equal(step.state.previewStep, 1)
  assert.equal(step.state.isPlaying, false)

  const stop = applyS10PreviewControl(step.snapshot, {...step.state, isPlaying: true}, 'stop preview')
  assert.equal(stop.state.isPlaying, false)
  assert.equal(stop.state.previewStep, 1)

  const reset = applyS10PreviewControl(stop.snapshot, stop.state, 'reset preview', snapshot)
  assert.equal(reset.state.previewStep, 0)
  assert.equal(reset.state.selectedNodeId, null)
  assert.equal(reset.state.isPlaying, false)
  assert.deepEqual(reset.snapshot, snapshot)

  const harness = PLAYGROUND_SCENARIO_INTERACTION_HARNESSES.find((entry) => entry.scenarioId === 's10-game-editor-runtime-preview')
  assert.ok(harness)
  assert.equal(harness.controls.includes('reset preview'), true)
})

test('s10 authoring/runtime preview compile path produces deterministic signatures', () => {
  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  try {
    const snapshot = createS10SnapshotFixture()
    const first = compileS10AuthoringRuntimePreview(engine, snapshot, 4)
    const second = compileS10AuthoringRuntimePreview(engine, snapshot, 4)

    assert.equal(first.matching, true)
    assert.equal(first.addedNodeCount, 0)
    assert.equal(first.removedNodeCount, 0)
    assert.equal(first.authoringSignature, first.runtimeSignature)
    assert.equal(first.previewSignature, first.runtimeSignature)
    assert.equal(first.previewStepIndex, 4)
    assert.equal(second.authoringSignature, first.authoringSignature)
    assert.equal(second.runtimeSignature, first.runtimeSignature)
  } finally {
    engine.dispose()
  }
})

test('s10 remote page exposes authoring runtime preview compile telemetry', () => {
  const source = readSource('src/demos/remoteScenarioPage.ts')
  assert.match(source, /compileS10AuthoringRuntimePreview\(engine, sceneSnapshot, interactionState\.previewStep\)/)
  assert.match(source, /`parity \$\{s10PreviewCompile\?\.matching/)
  assert.match(source, /`signature \$\{s10PreviewCompile\?\.runtimeSignature/)
  assert.match(source, /S10_GAME_PREVIEW_FIXED_TICK_MS/)
})
