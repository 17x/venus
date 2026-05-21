import assert from 'node:assert/strict'
import test from 'node:test'

import {resolvePointerLifecycleTransition} from '../pointerLifecycleState.ts'

test('pointer lifecycle: idle -> down enters pressed', () => {
  const result = resolvePointerLifecycleTransition('idle', 'input.pointer.down')
  assert.deepEqual(result, {
    next: 'pressed',
    accepted: true,
  })
})

test('pointer lifecycle: pressed -> down is rejected', () => {
  const result = resolvePointerLifecycleTransition('pressed', 'input.pointer.down')
  assert.deepEqual(result, {
    next: 'pressed',
    accepted: false,
  })
})

test('pointer lifecycle: pressed -> up enters idle', () => {
  const result = resolvePointerLifecycleTransition('pressed', 'input.pointer.up')
  assert.deepEqual(result, {
    next: 'idle',
    accepted: true,
  })
})

test('pointer lifecycle: idle -> up is rejected', () => {
  const result = resolvePointerLifecycleTransition('idle', 'input.pointer.up')
  assert.deepEqual(result, {
    next: 'idle',
    accepted: false,
  })
})

test('pointer lifecycle: pressed -> leave enters idle', () => {
  const result = resolvePointerLifecycleTransition('pressed', 'input.pointer.leave')
  assert.deepEqual(result, {
    next: 'idle',
    accepted: true,
  })
})

test('pointer lifecycle: move keeps phase and is accepted', () => {
  const result = resolvePointerLifecycleTransition('pressed', 'input.pointer.move')
  assert.deepEqual(result, {
    next: 'pressed',
    accepted: true,
  })
})
