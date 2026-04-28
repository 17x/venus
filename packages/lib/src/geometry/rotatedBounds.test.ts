/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {isPointInsideRotatedBounds} from './rotatedBounds.ts'

test('isPointInsideRotatedBounds behaves like axis-aligned hit test for zero rotation', () => {
  assert.equal(
    isPointInsideRotatedBounds(
      {x: 5, y: 5},
      {minX: 0, minY: 0, maxX: 10, maxY: 10},
      0,
    ),
    true,
  )
  assert.equal(
    isPointInsideRotatedBounds(
      {x: 12, y: 5},
      {minX: 0, minY: 0, maxX: 10, maxY: 10},
      0,
    ),
    false,
  )
})

test('isPointInsideRotatedBounds keeps rotated corners hittable', () => {
  const result = isPointInsideRotatedBounds(
    {x: 10, y: 0},
    {minX: 0, minY: 0, maxX: 20, maxY: 10},
    45,
  )

  // Rotated hit testing should still include points on transformed boundary.
  assert.equal(result, true)
})

test('isPointInsideRotatedBounds rejects distant points after rotation', () => {
  const result = isPointInsideRotatedBounds(
    {x: 40, y: 40},
    {minX: 0, minY: 0, maxX: 20, maxY: 10},
    45,
  )

  assert.equal(result, false)
})

