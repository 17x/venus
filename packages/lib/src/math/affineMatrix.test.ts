/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  createIdentityAffineMatrix,
  createRotationAffineMatrix,
  createScaleAffineMatrix,
  createTranslationAffineMatrix,
  invertAffineMatrix,
  multiplyAffineMatrices,
} from './affineMatrix.ts'

test('createIdentityAffineMatrix returns neutral tuple', () => {
  const matrix = createIdentityAffineMatrix()

  assert.deepEqual(matrix, [1, 0, 0, 1, 0, 0])
})

test('multiplyAffineMatrices composes translation after scaling', () => {
  const scale = createScaleAffineMatrix(2, 3)
  const translate = createTranslationAffineMatrix(5, -2)
  const matrix = multiplyAffineMatrices(translate, scale)
  const point = applyAffineMatrixToPoint(matrix, {x: 4, y: 1})

  // Verify matrix multiplication order stays stable for interaction pipelines.
  assert.deepEqual(point, {x: 13, y: 1})
})

test('invertAffineMatrix returns identity for singular matrix', () => {
  const inverse = invertAffineMatrix([0, 0, 0, 0, 5, 7])

  // Singular matrices are intentionally guarded to avoid NaN propagation.
  assert.deepEqual(inverse, [1, 0, 0, 1, 0, 0])
})

test('invertAffineMatrix composes back to identity for invertible matrix', () => {
  const matrix = multiplyAffineMatrices(
    createTranslationAffineMatrix(20, -10),
    multiplyAffineMatrices(createRotationAffineMatrix(30), createScaleAffineMatrix(-1, 2)),
  )
  const inverse = invertAffineMatrix(matrix)
  const combined = multiplyAffineMatrices(matrix, inverse)

  assert.ok(Math.abs(combined[0] - 1) < 1e-9)
  assert.ok(Math.abs(combined[1]) < 1e-9)
  assert.ok(Math.abs(combined[2]) < 1e-9)
  assert.ok(Math.abs(combined[3] - 1) < 1e-9)
  assert.ok(Math.abs(combined[4]) < 1e-9)
  assert.ok(Math.abs(combined[5]) < 1e-9)
})

test('createAffineMatrixAroundPoint keeps center fixed during rotation', () => {
  const center = {x: 50, y: 10}
  const matrix = createAffineMatrixAroundPoint(center, {rotationDegrees: 90})
  const result = applyAffineMatrixToPoint(matrix, center)

  assert.ok(Math.abs(result.x - center.x) < 1e-9)
  assert.ok(Math.abs(result.y - center.y) < 1e-9)
})

