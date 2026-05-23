import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../../runtime/model/index.ts'
import {
  collectDocumentInvariantViolations,
  createNormalizedRuntimeDocument,
  createNormalizedSiblingReorderPlan,
  evolveDocumentLifecycleState,
  normalizeEditorDocumentContract,
  validateNormalizedDualWriteConsistency,
} from '../../../runtime/model/document-runtime/index.ts'

/**
 * Creates one compact document fixture used by governance contract tests.
 */
function createGovernanceFixture(): EditorDocument {
  return {
    id: 'doc-governance-1',
    name: 'Governance Fixture',
    width: 1200,
    height: 800,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root Group',
        parentId: null,
        childIds: ['rect-a', 'rect-b'],
        x: 0,
        y: 0,
        width: 260,
        height: 140,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'Rect A',
        parentId: 'group-root',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        fill: {enabled: true, color: '#ff0000'},
        styleRefs: {fillStyleId: 'fill-primary'},
        extensions: {vendor: {frozen: true}},
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'Rect B',
        parentId: 'group-root',
        x: 140,
        y: 30,
        width: 110,
        height: 90,
        fill: {enabled: true, color: '#00ff00'},
      },
    ],
  }
}

/**
 * Creates one large synthetic document used by structural pressure tests.
 * @param count Number of leaf nodes to materialize under one group.
 */
function createLargeDocumentFixture(count: number): EditorDocument {
  const shapes: EditorDocument['shapes'] = [
    {
      id: 'group-large-root',
      type: 'group',
      name: 'Large Root',
      parentId: null,
      childIds: [],
      x: 0,
      y: 0,
      width: 4000,
      height: 4000,
    },
  ]

  for (let index = 0; index < count; index += 1) {
    const shapeId = `rect-${index}`
    ;(shapes[0].childIds as string[]).push(shapeId)
    shapes.push({
      id: shapeId,
      type: 'rectangle',
      name: shapeId,
      parentId: 'group-large-root',
      x: (index % 80) * 40,
      y: Math.floor(index / 80) * 40,
      width: 32,
      height: 32,
    })
  }

  return {
    id: 'doc-large-1',
    name: 'Large Fixture',
    width: 4096,
    height: 4096,
    shapes,
  }
}

test('T19 contract normalization provides schema defaults and invariant-safe shape metadata', () => {
  const normalized = normalizeEditorDocumentContract(createGovernanceFixture())

  // Contract defaults must always be present so migration and IO gates have one canonical source of truth.
  assert.equal(normalized.schema?.name, 'venus.vector.document')
  assert.equal(normalized.schema?.version, 1)
  assert.equal(Array.isArray(normalized.pages), true)
  assert.equal(typeof normalized.activePageId, 'string')
  assert.equal(normalized.shapes[0].extensions ? true : false, true)

  const violations = collectDocumentInvariantViolations(normalized)
  assert.deepEqual(violations, [])
})

test('T19 invariant collector reports orphan and cycle violations with stable codes', () => {
  const invalid = createGovernanceFixture()
  invalid.shapes[1].parentId = 'missing-parent'
  invalid.shapes[2].parentId = 'rect-a'
  invalid.shapes[1].parentId = 'rect-b'
  invalid.shapes[2].childIds = ['rect-a']

  const violations = collectDocumentInvariantViolations(invalid)
  const codes = new Set(violations.map((violation) => violation.code))

  assert.equal(codes.has('parent-not-group') || codes.has('missing-parent'), true)
  assert.equal(codes.has('cycle-detected'), true)
})

