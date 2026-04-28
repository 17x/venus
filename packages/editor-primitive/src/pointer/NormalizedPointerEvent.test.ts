import assert from 'node:assert/strict'
import test from 'node:test'

import {createNormalizedPointerEvent} from './NormalizedPointerEvent.ts'

test('createNormalizedPointerEvent keeps adapter-provided coordinate spaces intact', () => {
  const event = createNormalizedPointerEvent({
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    buttons: 1,
    client: {x: 100, y: 120},
    canvas: {x: 80, y: 90},
    screen: {x: 160, y: 180},
    world: {x: 10, y: 12},
    modifiers: {
      alt: false,
      ctrl: false,
      meta: false,
      shift: true,
      space: false,
    },
    timestamp: 42,
    isPrimary: true,
  })

  assert.deepEqual(event.world, {x: 10, y: 12})
  assert.equal(event.pointerType, 'mouse')
})
