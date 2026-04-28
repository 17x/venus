/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {assertNever, invariant} from './invariant.ts'

// Verifies invariant no-op path for truthy conditions.
test('invariant does not throw when condition is true', () => {
  assert.doesNotThrow(() => {
    invariant(true, 'should not throw')
  })
})

// Verifies invariant throws with caller-provided message.
test('invariant throws when condition is false', () => {
  assert.throws(() => {
    invariant(false, 'failed')
  }, /failed/)
})

// Verifies assertNever always fails fast in unreachable paths.
test('assertNever always throws with provided message', () => {
  assert.throws(() => {
    assertNever('x' as never, 'unexpected')
  }, /unexpected/)
})

