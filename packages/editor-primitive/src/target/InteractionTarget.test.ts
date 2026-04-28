import assert from 'node:assert/strict'
import test from 'node:test'

import {resolveInteractionTarget} from './InteractionTarget.ts'

test('resolveInteractionTarget prefers capture target over overlay and scene hits', () => {
  const resolved = resolveInteractionTarget({
    capturedTarget: {type: 'overlay-bounds', id: 'capture-bounds'},
    overlayHandleTarget: {type: 'overlay-handle', id: 'overlay-1', handle: 'ne'},
    sceneTarget: {type: 'scene-node', id: 'shape-1'},
  })

  assert.equal(resolved.priority, 'capture')
  assert.deepEqual(resolved.target, {type: 'overlay-bounds', id: 'capture-bounds'})
})

test('resolveInteractionTarget falls back to empty when no candidates are present', () => {
  const resolved = resolveInteractionTarget({})

  assert.equal(resolved.priority, 'empty')
  assert.deepEqual(resolved.target, {type: 'empty'})
})

