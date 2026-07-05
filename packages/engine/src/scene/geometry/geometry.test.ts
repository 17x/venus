import assert from 'node:assert/strict'
import test from 'node:test'

import {
  cubicBezierPoint,
  closePolylinePoints,
  getBoundingRectFromBezierPoints,
  getCubicExtrema,
  isGeometryPathClosed,
  rectBoundsToPolyline,
} from './index.ts'
import type {EngineBezierPoint, EngineShapeNode} from '../types/types.ts'

test('geometry bezier helpers expose cubic sampling and bounds', () => {
  const start = {x: 0, y: 0}
  const cp1 = {x: 20, y: 40}
  const cp2 = {x: 80, y: 40}
  const end = {x: 100, y: 0}
  const mid = cubicBezierPoint(0.5, start, cp1, cp2, end)

  assert.deepEqual(mid, {x: 50, y: 30})

  const points: EngineBezierPoint[] = [
    {anchor: start, cp2: cp1},
    {anchor: end, cp1: cp2},
  ]
  const bounds = getBoundingRectFromBezierPoints(points)

  assert.equal(bounds.x, 0)
  assert.equal(bounds.width, 100)
  assert.ok(bounds.height > 29)
  assert.ok(bounds.height < 31)
})

test('geometry path helper detects closed point and bezier shapes', () => {
  const polygonLike: EngineShapeNode = {
    id: 'polygon-like',
    type: 'shape',
    shape: 'polygon',
    points: [{x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 0}],
  }
  const openPath: EngineShapeNode = {
    id: 'open-path',
    type: 'shape',
    shape: 'path',
    bezierPoints: [
      {anchor: {x: 0, y: 0}},
      {anchor: {x: 10, y: 0}},
      {anchor: {x: 20, y: 0}},
    ],
  }

  assert.equal(isGeometryPathClosed(polygonLike), true)
  assert.equal(isGeometryPathClosed(openPath), false)
})

test('geometry cubic extrema keeps roots inside the open unit interval', () => {
  const extrema = getCubicExtrema(0, 40, 40, 0)

  assert.deepEqual(extrema, [0.5])
})

test('geometry polyline helpers close paths and convert rect bounds', () => {
  assert.deepEqual(closePolylinePoints([
    {x: 0, y: 0},
    {x: 10, y: 0},
  ]), [
    {x: 0, y: 0},
    {x: 10, y: 0},
    {x: 0, y: 0},
  ])

  assert.deepEqual(rectBoundsToPolyline({
    minX: 1,
    minY: 2,
    maxX: 5,
    maxY: 7,
  }), [
    {x: 1, y: 2},
    {x: 5, y: 2},
    {x: 5, y: 7},
    {x: 1, y: 7},
    {x: 1, y: 2},
  ])
})