test('T20 lifecycle transitions are observable and keep normalized structure invariant-safe', () => {
  const document = normalizeEditorDocumentContract(createGovernanceFixture())

  // Created transition should start with clean state before file-open/session wiring proceeds.
  const created = evolveDocumentLifecycleState(document.lifecycle, 'created')
  assert.equal(created.state, 'created')
  assert.equal(created.dirty, false)

  // Dirty transition should expose unsaved status before save pipeline starts.
  const dirty = evolveDocumentLifecycleState(created, 'dirty', {
    source: {
      kind: 'command',
      event: 'runtime.command.dispatched',
      commandId: 'runtime-cmd-42',
      transactionId: 'runtime-txn-9',
      commandType: 'shape.move',
      issuedAt: 100,
    },
    dirtySource: {
      commandType: 'shape.move',
      commandId: 'runtime-cmd-42',
      transactionId: 'runtime-txn-9',
      issuedAt: 100,
    },
  })
  assert.equal(dirty.state, 'dirty')
  assert.equal(dirty.dirty, true)
  assert.equal(dirty.lastTransitionSource?.kind, 'command')
  assert.equal(dirty.lastDirtySource?.transactionId, 'runtime-txn-9')

  // Saving transition should preserve dirty=true to prevent accidental clean-state reporting.
  const saving = evolveDocumentLifecycleState(dirty, 'saving')
  assert.equal(saving.state, 'saving')
  assert.equal(saving.dirty, true)

  // Saved transition should independently clear dirty state and stamp save observability fields.
  const saved = evolveDocumentLifecycleState(saving, 'saved')
  assert.equal(saved.state, 'saved')
  assert.equal(saved.dirty, false)
  assert.equal(typeof saved.lastSavedAt, 'number')

  // Recovery transition should keep diagnostics context while remaining structurally valid.
  const recovery = evolveDocumentLifecycleState(saved, 'recovery', 'io-timeout')
  assert.equal(recovery.state, 'recovery')
  assert.equal(recovery.recoveryReason, 'io-timeout')

  const postLifecycle = {
    ...document,
    lifecycle: recovery,
  }
  const violations = collectDocumentInvariantViolations(postLifecycle)
  assert.deepEqual(violations, [])

  // Opened transition should clear dirty flag and refresh lastSavedAt for observability.
  const opened = evolveDocumentLifecycleState(recovery, 'opened')
  assert.equal(opened.state, 'opened')
  assert.equal(opened.dirty, false)
  assert.equal(typeof opened.lastSavedAt, 'number')
  assert.equal(typeof opened.lastTransitionSource?.event, 'string')
})

test('T21/T22 pages-style-refs-extensions contract keeps references and unknown payloads', () => {
  const baseline = normalizeEditorDocumentContract(createGovernanceFixture())
  baseline.pages = [
    {id: 'page-a', name: 'Page A', width: 1200, height: 800},
    {id: 'page-b', name: 'Page B', width: 1200, height: 800},
  ]
  baseline.activePageId = 'page-b'
  baseline.styleReferences = {
    fills: {'fill-primary': {name: 'Primary Fill'}},
    strokes: {},
    texts: {},
    effects: {},
  }
  baseline.extensions = {
    'vendor.unknown': {
      mode: 'opaque',
      threshold: 3,
    },
  }
  baseline.shapes[1].styleRefs = {
    fillStyleId: 'fill-primary',
  }
  baseline.shapes[1].extensions = {
    'vendor.node': {
      frozen: true,
    },
  }

  const normalized = normalizeEditorDocumentContract(baseline)

  assert.equal(normalized.pages?.length, 2)
  assert.equal(normalized.activePageId, 'page-b')
  assert.equal(normalized.styleReferences?.fills['fill-primary']?.name, 'Primary Fill')
  assert.deepEqual(normalized.extensions, baseline.extensions)
  assert.equal(normalized.shapes[1].styleRefs?.fillStyleId, 'fill-primary')
  assert.deepEqual(normalized.shapes[1].extensions, {
    'vendor.node': {
      frozen: true,
    },
  })
})

test('T23 structural pressure + deterministic reorder planning remain stable on large documents', () => {
  const large = createLargeDocumentFixture(2000)

  // Pressure path should still produce one coherent normalized projection without structural drift.
  const normalized = createNormalizedRuntimeDocument(large)
  assert.equal(normalized.rootIds.length, 1)
  assert.equal(normalized.nodes['group-large-root']?.children.length, 2000)

  const dualWrite = validateNormalizedDualWriteConsistency(large)
  assert.equal(dualWrite.valid, true)

  // Deterministic replay proxy: same input snapshot must emit identical reorder patch plans.
  const planA = createNormalizedSiblingReorderPlan({
    document: large,
    shapeId: 'rect-0',
    toIndex: 1999,
  })
  const planB = createNormalizedSiblingReorderPlan({
    document: large,
    shapeId: 'rect-0',
    toIndex: 1999,
  })

  assert.deepEqual(planA, planB)
})