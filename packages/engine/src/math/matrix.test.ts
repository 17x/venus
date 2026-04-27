import test from 'node:test'
import assert from 'node:assert/strict'

import {applyMatrixToPoint, type Mat3} from './matrix.ts'

test('applyMatrixToPoint applies affine translation and scale components', () => {
  const matrix: Mat3 = [
    2, 0, 10,
    0, 3, -5,
    0, 0, 1,
  ]

  const result = applyMatrixToPoint(matrix, {x: 4, y: 6})

  assert.deepEqual(result, {x: 18, y: 13})
})

test('applyMatrixToPoint respects mixed affine coefficients', () => {
  const matrix: Mat3 = [
    1, 2, 3,
    4, 5, 6,
    0, 0, 1,
  ]

  const result = applyMatrixToPoint(matrix, {x: 2, y: -1})

  assert.deepEqual(result, {x: 3, y: 9})
})