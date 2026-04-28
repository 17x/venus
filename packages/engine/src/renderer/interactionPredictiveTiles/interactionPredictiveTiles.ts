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

const MIN_CONFIDENCE_FOR_DIRECTIONAL_BIAS = 0.2
const MAX_RING_EXTENSION = 3
const CONFIDENCE_EXTENSION_MULTIPLIER = 2
const SPEED_EXTENSION_HIGH_THRESHOLD = 1800
const SPEED_EXTENSION_MEDIUM_THRESHOLD = 900
const SPEED_EXTENSION_HIGH_VALUE = 2
const SPEED_EXTENSION_MEDIUM_VALUE = 1
const DIRECTION_ACTIVATION_THRESHOLD = 0.2
const DIRECTIONAL_EXTENSION_CONFIDENCE_MULTIPLIER = 3

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