import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../../runtime/model/index.ts'
import {
  applyNormalizedInsertShape,
  applyNormalizedShapeParentChange,
  collectDocumentInvariantViolations,
  evolveDocumentLifecycleState,
  isEditorDocumentInvariantSafe,
  normalizeEditorDocumentContract,
} from '../../../runtime/model/document-runtime/index.ts'

/**
 * Creates one deterministic editor document fixture for governance contract tests.
 */
function createGovernanceDocumentFixture(): EditorDocument {
  return {
    id: 'doc-contract',
    name: 'Contract Fixture',
    width: 900,
    height: 600,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['rect-a'],
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-root',
        x: 10,
        y: 12,
        width: 40,
        height: 20,
        styleRefs: {
          fillStyleId: 'fill-primary',
        },
      },
    ],
    styleReferences: {
      fills: {
        'fill-primary': {name: 'Primary Fill'},
      },
      strokes: {},
      texts: {},
      effects: {},
    },
    createdAt: 1735689600000,
    updatedAt: 1735689600000,
  }
}

test('document governance contract keeps invariant checks mappable to automation', () => {
  const document = normalizeEditorDocumentContract(createGovernanceDocumentFixture())

  assert.equal(isEditorDocumentInvariantSafe(document), true)
  assert.equal(collectDocumentInvariantViolations(document).length, 0)
})

test('document lifecycle recovery state remains observable and structure-safe', () => {
  const document = normalizeEditorDocumentContract(createGovernanceDocumentFixture())
  document.lifecycle = evolveDocumentLifecycleState(document.lifecycle, 'dirty')
  document.lifecycle = evolveDocumentLifecycleState(document.lifecycle, 'saving')
  document.lifecycle = evolveDocumentLifecycleState(document.lifecycle, 'recovery', 'save-failed')

  assert.equal(document.lifecycle.state, 'recovery')
  assert.equal(document.lifecycle.dirty, true)
  assert.equal(document.lifecycle.recoveryReason, 'save-failed')
  assert.equal(isEditorDocumentInvariantSafe(document), true)
})

test('deterministic structural replay stays stable across repeated command sequences', () => {
  const applySequence = () => {
    const document = normalizeEditorDocumentContract(createGovernanceDocumentFixture())

    applyNormalizedInsertShape({
      document,
      index: document.shapes.length,
      shape: {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: null,
        x: 200,
        y: 100,
        width: 64,
        height: 32,
        styleRefs: {
          strokeStyleId: 'stroke-accent',
        },
      },
    })

    applyNormalizedShapeParentChange({
      document,
      shapeId: 'rect-b',
      nextParentId: 'group-root',
    })

    return JSON.stringify(document)
  }

  const replayA = applySequence()
  const replayB = applySequence()

  assert.equal(replayA, replayB)
})
