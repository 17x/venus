import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../index.ts'
import {
  collectDocumentInvariantViolations,
  evolveDocumentLifecycleState,
  isEditorDocumentInvariantSafe,
  normalizeEditorDocumentContract,
} from '../documentGovernance.ts'

/**
 * Creates one minimal legacy document fixture for governance normalization tests.
 */
function createLegacyDocumentFixture(): EditorDocument {
  return {
    id: 'doc-governance',
    name: 'Governance Fixture',
    width: 800,
    height: 600,
    shapes: [
      {
        id: 'group-1',
        type: 'group',
        name: 'Group',
        parentId: null,
        childIds: ['rect-1'],
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect',
        parentId: 'group-1',
        x: 10,
        y: 10,
        width: 30,
        height: 20,
      },
    ],
  }
}

test('normalizeEditorDocumentContract backfills schema lifecycle pages and extensions defaults', () => {
  const normalized = normalizeEditorDocumentContract(createLegacyDocumentFixture())

  assert.equal(typeof normalized.schema?.name, 'string')
  assert.equal(typeof normalized.schema?.version, 'number')
  assert.equal(typeof normalized.createdAt, 'number')
  assert.equal(typeof normalized.updatedAt, 'number')
  assert.equal(normalized.lifecycle?.state, 'opened')
  assert.equal(normalized.lifecycle?.dirty, false)
  assert.equal(normalized.pages?.length, 1)
  assert.equal(normalized.activePageId, normalized.pages?.[0]?.id)
  assert.deepEqual(normalized.styleReferences, {
    fills: {},
    strokes: {},
    texts: {},
    effects: {},
  })
  assert.deepEqual(normalized.extensions, {})
  assert.deepEqual(normalized.shapes[0]?.extensions, {})
})

test('collectDocumentInvariantViolations detects parent-child mismatch and cycles', () => {
  const document = createLegacyDocumentFixture()
  document.shapes[0].childIds = ['rect-1', 'ghost-child']
  document.shapes[1].parentId = 'group-1'
  document.shapes.push({
    id: 'group-cycle',
    type: 'group',
    name: 'Cycle',
    parentId: 'group-cycle',
    childIds: [],
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  })

  const violations = collectDocumentInvariantViolations(normalizeEditorDocumentContract(document))

  assert.ok(violations.some((violation) => violation.code === 'child-parent-mismatch'))
  assert.ok(violations.some((violation) => violation.code === 'cycle-detected'))
  assert.equal(isEditorDocumentInvariantSafe(normalizeEditorDocumentContract(document)), false)
})

test('evolveDocumentLifecycleState keeps dirty and recovery semantics deterministic', () => {
  const created = evolveDocumentLifecycleState(undefined, 'created')
  const opened = evolveDocumentLifecycleState(created, 'opened')
  const dirty = evolveDocumentLifecycleState(opened, 'dirty', {
    source: {
      kind: 'command',
      event: 'runtime.command.dispatched',
      commandId: 'runtime-cmd-1',
      transactionId: 'runtime-txn-1',
      commandType: 'shape.move',
      issuedAt: 100,
    },
    dirtySource: {
      commandType: 'shape.move',
      commandId: 'runtime-cmd-1',
      transactionId: 'runtime-txn-1',
      issuedAt: 100,
    },
  })
  const saving = evolveDocumentLifecycleState(dirty, 'saving')
  const saved = evolveDocumentLifecycleState(saving, 'saved')
  const recovery = evolveDocumentLifecycleState(saving, 'recovery', 'io-timeout')
  const reopened = evolveDocumentLifecycleState(recovery, 'opened')

  assert.equal(created.state, 'created')
  assert.equal(created.dirty, false)
  assert.equal(created.lastTransitionSource?.event, 'lifecycle.created')
  assert.equal(opened.dirty, false)
  assert.equal(opened.lastTransitionSource?.event, 'lifecycle.opened')
  assert.equal(dirty.dirty, true)
  assert.equal(dirty.lastTransitionSource?.kind, 'command')
  assert.equal(dirty.lastDirtySource?.transactionId, 'runtime-txn-1')
  assert.equal(saving.state, 'saving')
  assert.equal(saved.state, 'saved')
  assert.equal(saved.dirty, false)
  assert.equal(typeof saved.lastSavedAt, 'number')
  assert.equal(saved.lastTransitionSource?.event, 'lifecycle.saved')
  assert.equal(recovery.recoveryReason, 'io-timeout')
  assert.equal(reopened.state, 'opened')
  assert.equal(reopened.dirty, false)
  assert.equal(typeof reopened.lastSavedAt, 'number')
})
