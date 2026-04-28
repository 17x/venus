import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '@vector/model'
import {
  applyNormalizedGroupChildrenChange,
  applyNormalizedInsertShape,
  applyNormalizedRemoveShape,
  applyNormalizedShapeParentChange,
  createNormalizedRuntimeDocument,
  deriveGroupBoundsFromNormalizedRuntime,
} from './normalizedDocumentRuntime.ts'

/**
 * Creates a compact editor document fixture for normalized-runtime tests.
 */
function createDocumentFixture(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'fixture',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-a',
        type: 'group',
        name: 'Group A',
        parentId: null,
        childIds: ['rect-1', 'group-b'],
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        parentId: 'group-a',
        x: 10,
        y: 20,
        width: 60,
        height: 20,
      },
      {
        id: 'group-b',
        type: 'group',
        name: 'Group B',
        parentId: 'group-a',
        childIds: ['rect-2'],
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
      {
        id: 'rect-2',
        type: 'rectangle',
        name: 'Rect 2',
        parentId: 'group-b',
        x: 100,
        y: 100,
        width: 40,
        height: 40,
      },
    ],
  }
}

test('createNormalizedRuntimeDocument preserves group child order and roots', () => {
  const document = createDocumentFixture()

  // Keep explicit group child ordering because it drives z-order and hit-test traversal.
  const normalized = createNormalizedRuntimeDocument(document)

  assert.deepEqual(normalized.rootIds, ['group-a'])
  assert.deepEqual(normalized.nodes['group-a']?.children, ['rect-1', 'group-b'])
})

test('createNormalizedRuntimeDocument backfills missing childIds from parent pointers', () => {
  const document = createDocumentFixture()

  // Remove explicit child lists to exercise compatibility backfill path.
  document.shapes[0].childIds = undefined
  document.shapes[2].childIds = undefined

  const normalized = createNormalizedRuntimeDocument(document)

  assert.deepEqual(normalized.nodes['group-a']?.children, ['rect-1', 'group-b'])
  assert.deepEqual(normalized.nodes['group-b']?.children, ['rect-2'])
})

test('deriveGroupBoundsFromNormalizedRuntime updates nested groups from descendants', () => {
  const document = createDocumentFixture()
  const normalized = createNormalizedRuntimeDocument(document)

  // Derive group bounds from leaves so runtime group geometry tracks subtree extents.
  const changedIds = deriveGroupBoundsFromNormalizedRuntime(normalized)

  assert.deepEqual(changedIds.sort(), ['group-a', 'group-b'])

  const groupA = document.shapes.find((shape) => shape.id === 'group-a')
  const groupB = document.shapes.find((shape) => shape.id === 'group-b')

  assert.equal(groupB?.x, 100)
  assert.equal(groupB?.y, 100)
  assert.equal(groupB?.width, 40)
  assert.equal(groupB?.height, 40)

  assert.equal(groupA?.x, 10)
  assert.equal(groupA?.y, 20)
  assert.equal(groupA?.width, 130)
  assert.equal(groupA?.height, 120)
})

test('applyNormalizedShapeParentChange moves node across groups and syncs child lists', () => {
  const document = createDocumentFixture()

  // Re-parent rect-1 from group-a to group-b and ensure both group child lists are updated.
  const changed = applyNormalizedShapeParentChange({
    document,
    shapeId: 'rect-1',
    nextParentId: 'group-b',
  })

  assert.equal(changed, true)

  const groupA = document.shapes.find((shape) => shape.id === 'group-a')
  const groupB = document.shapes.find((shape) => shape.id === 'group-b')
  const rect1 = document.shapes.find((shape) => shape.id === 'rect-1')

  assert.deepEqual(groupA?.childIds, ['group-b'])
  assert.deepEqual(groupB?.childIds, ['rect-2', 'rect-1'])
  assert.equal(rect1?.parentId, 'group-b')
})

test('applyNormalizedGroupChildrenChange syncs child parent pointers and target order', () => {
  const document = createDocumentFixture()

  // Replace group-a children so child parent pointers and order stay canonical.
  const changed = applyNormalizedGroupChildrenChange({
    document,
    groupId: 'group-a',
    nextChildIds: ['group-b'],
  })

  assert.equal(changed, true)

  const groupA = document.shapes.find((shape) => shape.id === 'group-a')
  const rect1 = document.shapes.find((shape) => shape.id === 'rect-1')

  assert.deepEqual(groupA?.childIds, ['group-b'])
  assert.equal(rect1?.parentId, null)
})

test('applyNormalizedInsertShape inserts child and appends it to parent group children', () => {
  const document = createDocumentFixture()

  // Insert one new child under group-b and verify parent childIds reflect normalized ownership.
  const insertedIndex = applyNormalizedInsertShape({
    document,
    index: document.shapes.length,
    shape: {
      id: 'rect-3',
      type: 'rectangle',
      name: 'Rect 3',
      parentId: 'group-b',
      x: 160,
      y: 100,
      width: 20,
      height: 20,
    },
  })

  const groupB = document.shapes.find((shape) => shape.id === 'group-b')
  const insertedShape = document.shapes[insertedIndex]

  assert.equal(insertedShape?.id, 'rect-3')
  assert.deepEqual(groupB?.childIds, ['rect-2', 'rect-3'])
})

test('applyNormalizedRemoveShape removes child and clears parent childIds reference', () => {
  const document = createDocumentFixture()

  // Remove rect-1 and verify parent group no longer references it.
  const removed = applyNormalizedRemoveShape({
    document,
    index: 1,
    shapeId: 'rect-1',
  })

  const groupA = document.shapes.find((shape) => shape.id === 'group-a')

  assert.equal(removed?.removedShape.id, 'rect-1')
  assert.deepEqual(groupA?.childIds, ['group-b'])
})
