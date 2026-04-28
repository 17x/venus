/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  accumulatePointerPanOffset,
  accumulateWheelPanOffset,
  createViewportPanOrigin,
} from './viewportPan.ts'

test('accumulateWheelPanOffset converts wheel deltas to viewport translation', () => {
  const offset = accumulateWheelPanOffset({x: 10, y: 20}, {deltaX: 5, deltaY: -2})

  assert.deepEqual(offset, {x: 5, y: 22})
})

test('accumulatePointerPanOffset ignores pointer updates from other pointer ids', () => {
  const origin = createViewportPanOrigin({x: 100, y: 100, pointerId: 1})
  const result = accumulatePointerPanOffset({x: 0, y: 0}, origin, {
    x: 140,
    y: 120,
    pointerId: 2,
  })

  assert.deepEqual(result, {
    offset: {x: 0, y: 0},
    origin,
  })
})

