import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngineInteractionPredictor } from './interactionPredictor.ts'
import { resolveEngineViewportState } from '../../../interaction/viewport/viewport.ts'

/**
 * Resolves viewport input with stable defaults so predictor tests stay focused on motion behavior.
  * @param input Input payload for this operation.
*/
function createViewport(input?: Partial<{ offsetX: number; offsetY: number; scale: number }>) {
  return resolveEngineViewportState({
    viewportWidth: 640,
    viewportHeight: 480,
    offsetX: input?.offsetX ?? 0,
    offsetY: input?.offsetY ?? 0,
    scale: input?.scale ?? 1,
  })
}

test('createEngineInteractionPredictor emits normalized direction and speed from pan deltas', () => {
  const predictor = createEngineInteractionPredictor()

  predictor.update({
    nowMs: 100,
    viewport: createViewport({ offsetX: 0, offsetY: 0 }),
    interactionActive: true,
  })
  const snapshot = predictor.update({
    nowMs: 116,
    viewport: createViewport({ offsetX: 16, offsetY: 0 }),
    interactionActive: true,
  })

  assert.equal(snapshot.directionX, 1)
  assert.equal(snapshot.directionY, 0)
  assert.equal(snapshot.speedPxPerSec, 1000)
  assert.ok(snapshot.confidence > 0)
})

test('createEngineInteractionPredictor suppresses confidence when interaction is inactive', () => {
  const predictor = createEngineInteractionPredictor()

  predictor.update({
    nowMs: 0,
    viewport: createViewport({ offsetX: 0, offsetY: 0 }),
    interactionActive: true,
  })
  const active = predictor.update({
    nowMs: 16,
    viewport: createViewport({ offsetX: 20, offsetY: 0 }),
    interactionActive: true,
  })
  const inactive = predictor.update({
    nowMs: 32,
    viewport: createViewport({ offsetX: 40, offsetY: 0 }),
    interactionActive: false,
  })

  assert.ok(active.confidence > inactive.confidence)
})

test('createEngineInteractionPredictor resets to zero snapshot', () => {
  const predictor = createEngineInteractionPredictor()

  predictor.update({
    nowMs: 10,
    viewport: createViewport({ offsetX: 0, offsetY: 0 }),
    interactionActive: true,
  })
  predictor.update({
    nowMs: 26,
    viewport: createViewport({ offsetX: 8, offsetY: 8 }),
    interactionActive: true,
  })
  predictor.reset()

  assert.deepEqual(predictor.read(), {
    directionX: 0,
    directionY: 0,
    speedPxPerSec: 0,
    confidence: 0,
  })
})