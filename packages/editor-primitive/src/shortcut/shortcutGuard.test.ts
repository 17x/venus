import assert from 'node:assert/strict'
import test from 'node:test'

import {shouldHandleEditorShortcut} from './shortcutGuard.ts'

test('shouldHandleEditorShortcut returns false while IME composition is active', () => {
  const allowed = shouldHandleEditorShortcut({
    isTextEditing: false,
    isComposing: true,
    targetTagName: 'div',
  })

  assert.equal(allowed, false)
})

test('shouldHandleEditorShortcut returns false for textarea and text-editing contexts', () => {
  const blockedByTag = shouldHandleEditorShortcut({
    isTextEditing: false,
    isComposing: false,
    targetTagName: 'textarea',
  })

  const blockedByMode = shouldHandleEditorShortcut({
    isTextEditing: true,
    isComposing: false,
    targetTagName: 'div',
  })

  assert.equal(blockedByTag, false)
  assert.equal(blockedByMode, false)
})

