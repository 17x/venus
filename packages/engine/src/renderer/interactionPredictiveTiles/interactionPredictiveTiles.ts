import type { EngineInteractionPredictorState } from '../types/index.ts'

/**
 * Stores directional ring expansion resolved from predictor output.
 */
export interface PredictiveTileRingWindow {
  /** Extra tiles retained toward negative X direction. */
  left: number
  /** Extra tiles retained toward positive X direction. */
  right: number
  /** Extra tiles retained toward negative Y direction. */
  up: number
  /** Extra tiles retained toward positive Y direction. */
  down: number
}

/**
 * Stores predictor-driven pan queue policy used by tile request scheduling.
 */
export interface PredictivePanQueuePolicy {
  /** Forward overscan tiles along predicted movement direction. */
  forwardOverscanTiles: number
  /** Backward overscan tiles opposite predicted movement direction. */
  backwardOverscanTiles: number
  /** Look-ahead window in milliseconds for projected pan camera. */
  predictionWindowMs: number
}

const MIN_CONFIDENCE_FOR_DIRECTIONAL_BIAS = 0.2
const MAX_RING_EXTENSION = 3
const CONFIDENCE_EXTENSION_MULTIPLIER = 2
const SPEED_EXTENSION_HIGH_THRESHOLD = 1800
const SPEED_EXTENSION_MEDIUM_THRESHOLD = 900
const SPEED_EXTENSION_HIGH_VALUE = 2
const SPEED_EXTENSION_MEDIUM_VALUE = 1
const DIRECTION_ACTIVATION_THRESHOLD = 0.2
const DIRECTIONAL_EXTENSION_CONFIDENCE_MULTIPLIER = 3
const PAN_QUEUE_BASE_FORWARD_TILES = 2
const PAN_QUEUE_BASE_BACKWARD_TILES = 1
const PAN_QUEUE_BASE_PREDICTION_WINDOW_MS = 100
const PAN_QUEUE_MAX_FORWARD_TILES = 4
const PAN_QUEUE_MAX_BACKWARD_TILES = 2
const PAN_QUEUE_MAX_PREDICTION_WINDOW_MS = 180
const PAN_QUEUE_HIGH_CONFIDENCE_THRESHOLD = 0.75
const PAN_QUEUE_HIGH_SPEED_THRESHOLD = 1600
const PAN_QUEUE_MEDIUM_SPEED_THRESHOLD = 900

/**
 * Resolves dynamic preload ring radius from a base ring and predictor snapshot.
  * @param baseRing baseRing parameter.
 * @param predictor predictor parameter.
*/
export function resolvePredictivePreloadRing(
  baseRing: number,
  predictor: EngineInteractionPredictorState | undefined,
): number {
  const safeBaseRing = Math.max(0, Math.round(baseRing))
  if (!predictor) {
    return safeBaseRing
  }

  // Increase preload ring under high-confidence/high-speed motion to reduce miss bursts.
  const confidenceExtension = Math.round(Math.max(0, predictor.confidence) * CONFIDENCE_EXTENSION_MULTIPLIER)
  const speedExtension = predictor.speedPxPerSec >= SPEED_EXTENSION_HIGH_THRESHOLD
    ? SPEED_EXTENSION_HIGH_VALUE
    : predictor.speedPxPerSec >= SPEED_EXTENSION_MEDIUM_THRESHOLD
      ? SPEED_EXTENSION_MEDIUM_VALUE
      : 0
  return safeBaseRing + Math.min(MAX_RING_EXTENSION, confidenceExtension + speedExtension)
}

/**
 * Resolves dynamic overscan in CSS px using tile size and predictor confidence.
  * @param tileSizeCssPx tileSizeCssPx parameter.
 * @param predictor predictor parameter.
*/
export function resolvePredictiveOverscanCssPx(
  tileSizeCssPx: number,
  predictor: EngineInteractionPredictorState | undefined,
): number {
  const safeTileSize = Math.max(1, Math.round(tileSizeCssPx))
  if (!predictor) {
    return 0
  }

  // Confidence drives conservative overscan growth so queue pruning keeps forward context.
  return Math.round(safeTileSize * Math.max(0, predictor.confidence))
}

