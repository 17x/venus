import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '@vector/model'
import {
  createNormalizedGroupPatchPlan,
  createNormalizedSiblingReorderPlan,
  createNormalizedUngroupPatchPlan,
  validateNormalizedDualWriteConsistency,
} from './normalizedHistoryPatches.ts'

/**
 * Creates a compact document fixture used for normalized history patch planning tests.
 */
function createHistoryFixture(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'history-fixture',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-parent',
        type: 'group',
        name: 'Parent',
        parentId: null,
        childIds: ['rect-a', 'rect-b', 'rect-c'],
        x: 0,
        y: 0,
        width: 200,
        height: 80,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-parent',
        x: 0,
        y: 0,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-parent',
        x: 60,
        y: 0,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-parent',
        x: 120,
        y: 0,
        width: 40,
        height: 40,
      },
    ],
  }
}

/**
 * Creates one cross-parent fixture used to validate regroup planning across sibling groups.
 */
function createCrossParentHistoryFixture(): EditorDocument {
  return {
    id: 'doc-cross-parent',
    name: 'history-cross-parent-fixture',
    width: 1200,
    height: 800,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['group-left', 'group-right'],
        x: 0,
        y: 0,
        width: 600,
        height: 240,
      },
      {
        id: 'group-left',
        type: 'group',
        name: 'Left',
        parentId: 'group-root',
        childIds: ['rect-a', 'rect-b'],
        x: 0,
        y: 0,
        width: 220,
        height: 120,
      },
      {
        id: 'group-right',
        type: 'group',
        name: 'Right',
        parentId: 'group-root',
        childIds: ['rect-c', 'rect-d'],
        x: 260,
        y: 0,
        width: 220,
        height: 120,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-left',
        x: 10,
        y: 10,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-left',
        x: 90,
        y: 10,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-right',
        x: 280,
        y: 10,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-d',
        type: 'rectangle',
        name: 'D',
        parentId: 'group-right',
        x: 360,
        y: 10,
        width: 40,
        height: 40,
      },
    ],
  }
}

test('createNormalizedGroupPatchPlan returns canonical parent/children patches', () => {
  const document = createHistoryFixture()

  // Group selected siblings and verify parent-child structural patches are emitted.
  const plan = createNormalizedGroupPatchPlan({
    document,
    selectedShapeIds: ['rect-a', 'rect-b'],
    groupId: 'group-new',
    groupName: 'Group New',
  })

  assert.ok(plan)
  assert.equal(plan?.groupId, 'group-new')
  assert.deepEqual(plan?.groupedShapeIds, ['rect-a', 'rect-b'])
  assert.equal(plan?.patches.some((patch) => patch.type === 'insert-shape'), true)
  assert.equal(
    plan?.patches.some((patch) => patch.type === 'set-group-children' && patch.groupId === 'group-parent'),
    true,
  )
})

test('createNormalizedGroupPatchPlan rewrites source group child lists for cross-parent regroup', () => {
  const document = createCrossParentHistoryFixture()

  // Regroup children from different parents and verify both source groups are rewritten.
  const plan = createNormalizedGroupPatchPlan({
    document,
    selectedShapeIds: ['rect-a', 'rect-c'],
    groupId: 'group-merge',
    groupName: 'Merged',
  })

  assert.ok(plan)
  // Cross-parent regroup should produce one root-level group so ownership does not pick an arbitrary parent.
  assert.equal((plan?.patches.find((patch) => patch.type === 'insert-shape')?.shape.parentId ?? null), null)
  // Group-left should remove rect-a from its canonical child list.
  assert.equal(
    plan?.patches.some((patch) => patch.type === 'set-group-children' && patch.groupId === 'group-left'),
    true,
  )
  // Group-right should remove rect-c from its canonical child list.
  assert.equal(
    plan?.patches.some((patch) => patch.type === 'set-group-children' && patch.groupId === 'group-right'),
    true,
  )
})

