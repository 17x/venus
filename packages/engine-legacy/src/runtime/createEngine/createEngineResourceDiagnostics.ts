// Module responsibility: derive resource and streaming diagnostics from render stats and frame budgets.
// Non-responsibility: scheduling resource loads or mutating renderer caches.

import type {
  EngineFrameBudget,
  EngineRenderStats,
} from '../../renderer/types/index.ts'
import type { EngineRuntimeDiagnostics } from './createEngineContracts.ts'

const STREAMING_BACKLOG_HIGH_WATERMARK = 128

/**
 * Intent: resolve resource/cache/streaming diagnostics from latest renderer telemetry.
 * @param stats Latest renderer stats snapshot.
 * @param frameBudget Latest runtime frame budget.
 * @returns Resource diagnostics section for runtime snapshots.
 */
export function resolveCreateEngineResourceDiagnostics(
  stats: EngineRenderStats | null,
  frameBudget: EngineFrameBudget | undefined,
): EngineRuntimeDiagnostics['resource'] {
  const imageUploadBytes = stats?.webglImageTextureUploadBytes ?? 0
  const textUploadBytes = stats?.webglTextTextureUploadBytes ?? 0
  const totalUploadBytes = imageUploadBytes + textUploadBytes
  const uploadBudgetBytes = frameBudget?.textureUploadTotalBudgetBytes ?? 0
  const tileSchedulerPendingCount = stats?.tileSchedulerPendingCount ?? 0

  return {
    gpuTextureBytes: stats?.gpuTextureBytes ?? 0,
    imageTextureBytes: stats?.imageTextureBytes ?? 0,
    textureUploadBytes: totalUploadBytes,
    textureUploadBudgetBytes: uploadBudgetBytes,
    textureUploadBudgetUtilization: resolveBudgetUtilization(totalUploadBytes, uploadBudgetBytes),
    textureUploadBudgetExceeded: stats?.webglTextureUploadBudgetExceeded ?? false,
    tileSchedulerPendingCount,
    streamingLoad: Math.min(1, tileSchedulerPendingCount / STREAMING_BACKLOG_HIGH_WATERMARK),
  }
}

/**
 * Intent: compute a safe normalized utilization ratio for optional budgets.
 * @param usedBytes Bytes consumed by the current frame.
 * @param budgetBytes Budget bytes available to the current frame.
 * @returns Ratio in range [0, 1] unless budget is unavailable.
 */
function resolveBudgetUtilization(usedBytes: number, budgetBytes: number): number {
  if (budgetBytes <= 0) {
    return usedBytes > 0 ? 1 : 0
  }

  return Math.min(1, usedBytes / budgetBytes)
}
