import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveLayeredRenderBridgeOutput,
} from './layeredBridge.ts'

test('resolveLayeredRenderBridgeOutput maps runtime frame into layered output', () => {
  const output = resolveLayeredRenderBridgeOutput({
    scene: {
      revision: 'bridge-1',
      width: 1000,
      height: 1000,
      nodes: [
        {
          id: 'shape-1',
          type: 'shape',
          shape: 'rect',
          x: 20,
          y: 40,
          width: 100,
          height: 80,
        },
      ],
    },
    viewport: {
      viewportWidth: 500,
      viewportHeight: 400,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    context: {
      quality: 'full',
    },
  })

  // Compatibility bridge should produce base-first layered output for runtime migration.
  assert.equal(output.base.length, 1)
  assert.equal(output.active.length, 0)
  assert.equal(output.overlay.length, 0)
  assert.deepEqual(output.composed.map((command) => command.layer), ['base'])
})

test('resolveLayeredRenderBridgeOutput keeps protected nodes in base layer without interaction active ids', () => {
  const output = resolveLayeredRenderBridgeOutput({
    scene: {
      revision: 'bridge-2',
      width: 1000,
      height: 1000,
      nodes: [
        {
          id: 'shape-1',
          type: 'shape',
          shape: 'rect',
          x: 20,
          y: 40,
          width: 100,
          height: 80,
        },
      ],
    },
    viewport: {
      viewportWidth: 500,
      viewportHeight: 400,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    context: {
      quality: 'full',
      protectedNodeIds: ['shape-1'],
    },
  })

  // Bridge migration behavior keeps protected ids rendered through active layer to avoid base-active double draw.
  assert.equal(output.base.length, 1)
  assert.equal(output.active.length, 0)
  assert.deepEqual(output.composed.map((command) => command.layer), ['base'])
})

test('resolveLayeredRenderBridgeOutput prioritizes interaction active ids over protected fallback ids', () => {
  const output = resolveLayeredRenderBridgeOutput({
    scene: {
      revision: 'bridge-3',
      width: 1000,
      height: 1000,
      nodes: [
        {
          id: 'shape-1',
          type: 'shape',
          shape: 'rect',
          x: 20,
          y: 40,
          width: 100,
          height: 80,
        },
        {
          id: 'shape-2',
          type: 'shape',
          shape: 'ellipse',
          x: 140,
          y: 60,
          width: 80,
          height: 80,
        },
      ],
    },
    viewport: {
      viewportWidth: 500,
      viewportHeight: 400,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    context: {
      quality: 'full',
      interactionActiveNodeIds: ['shape-2'],
      protectedNodeIds: ['shape-1'],
    },
  })

  // Active-layer routing depends only on explicit interaction-active ids.
  assert.deepEqual(output.base.map((command) => command.nodeId), ['shape-1'])
  assert.deepEqual(output.active.map((command) => command.nodeId), ['shape-2'])
  assert.deepEqual(output.composed.map((command) => command.layer), ['base', 'active'])
})
