// Module responsibility: provide fallback reason severity model and recovery checks.
// Non-responsibility: selecting fallback paths in renderer.

import type { EngineRenderFallbackReason } from './fallbackTaxonomy.ts'
import { ENGINE_RENDER_FALLBACK_REASON } from './fallbackTaxonomy.ts'

/**
 * Describes fallback severity levels.
 */
export type EngineFallbackSeverity = 'none' | 'minor' | 'moderate' | 'critical'

const CRITICAL_FALLBACK_SET: ReadonlySet<EngineRenderFallbackReason> = new Set([
  ENGINE_RENDER_FALLBACK_REASON.L2_TILE_FRAMEBUFFER_COPY_FAILED,
  ENGINE_RENDER_FALLBACK_REASON.L2_TILE_SOURCE_BUILD_FAILED,
  ENGINE_RENDER_FALLBACK_REASON.L3_EMPTY_FRAME_MODEL_FALLBACK,
])

const MODERATE_FALLBACK_SET: ReadonlySet<EngineRenderFallbackReason> = new Set([
  ENGINE_RENDER_FALLBACK_REASON.L2_TILE_FALLBACK_TO_COMPOSITE,
  ENGINE_RENDER_FALLBACK_REASON.L2_BYPASS_VISIBLE_TILE_PRESSURE,
  ENGINE_RENDER_FALLBACK_REASON.L3_BUDGET_DRAW_SUBMIT_CAP,
])

/**
 * Intent: resolve severity level for one fallback reason.
 * @param reason Fallback reason.
 * @returns Fallback severity level.
 */
export function resolveEngineFallbackSeverity(reason: EngineRenderFallbackReason): EngineFallbackSeverity {
  if (reason === ENGINE_RENDER_FALLBACK_REASON.NONE) {
    return 'none'
  }

  if (CRITICAL_FALLBACK_SET.has(reason)) {
    return 'critical'
  }

  if (MODERATE_FALLBACK_SET.has(reason)) {
    return 'moderate'
  }

  return 'minor'
}

/**
 * Intent: resolve whether fallback recovery is complete.
 * @param currentReason Current fallback reason.
 * @param previousReason Previous fallback reason.
 * @returns True when fallback lane recovered to stable none state.
 */
export function isEngineFallbackRecovered(
  currentReason: EngineRenderFallbackReason,
  previousReason: EngineRenderFallbackReason,
): boolean {
  return previousReason !== ENGINE_RENDER_FALLBACK_REASON.NONE && currentReason === ENGINE_RENDER_FALLBACK_REASON.NONE
}
