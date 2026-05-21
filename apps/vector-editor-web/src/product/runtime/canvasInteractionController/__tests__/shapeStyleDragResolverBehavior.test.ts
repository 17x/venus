import assert from 'node:assert/strict'
import test from 'node:test'
import type {ControlDragBehavior} from '@venus/editor-primitive'
import {resolveShapeStyleDragFromBehavior} from '../shapeStyleDragResolver.ts'

test('resolveShapeStyleDragFromBehavior resolves rect-radius drag payload', () => {
    const point = {x: 12, y: 24}
    const behavior: ControlDragBehavior = {
      kind: 'rect-radius',
      payload: {
        shapeId: 'shape-1',
        corner: 'topLeft',
      },
    }

    const result = resolveShapeStyleDragFromBehavior(behavior, point)

    assert.deepEqual(result, {
      kind: 'rect-radius',
      payload: {
        shapeId: 'shape-1',
        corner: 'topLeft',
        point,
      },
    })
})

test('resolveShapeStyleDragFromBehavior resolves arc-angle drag payload', () => {
    const point = {x: 40, y: 80}
    const behavior: ControlDragBehavior = {
      kind: 'arc-angle',
      payload: {
        shapeId: 'ellipse-1',
        boundary: 'end',
      },
    }

    const result = resolveShapeStyleDragFromBehavior(behavior, point)

    assert.deepEqual(result, {
      kind: 'ellipse-arc',
      payload: {
        shapeId: 'ellipse-1',
        boundary: 'end',
        point,
      },
    })
})

test('resolveShapeStyleDragFromBehavior returns null when payload is invalid', () => {
    const point = {x: 0, y: 0}
    const behavior: ControlDragBehavior = {
      kind: 'rect-radius',
      payload: {
        shapeId: 'shape-1',
        corner: 'unknown-corner',
      },
    }

    const result = resolveShapeStyleDragFromBehavior(behavior, point)

    assert.equal(result, null)
})

test('resolveShapeStyleDragFromBehavior returns null for unsupported drag kind', () => {
    const point = {x: 1, y: 2}
    const behavior: ControlDragBehavior = {
      kind: 'move',
      payload: {
        shapeId: 'shape-1',
      },
    }

    const result = resolveShapeStyleDragFromBehavior(behavior, point)

    assert.equal(result, null)
})
