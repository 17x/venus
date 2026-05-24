import assert from 'node:assert/strict'
import test from 'node:test'

import { composeLayeredDrawCommands } from './compose.ts'
import { renderLayeredScene } from './render.ts'

test('composeLayeredDrawCommands keeps strict base-active-overlay order', () => {
  const composed = composeLayeredDrawCommands({
    base: [{
      id: 'base:1',
      nodeId: 'n1',
      layer: 'base',
      nodeType: 'shape',
      bounds: {x: 0, y: 0, width: 10, height: 10},
    }],
    active: [{
      id: 'active:1',
      nodeId: 'n2',
      layer: 'active',
      nodeType: 'shape',
      bounds: {x: 0, y: 0, width: 10, height: 10},
    }],
    overlay: [{
      id: 'overlay:1',
      nodeId: 'n3',
      layer: 'overlay',
      nodeType: 'shape',
      bounds: {x: 0, y: 0, width: 0, height: 0},
      marker: 'selection',
    }],
  })

  // Layer order must remain stable for deterministic draw precedence.
  assert.deepEqual(composed.map((command) => command.layer), ['base', 'active', 'overlay'])
})

test('renderLayeredScene emits baseline material/lighting bindings for shape draw commands', () => {
  const output = renderLayeredScene({
    scene: {
      revision: 'phase-e-layered',
      width: 100,
      height: 100,
      nodes: [{
        id: 'shape-1',
        type: 'shape',
        shape: 'rect',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        fill: '#123456',
      }],
    },
    camera: {
      viewportWidth: 100,
      viewportHeight: 100,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    interaction: {},
  })

  assert.equal(output.base.length, 1)
  assert.equal(output.base[0]?.material?.shadingModel, 'unlit')
  assert.equal(output.base[0]?.lighting?.mode, 'none')
})
