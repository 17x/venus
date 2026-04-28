/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_ZOOM_SESSION,
  detectZoomInputSource,
  handleZoomWheel,
  normalizeZoomDelta,
} from './zoom.ts'

test('detectZoomInputSource classifies non-pixel wheel input as mouse', () => {
  const source = detectZoomInputSource({
    deltaMode: 1,
    deltaX: 0,
    deltaY: 3,
  })

  assert.equal(source, 'mouse')
})

test('normalizeZoomDelta clamps large wheel delta values', () => {
  const normalized = normalizeZoomDelta({
    clientX: 10,
    clientY: 20,
    ctrlKey: false,
    metaKey: false,
    deltaMode: 0,
    deltaX: 0,
    deltaY: 1000,
  })

  assert.equal(normalized.anchor.x, 10)
  assert.equal(normalized.anchor.y, 20)
  assert.ok(normalized.delta <= 160)
})

test('handleZoomWheel updates session as active and returns settle delay', () => {
  const result = handleZoomWheel(DEFAULT_ZOOM_SESSION, {
    clientX: 100,
    clientY: 120,
    ctrlKey: true,
    metaKey: false,
    deltaMode: 0,
    deltaX: 0,
    deltaY: -20,
    timeStamp: 10,
  })

  assert.equal(result.session.active, true)
  assert.equal(result.anchor.x, 100)
  assert.equal(typeof result.settleDelay, 'number')
})

