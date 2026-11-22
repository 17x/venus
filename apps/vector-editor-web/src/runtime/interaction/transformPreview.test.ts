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

test('resolveTransformPreviewRuntimeState carries rotation into preview snapshots for point-authored shapes', () => {
  const document: EditorDocument = {
    id: 'doc-rotate',
    name: 'rotate fixture',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'poly-1',
        type: 'polygon',
        name: 'Polygon 1',
        x: 10,
        y: 20,
        width: 30,
        height: 40,
        rotation: 0,
        points: [
          {x: 10, y: 20},
          {x: 40, y: 20},
          {x: 25, y: 60},
        ],
      },
    ],
  }

  const state = resolveTransformPreviewRuntimeState(
    document,
    document.shapes,
    [{
      shapeId: 'poly-1',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      rotation: 35,
    }],
  )

  assert.equal(state.previewDocument.shapes[0]?.rotation, 35)
  assert.equal(state.previewShapes[0]?.rotation, 35)
})

test('resolveTransformPreviewRuntimeState rotates clip-bound image preview with clip source', () => {
  const document: EditorDocument = {
    id: 'doc-clip',
    name: 'clip fixture',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'clip-source',
        type: 'polygon',
        name: 'Clip Source',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        rotation: 0,
        points: [
          {x: 100, y: 100},
          {x: 200, y: 100},
          {x: 200, y: 200},
        ],
      },
      {
        id: 'image-1',
        type: 'image',
        name: 'Image 1',
        x: 110,
        y: 120,
        width: 80,
        height: 60,
        rotation: 10,
        assetId: 'asset-1',
        clipPathId: 'clip-source',
      },
    ],
  }

  const state = resolveTransformPreviewRuntimeState(
    document,
    document.shapes,
    [{
      shapeId: 'clip-source',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      rotation: 90,
    }],
    {includeClipBoundImagePreview: true},
  )

  const previewImageDocumentNode = state.previewDocument.shapes.find((shape) => shape.id === 'image-1')
  const previewImageSnapshot = state.previewShapes.find((shape) => shape.id === 'image-1')

  assert.equal(previewImageDocumentNode?.rotation, 100)
  assert.equal(previewImageSnapshot?.rotation, 100)
})
