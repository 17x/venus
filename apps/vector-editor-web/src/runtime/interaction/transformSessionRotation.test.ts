import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createTransformSessionManager,
  createTransformSessionShape,
} from './transformSessionManager.ts'

/**
 * Creates one deterministic transform session shape for reflection tests.
 * @param overrides Optional partial overrides for the shape payload.
 */
function createFixtureShape(overrides?: Partial<{
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  flipX: boolean
  flipY: boolean
}>) {
  return createTransformSessionShape({
    id: overrides?.id ?? 'shape-1',
    x: overrides?.x ?? 0,
    y: overrides?.y ?? 0,
    width: overrides?.width ?? 100,
    height: overrides?.height ?? 80,
    rotation: overrides?.rotation ?? 30,
    flipX: overrides?.flipX ?? false,
    flipY: overrides?.flipY ?? false,
  })
}

/**
 * Resolves aggregate bounds for one shape array.
 * @param shapes Transform-session shape list.
 */
function resolveAggregateBounds(shapes: Array<{bounds: {minX: number; minY: number; maxX: number; maxY: number}}>) {
  return {
    minX: Math.min(...shapes.map((shape) => shape.bounds.minX)),
    minY: Math.min(...shapes.map((shape) => shape.bounds.minY)),
    maxX: Math.max(...shapes.map((shape) => shape.bounds.maxX)),
    maxY: Math.max(...shapes.map((shape) => shape.bounds.maxY)),
  }
}

/**
 * Resolves one point at radius/angle around center for rotation-handle tests.
 * @param center Rotation center.
 * @param radius Radius from center.
 * @param angleDegrees Angle in degrees.
 */
function resolvePointAroundCenter(
  center: {x: number; y: number},
  radius: number,
  angleDegrees: number,
) {
  const radians = (angleDegrees * Math.PI) / 180
  return {
    x: center.x + Math.cos(radians) * radius,
    y: center.y + Math.sin(radians) * radius,
  }
}

/**
 * Verifies single-shape rotated resize mirrors rotation when crossing one axis.
 */
test('single rotated resize flips rotation sign when width is reflected', () => {
  const manager = createTransformSessionManager()
  const shape = createFixtureShape()

  manager.start({
    shapeIds: [shape.shapeId],
    shapes: [shape],
    handle: 'w',
    pointer: {x: 0, y: 40},
    startBounds: {
      minX: shape.bounds.minX,
      minY: shape.bounds.minY,
      maxX: shape.bounds.maxX,
      maxY: shape.bounds.maxY,
    },
  })

  const preview = manager.update({x: 220, y: 40})
  assert.ok(preview)
  assert.equal(preview.shapes.length, 1)

  const nextShape = preview.shapes[0]
  assert.equal(nextShape.flipX, true)
  assert.equal(nextShape.flipY, false)
  assert.equal(nextShape.rotation, 330)
})

/**
 * Verifies multi-shape resize reflects each element rotation on single-axis crossing.
 */
test('multi-shape west resize reflects rotations and flips when crossing x axis', () => {
  const manager = createTransformSessionManager()
  const shapeA = createFixtureShape({
    id: 'shape-a',
    x: 0,
    y: 0,
    rotation: 30,
  })
  const shapeB = createFixtureShape({
    id: 'shape-b',
    x: 180,
    y: 40,
    rotation: 120,
  })
  const startBounds = resolveAggregateBounds([shapeA, shapeB])
  const sourceWidth = startBounds.maxX - startBounds.minX

  manager.start({
    shapeIds: [shapeA.shapeId, shapeB.shapeId],
    shapes: [shapeA, shapeB],
    handle: 'w',
    pointer: {x: startBounds.minX, y: (startBounds.minY + startBounds.maxY) / 2},
    startBounds,
  })

  const preview = manager.update({
    x: startBounds.minX + sourceWidth + 20,
    y: (startBounds.minY + startBounds.maxY) / 2,
  })
  assert.ok(preview)
  assert.equal(preview.shapes.length, 2)

  const previewById = new Map(preview.shapes.map((shape) => [shape.shapeId, shape]))
  const nextShapeA = previewById.get(shapeA.shapeId)
  const nextShapeB = previewById.get(shapeB.shapeId)
  assert.ok(nextShapeA)
  assert.ok(nextShapeB)
  assert.equal(nextShapeA?.flipX, true)
  assert.equal(nextShapeB?.flipX, true)
  assert.equal(nextShapeA?.rotation, 330)
  assert.equal(nextShapeB?.rotation, 240)
})

/**
 * Verifies rotate-handle preview delta remains continuous across +/-180 degree seam.
 */
test('rotate preview keeps shortest-angle continuity across seam', () => {
  const manager = createTransformSessionManager()
  const shape = createFixtureShape({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
  })
  const startBounds = resolveAggregateBounds([shape])
  const center = {
    x: (startBounds.minX + startBounds.maxX) / 2,
    y: (startBounds.minY + startBounds.maxY) / 2,
  }

  manager.start({
    shapeIds: [shape.shapeId],
    shapes: [shape],
    handle: 'rotate',
    pointer: resolvePointAroundCenter(center, 200, 179),
    startBounds,
  })

  const preview = manager.update(resolvePointAroundCenter(center, 200, -179))
  assert.ok(preview)
  assert.equal(preview.shapes.length, 1)

  const nextRotation = preview.shapes[0].rotation
  assert.ok(nextRotation > 1 && nextRotation < 3)
})
