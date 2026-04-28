import assert from 'node:assert/strict'
import test from 'node:test'

import { renderLayeredScene } from './render.ts'
import type { EngineLayeredRenderInput } from './types.ts'

test('renderLayeredScene keeps deterministic output for identical inputs', () => {
  const input: EngineLayeredRenderInput = {
    scene: {
      revision: 'determinism-1',
      width: 1000,
      height: 1000,
      nodes: [
        {
          id: 'shape-1',
          type: 'shape',
          shape: 'rect',
          x: 100,
          y: 120,
          width: 200,
          height: 140,
          fill: '#222222',
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
      activeIds: new Set(['shape-1']),
      selectionIds: new Set(['shape-1']),
    },
  }

  const first = renderLayeredScene(input)
  const second = renderLayeredScene(input)

  // Determinism check ensures stable command ordering and payload values.
  assert.deepEqual(second, first)
})
