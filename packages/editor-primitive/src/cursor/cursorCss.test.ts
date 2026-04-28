import assert from 'node:assert/strict'
import test from 'node:test'

import {cursorIntentToCss} from './cursorCss.ts'
import {resolveCursorIntent, resolveCursorRuntime} from './CursorManager.ts'

test('cursor helpers resolve resize and priority intent', () => {
  assert.equal(
    cursorIntentToCss({type: 'resize', direction: 'e', rotation: 90}),
    'ns-resize',
  )

  const runtime = resolveCursorRuntime({
    tool: {type: 'default'},
    overlay: {type: 'pointer'},
  })
  assert.equal(runtime.source, 'overlay')
  assert.equal(runtime.css, 'pointer')

  const intent = resolveCursorIntent({
    scene: {type: 'crosshair'},
  })
  assert.equal(intent.type, 'crosshair')
})
