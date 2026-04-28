import assert from 'node:assert/strict'
import test from 'node:test'

import {createKeyboardRuntime} from './KeyboardRuntime.ts'
import {applyKeyboardKeyDown, applyKeyboardKeyUp, normalizeKeyboardKey} from './keyUtils.ts'

test('keyboard helpers normalize and track pressed keys', () => {
  assert.equal(normalizeKeyboardKey('A'), 'a')
  assert.equal(normalizeKeyboardKey(' '), 'space')

  const seeded = createKeyboardRuntime()
  const withShiftDown = applyKeyboardKeyDown(seeded, {key: 'Shift', shiftKey: true})
  assert.equal(withShiftDown.modifierKeys.shift, true)

  const withShiftUp = applyKeyboardKeyUp(withShiftDown, {key: 'Shift'})
  assert.equal(withShiftUp.modifierKeys.shift, false)
})
