import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../model/index.ts'
import {resolveTransformPreviewRuntimeState} from './transformPreview.ts'

/**
 * Creates one compact grouped document fixture for transform preview tests.
 */
function createPreviewFixture(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'preview fixture',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-a',
        type: 'group',
        name: 'Group A',
        parentId: null,
        childIds: ['rect-1'],
        x: 10,
        y: 10,
        width: 40,
        height: 30,
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        parentId: 'group-a',
        x: 10,
        y: 10,
        width: 40,
        height: 30,
      },
    ],
  }
}

test('resolveTransformPreviewRuntimeState derives group bounds from previewed children without mutating source document', () => {
  const document = createPreviewFixture()

  const state = resolveTransformPreviewRuntimeState(
    document,
    document.shapes,
    [
      {
        shapeId: 'rect-1',
        x: 70,
        y: 90,
        width: 20,
        height: 10,
      },
    ],
  )

  const previewGroup = state.previewDocument.shapes.find((shape) => shape.id === 'group-a')
  const sourceGroup = document.shapes.find((shape) => shape.id === 'group-a')

  assert.equal(previewGroup?.x, 70)
  assert.equal(previewGroup?.y, 90)
  assert.equal(previewGroup?.width, 20)
  assert.equal(previewGroup?.height, 10)
  assert.equal(sourceGroup?.x, 10)
  assert.equal(sourceGroup?.y, 10)
  assert.equal(sourceGroup?.width, 40)
  assert.equal(sourceGroup?.height, 30)
})
