import assert from 'node:assert/strict'
import test from 'node:test'

import {createPointerRuntime} from '../pointer/PointerRuntime.ts'
import {applyPointerDown, applyPointerMove, applyPointerUp} from '../pointer/pointerEvents.ts'
import {resolveGestureIntent} from './GestureIntent.ts'
import {resolveGesturePolicy} from './GesturePolicy.ts'

/**
 * Creates a minimal pointer event-like object for gesture tests.
 */
function pointerEvent(pointerId: number, buttons: number, timeStamp: number) {
  return {pointerId, buttons, timeStamp}
}

test('resolveGestureIntent emits drag-start when threshold is crossed', () => {
  const policy = resolveGesturePolicy({dragThreshold: 4})
  const base = createPointerRuntime({x: 0, y: 0})
  const down = applyPointerDown(base, pointerEvent(1, 1, 0), {x: 0, y: 0})
  const moved = applyPointerMove(down, pointerEvent(1, 1, 16), {x: 10, y: 0}, undefined, {
    dragThresholdPx: policy.dragThreshold,
  })

  const gesture = resolveGestureIntent({
    previous: down,
    next: moved,
    eventType: 'pointermove',
    policy,
    timeStamp: 16,
  })

  assert.equal(gesture.type, 'drag-start')
})

test('resolveGestureIntent emits double-click for close click timestamps', () => {
  const policy = resolveGesturePolicy()
  const base = createPointerRuntime({x: 0, y: 0})
  const down = applyPointerDown(base, pointerEvent(1, 1, 0), {x: 0, y: 0})
  const up = applyPointerUp(down, pointerEvent(1, 0, 100), {x: 0, y: 0})

  const gesture = resolveGestureIntent({
    previous: down,
    next: up,
    eventType: 'pointerup',
    policy,
    lastClickAt: 0,
    timeStamp: 100,
  })

  assert.equal(gesture.type, 'double-click')
})

