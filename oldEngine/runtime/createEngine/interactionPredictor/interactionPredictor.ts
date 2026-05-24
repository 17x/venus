import type { EngineCanvasViewportState } from '../../../interaction/viewport/viewport.ts'

/**
 * Stores one interaction predictor sample that can drive render-side prefetch policy.
 */
export interface EngineInteractionPredictorSnapshot {
  /** Unit X direction of camera movement in screen-space offset coordinates. */
  directionX: number
  /** Unit Y direction of camera movement in screen-space offset coordinates. */
  directionY: number
  /** Magnitude of camera movement velocity in screen px/sec. */
  speedPxPerSec: number
  /** Confidence score in range [0, 1] derived from movement stability. */
  confidence: number
}

interface EngineInteractionPredictorSample {
  viewport: Pick<EngineCanvasViewportState, 'offsetX' | 'offsetY' | 'scale'>
  atMs: number
}

/**
 * Stores input payload used to update the interaction predictor.
 */
export interface UpdateEngineInteractionPredictorInput {
  /** Current monotonic timestamp in milliseconds. */
  nowMs: number
  /** Current viewport state used to derive pan/zoom motion vector. */
  viewport: EngineCanvasViewportState
  /** Whether strategy currently marks frame as interaction-active. */
  interactionActive: boolean
}

/**
 * Defines internal predictor operations used by runtime orchestration.
 */
export interface EngineInteractionPredictor {
  /** Updates predictor from latest viewport sample and returns current snapshot. */
  update(input: UpdateEngineInteractionPredictorInput): EngineInteractionPredictorSnapshot
  /** Returns the latest predictor snapshot without mutating predictor state. */
  read(): EngineInteractionPredictorSnapshot
  /** Resets predictor history so stale motion vectors do not leak across sessions. */
  reset(): void
}

const DEFAULT_PREDICTOR_SNAPSHOT: EngineInteractionPredictorSnapshot = {
  directionX: 0,
  directionY: 0,
  speedPxPerSec: 0,
  confidence: 0,
}

const MAX_MOTION_DT_MS = 96
const MIN_DIRECTION_DISTANCE_PX = 0.5
const SPEED_CONFIDENCE_DENOMINATOR = 1200
const SPEED_PER_SECOND_MULTIPLIER = 1000
const ZOOM_CONFIDENCE_DENOMINATOR = 0.15
const IDLE_CONFIDENCE_ATTENUATION = 0.25

/**
 * Creates a stateful interaction predictor for pan/zoom direction and velocity.
 */
export function createEngineInteractionPredictor(): EngineInteractionPredictor {
  let previousSample: EngineInteractionPredictorSample | null = null
  let latestSnapshot: EngineInteractionPredictorSnapshot = DEFAULT_PREDICTOR_SNAPSHOT

  /**
   * Updates prediction snapshot from viewport delta while clamping stale timing windows.
    * @param input Predictor sample input for the current frame.
   */
  const update: EngineInteractionPredictor['update'] = (input) => {
    const sample: EngineInteractionPredictorSample = {
      viewport: {
        offsetX: input.viewport.offsetX,
        offsetY: input.viewport.offsetY,
        scale: input.viewport.scale,
      },
      atMs: input.nowMs,
    }

    if (!previousSample) {
      previousSample = sample
      latestSnapshot = DEFAULT_PREDICTOR_SNAPSHOT
      return latestSnapshot
    }

    const deltaTimeMs = Math.max(1, Math.min(MAX_MOTION_DT_MS, sample.atMs - previousSample.atMs))
    const deltaOffsetX = sample.viewport.offsetX - previousSample.viewport.offsetX
    const deltaOffsetY = sample.viewport.offsetY - previousSample.viewport.offsetY
    const deltaScale = Math.abs(sample.viewport.scale - previousSample.viewport.scale)
    const distancePx = Math.hypot(deltaOffsetX, deltaOffsetY)
    const speedPxPerSec = (distancePx / deltaTimeMs) * SPEED_PER_SECOND_MULTIPLIER

    // Keep direction stable: tiny viewport jitter should not emit noisy vectors.
    const directionX = distancePx >= MIN_DIRECTION_DISTANCE_PX
      ? deltaOffsetX / distancePx
      : 0
    const directionY = distancePx >= MIN_DIRECTION_DISTANCE_PX
      ? deltaOffsetY / distancePx
      : 0

    // Blend speed and zoom-change activity into one bounded confidence score.
    const speedConfidence = Math.min(1, speedPxPerSec / SPEED_CONFIDENCE_DENOMINATOR)
    const zoomConfidence = Math.min(1, deltaScale / ZOOM_CONFIDENCE_DENOMINATOR)
    const motionConfidence = Math.max(speedConfidence, zoomConfidence)
    const confidence = input.interactionActive
      ? motionConfidence
      : motionConfidence * IDLE_CONFIDENCE_ATTENUATION

    latestSnapshot = {
      directionX,
      directionY,
      speedPxPerSec,
      confidence,
    }
    previousSample = sample
    return latestSnapshot
  }

  /**
   * Returns the latest predictor snapshot for diagnostics and renderer context wiring.
   */
  const read = () => latestSnapshot

  /**
   * Clears predictor state, for example when disposing or hard-resetting runtime.
   */
  const reset = () => {
    previousSample = null
    latestSnapshot = DEFAULT_PREDICTOR_SNAPSHOT
  }

  return {
    update,
    read,
    reset,
  }
}