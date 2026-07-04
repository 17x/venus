import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {createMutableEngineSceneState} from '../patch/patch.ts'
import {hitTestEngineSceneState} from './hitTest.ts'

describe('engine scene hit-test', () => {
  it('maps internal render nodes back to their public hit target id', () => {
    const state = createMutableEngineSceneState({
      revision: 1,
      width: 200,
      height: 160,
      nodes: [
        {
          id: 'frame',
          type: 'group',
          children: [
            {
              id: 'frame__background',
              type: 'shape',
              shape: 'rect',
              x: 10,
              y: 20,
              width: 100,
              height: 80,
              fill: '#ffffff',
              hitTargetId: 'frame',
            },
          ],
        },
      ],
    })

    const hit = hitTestEngineSceneState(state, {x: 30, y: 40})

    assert.equal(hit?.nodeId, 'frame')
    assert.equal(hit?.nodeType, 'group')
  })
})
