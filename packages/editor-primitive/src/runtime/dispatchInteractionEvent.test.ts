import assert from 'node:assert/strict'
import test from 'node:test'

import {createCaptureRuntime} from '../capture/CaptureRuntime.ts'
import {createGestureRuntime} from '../operation/GestureRuntime.ts'
import {createKeyboardRuntime} from '../keyboard/KeyboardRuntime.ts'
import {createPointerRuntime} from '../pointer/PointerRuntime.ts'
import {createNormalizedPointerEvent} from '../pointer/NormalizedPointerEvent.ts'
import {createEmptyModifierState} from '../input/ModifierState.ts'
import type {InteractionRuntimeState} from './InteractionRuntimeState.ts'
import {dispatchInteractionEvent} from './dispatchInteractionEvent.ts'

/**
 * Creates a baseline interaction runtime state for dispatch tests.
 */
function createRuntimeState(): InteractionRuntimeState {
  return {
    pointer: createPointerRuntime({x: 0, y: 0}, {x: 0, y: 0}),
    keyboard: createKeyboardRuntime(),
    gesture: createGestureRuntime(),
    capture: createCaptureRuntime(),
    hover: {
      screenPoint: {x: 0, y: 0},
      changed: false,
    },
    cursor: {type: 'default'},
    tool: {
      currentTool: 'select',
      effectiveTool: 'select',
    },
    operation: {
      phase: 'idle',
      active: null,
    },
  }
}

/**
 * Creates a normalized pointer event with shared baseline fields for test brevity.
 */
function createPointerEvent(input: {x: number; y: number; buttons: number; timestamp: number; isPrimary?: boolean}) {
  return createNormalizedPointerEvent({
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    buttons: input.buttons,
    client: {x: input.x, y: input.y},
    canvas: {x: input.x, y: input.y},
    screen: {x: input.x, y: input.y},
    world: {x: input.x, y: input.y},
    modifiers: createEmptyModifierState(),
    timestamp: input.timestamp,
    // Keep primary true by default so existing tests stay focused unless explicitly overridden.
    isPrimary: input.isPrimary ?? true,
  })
}

test('dispatchInteractionEvent returns commit intent on pointer up after drag phase', () => {
  const state = createRuntimeState()
  const downResult = dispatchInteractionEvent(state, {
    type: 'pointer-down',
    eventId: 'e1',
    event: createPointerEvent({x: 0, y: 0, buttons: 1, timestamp: 1}),
  })

  const movedState = {
    ...state,
    ...downResult.nextState,
    operation: {
      phase: 'pending' as const,
      active: null,
    },
  }

  const moveResult = dispatchInteractionEvent(movedState, {
    type: 'pointer-move',
    eventId: 'e2',
    patch: {delta: 10},
    event: createPointerEvent({x: 10, y: 0, buttons: 1, timestamp: 16}),
  })

  const upResult = dispatchInteractionEvent(
    {
      ...movedState,
      ...moveResult.nextState,
      operation: {
        phase: 'active',
        active: null,
      },
    },
    {
      type: 'pointer-up',
      eventId: 'e3',
      patch: {delta: 10},
      event: createPointerEvent({x: 10, y: 0, buttons: 0, timestamp: 24}),
    },
  )

  assert.equal(upResult.command?.type, 'commit')
})

test('dispatchInteractionEvent guards keyboard shortcuts during IME composition', () => {
  const state = createRuntimeState()
  const result = dispatchInteractionEvent(state, {
    type: 'key-down',
    eventId: 'k1',
    event: {
      key: 'z',
      code: 'KeyZ',
      modifiers: createEmptyModifierState(),
      repeat: false,
      timestamp: 1,
      isComposing: true,
    },
  })

  assert.equal(result.nextState?.keyboard?.pressedKeys.size, 0)
  assert.equal(result.warnings?.[0]?.code, 'shortcut-blocked-by-ime')
})

test('dispatchInteractionEvent emits zoom viewport intent for cmd-wheel', () => {
  const state = createRuntimeState()
  const result = dispatchInteractionEvent(state, {
    type: 'wheel',
    eventId: 'w1',
    event: {
      deltaX: 0,
      deltaY: 100,
      deltaMode: 'pixel',
      client: {x: 20, y: 30},
      canvas: {x: 20, y: 30},
      screen: {x: 20, y: 30},
      world: {x: 100, y: 200},
      modifiers: {
        ...createEmptyModifierState(),
        meta: true,
      },
      timestamp: 10,
    },
  })

  assert.equal(result.viewport?.type, 'zoom-at')
  assert.equal(result.preventDefault, true)
})

test('dispatchInteractionEvent emits warning for non-primary pointer streams', () => {
  const state = createRuntimeState()
  const result = dispatchInteractionEvent(state, {
    type: 'pointer-down',
    eventId: 'np-1',
    event: createPointerEvent({x: 0, y: 0, buttons: 1, timestamp: 1, isPrimary: false}),
  })

  // Non-primary pointer paths should degrade safely with diagnostics instead of mutating runtime state.
  assert.equal(result.warnings?.[0]?.code, 'ignored-non-primary-pointer')
  assert.equal(result.nextState, undefined)
})

test('dispatchInteractionEvent cancels operation on blur lifecycle interrupts', () => {
  const state = createRuntimeState()
  const result = dispatchInteractionEvent(state, {
    type: 'blur',
    eventId: 'blur-1',
    timestamp: 15,
  })

  // Blur should route through one cancel contract so adapters can rollback capture consistently.
  assert.equal(result.command?.type, 'cancel')
  assert.equal(result.nextState?.operation?.phase, 'cancelled')
  assert.equal(result.nextState?.capture?.pointerCaptured, false)
})

test('dispatchInteractionEvent maps shift-wheel to horizontal pan intent', () => {
  const state = createRuntimeState()
  const result = dispatchInteractionEvent(state, {
    type: 'wheel',
    eventId: 'w2',
    event: {
      deltaX: 3,
      deltaY: 12,
      deltaMode: 'pixel',
      client: {x: 20, y: 30},
      canvas: {x: 20, y: 30},
      screen: {x: 20, y: 30},
      world: {x: 100, y: 200},
      modifiers: {
        ...createEmptyModifierState(),
        shift: true,
      },
      timestamp: 20,
    },
  })

  // Shift + wheel should preserve compatibility with horizontal timeline/canvas navigation patterns.
  assert.equal(result.viewport?.type, 'pan-by')
  assert.equal(result.viewport?.dx, 15)
  assert.equal(result.viewport?.dy, 0)
})
