import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorFileDocument} from '../../types/index.ts'
import {serializeEditorFileForStorage} from '../storage/editorFileStorage.ts'

test('local document serialization removes browser session handles', () => {
  const file: EditorFileDocument = {
    id: 'doc-1',
    name: 'Local document',
    version: '1',
    createdAt: 1,
    updatedAt: 2,
    config: {
      page: {unit: 'px', width: 100, height: 100, dpi: 72},
    },
    elements: [],
    assets: [{
      id: 'asset-1',
      name: 'photo.png',
      type: 'image',
      mimeType: 'image/png',
      imageRef: {naturalWidth: 10},
      objectUrl: 'blob:session-only',
    }, {
      id: 'asset-2',
      name: 'embedded.svg',
      type: 'image',
      mimeType: 'image/svg+xml',
      objectUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
    }],
  }

  const stored = serializeEditorFileForStorage(file)

  assert.deepEqual(stored.assets, [{
    id: 'asset-1',
    name: 'photo.png',
    type: 'image',
    mimeType: 'image/png',
    embeddedDataUrl: undefined,
  }, {
    id: 'asset-2',
    name: 'embedded.svg',
    type: 'image',
    mimeType: 'image/svg+xml',
    embeddedDataUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
  }])
})
