import assert from 'node:assert/strict'
import test from 'node:test'

import type {DocumentNode, EditorDocument} from '../model/index.ts'
import {createRuntimeEditingModeController} from '../index.ts'
import {createTransformSessionManager} from '../interaction/transformSessionManager.ts'
import {startTransformSessionFromSelection} from './transformInteractionPolicy.ts'

type StartTransformInput = Parameters<typeof startTransformSessionFromSelection>[0]

/**
 * Creates one nested group fixture for transform-target resolution tests.
 */
function createGroupTransformFixture(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'Group transform fixture',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-1',
        type: 'group',
        name: 'Group 1',
        parentId: null,
        childIds: ['rect-a', 'group-2'],
        x: 10,
        y: 20,
        width: 140,
        height: 90,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'Rect A',
        parentId: 'group-1',
        x: 10,
        y: 20,
        width: 40,
        height: 30,
      },
      {
        id: 'group-2',
        type: 'group',
        name: 'Group 2',
        parentId: 'group-1',
        childIds: ['rect-b'],
        x: 90,
        y: 50,
        width: 60,
        height: 60,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'Rect B',
        parentId: 'group-2',
        x: 90,
        y: 50,
        width: 60,
        height: 60,
      },
    ],
  }
}

/**
 * Builds one complete start-transform input while exposing the real session manager.
 */
function createStartInput(overrides: {
  document: EditorDocument
  handle: StartTransformInput['handle']
  selectedShapeIds: string[]
}) {
  const transformManager = createTransformSessionManager()
  const previewShapeById = new Map<string, DocumentNode>(
    overrides.document.shapes.map((shape) => [shape.id, shape]),
  )

  const input: StartTransformInput = {
    point: {x: 10, y: 20},
    handle: overrides.handle,
    selectedShapeIds: overrides.selectedShapeIds,
    previewShapeById,
    interactionDocument: overrides.document,
    selectedBounds: {minX: 10, minY: 20, maxX: 150, maxY: 110},
    transformManagerRef: {current: transformManager},
    setActiveTransformHandle: () => undefined,
    runtimeEditingModeControllerRef: {current: createRuntimeEditingModeController('idle')},
    setSnapGuides: () => undefined,
  }

  return {
    input,
    transformManager,
  }
}

test('startTransformSessionFromSelection expands group move targets to leaf descendants', () => {
  const document = createGroupTransformFixture()
  const {input, transformManager} = createStartInput({
    document,
    handle: 'move',
    selectedShapeIds: ['group-1'],
  })

  const started = startTransformSessionFromSelection(input)
  const session = transformManager.getSession()

  assert.equal(started, true)
  assert.deepEqual(session?.shapeIds, ['group-1'])
  assert.deepEqual(session?.shapes.map((shape) => shape.shapeId), ['rect-a', 'rect-b'])
})

test('startTransformSessionFromSelection expands group resize targets while preserving selected ids', () => {
  const document = createGroupTransformFixture()
  const {input, transformManager} = createStartInput({
    document,
    handle: 'se',
    selectedShapeIds: ['group-1', 'rect-a'],
  })

  const started = startTransformSessionFromSelection(input)
  const session = transformManager.getSession()

  assert.equal(started, true)
  assert.deepEqual(session?.shapeIds, ['group-1', 'rect-a'])
  assert.deepEqual(session?.shapes.map((shape) => shape.shapeId), ['rect-a', 'rect-b'])
})

test('startTransformSessionFromSelection expands group rotate targets while preserving selected ids', () => {
  const document = createGroupTransformFixture()
  const {input, transformManager} = createStartInput({
    document,
    handle: 'rotate',
    selectedShapeIds: ['group-1'],
  })

  const started = startTransformSessionFromSelection(input)
  const session = transformManager.getSession()

  assert.equal(started, true)
  assert.deepEqual(session?.shapeIds, ['group-1'])
  assert.deepEqual(session?.shapes.map((shape) => shape.shapeId), ['rect-a', 'rect-b'])
})
