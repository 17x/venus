import type { EngineFrameBudget } from '../../../renderer/types/index.ts'
import type { EngineRenderStrategyPhase } from '../strategy/strategy.ts'

export type EngineFrameBudgetPressure = 'low' | 'medium' | 'high'

// Describes one budget decision input snapshot from engine runtime state.
export interface EngineFrameBudgetBrokerInput {
  // Active internal render strategy phase for the current frame.
  phase: EngineRenderStrategyPhase
  // Whether strategy currently treats frame as interaction-time.
  interactionActive: boolean
  // Current scene node count used to estimate render pressure.
  sceneNodeCount: number
  // Current tile scheduler backlog from the previous frame.
  tileQueuePendingCount: number
  // Dirty-region count used to estimate incremental rebuild pressure.
  dirtyRegionCount: number
  // Whether settle sharpness contract is currently awaiting a sharp frame.
  settleSharpnessPending: boolean
  // Whether settle sharpness deadline was missed and one force-sharp frame is required.
  forceSharpFrame: boolean
  // Predictor confidence in range [0, 1] used by adaptive preload budgeting.
  predictorConfidence?: number
  // Predictor speed estimate in px/s used by adaptive preload budgeting.
  predictorSpeedPxPerSec?: number
}

// Describes one frame-budget broker decision for diagnostics and renderer lanes.
export interface EngineFrameBudgetBrokerDecision {
  // Per-lane budget slices consumed by renderer frame execution.
  budget: EngineFrameBudget
  // Coarse pressure tier used to derive budget contractions/expansions.
  pressure: EngineFrameBudgetPressure
}

const BYTES_PER_KIBIBYTE = 1024
const ONE_MEBIBYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE
const BASE_TEXTURE_UPLOAD_BUDGET_MIB = 16
const BASE_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB = 24
const CAMERA_TEXTURE_UPLOAD_BUDGET_MIB = 2
const CAMERA_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB = 4
const INTERACTIVE_TEXTURE_UPLOAD_BUDGET_MIB = 8
const INTERACTIVE_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB = 12
const SETTLE_RECOVERY_TEXTURE_UPLOAD_BUDGET_MIB = 24
const SETTLE_RECOVERY_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB = 32
const BASE_DRAW_SUBMIT_BUDGET_MS = 28
const BASE_TEXTURE_UPLOAD_BUDGET_BYTES = BASE_TEXTURE_UPLOAD_BUDGET_MIB * ONE_MEBIBYTE
const BASE_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES = BASE_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB * ONE_MEBIBYTE
const BASE_IMAGE_TEXTURE_UPLOAD_MAX_COUNT = 2
const BASE_TEXT_TEXTURE_UPLOAD_MAX_COUNT = 4
const BASE_TILE_PRELOAD_BUDGET_MS = 10
const BASE_TILE_PRELOAD_MAX_UPLOADS = 8
const BASE_OVERLAY_PASS_BUDGET_MS = 2

const INTERACTION_HIGH_SCENE_THRESHOLD = 12_000
const INTERACTION_HIGH_TILE_PENDING_THRESHOLD = 256
const STATIC_HIGH_SCENE_THRESHOLD = 18_000
const STATIC_HIGH_TILE_PENDING_THRESHOLD = 320
const STATIC_HIGH_DIRTY_REGION_THRESHOLD = 20
const STATIC_MEDIUM_SCENE_THRESHOLD = 8_000
const STATIC_MEDIUM_TILE_PENDING_THRESHOLD = 96
const STATIC_MEDIUM_DIRTY_REGION_THRESHOLD = 8

const PAN_DRAW_SUBMIT_BUDGET_MS = 10
const PAN_TEXTURE_UPLOAD_BUDGET_MIB = 1
const PAN_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB = 2
const PAN_TEXTURE_UPLOAD_BUDGET_BYTES = PAN_TEXTURE_UPLOAD_BUDGET_MIB * ONE_MEBIBYTE
const PAN_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES = PAN_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB * ONE_MEBIBYTE
const PAN_IMAGE_TEXTURE_UPLOAD_MAX_COUNT = 1
const PAN_TEXT_TEXTURE_UPLOAD_MAX_COUNT = 1
const PAN_TILE_PRELOAD_BUDGET_MS = 2
const PAN_TILE_PRELOAD_MAX_UPLOADS = 3
const PAN_OVERLAY_PASS_BUDGET_MS = 1

