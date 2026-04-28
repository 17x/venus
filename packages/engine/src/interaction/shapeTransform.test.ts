import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createIdentityAffineMatrix,
  createShapeTransformRecord,
  isPointInsideRotatedBounds,
  resolveNodeTransform,
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
