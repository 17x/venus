import { getEngineRenderPlanCacheDiagnostics } from '../../renderer/plan/index.ts'
import type { EngineInteractionPredictorState, EngineRenderStats } from '../../renderer/types/index.ts'
import type { EngineRenderStrategyPhase } from './strategy/strategy.ts'

/**
 * Runtime settle-sharpness mutable state used by stats handler.
 */
export interface EngineSettleSharpnessMutableState {
  pending: boolean
  deadlineMissRecorded: boolean
  forceSharpFrame: boolean
  metCount: number
  lastLatencyMs: number
  highZoomTextSlaCheckedCount: number
  highZoomTextSlaViolationCount: number
}

/**
 * Builds one render-stats handler that enriches diagnostics fields in-place.
 * @param options Mutable runtime state accessors and callbacks.
 * @returns Stats handler callback used by render loop.
 */
export function createEngineRenderStatsHandler(options: {
  cameraAnimationState: {
    active: boolean
    cachePreviewOnly: boolean
    previewHitCount: number
    previewMissCount: number
  }
  settleSharpnessState: EngineSettleSharpnessMutableState
  isSharpRenderStats: (stats: EngineRenderStats) => boolean
  getNowMs: () => number
  getLastInteractionAtMs: () => number
  getLatestStrategyPhase: () => EngineRenderStrategyPhase
  getLatestBudgetPressure: () => 'low' | 'medium' | 'high'
  getLatestInteractionPredictor: () => EngineInteractionPredictorState
  setLatestRenderStats: (stats: EngineRenderStats) => void
  onStats?: (stats: EngineRenderStats) => void
}) {
  /**
   * Enriches render stats with runtime diagnostics overlays and cache metrics.
   * @param stats Renderer-emitted stats snapshot.
   */
  return (stats: EngineRenderStats) => {
    const globalGeometryCacheDiagnostics = getEngineRenderPlanCacheDiagnostics()
    const geometryCacheHitCount = Math.max(
      0,
      stats.geometryCacheHitCount ?? globalGeometryCacheDiagnostics.geometryCacheHitCount,
    )
    const geometryCacheMissCount = Math.max(
      0,
      stats.geometryCacheMissCount ?? globalGeometryCacheDiagnostics.geometryCacheMissCount,
    )
    const geometryCacheHitRate = stats.geometryCacheHitRate
      ?? globalGeometryCacheDiagnostics.geometryCacheHitRate

    if (options.cameraAnimationState.active) {
      options.cameraAnimationState.previewHitCount += stats.l0PreviewHitCount ?? 0
      options.cameraAnimationState.previewMissCount += stats.l0PreviewMissCount ?? 0
    }

    if (stats.webglHighZoomTextSlaChecked) {
      options.settleSharpnessState.highZoomTextSlaCheckedCount += 1
      options.settleSharpnessState.highZoomTextSlaViolationCount += stats.webglHighZoomTextSlaViolationCount ?? 0
    }

    if (options.settleSharpnessState.pending && options.isSharpRenderStats(stats)) {
      options.settleSharpnessState.pending = false
      options.settleSharpnessState.deadlineMissRecorded = false
      options.settleSharpnessState.forceSharpFrame = false
      options.settleSharpnessState.metCount += 1
      options.settleSharpnessState.lastLatencyMs = Math.max(0, options.getNowMs() - options.getLastInteractionAtMs())
    }

    const latestInteractionPredictor = options.getLatestInteractionPredictor()
    const enrichedStats: EngineRenderStats = {
      ...stats,
      geometryCacheHitCount,
      geometryCacheMissCount,
      geometryCacheHitRate,
      strategySnapshotLane: options.getLatestStrategyPhase(),
      strategySnapshotBudgetPressure: options.getLatestBudgetPressure(),
      strategySnapshotFallbackReason: stats.cacheFallbackReason ?? null,
      strategySnapshotPredictorConfidence: latestInteractionPredictor.confidence,
      cameraAnimationActive: options.cameraAnimationState.active,
      cameraAnimationCachePreviewOnly: options.cameraAnimationState.cachePreviewOnly,
      cameraAnimationPreviewHitCount: options.cameraAnimationState.previewHitCount,
      cameraAnimationPreviewMissCount: options.cameraAnimationState.previewMissCount,
    }

    options.setLatestRenderStats(enrichedStats)
    options.onStats?.(enrichedStats)
  }
}