import assert from 'node:assert/strict'
import test from 'node:test'

import {runInteractionPipeline, type InteractionPipelineState} from './InteractionPipeline.ts'
import type {InteractionTargetCandidate} from '../target/index.ts'

test('runInteractionPipeline executes handlers and returns merged next state', () => {
  const initial: InteractionPipelineState<'select', InteractionTargetCandidate, string> = {
    pointer: {
      screen: {x: 0, y: 0},
      previousScreen: {x: 0, y: 0},
      deltaScreen: {x: 0, y: 0},
      buttons: 0,
      isDown: false,
      isDragging: false,
      dragDistancePx: 0,
    },
    keyboard: {
      pressedKeys: new Set(),
      modifierKeys: {},
    },
    gesture: {type: 'none'},
    target: {priority: 'empty', target: {type: 'empty'}},
    effectiveTool: 'select',
    activeOperation: null,
    operationPhase: 'idle',
  }

  const next = runInteractionPipeline(
    {type: 'pointermove', timeStamp: 10},
    initial,
    {
      resolvePointer: () => ({
        ...initial.pointer,
        screen: {x: 5, y: 2},
      }),
      resolveKeyboard: () => initial.keyboard,
      resolveGesture: () => ({type: 'drag-move'}),
      resolveTarget: () => ({priority: 'viewport', target: {type: 'viewport'}}),
      resolveEffectiveTool: () => 'select',
      resolveOperation: () => ({activeOperation: null, operationPhase: 'active'}),
      resolvePatch: () => 'patched',
    },
  )

  assert.equal(next.gesture.type, 'drag-move')
  assert.equal(next.target.priority, 'viewport')
  assert.equal(next.patch, 'patched')
})

