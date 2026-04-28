import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveRuntimeZoomGestureScale,
  resolveRuntimeZoomPresetScale,
} from './zoomPresets.ts'

test('zoom preset helpers keep mouse discrete and trackpad continuous', () => {
  assert.equal(resolveRuntimeZoomPresetScale(1, 'in'), 1.5)
  assert.equal(resolveRuntimeZoomPresetScale(1, 'out'), 0.6667)

  assert.equal(resolveRuntimeZoomGestureScale(1, 1.02, 'mouse'), 1.5)
  assert.equal(resolveRuntimeZoomGestureScale(1, 1.02, 'trackpad'), 1.02)
})
