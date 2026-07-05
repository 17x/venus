import assert from 'node:assert/strict'
import test from 'node:test'

import {createPointerSelectorState} from '@venus/editor-primitive'
import {createPointerDownHandler} from './canvasInteractionController.pointerDown.ts'
import {createPointerMoveHandler} from './canvasInteractionController.pointerMove.ts'
import type {
  EditorRuntimeCanvasInteractionControllerOptions,
  EditorRuntimeCanvasInteractionControllerState,
} from './canvasInteractionController.types.ts'

/**
 * Creates a compact controller state fixture for panning tests.
 */
function createControllerState(): EditorRuntimeCanvasInteractionControllerState {
  return {
    hoverHitBudget: {
      lastAt: 0,
      lastPoint: null,
    },
    pointerSelectorState: createPointerSelectorState(),
    pointerSelectorStartScreen: null,
    pointerSelectorModifiers: undefined,
    panDragOrigin: null,
    panDragOffset: {x: 0, y: 0},
  }
}

/**
 * Creates the minimum option surface touched by panning pointer handlers.
 */
function createPanningOptions() {
  const panDeltas: Array<{x: number; y: number}> = []
  const transitions: Array<{to: string; reason: string}> = []

  const options = {
    currentTool: 'panning',
    interactionBridge: {
      dispatch: () => undefined,
    },
    selectionDragControllerRef: {
      current: {
        clear: () => undefined,
      },
    },
    runtimeEditingModeControllerRef: {
      current: {
        transition: (payload: {to: string; reason: string}) => {
          transitions.push(payload)
        },
      },
    },
    defaultCanvasInteractions: {
      onViewportPan: (x: number, y: number) => {
        panDeltas.push({x, y})
      },
    },
    setActiveTransformHandle: () => undefined,
    setHoveredTransformHandle: () => undefined,
    setHoveredShapeId: () => undefined,
    setSelectorOverlayItems: () => undefined,
    setSnapGuides: () => undefined,
  } as unknown as EditorRuntimeCanvasInteractionControllerOptions

  return {
    options,
    panDeltas,
    transitions,
  }
}

test('panning tool converts left-button screen movement into viewport pan deltas', () => {
  const state = createControllerState()
  const {options, panDeltas, transitions} = createPanningOptions()
  const pointerDown = createPointerDownHandler(options, state)
  const pointerMove = createPointerMoveHandler(options, state)

  pointerDown({x: 0, y: 0}, undefined, {screen: {x: 100, y: 80}, pointerId: 7})
  pointerMove({x: 1, y: 1}, {screen: {x: 118, y: 74}, pointerId: 7})

  assert.deepEqual(transitions, [{to: 'panning', reason: 'pointer-down:panning'}])
  assert.deepEqual(panDeltas, [{x: 18, y: -6}])
})

test('panning tool ignores movement from a different pointer id', () => {
  const state = createControllerState()
  const {options, panDeltas} = createPanningOptions()
  const pointerDown = createPointerDownHandler(options, state)
  const pointerMove = createPointerMoveHandler(options, state)

  pointerDown({x: 0, y: 0}, undefined, {screen: {x: 100, y: 80}, pointerId: 7})
  pointerMove({x: 1, y: 1}, {screen: {x: 118, y: 74}, pointerId: 8})

  assert.deepEqual(panDeltas, [])
})
