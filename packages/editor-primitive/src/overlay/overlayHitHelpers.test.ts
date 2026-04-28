import assert from 'node:assert/strict'
import test from 'node:test'

import {expandOverlayHitBounds, isPointInsideOverlayBounds} from './overlayHitHelpers.ts'

test('overlay hit helpers expand bounds and test containment', () => {
  const bounds = {minX: 10, minY: 10, maxX: 20, maxY: 20}
  const expanded = expandOverlayHitBounds(bounds, 2)
  assert.deepEqual(expanded, {minX: 8, minY: 8, maxX: 22, maxY: 22})

  assert.equal(isPointInsideOverlayBounds({x: 9, y: 9}, bounds, 1), true)
  assert.equal(isPointInsideOverlayBounds({x: 9, y: 9}, bounds, 0), false)
})
