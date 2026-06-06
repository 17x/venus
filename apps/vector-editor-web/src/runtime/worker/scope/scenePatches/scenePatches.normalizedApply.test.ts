import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../../model/index.ts'
import {
  attachSceneMemory,
  createSceneMemory,
  writeDocumentToScene,
} from '../../../shared-memory/index.ts'
import {applyPatches} from './scenePatches.ts'
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

function createRecordingSpatialIndexMock() {
  const updatedItems: Array<{id: string; minX: number; minY: number; maxX: number; maxY: number}> = []
  const spatialIndex = {
    clear: () => undefined,
    insert: () => undefined,
    load: () => undefined,
    update: (item: {id: string; minX: number; minY: number; maxX: number; maxY: number}) => {
      updatedItems.push(item)
    },
    remove: () => undefined,
    search: () => [],
  } as unknown as WorkerSpatialIndex
  return {spatialIndex, updatedItems}
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

test('applyPatches group resize scales descendant geometry with the group', () => {
  const document = createPatchFixture()
  const scene = attachSceneMemory(createSceneMemory(16), 16)
  writeDocumentToScene(scene, document)

  applyPatches(scene, document, createSpatialIndexMock(), [
    {
      type: 'resize-shape',
      shapeId: 'group-a',
      prevWidth: 100,
      prevHeight: 60,
      nextWidth: 200,
      nextHeight: 120,
    },
  ])

  const child = document.shapes.find((shape) => shape.id === 'rect-1')
  assert.deepEqual(
    child && {x: child.x, y: child.y, width: child.width, height: child.height},
    {x: 20, y: 20, width: 80, height: 60},
  )
})

test('applyPatches line resize and rotation keep world-space point geometry aligned', () => {
  const document: EditorDocument = {
    id: 'doc-line',
    name: 'line fixture',
    width: 1000,
    height: 1000,
    shapes: [{
      id: 'line-1',
      type: 'lineSegment',
      name: 'Line 1',
      parentId: null,
      x: 10,
      y: 10,
      width: 20,
      height: 10,
      points: [{x: 10, y: 10}, {x: 30, y: 20}],
    }],
  }
  const scene = attachSceneMemory(createSceneMemory(16), 16)
  writeDocumentToScene(scene, document)

  applyPatches(scene, document, createSpatialIndexMock(), [{
    type: 'resize-shape',
    shapeId: 'line-1',
    prevWidth: 20,
    prevHeight: 10,
    nextWidth: 40,
    nextHeight: 20,
  }])
  assert.deepEqual(document.shapes[0]?.points, [{x: 10, y: 10}, {x: 50, y: 30}])

  applyPatches(scene, document, createSpatialIndexMock(), [{
    type: 'rotate-shape',
    shapeId: 'line-1',
    prevRotation: 0,
    nextRotation: 180,
  }])
  assert.deepEqual(
    document.shapes[0]?.points?.map((point) => ({
      x: Math.round(point.x),
      y: Math.round(point.y),
    })),
    [{x: 50, y: 30}, {x: 10, y: 10}],
  )
})

test('applyPatches updates spatial bounds from line point geometry after movement', () => {
  const document: EditorDocument = {
    id: 'doc-line-move',
    name: 'line move fixture',
    width: 1000,
    height: 1000,
    shapes: [{
      id: 'line-1',
      type: 'lineSegment',
      name: 'Line 1',
      parentId: null,
      x: 10,
      y: 10,
      width: 20,
      height: 10,
      points: [{x: 10, y: 10}, {x: 30, y: 20}],
    }],
  }
  const scene = attachSceneMemory(createSceneMemory(16), 16)
  writeDocumentToScene(scene, document)
  const {spatialIndex, updatedItems} = createRecordingSpatialIndexMock()

  applyPatches(scene, document, spatialIndex, [{
    type: 'move-shape',
    shapeId: 'line-1',
    prevX: 10,
    prevY: 10,
    nextX: 110,
    nextY: 210,
  }])

  const updatedLine = updatedItems.find((item) => item.id === 'line-1')
  assert.deepEqual(
    updatedLine && {
      minX: updatedLine.minX,
      minY: updatedLine.minY,
      maxX: updatedLine.maxX,
      maxY: updatedLine.maxY,
    },
    {minX: 110, minY: 210, maxX: 130, maxY: 220},
  )
})
