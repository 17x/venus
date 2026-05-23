import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createEditorDocumentFromFile,
  createFileElementsFromDocument,
} from '../fileDocument/fileDocument.ts'

/**
 * Creates one runtime-document fixture for file-elements adapter snapshot validation.
 */
function createFileElementsFixtureDocument() {
  return {
    id: 'doc-elements-1',
    name: 'Elements Fixture',
    width: 640,
    height: 480,
    shapes: [
      {
        id: 'shape-1',
        type: 'rectangle' as const,
        name: 'Shape 1',
        parentId: null,
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        styleRefs: {
          fillStyleId: 'fill-1',
          strokeStyleId: 'stroke-1',
        },
      },
      {
        id: 'shape-2',
        type: 'text' as const,
        name: 'Shape 2',
        parentId: null,
        x: 200,
        y: 100,
        width: 120,
        height: 40,
        text: 'Label',
      },
    ],
  }
}

/**
 * Creates one persisted-file fixture for file-document adapter snapshot validation.
 */
function createFileDocumentFixture() {
  return {
    id: 'file-doc-1',
    name: 'File Document Fixture',
    version: '1.0.0',
    createdAt: 10,
    updatedAt: 11,
    schema: {name: 'venus.vector.document', version: 1, major: 1, minor: 0},
    config: {
      page: {unit: 'px', width: 800, height: 600, dpi: 72},
    },
    elements: [
      {
        id: 'image-1',
        type: 'image',
        name: 'Image 1',
        x: 20,
        y: 30,
        width: 200,
        height: 150,
        asset: 'asset-image-1',
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        x: 240,
        y: 50,
        width: 100,
        height: 80,
      },
    ],
    assets: [
      {
        id: 'asset-image-1',
        name: 'Image Asset',
        type: 'image',
        mimeType: 'image/png',
        objectUrl: 'blob:fixture-image-1',
      },
    ],
  }
}

/**
 * Asserts createFileElementsFromDocument output keeps deterministic adapter snapshot shape.
 */
test('createFileElementsFromDocument emits deterministic element snapshot projection', () => {
  const elements = createFileElementsFromDocument(createFileElementsFixtureDocument())

  const snapshot = elements.map((element) => ({
    id: element.id,
    type: element.type,
    layer: element.layer,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    fillStyleId: element.fillStyleId,
    strokeStyleId: element.strokeStyleId,
    text: element.text,
  }))

  assert.deepEqual(snapshot, [
    {
      id: 'shape-1',
      type: 'rectangle',
      layer: 0,
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      fillStyleId: 'fill-1',
      strokeStyleId: 'stroke-1',
      text: undefined,
    },
    {
      id: 'shape-2',
      type: 'text',
      layer: 1,
      x: 200,
      y: 100,
      width: 120,
      height: 40,
      fillStyleId: undefined,
      strokeStyleId: undefined,
      text: 'Label',
    },
  ])
})

/**
 * Asserts createEditorDocumentFromFile resolves asset url mapping and preserves deterministic node ordering.
 */
test('createEditorDocumentFromFile resolves persisted asset object urls in deterministic shape order', () => {
  const document = createEditorDocumentFromFile(createFileDocumentFixture())

  const snapshot = document.shapes.map((shape) => ({
    id: shape.id,
    type: shape.type,
    assetId: shape.assetId,
    assetUrl: shape.assetUrl,
  }))

  assert.deepEqual(snapshot, [
    {
      id: 'image-1',
      type: 'image',
      assetId: 'asset-image-1',
      assetUrl: 'blob:fixture-image-1',
    },
    {
      id: 'rect-1',
      type: 'rectangle',
      assetId: undefined,
      assetUrl: undefined,
    },
  ])
})