/**
 * Resolves directional ring window so prefetch can bias toward predicted movement direction.
  * @param ring ring parameter.
 * @param predictor predictor parameter.
*/
export function resolvePredictiveTileRingWindow(
  ring: number,
  predictor: EngineInteractionPredictorState | undefined,
): PredictiveTileRingWindow {
  const safeRing = Math.max(0, Math.round(ring))
  const defaultWindow: PredictiveTileRingWindow = {
    left: safeRing,
    right: safeRing,
    up: safeRing,
    down: safeRing,
  }
  if (!predictor || predictor.confidence < MIN_CONFIDENCE_FOR_DIRECTIONAL_BIAS) {
    return defaultWindow
  }

  const directionalExtension = Math.min(
    MAX_RING_EXTENSION,
    Math.max(1, Math.round(predictor.confidence * DIRECTIONAL_EXTENSION_CONFIDENCE_MULTIPLIER)),
  )
  const shrink = safeRing > 0 ? 1 : 0
  const nextWindow = {
    ...defaultWindow,
  }

  // Bias along horizontal axis when direction magnitude is meaningful.
  if (predictor.directionX >= DIRECTION_ACTIVATION_THRESHOLD) {
    nextWindow.right = safeRing + directionalExtension
    nextWindow.left = Math.max(0, safeRing - shrink)
  } else if (predictor.directionX <= -DIRECTION_ACTIVATION_THRESHOLD) {
    nextWindow.left = safeRing + directionalExtension
    nextWindow.right = Math.max(0, safeRing - shrink)
  }

  // Bias along vertical axis when direction magnitude is meaningful.
  if (predictor.directionY >= DIRECTION_ACTIVATION_THRESHOLD) {
    nextWindow.down = safeRing + directionalExtension
    nextWindow.up = Math.max(0, safeRing - shrink)
  } else if (predictor.directionY <= -DIRECTION_ACTIVATION_THRESHOLD) {
    nextWindow.up = safeRing + directionalExtension
    nextWindow.down = Math.max(0, safeRing - shrink)
  }

  return nextWindow
}

/**
 * Resolves pan predictive queue policy from interaction predictor snapshot.
 * @param predictor Predictor state used to shape forward/backward preload spread.
 */
export function resolvePredictivePanQueuePolicy(
  predictor: EngineInteractionPredictorState | undefined,
): PredictivePanQueuePolicy {
  if (!predictor) {
    return {
      forwardOverscanTiles: PAN_QUEUE_BASE_FORWARD_TILES,
      backwardOverscanTiles: PAN_QUEUE_BASE_BACKWARD_TILES,
      predictionWindowMs: PAN_QUEUE_BASE_PREDICTION_WINDOW_MS,
    }
  }

  const safeConfidence = Math.max(0, Math.min(1, predictor.confidence))
  const safeSpeed = Math.max(0, predictor.speedPxPerSec)
  const highConfidence = safeConfidence >= PAN_QUEUE_HIGH_CONFIDENCE_THRESHOLD
  const highSpeed = safeSpeed >= PAN_QUEUE_HIGH_SPEED_THRESHOLD
  const mediumSpeed = safeSpeed >= PAN_QUEUE_MEDIUM_SPEED_THRESHOLD

  const forwardBoost = highConfidence && highSpeed
    ? 2
    : highConfidence || mediumSpeed
      ? 1
      : 0
  const backwardBoost = highConfidence && highSpeed ? 1 : 0
  const predictionWindowBoostMs = highConfidence && highSpeed
    ? 80
    : highConfidence || mediumSpeed
      ? 40
      : 0

  return {
    forwardOverscanTiles: Math.min(
      PAN_QUEUE_MAX_FORWARD_TILES,
      PAN_QUEUE_BASE_FORWARD_TILES + forwardBoost,
    ),
    backwardOverscanTiles: Math.min(
      PAN_QUEUE_MAX_BACKWARD_TILES,
      PAN_QUEUE_BASE_BACKWARD_TILES + backwardBoost,
    ),
    predictionWindowMs: Math.min(
      PAN_QUEUE_MAX_PREDICTION_WINDOW_MS,
      PAN_QUEUE_BASE_PREDICTION_WINDOW_MS + predictionWindowBoostMs,
    ),
  }
}