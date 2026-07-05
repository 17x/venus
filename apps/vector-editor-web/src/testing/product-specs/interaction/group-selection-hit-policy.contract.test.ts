import assert from 'node:assert/strict'
import test from 'node:test'

import type {DocumentNode} from '../../../runtime/model/index.ts'
import {resolveSelectableShape} from '../../../runtime/worker/scope/hitTest.ts'

test('default group hit policy promotes nested hits to the topmost parent group', () => {
  const shapes: DocumentNode[] = [
    {
      id: 'outer-group',
      type: 'group',
      name: 'Outer Group',
      parentId: null,
      childIds: ['inner-group'],
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    },
    {
      id: 'inner-group',
      type: 'group',
      name: 'Inner Group',
      parentId: 'outer-group',
      childIds: ['rect-1'],
      x: 20,
      y: 30,
      width: 80,
      height: 60,
    },
    {
      id: 'rect-1',
      type: 'rectangle',
      name: 'Rect 1',
      parentId: 'inner-group',
      x: 20,
      y: 30,
      width: 80,
      height: 60,
    },
  ]
  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]))

  assert.equal(resolveSelectableShape(shapes[2], shapeById).id, 'outer-group')
})

test('default group hit policy keeps direct hits when there is no parent group', () => {
  const shape: DocumentNode = {
    id: 'rect-1',
    type: 'rectangle',
    name: 'Rect 1',
    parentId: null,
    x: 20,
    y: 30,
    width: 80,
    height: 60,
  }

  assert.equal(resolveSelectableShape(shape, new Map([[shape.id, shape]])).id, 'rect-1')
})
