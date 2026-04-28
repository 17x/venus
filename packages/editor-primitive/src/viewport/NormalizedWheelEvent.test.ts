import assert from 'node:assert/strict'
import test from 'node:test'

import {createEmptyModifierState} from '../input/ModifierState.ts'
import type {NormalizedWheelEvent} from './NormalizedWheelEvent.ts'

test('NormalizedWheelEvent keeps coordinate spaces and normalized delta mode', () => {
  // Validate wheel adapters can pass all coordinate spaces through one stable contract.
  const event: NormalizedWheelEvent = {
    deltaX: 2,
    deltaY: 8,
    deltaMode: 'pixel',
    client: {x: 10, y: 20},
    canvas: {x: 8, y: 16},
    screen: {x: 12, y: 18},
    world: {x: 100, y: 200},
    modifiers: {
      ...createEmptyModifierState(),
      ctrl: true,
    },
    timestamp: 300,
  }

  assert.equal(event.deltaMode, 'pixel')
  assert.equal(event.world.x, 100)
  assert.equal(event.modifiers.ctrl, true)
})

