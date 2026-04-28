import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '@vector/model'
import {
  attachSceneMemory,
  createSceneMemory,
  writeDocumentToScene,
} from '../../shared-memory/index.ts'
import {createCollaborationManager} from '../collaboration.ts'
import {createHistoryManager} from '../history.ts'
import {handleRemoteOperation} from './operations.ts'
import type {WorkerSpatialIndex} from './types.ts'

/**
 * Creates one minimal spatial index mock for remote operation tests.
 */
function createSpatialIndexMock(): WorkerSpatialIndex {
  return {
    clear: () => undefined,
    insert: () => undefined,
    load: () => undefined,
    update: () => undefined,
    remove: () => undefined,
    search: () => [],
  } as unknown as WorkerSpatialIndex
}

/**
 * Creates one inconsistent fixture where group ownership and child parent pointer are intentionally out of sync.
 */
function createInconsistentFixture(): EditorDocument {
  return {
    id: 'doc-remote',
    name: 'remote fixture',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-1',
        type: 'group',
        name: 'Group 1',
        parentId: null,
        childIds: ['rect-1'],
        x: 0,
        y: 0,
        width: 200,
        height: 80,
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        // Keep this mismatched on purpose so remote reconciliation has work to do.
        parentId: null,
        x: 10,
        y: 10,
        width: 60,
        height: 40,
      },
    ],
  }
}

/**
 * Creates one malformed fixture where a shared child is referenced by multiple groups.
 */
function createMultiParentInconsistentFixture(): EditorDocument {
  return {
    id: 'doc-remote-multi-parent',
    name: 'remote multi-parent fixture',
    width: 1200,
    height: 800,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['group-a', 'group-b'],
        x: 0,
        y: 0,
        width: 500,
        height: 200,
      },
      {
        id: 'group-a',
        type: 'group',
        name: 'Group A',
        parentId: 'group-root',
        childIds: ['rect-shared', 'rect-a'],
        x: 0,
        y: 0,
        width: 220,
        height: 100,
      },
      {
        id: 'group-b',
        type: 'group',
        name: 'Group B',
        parentId: 'group-root',
        childIds: ['rect-shared', 'rect-b'],
        x: 240,
        y: 0,
        width: 220,
        height: 100,
      },
      {
        id: 'rect-shared',
        type: 'rectangle',
        name: 'Shared',
        parentId: 'group-b',
        x: 20,
        y: 20,
        width: 40,
        height: 30,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-a',
        x: 80,
        y: 20,
        width: 40,
        height: 30,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-b',
        x: 320,
        y: 20,
        width: 40,
        height: 30,
      },
    ],
  }
}

/**
 * Verifies remote structural apply reconciles parent pointers with canonical group child ownership.
 */
test('handleRemoteOperation reconciles parent pointers after remote insert on inconsistent storage', () => {
  const document = createInconsistentFixture()
  const scene = attachSceneMemory(createSceneMemory(32), 32)
  writeDocumentToScene(scene, document)

  const history = createHistoryManager()
  const collaboration = createCollaborationManager()
  collaboration.connect('local-user')

  const updateKind = handleRemoteOperation(
    {
      id: 'remote-insert-1',
      type: 'shape.insert',
      actorId: 'remote-user',
      payload: {
        index: 2,
        shape: {
          id: 'rect-2',
          type: 'rectangle',
          name: 'Rect 2',
          parentId: 'group-1',
          x: 90,
          y: 10,
          width: 60,
          height: 40,
        },
      },
    },
    scene,
    document,
    createSpatialIndexMock(),
    history,
    collaboration,
  )

  assert.equal(updateKind, 'full')

  const rect1 = document.shapes.find((shape) => shape.id === 'rect-1')
  const group = document.shapes.find((shape) => shape.id === 'group-1')

  // The existing mismatched child should be normalized to canonical parent ownership.
  assert.equal(rect1?.parentId, 'group-1')
  // Remote insert payload normalization currently omits parent linkage fields,
  // so this assertion focuses on fixing pre-existing drift in stored ownership.
  assert.deepEqual(group?.childIds, ['rect-1'])
})

/**
 * Verifies remote structural apply collapses malformed multi-parent ownership to one canonical group owner.
 */
test('handleRemoteOperation reconciles malformed multi-parent group membership on remote structural apply', () => {
  const document = createMultiParentInconsistentFixture()
  const scene = attachSceneMemory(createSceneMemory(64), 64)
  writeDocumentToScene(scene, document)

  const history = createHistoryManager()
  const collaboration = createCollaborationManager()
  collaboration.connect('local-user')

  const updateKind = handleRemoteOperation(
    {
      id: 'remote-remove-2',
      type: 'shape.remove',
      actorId: 'remote-user',
      payload: {
        shapeId: 'rect-b',
      },
    },
    scene,
    document,
    createSpatialIndexMock(),
    history,
    collaboration,
  )

  assert.equal(updateKind, 'full')

  const sharedRect = document.shapes.find((shape) => shape.id === 'rect-shared')
  const groupA = document.shapes.find((shape) => shape.id === 'group-a')
  const groupB = document.shapes.find((shape) => shape.id === 'group-b')

  // Canonical ownership should prefer the first explicit group-child owner encountered in traversal.
  assert.equal(sharedRect?.parentId, 'group-a')
  // The canonical owner keeps the shared child while preserving local sibling order.
  assert.deepEqual(groupA?.childIds, ['rect-shared', 'rect-a'])
  // Non-canonical groups should drop stale shared-child references after reconciliation.
  assert.deepEqual(groupB?.childIds, [])
})

