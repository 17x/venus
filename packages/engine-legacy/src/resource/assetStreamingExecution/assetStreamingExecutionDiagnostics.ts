// Module responsibility: normalize streaming execution summaries for runtime diagnostics.
// Non-responsibility: executing streaming plans or owning renderer residency state.

import type { EngineStreamingExecutionSummary } from './assetStreamingExecution.ts'

/**
 * Declares diagnostics derived from the latest streaming execution summary.
 */
export interface EngineStreamingExecutionDiagnostics {
  /** True when a streaming execution summary has been recorded. */
  available: boolean
  /** Number of completed load callbacks. */
  loadedCount: number
  /** Estimated bytes represented by completed load callbacks. */
  loadedBytes: number
  /** Number of completed cancel callbacks. */
  cancelledCount: number
  /** Number of completed eviction callbacks. */
  evictedCount: number
  /** Estimated bytes released by completed evictions. */
  evictedBytes: number
  /** Estimated bytes retained after planning. */
  retainedBytes: number
  /** Total number of completed load/cancel/evict callbacks. */
  operationCount: number
}

/**
 * Intent: convert an optional streaming execution summary into stable diagnostics fields.
 * @param summary Latest streaming execution summary, if one has been recorded.
 * @returns Normalized streaming execution diagnostics.
 */
export function resolveEngineStreamingExecutionDiagnostics(
  summary: EngineStreamingExecutionSummary | null,
): EngineStreamingExecutionDiagnostics {
  if (!summary) {
    return {
      available: false,
      loadedCount: 0,
      loadedBytes: 0,
      cancelledCount: 0,
      evictedCount: 0,
      evictedBytes: 0,
      retainedBytes: 0,
      operationCount: 0,
    }
  }

  return {
    available: true,
    loadedCount: summary.loadedCount,
    loadedBytes: summary.loadedBytes,
    cancelledCount: summary.cancelledCount,
    evictedCount: summary.evictedCount,
    evictedBytes: summary.evictedBytes,
    retainedBytes: summary.retainedBytes,
    operationCount: summary.loadedCount + summary.cancelledCount + summary.evictedCount,
  }
}
