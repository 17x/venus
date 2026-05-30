import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createTransformSessionManager,
  createTransformSessionShape,
} from '../../../runtime/interaction/transformSessionManager.ts'
import {resolvePointerUpTransformCommit} from '../../../runtime/interaction/pointerUpResolve.ts'

const SHAPE = {
  id: 'shape-transform-1',
  x: 10,
  y: 20,
  width: 100,
  height: 80,
  rotation: 0,
}

/**
 * Verifies transform sessions separate preview, commit, and cancel state transitions.
 */
test('transform session state machine commits preview once and clears active session', () => {
  const manager = createTransformSessionManager()
  manager.start({
    shapeIds: [SHAPE.id],
    shapes: [createTransformSessionShape(SHAPE)],
    handle: 'move',
    pointer: {x: 10, y: 20},
    startBounds: {minX: 10, minY: 20, maxX: 110, maxY: 100},
  })

  const preview = manager.update({x: 30, y: 45})
  const committedSession = manager.commit()
  const result = resolvePointerUpTransformCommit(committedSession, preview, [SHAPE])

  assert.equal(manager.getSession(), null)
  assert.deepEqual(result?.selectionShapeIds, [SHAPE.id])
  assert.equal(result?.transformCommand?.type, 'shape.transform.batch')
  assert.equal(result?.transformCommand?.transforms.length, 1)
})

/**
 * Verifies cancel clears preview state without producing a transform commit.
 */
test('transform session state machine cancel leaves no dirty transform command', () => {
  const manager = createTransformSessionManager()
  manager.start({
    shapeIds: [SHAPE.id],
    shapes: [createTransformSessionShape(SHAPE)],
    handle: 'move',
    pointer: {x: 10, y: 20},
    startBounds: {minX: 10, minY: 20, maxX: 110, maxY: 100},
  })

  const preview = manager.update({x: 40, y: 50})
  manager.cancel()
  const result = resolvePointerUpTransformCommit(manager.getSession(), preview, [SHAPE])

  assert.equal(manager.getSession(), null)
  assert.equal(result, null)
})
