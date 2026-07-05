import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import type {EditorDocument} from '../../model/index.ts'
import type {EditorFileDocument, ElementProps} from '../../types/index.ts'
import {
  createDocumentNodeFromElement,
  createEditorDocumentFromFile,
  createFileElementsFromDocument,
} from './fileDocument.ts'

describe('file document image fields', () => {
  it('parses image sampling and source geometry from file elements', () => {
    const node = createDocumentNodeFromElement({
      id: 'image',
      type: 'image',
      name: 'Image',
      asset: 'asset-1',
      sourceRect: {x: 4, y: 8, width: 80, height: 60},
      naturalSize: {width: 320, height: 240},
      imageSmoothing: false,
      x: 10,
      y: 20,
      width: 160,
      height: 120,
    })

    assert.equal(node.type, 'image')
    assert.deepEqual(node.sourceRect, {x: 4, y: 8, width: 80, height: 60})
    assert.deepEqual(node.naturalSize, {width: 320, height: 240})
    assert.equal(node.imageSmoothing, false)
  })

  it('serializes image sampling and source geometry to file elements', () => {
    const document: EditorDocument = {
      id: 'doc',
      name: 'Image document',
      width: 800,
      height: 600,
      shapes: [{
        id: 'image',
        type: 'image',
        name: 'Image',
        assetId: 'asset-1',
        sourceRect: {x: 4, y: 8, width: 80, height: 60},
        naturalSize: {width: 320, height: 240},
        imageSmoothing: false,
        x: 10,
        y: 20,
        width: 160,
        height: 120,
      }],
    }

    const [element] = createFileElementsFromDocument(document)

    assert.equal(element?.type, 'image')
    assert.deepEqual(element?.sourceRect, {x: 4, y: 8, width: 80, height: 60})
    assert.deepEqual(element?.naturalSize, {width: 320, height: 240})
    assert.equal(element?.imageSmoothing, false)
  })

  it('preserves image fields through the file runtime-scene parse path', () => {
    const file: EditorFileDocument = {
      id: 'file',
      name: 'Image file',
      version: '1',
      createdAt: 0,
      updatedAt: 0,
      config: {
        page: {
          unit: 'px',
          width: 800,
          height: 600,
          dpi: 72,
        },
      },
      elements: [{
        id: 'image',
        type: 'image',
        name: 'Image',
        asset: 'asset-1',
        sourceRect: {x: 4, y: 8, width: 80, height: 60},
        naturalSize: {width: 320, height: 240},
        imageSmoothing: false,
        x: 10,
        y: 20,
        width: 160,
        height: 120,
      } satisfies ElementProps],
      assets: [{
        id: 'asset-1',
        name: 'photo.png',
        type: 'image',
        mimeType: 'image/png',
        objectUrl: 'blob:photo',
      }],
    }

    const document = createEditorDocumentFromFile(file)
    const image = document.shapes[0]

    assert.equal(image?.type, 'image')
    assert.equal(image?.assetUrl, 'blob:photo')
    assert.deepEqual(image?.sourceRect, {x: 4, y: 8, width: 80, height: 60})
    assert.deepEqual(image?.naturalSize, {width: 320, height: 240})
    assert.equal(image?.imageSmoothing, false)
  })
})

describe('file document text fields', () => {
  it('preserves text alignment through the file runtime-scene parse path', () => {
    const file: EditorFileDocument = {
      id: 'file',
      name: 'Text file',
      version: '1',
      createdAt: 0,
      updatedAt: 0,
      config: {
        page: {
          unit: 'px',
          width: 800,
          height: 600,
          dpi: 72,
        },
      },
      elements: [{
        id: 'text',
        type: 'text',
        name: 'Text',
        text: 'Hello',
        textRuns: [{
          start: 0,
          end: 5,
          style: {
            color: '#111827',
            fontFamily: 'Inter',
            fontSize: 18,
            fontWeight: 600,
            fontStyle: 'italic',
            textAlign: 'center',
            verticalAlign: 'middle',
          },
        }],
        x: 10,
        y: 20,
        width: 160,
        height: 120,
      } satisfies ElementProps],
    }

    const document = createEditorDocumentFromFile(file)
    const text = document.shapes[0]

    assert.equal(text?.type, 'text')
    assert.equal(text?.textRuns?.[0]?.style?.fontStyle, 'italic')
    assert.equal(text?.textRuns?.[0]?.style?.textAlign, 'center')
    assert.equal(text?.textRuns?.[0]?.style?.verticalAlign, 'middle')
  })
})