const ZOOM_DRAW_SUBMIT_BUDGET_MS = 10
const ZOOM_TEXTURE_UPLOAD_BUDGET_MIB = 1
const ZOOM_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB = 2
const ZOOM_TEXTURE_UPLOAD_BUDGET_BYTES = ZOOM_TEXTURE_UPLOAD_BUDGET_MIB * ONE_MEBIBYTE
const ZOOM_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES = ZOOM_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB * ONE_MEBIBYTE
const ZOOM_IMAGE_TEXTURE_UPLOAD_MAX_COUNT = 1
const ZOOM_TEXT_TEXTURE_UPLOAD_MAX_COUNT = 1
const ZOOM_TILE_PRELOAD_BUDGET_MS = 2
const ZOOM_TILE_PRELOAD_MAX_UPLOADS = 3
const ZOOM_OVERLAY_PASS_BUDGET_MS = 1

const CAMERA_DRAW_SUBMIT_BUDGET_MS = 12
const CAMERA_TEXTURE_UPLOAD_BUDGET_BYTES = CAMERA_TEXTURE_UPLOAD_BUDGET_MIB * ONE_MEBIBYTE
const CAMERA_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES = CAMERA_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB * ONE_MEBIBYTE
const CAMERA_IMAGE_TEXTURE_UPLOAD_MAX_COUNT = 1
const CAMERA_TEXT_TEXTURE_UPLOAD_MAX_COUNT = 1
const CAMERA_TILE_PRELOAD_BUDGET_MS = 4
const CAMERA_TILE_PRELOAD_MAX_UPLOADS = 5
const CAMERA_OVERLAY_PASS_BUDGET_MS = 1

const INTERACTIVE_DRAW_SUBMIT_BUDGET_MS = 16
const INTERACTIVE_TEXTURE_UPLOAD_BUDGET_BYTES = INTERACTIVE_TEXTURE_UPLOAD_BUDGET_MIB * ONE_MEBIBYTE
const INTERACTIVE_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES = INTERACTIVE_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB * ONE_MEBIBYTE
const INTERACTIVE_IMAGE_TEXTURE_UPLOAD_MAX_COUNT = 1
const INTERACTIVE_TEXT_TEXTURE_UPLOAD_MAX_COUNT = 2
const INTERACTIVE_TILE_PRELOAD_BUDGET_MS = 6
const INTERACTIVE_TILE_PRELOAD_MAX_UPLOADS = 4
const INTERACTIVE_OVERLAY_PASS_BUDGET_MS = 2

const PREDICTIVE_PRELOAD_CONFIDENCE_THRESHOLD = 0.75
const PREDICTIVE_PRELOAD_SPEED_THRESHOLD = 1_200
const PREDICTIVE_PRELOAD_BUDGET_BOOST_MS = 2
const PREDICTIVE_PRELOAD_UPLOAD_BOOST = 2
const PREDICTIVE_PRELOAD_BUDGET_MAX_MS = 8
const PREDICTIVE_PRELOAD_UPLOAD_MAX = 8

const SETTLE_RECOVERY_DRAW_SUBMIT_BUDGET_MS = 32
const SETTLE_RECOVERY_TEXTURE_UPLOAD_BUDGET_BYTES = SETTLE_RECOVERY_TEXTURE_UPLOAD_BUDGET_MIB * ONE_MEBIBYTE
const SETTLE_RECOVERY_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES = SETTLE_RECOVERY_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB * ONE_MEBIBYTE
const SETTLE_RECOVERY_IMAGE_TEXTURE_UPLOAD_MAX_COUNT = 4
const SETTLE_RECOVERY_TEXT_TEXTURE_UPLOAD_MAX_COUNT = 6
const SETTLE_RECOVERY_TILE_PRELOAD_BUDGET_MS = 4
const SETTLE_RECOVERY_TILE_PRELOAD_MAX_UPLOADS = 2
const SETTLE_RECOVERY_OVERLAY_PASS_BUDGET_MS = 2

