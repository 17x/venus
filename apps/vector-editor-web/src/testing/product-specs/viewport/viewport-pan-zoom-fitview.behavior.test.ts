import assert from 'node:assert/strict'
import test from 'node:test'

import {
  accumulatePointerPanOffset,
  accumulateWheelPanOffset,
  fitViewportToDocument,
  resolveViewportState,
  zoomViewportState,
} from '../../../runtime/viewport/controller.ts'
import {DEFAULT_ZOOM_SESSION, handleZoomWheel} from '../../../runtime/zoom/index.ts'

/**
 * Creates one measured viewport baseline used by pan/zoom tests.
 */
function createMeasuredViewport() {
  return resolveViewportState({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    viewportWidth: 1000,
    viewportHeight: 800,
  })
}

test('zoom around anchor keeps expected offset mapping for deterministic pan-zoom behavior', () => {
  const viewport = createMeasuredViewport()
  const next = zoomViewportState(viewport, 2, {x: 500, y: 400})

  assert.equal(next.scale, 2)
  assert.equal(next.offsetX, -500)
  assert.equal(next.offsetY, -400)
})

test('fit view computes bounded scale and centers content within viewport', () => {
  const viewport = createMeasuredViewport()
  const fit = fitViewportToDocument(
    {
      width: 2000,
      height: 1000,
    },
    viewport,
  )

  assert.ok(fit.scale > 0)
  assert.ok(fit.scale < 1)
  assert.ok(Number.isFinite(fit.offsetX))
  assert.ok(Number.isFinite(fit.offsetY))
})

test('wheel source lock keeps input source stable across short mixed event bursts', () => {
  const first = handleZoomWheel(DEFAULT_ZOOM_SESSION, {
    clientX: 100,
    clientY: 100,
    ctrlKey: true,
    metaKey: false,
    deltaMode: 0,
    deltaX: 0,
    deltaY: 120,
    timeStamp: 1000,
  })

  const second = handleZoomWheel(first.session, {
    clientX: 100,
    clientY: 100,
    ctrlKey: true,
    metaKey: false,
    deltaMode: 0,
    deltaX: 0.25,
    deltaY: 0.75,
    timeStamp: 1080,
  })

  assert.equal(first.source, 'mouse')
  assert.equal(second.source, 'mouse')
})

test('wheel and pointer pan accumulators keep deterministic offset state', () => {
  const afterWheel = accumulateWheelPanOffset({x: 0, y: 0}, {deltaX: 12, deltaY: -8})
  assert.deepEqual(afterWheel, {x: -12, y: 8})

  const pan = accumulatePointerPanOffset(
    {x: 10, y: 20},
    {x: 100, y: 120, pointerId: 7},
    {x: 130, y: 150, pointerId: 7},
  )

  assert.deepEqual(pan.offset, {x: 40, y: 50})
  assert.deepEqual(pan.origin, {x: 130, y: 150, pointerId: 7})
})
