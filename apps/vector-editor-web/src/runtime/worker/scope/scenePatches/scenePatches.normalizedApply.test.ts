import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../../model/index.ts'
import {
  attachSceneMemory,
  createSceneMemory,
  readSceneSnapshot,
  readSceneStats,
  writeDocumentToScene,
} from '../../../shared-memory/index.ts'
import {applyPatches, rebuildSpatialIndex} from './scenePatches.ts'
import {syncDerivedGroupBounds} from '../sceneGroupBounds.ts'
import type {WorkerSpatialIndex} from '../types.ts'

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

test('syncDerivedGroupBounds returns changed group ids and writes derived geometry to scene', () => {
  const document = createPatchFixture()
  const scene = attachSceneMemory(createSceneMemory(16), 16)
  writeDocumentToScene(scene, document)
  const initialVersion = readSceneStats(scene).version

  const rect = document.shapes.find((shape) => shape.id === 'rect-1')
  assert.ok(rect)
  rect.x = 50
  rect.y = 70
  rect.width = 20
  rect.height = 10

  const changedIds = syncDerivedGroupBounds(scene, document, createSpatialIndexMock())
  const group = document.shapes.find((shape) => shape.id === 'group-a')
  const groupSceneShape = readSceneSnapshot(scene, document).find((shape) => shape.id === 'group-a')

  assert.deepEqual(changedIds, ['group-a'])
  assert.equal(group?.x, 50)
  assert.equal(group?.y, 70)
  assert.equal(group?.width, 20)
  assert.equal(group?.height, 10)
  assert.equal(groupSceneShape?.x, 50)
  assert.equal(groupSceneShape?.y, 70)
  assert.equal(groupSceneShape?.width, 20)
  assert.equal(groupSceneShape?.height, 10)
  assert.equal(readSceneStats(scene).version, initialVersion + 1)
})

test('rebuildSpatialIndex uses transform-aware bounds for rotated shapes', () => {
  const document = createPatchFixture()
  const rect = document.shapes.find((shape) => shape.id === 'rect-1')
  assert.ok(rect)
  rect.x = 0
  rect.y = 0
  rect.width = 100
  rect.height = 20
  rect.rotation = 90

  let loadedItems: Array<{id: string; minX: number; minY: number; maxX: number; maxY: number}> = []
  const spatialIndex = {
    ...createSpatialIndexMock(),
    load: (items: Array<{id: string; minX: number; minY: number; maxX: number; maxY: number}>) => {
      loadedItems = items
    },
  } as WorkerSpatialIndex

  rebuildSpatialIndex(spatialIndex, document)
  const rectItem = loadedItems.find((item) => item.id === 'rect-1')

  assert.ok(rectItem)
  assert.equal(Math.round(rectItem.minX), 40)
  assert.equal(Math.round(rectItem.minY), -40)
  assert.equal(Math.round(rectItem.maxX), 60)
  assert.equal(Math.round(rectItem.maxY), 60)
})