const PRESSURE_MEDIUM_DRAW_BUDGET_MIN_MS = 8
const PRESSURE_MEDIUM_DRAW_BUDGET_DELTA_MS = 2
const PRESSURE_MEDIUM_TEXTURE_SCALE = 0.75
const PRESSURE_MEDIUM_IMAGE_TEXTURE_DELTA = 1
const PRESSURE_MEDIUM_TEXT_TEXTURE_DELTA = 1
const PRESSURE_MEDIUM_TILE_PRELOAD_MIN_MS = 1
const PRESSURE_MEDIUM_TILE_PRELOAD_DELTA_MS = 2
const PRESSURE_MEDIUM_TILE_UPLOAD_DELTA = 2
const PRESSURE_MEDIUM_OVERLAY_MIN_MS = 1
const PRESSURE_MEDIUM_OVERLAY_DELTA_MS = 1

const PRESSURE_HIGH_DRAW_BUDGET_MIN_MS = 8
const PRESSURE_HIGH_DRAW_BUDGET_DELTA_MS = 4
const PRESSURE_HIGH_TEXTURE_SCALE = 0.5
const PRESSURE_HIGH_IMAGE_TEXTURE_DELTA = 1
const PRESSURE_HIGH_TEXT_TEXTURE_DELTA = 2
const PRESSURE_HIGH_TILE_PRELOAD_MIN_MS = 1
const PRESSURE_HIGH_TILE_PRELOAD_DELTA_MS = 4
const PRESSURE_HIGH_TILE_UPLOAD_DELTA = 4
const PRESSURE_HIGH_OVERLAY_MIN_MS = 0
const PRESSURE_HIGH_OVERLAY_DELTA_MS = 1

const BASE_BUDGET: EngineFrameBudget = {
  drawSubmitBudgetMs: BASE_DRAW_SUBMIT_BUDGET_MS,
  textureUploadBudgetBytes: BASE_TEXTURE_UPLOAD_BUDGET_BYTES,
  textureUploadTotalBudgetBytes: BASE_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES,
  imageTextureUploadMaxCount: BASE_IMAGE_TEXTURE_UPLOAD_MAX_COUNT,
  textTextureUploadMaxCount: BASE_TEXT_TEXTURE_UPLOAD_MAX_COUNT,
  tilePreloadBudgetMs: BASE_TILE_PRELOAD_BUDGET_MS,
  tilePreloadMaxUploads: BASE_TILE_PRELOAD_MAX_UPLOADS,
  overlayPassBudgetMs: BASE_OVERLAY_PASS_BUDGET_MS,
}

/**
 * Resolve one pressure tier from scene and queue pressure indicators.
  * @param input Input payload for this operation.
*/
function resolvePressure(input: EngineFrameBudgetBrokerInput): EngineFrameBudgetPressure {
  // Keep interaction frames at least medium pressure so uploader/preload budgets
  // contract before packet/tile work saturates frame latency.
  if (input.interactionActive) {
    if (input.sceneNodeCount >= INTERACTION_HIGH_SCENE_THRESHOLD || input.tileQueuePendingCount >= INTERACTION_HIGH_TILE_PENDING_THRESHOLD) {
      return 'high'
    }

    return 'medium'
  }

  if (
    input.sceneNodeCount >= STATIC_HIGH_SCENE_THRESHOLD ||
    input.tileQueuePendingCount >= STATIC_HIGH_TILE_PENDING_THRESHOLD ||
    input.dirtyRegionCount >= STATIC_HIGH_DIRTY_REGION_THRESHOLD
  ) {
    return 'high'
  }

  if (
    input.sceneNodeCount >= STATIC_MEDIUM_SCENE_THRESHOLD ||
    input.tileQueuePendingCount >= STATIC_MEDIUM_TILE_PENDING_THRESHOLD ||
    input.dirtyRegionCount >= STATIC_MEDIUM_DIRTY_REGION_THRESHOLD
  ) {
    return 'medium'
  }

  return 'low'
}

