import assert from 'node:assert/strict'
import test from 'node:test'

import {createEmptyModifierState} from '../input/ModifierState.ts'
import type {NormalizedKeyboardEvent} from './NormalizedKeyboardEvent.ts'

test('NormalizedKeyboardEvent preserves normalized key, modifiers, and editor guard metadata', () => {
  // Exercise the typed contract used by keyboard dispatch so fields do not drift silently.
  const event: NormalizedKeyboardEvent = {
    key: 'z',
    code: 'KeyZ',
    modifiers: {
      ...createEmptyModifierState(),
      meta: true,
    },
    repeat: false,
    timestamp: 120,
    isComposing: false,
    targetTagName: 'canvas',
    isContentEditable: false,
  }

  assert.equal(event.key, 'z')
  assert.equal(event.modifiers.meta, true)
  assert.equal(event.targetTagName, 'canvas')
  assert.equal(event.isContentEditable, false)
})

