import assert from 'node:assert/strict'
import test from 'node:test'

import { hitTestLayeredCommands } from './hitTest.ts'

test('hitTestLayeredCommands prioritizes active layer over base layer', () => {
  const hit = hitTestLayeredCommands({
    commands: [
      {
        id: 'base:rect',
        nodeId: 'base-rect',
        layer: 'base',
        nodeType: 'shape',
        bounds: {x: 0, y: 0, width: 100, height: 100},
      },
      {
        id: 'active:rect',
        nodeId: 'active-rect',
        layer: 'active',
        nodeType: 'shape',
        bounds: {x: 0, y: 0, width: 100, height: 100},
      },
    ],
    point: {x: 50, y: 50},
  })

  // Active layer should win hit priority when bounds overlap.
  assert.equal(hit?.layer, 'active')
  assert.equal(hit?.nodeId, 'active-rect')
})
