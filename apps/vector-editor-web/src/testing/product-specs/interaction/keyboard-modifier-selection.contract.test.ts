import assert from 'node:assert/strict'
import test from 'node:test'

import {createTransformSessionManager, createTransformSessionShape} from '../../../runtime/interaction/transformSessionManager.ts'
import type {SelectionState} from '../../../runtime/interaction/productInteractionTypes.ts'

const SHAPE = {
  id: 'shape-mod-1',
  x: 10,
  y: 20,
  width: 80,
  height: 60,
  rotation: 0,
}

/**
 * Simulates modifier-key selection helpers for additive/toggle selection modes.
 */
function applyModifierSelection(
  state: SelectionState,
  candidateIdx: string,
  modifiers: {shiftKey?: boolean; metaKey?: boolean},
): SelectionState {
  if (modifiers.metaKey) {
    if (state.selectedIds.includes(candidateIdx)) {
      return {...state, selectedIds: state.selectedIds.filter((id) => id !== candidateIdx)}
    }
    return {...state, selectedIds: [...state.selectedIds, candidateIdx]}
  }

  if (modifiers.shiftKey) {
    return {...state, selectedIds: [...state.selectedIds, candidateIdx]}
  }

  return {...state, selectedIds: [candidateIdx]}
}

/**
 * Verifies modifier-key selection behavior before transform arm state.
 */
test('modifier selection adds and toggles shape ids without arming transform', () => {
  let state: SelectionState = {selectedIds: [], hoverId: null, selectedBounds: null}

  state = applyModifierSelection(state, 'shape-a', {})
  assert.deepEqual(state.selectedIds, ['shape-a'])

  state = applyModifierSelection(state, 'shape-b', {shiftKey: true})
  assert.deepEqual(state.selectedIds, ['shape-a', 'shape-b'])

  state = applyModifierSelection(state, 'shape-a', {metaKey: true})
  assert.deepEqual(state.selectedIds, ['shape-b'])
})

/**
 * Verifies transform session is not armed when only modifiers change selection.
 */
test('transform session not armed when modifier-only selection change occurs', () => {
  const manager = createTransformSessionManager()

  manager.start({
    shapeIds: [SHAPE.id],
    shapes: [createTransformSessionShape(SHAPE)],
    handle: 'move',
    pointer: {x: 10, y: 20},
    startBounds: {minX: 10, minY: 20, maxX: 90, maxY: 80},
  })

  const session = manager.commit()
  assert.ok(session)

  // After commit, no pending session
  assert.equal(manager.getSession(), null)

  // Modifier selection change alone should not arm a new session
  const nextState: SelectionState = {selectedIds: ['shape-mod-1'], hoverId: null, selectedBounds: null}
  assert.deepEqual(nextState.selectedIds, ['shape-mod-1'])
})
