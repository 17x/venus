import assert from 'node:assert/strict'
import test from 'node:test'

import type {DocumentNode, EditorDocument} from '../../../runtime/model/index.ts'
import type {SelectionDragSession} from '../../../runtime/interaction/selectionDragController.ts'
import {resolveDragStartTransformPayload} from '../../../runtime/interaction/transformPreviewResolve.ts'

function createNestedGroupDocument(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'Nested group transform preview',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-1',
        type: 'group',
        name: 'Group 1',
        parentId: null,
        childIds: ['rect-a', 'group-2'],
        x: 0,
        y: 0,
        width: 200,
        height: 160,
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

test('group drag keeps group selection while transforming leaf descendants', () => {
  const document = createNestedGroupDocument()
  const shapeById = new Map<string, DocumentNode>(
    document.shapes.map((shape) => [shape.id, shape]),
  )
  const session: SelectionDragSession = {
    start: {x: 12, y: 18},
    current: {x: 30, y: 44},
    bounds: {minX: 0, minY: 0, maxX: 200, maxY: 160},
    selectionShapeIds: ['group-1'],
    shapes: [
      {shapeId: 'group-1', x: 0, y: 0},
      {shapeId: 'rect-a', x: 10, y: 20},
      {shapeId: 'group-2', x: 90, y: 50},
      {shapeId: 'rect-b', x: 90, y: 50},
    ],
  }

  const payload = resolveDragStartTransformPayload(session, shapeById, document)

  assert.deepEqual(payload?.shapeIds, ['group-1'])
  assert.deepEqual(payload?.sessionShapes.map((shape) => shape.shapeId), ['rect-a', 'rect-b'])
  assert.deepEqual(payload?.previewShapes.map((shape) => shape.shapeId), ['rect-a', 'rect-b'])
  assert.deepEqual(payload?.startBounds, {minX: 10, minY: 20, maxX: 150, maxY: 110})
})
