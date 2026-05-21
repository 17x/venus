import test from 'node:test'
import assert from 'node:assert/strict'
import {
  resolvePredictiveOverscanCssPx,
  resolvePredictivePanQueuePolicy,
  resolvePredictivePreloadRing,
  resolvePredictiveTileRingWindow,
} from './interactionPredictiveTiles.ts'

test('resolvePredictivePreloadRing expands ring under high-confidence motion', () => {
  const ring = resolvePredictivePreloadRing(1, {
    directionX: 1,
    directionY: 0,
    speedPxPerSec: 1500,
    confidence: 0.8,
  })

  assert.equal(ring, 4)
})

test('resolvePredictiveOverscanCssPx scales with predictor confidence', () => {
  const overscan = resolvePredictiveOverscanCssPx(512, {
    directionX: 0,
    directionY: 1,
    speedPxPerSec: 800,
    confidence: 0.5,
  })

  assert.equal(overscan, 256)
})

test('resolvePredictiveTileRingWindow biases forward direction and shrinks opposite side', () => {
  const ringWindow = resolvePredictiveTileRingWindow(2, {
    directionX: 1,
    directionY: 0,
    speedPxPerSec: 1000,
    confidence: 0.9,
  })

  assert.equal(ringWindow.right, 5)
  assert.equal(ringWindow.left, 1)
  assert.equal(ringWindow.up, 2)
  assert.equal(ringWindow.down, 2)
})

test('resolvePredictivePanQueuePolicy returns baseline policy when predictor is missing', () => {
  const policy = resolvePredictivePanQueuePolicy(undefined)

  assert.equal(policy.forwardOverscanTiles, 2)
  assert.equal(policy.backwardOverscanTiles, 1)
  assert.equal(policy.predictionWindowMs, 100)
})

test('resolvePredictivePanQueuePolicy boosts forward overscan and prediction window under fast confident motion', () => {
  const policy = resolvePredictivePanQueuePolicy({
    directionX: 1,
    directionY: 0,
    speedPxPerSec: 2_000,
    confidence: 0.92,
  })

  assert.equal(policy.forwardOverscanTiles, 4)
  assert.equal(policy.backwardOverscanTiles, 2)
  assert.equal(policy.predictionWindowMs, 180)
})