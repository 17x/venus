import assert from 'node:assert/strict'
import test from 'node:test'

import {createCaptureRuntime} from './CaptureRuntime.ts'

test('capture runtime starts as inactive with auto-release enabled', () => {
  const runtime = createCaptureRuntime()
  assert.equal(runtime.pointerCaptured, false)
  assert.equal(runtime.releaseOnPointerUp, true)
})
