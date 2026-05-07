import test from 'node:test'
import assert from 'node:assert/strict'
import {
  resolvePredictiveOverscanCssPx,
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