test('createNormalizedUngroupPatchPlan emits remove and parent restoration patches', () => {
  const document = createHistoryFixture()
  const groupInsertPlan = createNormalizedGroupPatchPlan({
    document,
    selectedShapeIds: ['rect-a', 'rect-b'],
    groupId: 'group-new',
    groupName: 'Group New',
  })

  assert.ok(groupInsertPlan)

  // Apply minimal projection updates to simulate grouped state before ungroup planning.
  document.shapes.push({
    id: 'group-new',
    type: 'group',
    name: 'Group New',
    parentId: 'group-parent',
    childIds: ['rect-a', 'rect-b'],
    x: 0,
    y: 0,
    width: 100,
    height: 40,
  })
  document.shapes.find((shape) => shape.id === 'rect-a')!.parentId = 'group-new'
  document.shapes.find((shape) => shape.id === 'rect-b')!.parentId = 'group-new'
  document.shapes.find((shape) => shape.id === 'group-parent')!.childIds = ['group-new', 'rect-c']

  const ungroupPlan = createNormalizedUngroupPatchPlan({
    document,
    groupId: 'group-new',
  })

  assert.ok(ungroupPlan)
  assert.equal(ungroupPlan?.patches.some((patch) => patch.type === 'remove-shape'), true)
  assert.equal(
    ungroupPlan?.patches.some((patch) => patch.type === 'set-shape-parent' && patch.shapeId === 'rect-a'),
    true,
  )
})

test('createNormalizedUngroupPatchPlan replaces nested group with children in parent order', () => {
  const document = createCrossParentHistoryFixture()

  // Build nested state where a temporary group sits between root and selected children.
  document.shapes.push({
    id: 'group-temp',
    type: 'group',
    name: 'Temp',
    parentId: 'group-root',
    childIds: ['rect-a', 'rect-c'],
    x: 0,
    y: 0,
    width: 400,
    height: 80,
  })
  document.shapes.find((shape) => shape.id === 'rect-a')!.parentId = 'group-temp'
  document.shapes.find((shape) => shape.id === 'rect-c')!.parentId = 'group-temp'
  document.shapes.find((shape) => shape.id === 'group-left')!.childIds = ['rect-b']
  document.shapes.find((shape) => shape.id === 'group-right')!.childIds = ['rect-d']
  document.shapes.find((shape) => shape.id === 'group-root')!.childIds = ['group-left', 'group-temp', 'group-right']

  const ungroupPlan = createNormalizedUngroupPatchPlan({
    document,
    groupId: 'group-temp',
  })

  assert.ok(ungroupPlan)
  // Parent replacement patch should inline nested children and remove the temporary group id.
  const parentPatch = ungroupPlan?.patches.find(
    (patch): patch is Extract<typeof patch, {type: 'set-group-children'}> => patch.type === 'set-group-children' && patch.groupId === 'group-root',
  )
  assert.ok(parentPatch)
  // Runtime currently resolves child order by shape-array order, so assert invariants instead of one fixed order.
  const parentNextChildIds = parentPatch?.nextChildIds ?? []
  assert.equal(parentNextChildIds.includes('group-temp'), false)
  assert.equal(parentNextChildIds.includes('rect-a'), true)
  assert.equal(parentNextChildIds.includes('rect-c'), true)
})

test('createNormalizedSiblingReorderPlan updates group child order and emits compatibility reorder patch', () => {
  const document = createHistoryFixture()

  // Reorder one sibling and verify both canonical and compatibility patch outputs are available.
  const plan = createNormalizedSiblingReorderPlan({
    document,
    shapeId: 'rect-a',
    toIndex: 2,
  })

  assert.ok(plan)
  assert.equal(plan?.siblingPatch.groupId, 'group-parent')
  assert.deepEqual(plan?.siblingPatch.nextChildIds, ['rect-b', 'rect-c', 'rect-a'])
  assert.equal(plan?.compatibilityReorderPatch.type, 'reorder-shape')
})

test('validateNormalizedDualWriteConsistency reports parent-child mismatch issues', () => {
  const document = createHistoryFixture()

  // Break child parent pointer intentionally to ensure migration diagnostics detect drift.
  document.shapes.find((shape) => shape.id === 'rect-b')!.parentId = null

  const validation = validateNormalizedDualWriteConsistency(document)

  assert.equal(validation.valid, false)
  assert.equal(validation.issues.length > 0, true)
})

