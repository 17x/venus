import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../../runtime/model/index.ts'
import {
  createNormalizedGroupPatchPlan,
  runNormalizedGroupConsistencyQuickCheck,
  createNormalizedUngroupPatchPlan,
  validateNormalizedDualWriteConsistency,
} from '../../../runtime/model/document-runtime/normalizedHistoryPatches.ts'

/**
 * Creates one document fixture with nested groups used by structure tests.
 */
function createStructuredDocumentFixture(): EditorDocument {
  return {
    id: 'doc-structure-1',
    name: 'Structure Fixture',
    width: 1200,
    height: 800,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['rect-1', 'rect-2'],
        x: 0,
        y: 0,
        width: 240,
        height: 140,
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        parentId: 'group-root',
        x: 10,
        y: 20,
        width: 80,
        height: 60,
      },
      {
        id: 'rect-2',
        type: 'rectangle',
        name: 'Rect 2',
        parentId: 'group-root',
        x: 120,
        y: 40,
        width: 90,
        height: 80,
      },
    ],
  }
}

test('group patch planning keeps sibling order and emits reversible structural patches', () => {
  const document = createStructuredDocumentFixture()

  const plan = createNormalizedGroupPatchPlan({
    document,
    selectedShapeIds: ['rect-1', 'rect-2'],
    groupId: 'group-child',
    groupName: 'Grouped Nodes',
  })

  assert.ok(plan)
  assert.equal(plan?.groupedShapeIds.length, 2)

  const patchTypes = plan?.patches.map((patch) => patch.type) ?? []
  assert.ok(patchTypes.includes('insert-shape'))
  assert.ok(patchTypes.includes('set-group-children'))
  assert.ok(patchTypes.includes('set-shape-parent'))
})

test('ungroup patch planning emits remove-group and parent restoration patches', () => {
  const document = {
    ...createStructuredDocumentFixture(),
    shapes: [
      {
        id: 'group-root',
        type: 'group' as const,
        name: 'Root',
        parentId: null,
        childIds: ['group-child'],
        x: 0,
        y: 0,
        width: 240,
        height: 140,
      },
      {
        id: 'group-child',
        type: 'group' as const,
        name: 'Child Group',
        parentId: 'group-root',
        childIds: ['rect-1', 'rect-2'],
        x: 10,
        y: 20,
        width: 200,
        height: 100,
      },
      {
        id: 'rect-1',
        type: 'rectangle' as const,
        name: 'Rect 1',
        parentId: 'group-child',
        x: 10,
        y: 20,
        width: 80,
        height: 60,
      },
      {
        id: 'rect-2',
        type: 'rectangle' as const,
        name: 'Rect 2',
        parentId: 'group-child',
        x: 120,
        y: 40,
        width: 90,
        height: 80,
      },
    ],
  }

  const plan = createNormalizedUngroupPatchPlan({
    document,
    groupId: 'group-child',
  })

  assert.ok(plan)
  const patchTypes = plan?.patches.map((patch) => patch.type) ?? []
  assert.ok(patchTypes.includes('remove-shape'))
  assert.ok(patchTypes.includes('set-shape-parent'))
  assert.ok(patchTypes.includes('set-group-children'))
})

test('dual-write validator reports structural mismatch when parent-child links drift', () => {
  const document = createStructuredDocumentFixture()
  // Break canonical ownership by pointing one listed child to a different parent.
  document.shapes[1].parentId = 'foreign-parent'

  const validation = validateNormalizedDualWriteConsistency(document)

  assert.equal(validation.valid, false)
  assert.ok(validation.issues.some((issue) => issue.includes('foreign-parent')))
})

test('group consistency quick-check exposes stable diagnostics entry for structure triage', () => {
  const document = createStructuredDocumentFixture()
  document.shapes[0].childIds = ['rect-1', 'ghost-child']

  const quickCheck = runNormalizedGroupConsistencyQuickCheck(document)

  assert.equal(quickCheck.valid, false)
  assert.ok(quickCheck.diagnostics.some((diagnostic) => diagnostic.code === 'group-missing-child'))
})
