import assert from 'node:assert/strict'
import test from 'node:test'

import {createHistoryManager} from '../../../runtime/worker/history.ts'
import {
  createTransformSessionManager,
  createTransformSessionShape,
} from '../../../runtime/interaction/transformSessionManager.ts'
import {resolvePointerUpTransformCommit} from '../../../runtime/interaction/pointerUpResolve.ts'

const SHAPE = {
  id: 'shape-undo-1',
  x: 10,
  y: 20,
  width: 80,
  height: 60,
  rotation: 0,
}

/**
 * Verifies transform commit → undo → redo → commit again keeps selection stable.
 */
test('transform undo redo composite cycle preserves commit and selection ids', () => {
  const history = createHistoryManager()
  const manager = createTransformSessionManager()

  // First commit: move shape
  manager.start({
    shapeIds: [SHAPE.id],
    shapes: [createTransformSessionShape(SHAPE)],
    handle: 'move',
    pointer: {x: 10, y: 20},
    startBounds: {minX: 10, minY: 20, maxX: 90, maxY: 80},
  })
  const preview1 = manager.update({x: 30, y: 40})
  const session1 = manager.commit()
  const commit1 = resolvePointerUpTransformCommit(session1, preview1, [SHAPE])

  assert.ok(commit1)
  history.pushLocalEntry({id: 'entry-move', label: 'move shape', forward: [], backward: []})

  // Undo
  const undo = history.undo()
  assert.deepEqual(undo.appliedEntry?.id, 'entry-move')
  assert.equal(history.getSummary().canUndo, false)
  assert.equal(history.getSummary().canRedo, true)

  // Redo
  const redo = history.redo()
  assert.deepEqual(redo.appliedEntry?.id, 'entry-move')
  assert.equal(history.getSummary().canUndo, true)
  assert.equal(history.getSummary().canRedo, false)

  // Second commit after redo
  manager.start({
    shapeIds: [SHAPE.id],
    shapes: [createTransformSessionShape({...SHAPE, x: 30, y: 40})],
    handle: 'se',
    pointer: {x: 30, y: 40},
    startBounds: {minX: 30, minY: 40, maxX: 110, maxY: 100},
  })
  const preview2 = manager.update({x: 10, y: 20})
  const session2 = manager.commit()
  const commit2 = resolvePointerUpTransformCommit(session2, preview2, [
    {...SHAPE, x: 30, y: 40},
  ])

  assert.ok(commit2)
  history.pushLocalEntry({id: 'entry-resize', label: 'resize shape', forward: [], backward: []})

  const summary = history.getSummary()
  assert.deepEqual(summary.entries.map((entry) => entry.id), ['entry-move', 'entry-resize'])
  assert.equal(summary.canUndo, true)
  assert.equal(summary.canRedo, false)
})
