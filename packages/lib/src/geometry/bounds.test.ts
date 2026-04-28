/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  intersectNormalizedBounds,
} from './bounds.ts'

test('getNormalizedBoundsFromBox normalizes negative dimensions', () => {
  const bounds = getNormalizedBoundsFromBox(10, 20, -4, -6)

  assert.deepEqual(bounds, {
    minX: 6,
    minY: 14,
    maxX: 10,
    maxY: 20,
    width: 4,
    height: 6,
  })
})

test('doNormalizedBoundsOverlap excludes edge touching bounds', () => {
  const overlap = doNormalizedBoundsOverlap(
    {minX: 0, minY: 0, maxX: 10, maxY: 10},
    {minX: 10, minY: 0, maxX: 20, maxY: 10},
  )

  assert.equal(overlap, false)
})

test('intersectNormalizedBounds returns null when overlap area is zero', () => {
  const intersection = intersectNormalizedBounds(
    {minX: 0, minY: 0, maxX: 10, maxY: 10},
    {minX: 10, minY: 0, maxX: 20, maxY: 10},
  )

  assert.equal(intersection, null)
})

test('intersectNormalizedBounds returns shared area when overlap exists', () => {
  const intersection = intersectNormalizedBounds(
    {minX: 0, minY: 0, maxX: 10, maxY: 10},
    {minX: 2, minY: 3, maxX: 7, maxY: 12},
  )

  assert.deepEqual(intersection, {
    minX: 2,
    minY: 3,
    maxX: 7,
    maxY: 10,
  })
})

