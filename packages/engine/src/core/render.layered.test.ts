import assert from 'node:assert/strict'
import test from 'node:test'

import { composeLayeredDrawCommands } from './compose.ts'

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
