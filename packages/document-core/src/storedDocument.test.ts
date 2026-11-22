import assert from 'node:assert/strict'
import test from 'node:test'

import {
  advanceStoredDocument,
  createStoredDocument,
  toStoredDocumentSummary,
} from './storedDocument.ts'

test('stored documents advance revision without changing identity', () => {
  const first = createStoredDocument({
    id: 'doc-1',
    name: 'First',
    createdAt: 10,
    updatedAt: 10,
    document: {value: 1},
  })
  const second = advanceStoredDocument(first, {value: 2}, {updatedAt: 20})

  assert.equal(second.id, 'doc-1')
  assert.equal(second.revision, 2)
  assert.equal(second.createdAt, 10)
  assert.equal(second.updatedAt, 20)
  assert.deepEqual(second.document, {value: 2})
  assert.deepEqual(toStoredDocumentSummary(second), {
    id: 'doc-1',
    name: 'First',
    revision: 2,
    schemaVersion: 1,
    createdAt: 10,
    updatedAt: 20,
  })
})
