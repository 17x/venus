import assert from 'node:assert/strict'
import test from 'node:test'

import {createEmptyModifierState} from './ModifierState.ts'

test('createEmptyModifierState initializes all modifiers as false', () => {
  // Verify the canonical empty modifier snapshot used by all normalized input adapters.
  const state = createEmptyModifierState()

  assert.deepEqual(state, {
    alt: false,
    ctrl: false,
    meta: false,
    shift: false,
    space: false,
  })
})

test('createEmptyModifierState result can be safely extended per event context', () => {
  // Confirm callers can clone and override one modifier without mutating shared defaults.
  const base = createEmptyModifierState()
  const withShift = {
    ...base,
    shift: true,
  }

  assert.equal(base.shift, false)
  assert.equal(withShift.shift, true)
})

