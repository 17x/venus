import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanvas2DBackendExecution} from '../canvas2dBackendExecution'

/**
 * Verifies Canvas2D backend execution performs deterministic clear and packet count behavior.
 */
test('createCanvas2DBackendExecution clears context and reports packet count', () => {
  const operations: string[] = []
  const context = {
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    setTransform: () => operations.push('setTransform'),
    clearRect: () => operations.push('clearRect'),
  }

  const backend = createCanvas2DBackendExecution({
    width: 200,
    height: 100,
    canvas: {
      getContext: () => context,
    },
  })

  const executedCount = backend.executePackets(10, [
    {id: 'a', kind: 'draw', payload: {}},
    {id: 'b', kind: 'present', payload: {}},
  ])

  assert.equal(executedCount, 2)
  assert.deepEqual(operations, ['save', 'setTransform', 'clearRect', 'restore'])
})
