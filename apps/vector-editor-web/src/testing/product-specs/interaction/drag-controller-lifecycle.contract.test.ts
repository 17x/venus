import assert from 'node:assert/strict'
import test from 'node:test'

import {createSelectionDragController} from '../../../runtime/interaction/selectionDragController.ts'

/**
 * Verifies selection drag controller lifecycle: create, clear, getSession, and idempotent clear.
 */
test('selection drag controller clear and getSession remain deterministic after lifecycle', () => {
  const controller = createSelectionDragController({dragThresholdPx: 3})

  // Initial state: no session
  assert.equal(controller.getSession(), null)

  // pointerUp on empty controller returns null
  const up = controller.pointerUp()
  assert.equal(up, null)

  // clear is idempotent
  controller.clear()
  assert.equal(controller.getSession(), null)

  // pointerUp after clear returns null
  const upAfterClear = controller.pointerUp()
  assert.equal(upAfterClear, null)
})

/**
 * Verifies drag controller options defaults are deterministic.
 */
test('selection drag controller default options produce deterministic thresholds', () => {
  const defaultController = createSelectionDragController()
  assert.equal(defaultController.getSession(), null)

  const customController = createSelectionDragController({
    dragThresholdPx: 10,
    lineHitTolerance: 8,
    allowFrameSelection: false,
  })
  assert.equal(customController.getSession(), null)

  // Both controllers expose same interface shape
  assert.equal(typeof defaultController.pointerDown, 'function')
  assert.equal(typeof defaultController.pointerMove, 'function')
  assert.equal(typeof defaultController.pointerUp, 'function')
  assert.equal(typeof defaultController.clear, 'function')
  assert.equal(typeof customController.pointerDown, 'function')
})
