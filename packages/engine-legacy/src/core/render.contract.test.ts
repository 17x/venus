import assert from 'node:assert/strict'
import test from 'node:test'

import { renderLayeredScene } from './render.ts'
import type { EngineLayeredRenderInput, EngineRenderCamera } from './types.ts'
import type { EngineSceneSnapshot } from '../scene/types/types.ts'

/**
 * Deep-freezes one value recursively for side-effect contract assertions.
  * @param value value parameter.
*/
function deepFreezeValue<TValue>(value: TValue): TValue {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const entry of Object.values(value as Record<string, unknown>)) {
      if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) {
        deepFreezeValue(entry)
      }
    }
  }

  return value
}

test('renderLayeredScene does not mutate input scene and camera', () => {
  const scene = deepFreezeValue<EngineSceneSnapshot>({
    revision: 'contract-1',
    width: 1200,
    height: 900,
    nodes: [
      {
        id: 'shape-1',
        type: 'shape',
        shape: 'rect',
        x: 20,
        y: 30,
        width: 120,
        height: 80,
      },
    ],
  })
  const camera = deepFreezeValue<EngineRenderCamera>({
    viewportWidth: 800,
    viewportHeight: 600,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  })

  const input: EngineLayeredRenderInput = {
    scene,
    camera,
    interaction: {},
  }
  const output = renderLayeredScene(input)

  // Contract check ensures rendering path does not mutate scene/camera inputs.
  assert.equal(output.composed.length, 1)
  assert.equal(scene.nodes[0]?.id, 'shape-1')
  assert.equal(camera.viewportWidth, 800)
})