/**
 * Resolve lane budget contractions for interaction-focused strategy phases.
  * @param phase phase parameter.
*/
function resolveInteractionBudget(phase: EngineRenderStrategyPhase): EngineFrameBudget {
  if (phase === 'pan') {
    return {
      drawSubmitBudgetMs: PAN_DRAW_SUBMIT_BUDGET_MS,
      // Keep one tiny critical upload lane so icon/text focus content can
      // stay legible during continuous pan without waiting for settle frames.
      textureUploadBudgetBytes: PAN_TEXTURE_UPLOAD_BUDGET_BYTES,
      textureUploadTotalBudgetBytes: PAN_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES,
      imageTextureUploadMaxCount: PAN_IMAGE_TEXTURE_UPLOAD_MAX_COUNT,
      textTextureUploadMaxCount: PAN_TEXT_TEXTURE_UPLOAD_MAX_COUNT,
      tilePreloadBudgetMs: PAN_TILE_PRELOAD_BUDGET_MS,
      tilePreloadMaxUploads: PAN_TILE_PRELOAD_MAX_UPLOADS,
      overlayPassBudgetMs: PAN_OVERLAY_PASS_BUDGET_MS,
    }
  }

  if (phase === 'zoom') {
    return {
      drawSubmitBudgetMs: ZOOM_DRAW_SUBMIT_BUDGET_MS,
      // Keep one tiny critical upload lane so zoom focus content can sharpen
      // progressively instead of waiting for full settle recovery.
      textureUploadBudgetBytes: ZOOM_TEXTURE_UPLOAD_BUDGET_BYTES,
      textureUploadTotalBudgetBytes: ZOOM_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES,
      imageTextureUploadMaxCount: ZOOM_IMAGE_TEXTURE_UPLOAD_MAX_COUNT,
      textTextureUploadMaxCount: ZOOM_TEXT_TEXTURE_UPLOAD_MAX_COUNT,
      tilePreloadBudgetMs: ZOOM_TILE_PRELOAD_BUDGET_MS,
      tilePreloadMaxUploads: ZOOM_TILE_PRELOAD_MAX_UPLOADS,
      overlayPassBudgetMs: ZOOM_OVERLAY_PASS_BUDGET_MS,
    }
  }

  if (phase === 'camera') {
    return {
      drawSubmitBudgetMs: CAMERA_DRAW_SUBMIT_BUDGET_MS,
      textureUploadBudgetBytes: CAMERA_TEXTURE_UPLOAD_BUDGET_BYTES,
      textureUploadTotalBudgetBytes: CAMERA_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES,
      imageTextureUploadMaxCount: CAMERA_IMAGE_TEXTURE_UPLOAD_MAX_COUNT,
      textTextureUploadMaxCount: CAMERA_TEXT_TEXTURE_UPLOAD_MAX_COUNT,
      tilePreloadBudgetMs: CAMERA_TILE_PRELOAD_BUDGET_MS,
      tilePreloadMaxUploads: CAMERA_TILE_PRELOAD_MAX_UPLOADS,
      overlayPassBudgetMs: CAMERA_OVERLAY_PASS_BUDGET_MS,
    }
  }

  return {
    drawSubmitBudgetMs: INTERACTIVE_DRAW_SUBMIT_BUDGET_MS,
    textureUploadBudgetBytes: INTERACTIVE_TEXTURE_UPLOAD_BUDGET_BYTES,
    textureUploadTotalBudgetBytes: INTERACTIVE_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES,
    imageTextureUploadMaxCount: INTERACTIVE_IMAGE_TEXTURE_UPLOAD_MAX_COUNT,
    textTextureUploadMaxCount: INTERACTIVE_TEXT_TEXTURE_UPLOAD_MAX_COUNT,
    tilePreloadBudgetMs: INTERACTIVE_TILE_PRELOAD_BUDGET_MS,
    tilePreloadMaxUploads: INTERACTIVE_TILE_PRELOAD_MAX_UPLOADS,
    overlayPassBudgetMs: INTERACTIVE_OVERLAY_PASS_BUDGET_MS,
  }
}

