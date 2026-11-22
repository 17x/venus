import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveEngineClipGeometry,
  resolveEngineGeometryRotationAroundPoint,
  resolveEngineShapeGeometry,
  rotateEnginePointAroundPoint,
} from './index.ts'

test('public API returns canonical shape and clip geometry payloads', () => {
  const shapePayload = resolveEngineShapeGeometry({
    id: 'star-api',
    type: 'shape',
    shape: 'star',
    points: [{x: 0, y: 10}, {x: 10, y: 0}, {x: 20, y: 10}, {x: 10, y: 20}],
    strokeWidth: 4,
    closed: true,
  })
  const clipPayload = resolveEngineClipGeometry('shape-api', {
    kind: 'path',
    points: [{x: 0, y: 0}, {x: 30, y: 0}, {x: 15, y: 30}],
    closed: true,
  })

  assert.equal(shapePayload.authoredKind, 'star')
  assert.equal(shapePayload.hitTestKind, 'star')
  assert.deepEqual(shapePayload.strokeBounds, {x: -2, y: -2, width: 24, height: 24})
  assert.equal(clipPayload.source, 'clip')
  assert.equal(clipPayload.hitTestKind, 'path')
})

test('public API rotates generic geometry around a point', () => {
  const rotatedPoint = rotateEnginePointAroundPoint(
    {x: 20, y: 10},
    {x: 10, y: 10},
    90,
  )
  const rotatedGeometry = resolveEngineGeometryRotationAroundPoint({
    bounds: {minX: 0, minY: 0, maxX: 20, maxY: 0},
    points: [{x: 0, y: 0}, {x: 20, y: 0}],
    center: {x: 10, y: 0},
    rotationDegrees: 90,
  })

  assert.deepEqual(
    {x: Math.round(rotatedPoint.x), y: Math.round(rotatedPoint.y)},
    {x: 10, y: 20},
  )
  assert.deepEqual(
    rotatedGeometry.points.map((point) => ({x: Math.round(point.x), y: Math.round(point.y)})),
    [{x: 10, y: -10}, {x: 10, y: 10}],
  )
})
