// Module responsibility: execute deterministic asset-streaming plans through host-provided load/cache callbacks.
// Non-responsibility: owning renderer GPU resources or swallowing loader/cache failures.

import type {
  EngineStreamingAssetRequest,
  EngineStreamingPlan,
} from '../assetStreamingPlan/assetStreamingPlan.ts'

/**
 * Declares host callbacks required to execute one streaming plan.
 */
export interface EngineStreamingPlanExecutor {
  /** Starts loading one selected mesh/texture request. */
  loadAsset(request: EngineStreamingAssetRequest): void | Promise<void>
  /** Cancels one stale in-flight asset request. */
  cancelAsset(assetId: string): void | Promise<void>
  /** Evicts one cached asset selected by the planner. */
  evictAsset(assetId: string): void | Promise<void>
}

/**
 * Declares one execution summary emitted after applying a streaming plan.
 */
export interface EngineStreamingExecutionSummary {
  /** Asset ids whose load callbacks completed. */
  loadedAssetIds: readonly string[]
  /** Number of load callbacks that completed. */
  loadedCount: number
  /** Estimated bytes represented by completed load callbacks. */
  loadedBytes: number
  /** Asset ids whose cancel callbacks completed. */
  cancelledAssetIds: readonly string[]
  /** Number of cancel callbacks that completed. */
  cancelledCount: number
  /** Asset ids whose eviction callbacks completed. */
  evictedAssetIds: readonly string[]
  /** Number of eviction callbacks that completed. */
  evictedCount: number
  /** Estimated bytes released by completed eviction callbacks, copied from the source plan. */
  evictedBytes: number
  /** Estimated bytes retained after planning, copied from the source plan. */
  retainedBytes: number
}

/**
 * Intent: execute one streaming plan in deterministic cancel, evict, then load order.
 * @param plan Streaming plan produced by the planner.
 * @param executor Host callback adapter for load/cache operations.
 * @returns Execution summary after all callbacks complete.
 */
export async function executeEngineStreamingPlan(
  plan: EngineStreamingPlan,
  executor: EngineStreamingPlanExecutor,
): Promise<EngineStreamingExecutionSummary> {
  const cancelledAssetIds: string[] = []
  const evictedAssetIds: string[] = []
  const loadedAssetIds: string[] = []

  for (const assetId of plan.cancelAssetIds) {
    await executor.cancelAsset(assetId)
    cancelledAssetIds.push(assetId)
  }

  for (const assetId of plan.evictAssetIds) {
    await executor.evictAsset(assetId)
    evictedAssetIds.push(assetId)
  }

  for (const request of plan.loadRequests) {
    await executor.loadAsset(request)
    loadedAssetIds.push(request.assetId)
  }

  return {
    loadedAssetIds,
    loadedCount: loadedAssetIds.length,
    loadedBytes: plan.loadRequests.reduce((total, request) => total + request.estimatedBytes, 0),
    cancelledAssetIds,
    cancelledCount: cancelledAssetIds.length,
    evictedAssetIds,
    evictedCount: evictedAssetIds.length,
    evictedBytes: plan.evictedBytes,
    retainedBytes: plan.retainedBytes,
  }
}
