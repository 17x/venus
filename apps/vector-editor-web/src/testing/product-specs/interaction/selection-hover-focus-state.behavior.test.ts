import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../../runtime/model/index.ts'
import {filterRuntimeSelectionCandidateIds} from '../../../product/runtime/selectionFilterPolicy.ts'

/**
 * Creates one compact interaction document used by selection-state tests.
 */
function createInteractionDocument(shapeIds: string[]): EditorDocument {
  return {
    id: 'doc-selection-1',
    name: 'Selection Fixture',
    width: 800,
    height: 600,
    shapes: shapeIds.map((shapeId, index) => ({
      id: shapeId,
      type: 'rectangle',
      name: shapeId,
      x: index * 20,
      y: index * 20,
      width: 10,
      height: 10,
      parentId: null,
    })),
  }
}

test('selection filter enforces allow-list, deduplication, and hidden/locked guards', () => {
  const document = createInteractionDocument(['a', 'b', 'c'])
  const result = filterRuntimeSelectionCandidateIds({
    candidateIds: ['a', 'b', 'b', 'c', 'ghost'],
    interactionDocument: document,
    isHidden: (shapeId) => shapeId === 'b',
    isLocked: (shapeId) => shapeId === 'c',
  })

  assert.deepEqual(result, ['a'])
})

test('selection filter behaves like focus scope by honoring interaction document subset', () => {
  const scopedDocument = createInteractionDocument(['focus-node'])
  const result = filterRuntimeSelectionCandidateIds({
    candidateIds: ['outside-node', 'focus-node'],
    interactionDocument: scopedDocument,
  })

  assert.deepEqual(result, ['focus-node'])
})
