import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createIdentityAffineMatrix,
  createEngineRotateAroundPointMatrix,
  createShapeTransformRecord,
  isPointInsideRotatedBounds,
  resolveEngineGeometryRotationAroundPoint,
  resolveEngineTransformedBoundsFromBox,
  resolveNodeTransform,
  rotateEnginePointAroundPoint,
} from './shapeTransform.ts'

test('createIdentityAffineMatrix keeps legacy tuple shape', () => {
  const matrix = createIdentityAffineMatrix()

  assert.deepEqual(matrix, [1, 0, 0, 1, 0, 0])
})

test('createShapeTransformRecord backfills optional transform fields', () => {
  const record = createShapeTransformRecord({
    x: 10,
    y: 20,
    width: 50,
    height: 30,
  })

  assert.equal(record.rotation, 0)
  assert.equal(record.flipX, false)
  assert.equal(record.flipY, false)
})

test('resolveNodeTransform computes center and inverse matrix for mirrored node', () => {
  const resolved = resolveNodeTransform({
    x: 0,
    y: 0,
    width: 40,
    height: 20,
    rotation: 15,
    flipX: true,
    flipY: false,
  })

  assert.equal(resolved.center.x, 20)
  assert.equal(resolved.center.y, 10)
  assert.equal(Array.isArray(resolved.inverseMatrix), true)
})

test('isPointInsideRotatedBounds remains true for center point under rotation', () => {
  const inside = isPointInsideRotatedBounds(
    {x: 20, y: 10},
    {minX: 0, minY: 0, maxX: 40, maxY: 20},
    60,
  )

  // The center point must remain inside regardless of rotation.
  assert.equal(inside, true)
})

test('resolveEngineTransformedBoundsFromBox returns world-aligned bounds for rotated boxes', () => {
  const bounds = resolveEngineTransformedBoundsFromBox({
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    rotation: 90,
  })

  assert.equal(Math.round(bounds.minX), 40)
  assert.equal(Math.round(bounds.minY), -40)
  assert.equal(Math.round(bounds.maxX), 60)
  assert.equal(Math.round(bounds.maxY), 60)
  assert.equal(Math.round(bounds.width), 20)
  assert.equal(Math.round(bounds.height), 100)
})

test('rotateEnginePointAroundPoint keeps pivot stable and rotates source point', () => {
  const center = {x: 10, y: 10}
  const matrix = createEngineRotateAroundPointMatrix(center, 90)
  const pivot = rotateEnginePointAroundPoint(center, center, 90)
  const rotated = rotateEnginePointAroundPoint({x: 20, y: 10}, center, 90)

  assert.ok(Math.abs(pivot.x - center.x) < 1e-9)
  assert.ok(Math.abs(pivot.y - center.y) < 1e-9)
  assert.ok(Math.abs(rotated.x - 10) < 1e-9)
  assert.ok(Math.abs(rotated.y - 20) < 1e-9)
  assert.deepEqual(matrix.map((value) => Math.round(value)), [0, 1, -1, 0, 20, 0])
})

test('resolveEngineGeometryRotationAroundPoint supports bounds and point geometry', () => {
  const boxRotation = resolveEngineGeometryRotationAroundPoint({
    bounds: {minX: 0, minY: 0, maxX: 100, maxY: 20},
    center: {x: 50, y: 10},
    rotationDegrees: 90,
  })
  const pointRotation = resolveEngineGeometryRotationAroundPoint({
    bounds: {minX: 0, minY: 0, maxX: 100, maxY: 0},
    points: [{x: 0, y: 0}, {x: 100, y: 0}],
    center: {x: 50, y: 0},
    rotationDegrees: 90,
  })

  assert.equal(boxRotation.points.length, 4)
  assert.equal(Math.round(boxRotation.bounds.width), 20)
  assert.equal(Math.round(boxRotation.bounds.height), 100)
  assert.deepEqual(
    pointRotation.points.map((point) => ({x: Math.round(point.x), y: Math.round(point.y)})),
    [{x: 50, y: -50}, {x: 50, y: 50}],
  )
  assert.deepEqual(
    {
      minX: Math.round(pointRotation.bounds.minX),
      minY: Math.round(pointRotation.bounds.minY),
      maxX: Math.round(pointRotation.bounds.maxX),
      maxY: Math.round(pointRotation.bounds.maxY),
    },
    {minX: 50, minY: -50, maxX: 50, maxY: 50},
  )
})
