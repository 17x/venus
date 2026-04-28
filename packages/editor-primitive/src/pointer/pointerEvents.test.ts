import assert from 'node:assert/strict'
import test from 'node:test'

import {createPointerRuntime} from './PointerRuntime.ts'
import {applyPointerDown, applyPointerMove, applyPointerUp} from './pointerEvents.ts'

test('pointer reducers update drag state after threshold is crossed', () => {
  // Seed runtime from initial pointer position.
  const seeded = createPointerRuntime({x: 0, y: 0})
  const down = applyPointerDown(seeded, {pointerId: 1, buttons: 1, timeStamp: 0}, {x: 0, y: 0})

  // Move less than threshold first and keep dragging disabled.
  const moveBeforeThreshold = applyPointerMove(
    down,
    {pointerId: 1, buttons: 1, timeStamp: 8},
    {x: 1, y: 1},
    undefined,
    {previousTimeStamp: 0, dragThresholdPx: 3},
  )
  assert.equal(moveBeforeThreshold.isDragging, false)

  // Cross threshold and verify dragging becomes sticky.
  const moveAfterThreshold = applyPointerMove(
    moveBeforeThreshold,
    {pointerId: 1, buttons: 1, timeStamp: 16},
    {x: 5, y: 0},
    undefined,
    {previousTimeStamp: 8, dragThresholdPx: 3},
  )
  assert.equal(moveAfterThreshold.isDragging, true)
  assert.equal(typeof moveAfterThreshold.dragStartedAt, 'number')

  const up = applyPointerUp(moveAfterThreshold, {pointerId: 1, buttons: 0}, {x: 5, y: 0})
  assert.equal(up.isDown, false)
  assert.equal(up.isDragging, false)
})
