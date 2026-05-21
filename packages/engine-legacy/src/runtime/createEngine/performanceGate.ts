import type { EngineRenderStats } from '../../renderer/types/index.ts'

const DEFAULT_FRAME_MS_BUDGET = 34

/**
 * Declares one performance gate evaluation threshold set.
 */
export interface EnginePerformanceGateThresholds {
  /** Maximum allowed frame time before gate fails. */
  maxFrameMs: number
}

/**
 * Declares one performance gate evaluation snapshot.
 */
export interface EnginePerformanceGateStatus {
  /** Whether all performance-gate checks pass. */
  pass: boolean
  /** Human-readable failure reason list for diagnostics surfaces. */
  reasons: readonly string[]
  /** Effective threshold set used by this evaluation. */
  thresholds: EnginePerformanceGateThresholds
}

/**
 * Resolves one runtime performance-gate status from latest render stats.
 * @param renderStats Latest render stats snapshot.
 */
export function resolveEnginePerformanceGateStatus(
  renderStats: EngineRenderStats | null,
): EnginePerformanceGateStatus {
  const thresholds: EnginePerformanceGateThresholds = {
    maxFrameMs: DEFAULT_FRAME_MS_BUDGET,
  }

  if (!renderStats) {
    return {
      pass: true,
      reasons: [],
      thresholds,
    }
  }

  const reasons: string[] = []
  if (renderStats.frameMs > thresholds.maxFrameMs) {
    reasons.push(`frameMs ${String(renderStats.frameMs)} exceeds budget ${String(thresholds.maxFrameMs)}`)
  }

  return {
    pass: reasons.length === 0,
    reasons,
    thresholds,
  }
}
