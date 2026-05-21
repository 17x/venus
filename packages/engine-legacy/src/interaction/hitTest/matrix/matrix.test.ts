/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import { createAffineMatrixAroundPoint, applyAffineMatrixToPoint } from '@venus/lib/math'

import { resolveShapeHitPointer } from './matrix.ts'

// Check transformed coordinates with tolerance so floating-point noise does not fail stable behavior checks.
/**
 * Handles assertPointApproximately.
 * @param actual actual parameter.
 * @param expected expected parameter.
 * @param epsilon epsilon parameter.
 */
function assertPointApproximately(
  actual: {x: number; y: number},
  expected: {x: number; y: number},
  epsilon = 1e-6,
): void {
  assert.ok(Math.abs(actual.x - expected.x) <= epsilon)
  assert.ok(Math.abs(actual.y - expected.y) <= epsilon)
}

test('resolveShapeHitPointer keeps identity transform unchanged', () => {
  const pointer = {x: 40, y: 16}
  const shape = {
    id: 'shape',
    x: 10,
    y: 6,
    width: 12,
    height: 8,
  }

  const resolved = resolveShapeHitPointer(pointer, shape)

  assert.deepEqual(resolved, pointer)
})

test('resolveShapeHitPointer maps transformed pointer back to local coordinates', () => {
  const shape = {
    id: 'shape',
    x: 10,
    y: 20,
    width: 30,
    height: 20,
    rotation: 30,
    flipX: true,
    flipY: false,
  }
  const center = {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2,
  }
  const localPointer = {x: 18, y: 26}
  const worldPointer = applyAffineMatrixToPoint(
    createAffineMatrixAroundPoint(center, {
      rotationDegrees: shape.rotation,
      scaleX: -1,
      scaleY: 1,
    }),
    localPointer,
  )

  const resolved = resolveShapeHitPointer(worldPointer, shape)

  assertPointApproximately(resolved, localPointer)
})

test('resolveShapeHitPointer composes parent and child transforms', () => {
  const parent = {
    id: 'parent',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 45,
  }
  const child = {
    id: 'child',
    parentId: parent.id,
    x: 20,
    y: 10,
    width: 30,
    height: 20,
    rotation: 15,
  }
  const localPointer = {x: 26, y: 17}
  const childWorldPointer = applyAffineMatrixToPoint(
    createAffineMatrixAroundPoint(
      {x: child.x + child.width / 2, y: child.y + child.height / 2},
      {rotationDegrees: child.rotation},
    ),
    localPointer,
  )
  const worldPointer = applyAffineMatrixToPoint(
    createAffineMatrixAroundPoint(
      {x: parent.x + parent.width / 2, y: parent.y + parent.height / 2},
      {rotationDegrees: parent.rotation},
    ),
    childWorldPointer,
  )

  const resolved = resolveShapeHitPointer(worldPointer, child, new Map([
    [parent.id, parent],
    [child.id, child],
  ]))

  assertPointApproximately(resolved, localPointer)
})

test('resolveShapeHitPointer falls back to original pointer for invalid transforms', () => {
  const pointer = {x: 8, y: 12}
  const shape = {
    id: 'shape',
    x: 10,
    y: 12,
    width: 6,
    height: 6,
    rotation: Number.POSITIVE_INFINITY,
  }

  const resolved = resolveShapeHitPointer(pointer, shape)

  assert.deepEqual(resolved, pointer)
})