/**
 * Applies predictor-driven tile preload expansion during interaction frames.
 * @param budget Phase-resolved interaction budget.
 * @param input Full broker input snapshot.
 */
function applyPredictivePreloadBoost(
  budget: EngineFrameBudget,
  input: EngineFrameBudgetBrokerInput,
): EngineFrameBudget {
  const confidence = Math.max(0, input.predictorConfidence ?? 0)
  const speed = Math.max(0, input.predictorSpeedPxPerSec ?? 0)
  if (
    confidence < PREDICTIVE_PRELOAD_CONFIDENCE_THRESHOLD ||
    speed < PREDICTIVE_PRELOAD_SPEED_THRESHOLD
  ) {
    return budget
  }

  // AI-TEMP: 工业级交互预取增强，减少高速移动时边缘空白；remove when统一预取控制器上线；ref RENDER_OPTIMIZATION_TASKS.md
  return {
    ...budget,
    tilePreloadBudgetMs: Math.min(
      PREDICTIVE_PRELOAD_BUDGET_MAX_MS,
      budget.tilePreloadBudgetMs + PREDICTIVE_PRELOAD_BUDGET_BOOST_MS,
    ),
    tilePreloadMaxUploads: Math.min(
      PREDICTIVE_PRELOAD_UPLOAD_MAX,
      budget.tilePreloadMaxUploads + PREDICTIVE_PRELOAD_UPLOAD_BOOST,
    ),
  }
}

/**
 * Resolve an aggressive settled-frame recovery budget for sharpness deadline enforcement.
 */
function resolveSettleRecoveryBudget(): EngineFrameBudget {
  return {
    drawSubmitBudgetMs: SETTLE_RECOVERY_DRAW_SUBMIT_BUDGET_MS,
    textureUploadBudgetBytes: SETTLE_RECOVERY_TEXTURE_UPLOAD_BUDGET_BYTES,
    textureUploadTotalBudgetBytes: SETTLE_RECOVERY_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES,
    imageTextureUploadMaxCount: SETTLE_RECOVERY_IMAGE_TEXTURE_UPLOAD_MAX_COUNT,
    textTextureUploadMaxCount: SETTLE_RECOVERY_TEXT_TEXTURE_UPLOAD_MAX_COUNT,
    tilePreloadBudgetMs: SETTLE_RECOVERY_TILE_PRELOAD_BUDGET_MS,
    tilePreloadMaxUploads: SETTLE_RECOVERY_TILE_PRELOAD_MAX_UPLOADS,
    overlayPassBudgetMs: SETTLE_RECOVERY_OVERLAY_PASS_BUDGET_MS,
  }
}

/**
 * Apply pressure-tier contraction against an already phase-adjusted budget.
 * @param budget Phase-adjusted budget to contract.
 * @param pressure pressure parameter.
 * @param interactionActive Whether current frame is interaction-active.
 */
