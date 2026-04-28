import assert from 'node:assert/strict'
import test from 'node:test'

import {matchesShortcut, parseShortcutChord} from './ShortcutMatcher.ts'

test('matchesShortcut resolves mod alias to meta on mac', () => {
  const chord = parseShortcutChord('mod+z')
  const matched = matchesShortcut({pressedKeys: new Set(['meta', 'z']), platform: 'mac'}, chord)

  assert.equal(matched, true)
})

test('matchesShortcut resolves mod alias to ctrl on windows', () => {
  const chord = parseShortcutChord('mod+shift+z')
  const matched = matchesShortcut(
    {pressedKeys: new Set(['control', 'shift', 'z']), platform: 'windows'},
    chord,
  )

  assert.equal(matched, true)
})

