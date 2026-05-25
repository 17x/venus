import assert from 'node:assert/strict'
import test from 'node:test'

import {resolveActiveOverlayRoutingDecision} from './activeOverlayRoutingContract.ts'

/**
 * Verifies idle interaction phases route scene to base plane and keep active ids empty.
 */
test('resolveActiveOverlayRoutingDecision routes idle frames to base plane', () => {
  const decision = resolveActiveOverlayRoutingDecision({
    interactionPhase: 'settled',
    allShapeIds: ['a', 'b'],
    protectedNodeIds: ['b', 'a'],
    overlayNodeCount: 0,
  })

  assert.equal(decision.shouldUseActivePlane, false)
  assert.equal(decision.scenePlane, 'base')
  assert.equal(decision.overlayPlane, 'base')
  assert.deepEqual(decision.protectedNodeIds, ['a', 'b'])
  assert.deepEqual(decision.interactionActiveNodeIds, [])
})

/**
 * Verifies drag/precision phases route scene to active plane with all shape ids.
 */
test('resolveActiveOverlayRoutingDecision routes drag frames to active plane', () => {
  const decision = resolveActiveOverlayRoutingDecision({
    interactionPhase: 'drag',
    allShapeIds: ['shape-1', 'shape-2', 'shape-3'],
    protectedNodeIds: ['shape-2'],
    overlayNodeCount: 3,
  })

  assert.equal(decision.shouldUseActivePlane, true)
  assert.equal(decision.scenePlane, 'active')
  assert.equal(decision.overlayPlane, 'overlay')
  assert.deepEqual(decision.interactionActiveNodeIds, ['shape-1', 'shape-2', 'shape-3'])
})

/**
 * Verifies changed-node fallback keeps deterministic ordering when no scene ids are available.
 */
test('resolveActiveOverlayRoutingDecision falls back to protected+changed ids when scene ids are empty', () => {
  const decision = resolveActiveOverlayRoutingDecision({
    interactionPhase: 'precision',
    allShapeIds: [],
    protectedNodeIds: ['node-c', 'node-a'],
    changedNodeIds: ['node-b', 'node-a'],
    overlayNodeCount: 1,
  })

  assert.equal(decision.shouldUseActivePlane, true)
  assert.deepEqual(decision.interactionActiveNodeIds, ['node-a', 'node-b', 'node-c'])
})

/**
 * Verifies phase transitions keep deterministic active/base routing without flicker.
 */
test('resolveActiveOverlayRoutingDecision keeps stable routing across phase transitions', () => {
  const allShapeIds = ['shape-a', 'shape-b']
  const protectedNodeIds = ['shape-b']

  const settledDecision = resolveActiveOverlayRoutingDecision({
    interactionPhase: 'settled',
    allShapeIds,
    protectedNodeIds,
    overlayNodeCount: 2,
  })
  const dragDecision = resolveActiveOverlayRoutingDecision({
    interactionPhase: 'drag',
    allShapeIds,
    protectedNodeIds,
    overlayNodeCount: 2,
  })
  const settledAgainDecision = resolveActiveOverlayRoutingDecision({
    interactionPhase: 'settled',
    allShapeIds,
    protectedNodeIds,
    overlayNodeCount: 2,
  })

  assert.equal(settledDecision.scenePlane, 'base')
  assert.equal(dragDecision.scenePlane, 'active')
  assert.equal(settledAgainDecision.scenePlane, 'base')
  assert.deepEqual(settledDecision.interactionActiveNodeIds, [])
  assert.deepEqual(dragDecision.interactionActiveNodeIds, ['shape-a', 'shape-b'])
  assert.deepEqual(settledAgainDecision.interactionActiveNodeIds, [])
  assert.equal(settledDecision.overlayPlane, 'overlay')
  assert.equal(dragDecision.overlayPlane, 'overlay')
  assert.equal(settledAgainDecision.overlayPlane, 'overlay')
})
