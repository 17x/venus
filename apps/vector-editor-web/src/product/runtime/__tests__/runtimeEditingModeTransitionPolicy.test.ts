import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyRuntimeEditingModeTransition,
  resolveRuntimeEditingModeTransitionGuard,
} from '../runtimeEditingModeTransitionPolicy.ts'
import {createRuntimeEditingModeController} from '../../../runtime/editing-modes/controller.ts'

test('editing mode guard accepts pointer-down transitions to selecting', () => {
  const result = resolveRuntimeEditingModeTransitionGuard('idle', {
    to: 'selecting',
    reason: 'pointer-down:selector',
  })

  assert.deepEqual(result, {accepted: true})
})

test('editing mode guard rejects pointer-down transitions to idle', () => {
  const result = resolveRuntimeEditingModeTransitionGuard('idle', {
    to: 'idle',
    reason: 'pointer-down:selector',
  })

  assert.equal(result.accepted, false)
})

test('editing mode guard enforces pointer-up to idle', () => {
  const rejectResult = resolveRuntimeEditingModeTransitionGuard('dragging', {
    to: 'selecting',
    reason: 'pointer-up',
  })
  const acceptResult = resolveRuntimeEditingModeTransitionGuard('dragging', {
    to: 'idle',
    reason: 'pointer-up',
  })

  assert.equal(rejectResult.accepted, false)
  assert.deepEqual(acceptResult, {accepted: true})
})

test('applyRuntimeEditingModeTransition applies accepted transition', () => {
  const controller = createRuntimeEditingModeController('idle')

  const result = applyRuntimeEditingModeTransition(controller, {
    to: 'selecting',
    reason: 'pointer-down:selector',
  })

  assert.deepEqual(result, {accepted: true})
  assert.equal(controller.getCurrentMode(), 'selecting')
})

test('applyRuntimeEditingModeTransition rejects disallowed transition without mutating mode', () => {
  const controller = createRuntimeEditingModeController('idle')

  const result = applyRuntimeEditingModeTransition(controller, {
    to: 'idle',
    reason: 'pointer-down:selector',
  })

  assert.equal(result.accepted, false)
  assert.equal(controller.getCurrentMode(), 'idle')
})
