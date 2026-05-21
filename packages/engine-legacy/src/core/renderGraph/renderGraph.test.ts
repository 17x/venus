import assert from 'node:assert/strict'
import test from 'node:test'

import { createLayeredRenderGraph, executeEngineRenderGraph } from './renderGraph.ts'
import type { EngineLayeredRenderInput } from '../types.ts'

test('executeEngineRenderGraph resolves base/active/overlay/composite passes in deterministic order', () => {
  const input: EngineLayeredRenderInput = {
    scene: {
      revision: 'graph-1',
      width: 1000,
      height: 800,
      nodes: [
        {
          id: 'shape-base',
          type: 'shape',
          shape: 'rect',
          x: 10,
          y: 20,
          width: 100,
          height: 60,
        },
        {
          id: 'shape-active',
          type: 'shape',
          shape: 'rect',
          x: 100,
          y: 120,
          width: 80,
          height: 40,
        },
      ],
    },
    camera: {
      viewportWidth: 800,
      viewportHeight: 600,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    interaction: {
      activeIds: new Set(['shape-active']),
    },
    options: {
      viewport: {
        x: 0,
        y: 0,
        width: 1000,
        height: 800,
      },
    },
  }

  const graph = createLayeredRenderGraph()
  const output = executeEngineRenderGraph(graph, input)

  assert.deepEqual(graph.passOrder, ['base-pass', 'active-pass', 'overlay-pass', 'composite-pass'])
  assert.equal(output.passOutputs['base-pass'].length, 1)
  assert.equal(output.passOutputs['active-pass'].length, 1)
  assert.equal(output.passOutputs['overlay-pass'].length, 1)
  assert.equal(output.passOutputs['composite-pass'].length, output.composed.length)
  assert.deepEqual(
    output.composed.map((command) => command.layer),
    ['base', 'active', 'overlay'],
  )
})
