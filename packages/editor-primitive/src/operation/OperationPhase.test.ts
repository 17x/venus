import assert from 'node:assert/strict'
import test from 'node:test'

import {createActiveOperation} from './ActiveOperation.ts'
import {resolveOperationPhaseFromUpdate, transitionOperationPhase} from './OperationPhase.ts'

test('resolveOperationPhaseFromUpdate keeps pending below drag threshold', () => {
  const operation = createActiveOperation({
    id: 'op-1',
    type: 'drag',
    startedAt: 1,
    startScreen: {x: 0, y: 0},
  })

  const next = {
    ...operation,
    currentScreen: {x: 2, y: 2},
  }

  const phase = resolveOperationPhaseFromUpdate('pending', next, 4)
  assert.equal(phase, 'pending')
})

test('resolveOperationPhaseFromUpdate switches to active once threshold is crossed', () => {
  const operation = createActiveOperation({
    id: 'op-2',
    type: 'drag',
    startedAt: 1,
    startScreen: {x: 0, y: 0},
  })

  const next = {
    ...operation,
    currentScreen: {x: 10, y: 0},
  }

  const phase = resolveOperationPhaseFromUpdate('pending', next, 4)
  assert.equal(phase, 'active')
})

test('transitionOperationPhase promotes pending move to active once dragging is true', () => {
  const phase = transitionOperationPhase('pending', 'pointer-move', true)
  assert.equal(phase, 'active')
})

test('transitionOperationPhase completes active operation on pointer up', () => {
  const phase = transitionOperationPhase('active', 'pointer-up', false)
  assert.equal(phase, 'completed')
})
