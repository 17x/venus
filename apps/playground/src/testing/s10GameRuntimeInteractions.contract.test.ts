import assert from 'node:assert/strict'
import test from 'node:test'
import {applyS10PickNode, applyS10PreviewStep} from '../demos/s10GameRuntimeInteractions'
import type {PlaygroundSceneSnapshot} from '../types/playgroundScene'

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
