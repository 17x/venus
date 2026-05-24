// Module responsibility: derive scene-level performance profile diagnostics from existing runtime telemetry.
// Non-responsibility: changing frame budgets or renderer scheduling decisions.

import type {
  EngineFrameBudget,
  EngineRenderStats,
} from '../../renderer/types/index.ts'
import type { EngineFramePlan } from '../../scene/framePlan.ts'
import type { EngineRuntimeDiagnostics } from './createEngineContracts.ts'

/**
 * Intent: resolve one scene performance profile from latest frame stats and budgets.
 * @param stats Latest renderer stats snapshot.
 * @param framePlan Latest frame-plan snapshot.
 * @param frameBudget Latest frame-budget snapshot.
 * @returns Performance profile diagnostics section.
 */
export function resolveCreateEnginePerformanceProfileDiagnostics(
  stats: EngineRenderStats | null,
  framePlan: EngineFramePlan | null,
  frameBudget: EngineFrameBudget | undefined,
): EngineRuntimeDiagnostics['performanceProfile'] {
  const sceneNodeCount = framePlan?.sceneNodeCount ?? 0
  const visibleCount = stats?.visibleCount ?? 0
  const culledCount = stats?.culledCount ?? 0
  const drawSubmitMs = stats?.webglDrawSubmitMs ?? 0
  const textureUploadMs = stats?.webglTextureUploadMs ?? 0
  const planBuildMs = stats?.webglPlanBuildMs ?? 0
  const snapshotCaptureMs = stats?.webglSnapshotCaptureMs ?? 0
  const modelRenderMs = stats?.webglModelRenderMs ?? 0

  return {
    frameMs: stats?.frameMs ?? 0,
    sceneNodeCount,
    visibleCount,
    culledCount,
    cullingRatio: resolveRatio(culledCount, Math.max(sceneNodeCount, visibleCount + culledCount)),
    drawCount: stats?.drawCount ?? 0,
    drawDensity: resolveRatio(stats?.drawCount ?? 0, Math.max(1, visibleCount)),
    cacheHitRate: resolveCacheHitRate(stats),
    passCosts: {
      planBuildMs,
      textureUploadMs,
      drawSubmitMs,
      snapshotCaptureMs,
      modelRenderMs,
      knownPassTotalMs: planBuildMs + textureUploadMs + drawSubmitMs + snapshotCaptureMs + modelRenderMs,
    },
    budgetUtilization: {
      drawSubmit: resolveRatio(drawSubmitMs, frameBudget?.drawSubmitBudgetMs ?? 0),
      textureUploadBytes: resolveRatio(
        (stats?.webglImageTextureUploadBytes ?? 0) + (stats?.webglTextTextureUploadBytes ?? 0),
        frameBudget?.textureUploadTotalBudgetBytes ?? 0,
      ),
      overlayPass: resolveRatio(stats?.webglDrawSubmitMs ?? 0, frameBudget?.overlayPassBudgetMs ?? 0),
    },
  }
}

/**
 * Intent: resolve a bounded ratio with zero-budget protection.
 * @param numerator Ratio numerator.
 * @param denominator Ratio denominator.
 * @returns Ratio in range [0, 1].
 */
function resolveRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return numerator > 0 ? 1 : 0
  }

  return Math.max(0, Math.min(1, numerator / denominator))
}

/**
 * Intent: resolve cache hit rate from latest renderer stats.
 * @param stats Latest renderer stats snapshot.
 * @returns Cache hit rate in range [0, 1].
 */
function resolveCacheHitRate(stats: EngineRenderStats | null): number {
  const cacheHits = stats?.cacheHits ?? 0
  const cacheMisses = stats?.cacheMisses ?? 0
  return resolveRatio(cacheHits, cacheHits + cacheMisses)
}
