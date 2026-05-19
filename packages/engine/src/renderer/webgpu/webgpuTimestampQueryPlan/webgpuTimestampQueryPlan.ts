// Module responsibility: describe WebGPU timestamp-query lifecycle readiness without faking GPU timing samples.
// Non-responsibility: allocating query sets, resolving buffers, or reading timestamp data back to CPU.

/**
 * Declares timestamp-query lifecycle readiness before true resolve/readback instrumentation.
 */
export type EngineWebGPUTimestampQueryPlanState =
  | 'unsupported'
  | 'missing-query-set'
  | 'ready-unresolved'

/**
 * Declares one WebGPU timestamp-query readiness plan.
 */
export interface EngineWebGPUTimestampQueryPlan {
  /** True when the adapter/device supports timestamp-query. */
  supported: boolean
  /** True when the device exposes query-set creation needed for instrumentation. */
  querySetAvailable: boolean
  /** Current lifecycle state for timestamp-query instrumentation readiness. */
  state: EngineWebGPUTimestampQueryPlanState
  /** Number of timestamp writes expected for a begin/end frame sample. */
  queryWriteCount: number
  /** True when query resolve and buffer readback are still required before frameMs can be sampled. */
  readbackRequired: boolean
}

/**
 * Declares inputs used to derive timestamp-query readiness.
 */
export interface EngineWebGPUTimestampQueryPlanInput {
  /** True when WebGPU initialization detected timestamp-query support. */
  supported: boolean
  /** True when the native device exposes createQuerySet. */
  querySetAvailable: boolean
}

/**
 * Intent: resolve timestamp-query readiness without reporting fake GPU timings.
 * @param input Timestamp-query support and API availability flags.
 * @returns Timestamp-query lifecycle readiness plan.
 */
export function resolveEngineWebGPUTimestampQueryPlan(
  input: EngineWebGPUTimestampQueryPlanInput,
): EngineWebGPUTimestampQueryPlan {
  if (!input.supported) {
    return {
      supported: false,
      querySetAvailable: false,
      state: 'unsupported',
      queryWriteCount: 0,
      readbackRequired: false,
    }
  }

  if (!input.querySetAvailable) {
    return {
      supported: true,
      querySetAvailable: false,
      state: 'missing-query-set',
      queryWriteCount: 0,
      readbackRequired: true,
    }
  }

  return {
    supported: true,
    querySetAvailable: true,
    state: 'ready-unresolved',
    queryWriteCount: 2,
    readbackRequired: true,
  }
}
