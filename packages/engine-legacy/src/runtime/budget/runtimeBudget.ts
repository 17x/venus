// Module responsibility: runtime budget snapshot contract and serializer.
// Non-responsibility: pressure monitor and dynamic scaler state machine.

import type { EngineRuntimePolicy } from '../policy/runtimePolicy.ts'

/**
 * Describes budget trace metadata attached to per-frame budget snapshots.
 */
export interface EngineRuntimeBudgetTrace {
  /** Monotonic frame index for snapshot ordering. */
  frameIndex: number
  /** UTC timestamp in ISO-8601 format. */
  timestampIso: string
  /** Source profile used to resolve policy. */
  profile: EngineRuntimePolicy['profile']
  /** Source preset used to resolve policy. */
  preset: EngineRuntimePolicy['preset']
}

/**
 * Describes per-frame runtime budget snapshot.
 */
export interface EngineRuntimeBudgetSnapshot {
  /** Draw budget in milliseconds for this frame. */
  drawBudgetMs: number
  /** Upload budget in bytes for this frame. */
  uploadBudgetBytes: number
  /** Cache budget in bytes for this frame. */
  cacheBudgetBytes: number
  /** Tile budget in count for this frame. */
  tileBudgetCount: number
  /** Worker budget in count for this frame. */
  workerBudgetCount: number
  /** Total frame budget in milliseconds for this frame. */
  frameBudgetMs: number
  /** Trace metadata used for replay and audit. */
  trace: EngineRuntimeBudgetTrace
}

/**
 * Intent: build one deterministic runtime budget snapshot for current frame.
 * @param policy Runtime policy input.
 * @param frameIndex Frame index for trace metadata.
 * @param nowIso UTC timestamp used for trace metadata.
 * @returns Runtime budget snapshot.
 */
export function createEngineRuntimeBudgetSnapshot(
  policy: EngineRuntimePolicy,
  frameIndex: number,
  nowIso: string,
): EngineRuntimeBudgetSnapshot {
  return {
    drawBudgetMs: policy.budget.drawBudgetMs,
    uploadBudgetBytes: policy.budget.uploadBudgetBytes,
    cacheBudgetBytes: policy.budget.cacheBudgetBytes,
    tileBudgetCount: policy.budget.tileBudgetCount,
    workerBudgetCount: policy.budget.workerBudgetCount,
    frameBudgetMs: policy.budget.frameBudgetMs,
    trace: {
      frameIndex,
      timestampIso: nowIso,
      profile: policy.profile,
      preset: policy.preset,
    },
  }
}
