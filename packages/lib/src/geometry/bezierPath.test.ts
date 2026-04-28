/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {sampleBezierPathPolygon} from './bezierPath.ts'

test('sampleBezierPathPolygon returns empty list when input has fewer than two points', () => {
  const sampled = sampleBezierPathPolygon([{anchor: {x: 10, y: 20}}])

  assert.deepEqual(sampled, [])
})

test('sampleBezierPathPolygon includes first and last anchors for a single segment', () => {
  const sampled = sampleBezierPathPolygon([
    {
      anchor: {x: 0, y: 0},
      cp2: {x: 8, y: 0},
    },
    {
      cp1: {x: 12, y: 10},
      anchor: {x: 20, y: 10},
    },
  ], 6)

  assert.deepEqual(sampled[0], {x: 0, y: 0})
  assert.deepEqual(sampled[sampled.length - 1], {x: 20, y: 10})
})

test('sampleBezierPathPolygon skips duplicate seam point across adjacent segments', () => {
  const sampled = sampleBezierPathPolygon([
    {
      anchor: {x: 0, y: 0},
      cp2: {x: 5, y: 0},
    },
    {
      cp1: {x: 10, y: 0},
      anchor: {x: 10, y: 10},
      cp2: {x: 10, y: 15},
    },
    {
      cp1: {x: 15, y: 20},
      anchor: {x: 20, y: 20},
    },
  ], 4)

  const seamCount = sampled.filter((point) => point.x === 10 && point.y === 10).length

  assert.equal(seamCount, 1)
})