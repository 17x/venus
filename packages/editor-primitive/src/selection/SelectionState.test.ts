import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addSelectionId,
  createSelectionState,
  removeSelectionId,
  replaceSelection,
  toggleSelectionId,
} from './SelectionState.ts'

test('replaceSelection updates ids and derives focus/anchor', () => {
  const state = replaceSelection(createSelectionState<string>(), ['a', 'b'])

  assert.deepEqual(state.selectedIds, ['a', 'b'])
  assert.equal(state.focusedId, 'a')
  assert.equal(state.anchorId, 'a')
})

test('toggleSelectionId adds and removes ids deterministically', () => {
  const added = toggleSelectionId(createSelectionState<string>(), 'node-1')
  const removed = toggleSelectionId(added, 'node-1')

  assert.deepEqual(added.selectedIds, ['node-1'])
  assert.deepEqual(removed.selectedIds, [])
})

test('removeSelectionId repairs focus to remaining first id', () => {
  const seeded = addSelectionId(addSelectionId(createSelectionState<string>(), 'a'), 'b')
  const removed = removeSelectionId(seeded, 'a')

  assert.equal(removed.focusedId, 'b')
})

