import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../../model/index.ts'
import {createBooleanReplacePatches} from './shapeCommandHelpers.ts'

/**
 * Creates one compact overlapping-rectangle fixture for boolean regression tests.
 */
function createBooleanFixtureDocument(): EditorDocument {
  return {
    id: 'doc-boolean',
    name: 'boolean fixture',
    width: 800,
    height: 600,
    shapes: [
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'Rect A',
        parentId: null,
        x: 40,
        y: 40,
        width: 120,
        height: 100,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'Rect B',
        parentId: null,
        x: 100,
        y: 70,
        width: 120,
        height: 100,
      },
    ],
  }
}

/**
 * Ensures boolean outputs keep bezier anchors so follow-up path anchor editing remains available.
 */
test('createBooleanReplacePatches keeps boolean result path editable via bezier anchors', () => {
  const document = createBooleanFixtureDocument()
  const resolved = createBooleanReplacePatches(document, ['rect-a', 'rect-b'], 'union')

  assert.ok(resolved)
  assert.equal(resolved.patches.length > 0, true)

  const insertedShapes = resolved.patches
    .filter((patch): patch is Extract<(typeof resolved.patches)[number], {type: 'insert-shape'}> => patch.type === 'insert-shape')
    .map((patch) => patch.shape)

  assert.equal(insertedShapes.length >= 1, true)

  insertedShapes.forEach((shape) => {
    assert.equal(shape.type, 'path')
    assert.equal(Array.isArray(shape.points), true)
    assert.equal(Array.isArray(shape.bezierPoints), true)
    assert.equal((shape.bezierPoints?.length ?? 0) >= 4, true)
    assert.equal(shape.bezierPoints?.length, shape.points?.length)

    shape.bezierPoints?.forEach((bezierPoint, pointIndex) => {
      const sourcePoint = shape.points?.[pointIndex]
      assert.ok(sourcePoint)
      assert.equal(bezierPoint.anchor.x, sourcePoint.x)
      assert.equal(bezierPoint.anchor.y, sourcePoint.y)
    })
  })
})
