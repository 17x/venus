import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '@vector/model'
import {
  attachSceneMemory,
  createSceneMemory,
  writeDocumentToScene,
} from '../../shared-memory/index.ts'
import {applyPatches} from './scenePatches.ts'
import type {WorkerSpatialIndex} from './types.ts'

/**
 * Creates one minimal spatial index mock for worker patch-apply tests.
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
 * Creates one compact document fixture for normalized apply-path tests.
 */
function createPatchFixture(): EditorDocument {
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
        childIds: ['rect-1'],
        x: 0,
        y: 0,
        width: 100,
        height: 60,
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        parentId: 'group-a',
        x: 10,
        y: 10,
        width: 40,
        height: 30,
      },
    ],
  }
}

test('applyPatches insert-shape keeps parent childIds in sync via normalized helper', () => {
  const document = createPatchFixture()
  const scene = attachSceneMemory(createSceneMemory(16), 16)
  writeDocumentToScene(scene, document)

  // Insert a new child under group-a and verify the parent child list includes the inserted id.
  applyPatches(scene, document, createSpatialIndexMock(), [
    {
      type: 'insert-shape',
      index: 2,
      shape: {
        id: 'rect-2',
        type: 'rectangle',
        name: 'Rect 2',
        parentId: 'group-a',
        x: 60,
        y: 10,
        width: 30,
        height: 20,
      },
    },
  ])

  const group = document.shapes.find((shape) => shape.id === 'group-a')
  assert.deepEqual(group?.childIds, ['rect-1', 'rect-2'])
})

test('applyPatches remove-shape clears parent childIds references via normalized helper', () => {
  const document = createPatchFixture()
  const scene = attachSceneMemory(createSceneMemory(16), 16)
  writeDocumentToScene(scene, document)

  // Remove one child and verify group child list is updated in the same apply pass.
  applyPatches(scene, document, createSpatialIndexMock(), [
    {
      type: 'remove-shape',
      index: 1,
      shape: {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        parentId: 'group-a',
        x: 10,
        y: 10,
        width: 40,
        height: 30,
      },
    },
  ])

  const group = document.shapes.find((shape) => shape.id === 'group-a')
  assert.deepEqual(group?.childIds, [])
})
