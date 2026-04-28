import assert from 'node:assert/strict'
import test from 'node:test'

import {
  compileShortcutBindings,
  createShortcutPressedKeys,
  resolveMatchingShortcutBinding,
} from './ShortcutBindings.ts'

// Verifies comma-separated user config is compiled into multiple chord entries.
test('compileShortcutBindings parses comma-separated chords', () => {
  const bindings = compileShortcutBindings([
    {id: 'save', shortcut: 'ctrl+s,meta+s'},
    {id: 'tool-pan', shortcut: 'space'},
  ])

  assert.equal(bindings.length, 2)
  assert.equal(bindings[0].chords.length, 2)
  assert.equal(bindings[1].chords.length, 1)
})

// Verifies keyboard snapshots normalize both primary and alias modifier tokens.
test('createShortcutPressedKeys normalizes space and modifier aliases', () => {
  const pressedKeys = createShortcutPressedKeys({
    key: ' ',
    code: 'Space',
    ctrlKey: true,
  })

  assert.equal(pressedKeys.has('space'), true)
  assert.equal(pressedKeys.has('ctrl'), true)
  assert.equal(pressedKeys.has('control'), true)
})

// Verifies runtime matcher selects the first binding that satisfies current key state.
test('resolveMatchingShortcutBinding returns first matching binding id', () => {
  const bindings = compileShortcutBindings([
    {id: 'undo', shortcut: 'mod+z'},
    {id: 'redo', shortcut: 'mod+shift+z'},
  ])

  const match = resolveMatchingShortcutBinding(bindings, {
    pressedKeys: new Set(['meta', 'z']),
    platform: 'mac',
  })

  assert.equal(match, 'undo')
})