function applyPressureContraction(
  budget: EngineFrameBudget,
  pressure: EngineFrameBudgetPressure,
  interactionActive: boolean,
): EngineFrameBudget {
  if (pressure === 'low') {
    return budget
  }

  if (pressure === 'medium') {
    const mediumTileUploadMin = interactionActive ? 1 : 0
    return {
      drawSubmitBudgetMs: Math.max(PRESSURE_MEDIUM_DRAW_BUDGET_MIN_MS, budget.drawSubmitBudgetMs - PRESSURE_MEDIUM_DRAW_BUDGET_DELTA_MS),
      textureUploadBudgetBytes: Math.max(0, Math.floor(budget.textureUploadBudgetBytes * PRESSURE_MEDIUM_TEXTURE_SCALE)),
      textureUploadTotalBudgetBytes: Math.max(0, Math.floor(budget.textureUploadTotalBudgetBytes * PRESSURE_MEDIUM_TEXTURE_SCALE)),
      imageTextureUploadMaxCount: Math.max(0, budget.imageTextureUploadMaxCount - PRESSURE_MEDIUM_IMAGE_TEXTURE_DELTA),
      textTextureUploadMaxCount: Math.max(0, budget.textTextureUploadMaxCount - PRESSURE_MEDIUM_TEXT_TEXTURE_DELTA),
      tilePreloadBudgetMs: Math.max(PRESSURE_MEDIUM_TILE_PRELOAD_MIN_MS, budget.tilePreloadBudgetMs - PRESSURE_MEDIUM_TILE_PRELOAD_DELTA_MS),
      // Keep at least one preload upload during interaction to avoid edge blanking.
      tilePreloadMaxUploads: Math.max(mediumTileUploadMin, budget.tilePreloadMaxUploads - PRESSURE_MEDIUM_TILE_UPLOAD_DELTA),
      overlayPassBudgetMs: Math.max(PRESSURE_MEDIUM_OVERLAY_MIN_MS, budget.overlayPassBudgetMs - PRESSURE_MEDIUM_OVERLAY_DELTA_MS),
    }
  }

  const highTileUploadMin = interactionActive ? 1 : 0
  return {
    drawSubmitBudgetMs: Math.max(PRESSURE_HIGH_DRAW_BUDGET_MIN_MS, budget.drawSubmitBudgetMs - PRESSURE_HIGH_DRAW_BUDGET_DELTA_MS),
    textureUploadBudgetBytes: Math.max(0, Math.floor(budget.textureUploadBudgetBytes * PRESSURE_HIGH_TEXTURE_SCALE)),
    textureUploadTotalBudgetBytes: Math.max(0, Math.floor(budget.textureUploadTotalBudgetBytes * PRESSURE_HIGH_TEXTURE_SCALE)),
    imageTextureUploadMaxCount: Math.max(0, budget.imageTextureUploadMaxCount - PRESSURE_HIGH_IMAGE_TEXTURE_DELTA),
    textTextureUploadMaxCount: Math.max(0, budget.textTextureUploadMaxCount - PRESSURE_HIGH_TEXT_TEXTURE_DELTA),
    tilePreloadBudgetMs: Math.max(PRESSURE_HIGH_TILE_PRELOAD_MIN_MS, budget.tilePreloadBudgetMs - PRESSURE_HIGH_TILE_PRELOAD_DELTA_MS),
    // Keep one preload slot under high pressure in interaction frames for forward continuity.
    tilePreloadMaxUploads: Math.max(highTileUploadMin, budget.tilePreloadMaxUploads - PRESSURE_HIGH_TILE_UPLOAD_DELTA),
    overlayPassBudgetMs: Math.max(PRESSURE_HIGH_OVERLAY_MIN_MS, budget.overlayPassBudgetMs - PRESSURE_HIGH_OVERLAY_DELTA_MS),
  }
}

/**
 * Resolve one internal frame budget decision for draw/upload/tile/overlay lanes.
  * @param input Input payload for this operation.
*/
export function resolveEngineFrameBudget(
  input: EngineFrameBudgetBrokerInput,
): EngineFrameBudgetBrokerDecision {
  // Keep settle sharpness contract authoritative: when pending in settling or
  // forced recovery mode, prioritize sharp frame completion over throughput.
  if (input.forceSharpFrame || (input.settleSharpnessPending && input.phase === 'settling')) {
    return {
      budget: resolveSettleRecoveryBudget(),
      pressure: 'low',
    }
  }

  const pressure = resolvePressure(input)
  const phaseBudget = input.interactionActive
    ? applyPredictivePreloadBoost(resolveInteractionBudget(input.phase), input)
    : BASE_BUDGET

  return {
    budget: applyPressureContraction(phaseBudget, pressure, input.interactionActive),
    pressure,
  }
}
