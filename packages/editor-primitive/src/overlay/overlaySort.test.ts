import assert from 'node:assert/strict'
import test from 'node:test'

import type {OverlayNode} from './OverlayNode.ts'
import {sortOverlayNodesByZIndex} from './overlaySort.ts'

test('overlay sort orders by zIndex then id', () => {
  const nodes: OverlayNode[] = [
    {id: 'b', type: 'rect', coordinate: 'world', zIndex: 1},
    {id: 'a', type: 'rect', coordinate: 'world', zIndex: 1},
    {id: 'z', type: 'rect', coordinate: 'world', zIndex: 0},
  ]

  const sorted = sortOverlayNodesByZIndex(nodes)
  assert.deepEqual(sorted.map((item) => item.id), ['z', 'a', 'b'])
})
