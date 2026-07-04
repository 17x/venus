import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import type {VenusNode} from '../../Venus.ts'
import {resolveVenusDetailedHits, resolveVenusHitTestOptions} from './hitTest.ts'

describe('Venus hit-test metadata', () => {
  it('treats star nodes as polygon-backed anchor and fill targets', () => {
    const star: VenusNode = {
      id: 'star',
      type: 'star',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      points: [
        {x: 50, y: 0},
        {x: 62, y: 36},
        {x: 100, y: 36},
      ],
      fill: '#fde047',
    }

    const [hit] = resolveVenusDetailedHits({
      point: {x: 50, y: 0},
      options: resolveVenusHitTestOptions({phase: 'click'}),
      hits: [{nodeId: 'star', hitPoint: {x: 50, y: 0}}],
      resolveNode: () => star,
      resolveBounds: () => ({x: 0, y: 0, width: 100, height: 100}),
    })

    assert.equal(hit?.documentType, 'star')
    assert.equal(hit?.target.kind, 'shape.anchor')
    assert.equal(hit?.target.anchorIndex, 0)
    assert.deepEqual(hit?.regions.sort(), ['shape.anchor', 'shape.bounds', 'shape.center', 'shape.fill'].sort())
  })
})
