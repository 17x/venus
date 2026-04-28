import assert from 'node:assert/strict'
import test from 'node:test'

import {createTargetStack, pickNextTarget, resolveTargetStack} from './TargetStack.ts'

test('pickNextTarget cycles through stack in order and wraps to primary', () => {
  const stack = createTargetStack(
    {x: 10, y: 20},
    [
      {type: 'overlay-handle', id: 'overlay-1', handle: 'ne'},
      {type: 'scene-node', id: 'shape-1'},
      {type: 'viewport'},
    ],
  )

  const second = pickNextTarget(stack, stack.primary)
  const wrapped = pickNextTarget(stack, {type: 'viewport'})

  assert.deepEqual(second, {type: 'scene-node', id: 'shape-1'})
  assert.deepEqual(wrapped, stack.primary)
})

test('pickNextTarget falls back to empty when stack has no targets', () => {
  const stack = createTargetStack({x: 0, y: 0}, [])
  const next = pickNextTarget(stack, null)

  assert.deepEqual(next, {type: 'empty'})
})

test('resolveTargetStack returns equivalent snapshot to createTargetStack', () => {
  const pointer = {x: 4, y: 8}
  const targets = [{type: 'scene-node', id: 'shape-1'}] as const

  const stack = resolveTargetStack(pointer, [...targets])

  assert.equal(stack.pointer.x, 4)
  assert.deepEqual(stack.primary, {type: 'scene-node', id: 'shape-1'})
})
