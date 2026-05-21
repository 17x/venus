import type { EngineRenderStats } from '../../renderer/types/index.ts'
import type {
  EngineRuntimeDiagnosticsWebGPUCamera3D,
} from './createEngineWebGPUCamera3DDiagnostics.ts'

/**
 * Declares runtime WebGPU execution, readiness, and fallback diagnostics.
 */
export interface EngineRuntimeDiagnosticsWebGPU {
  /** Active WebGPU route selected for the latest rendered frame. */
  renderPath: NonNullable<EngineRenderStats['webgpuRenderPath']> | 'unknown'
  /** Captures per-frame and cumulative native submit counters. */
  nativeSubmission: {
    /** Number of native submit attempts captured in the latest frame. */
    attemptedCount: number
    /** Number of native submit successes captured in the latest frame. */
    successCount: number
    /** Number of native submit failures captured in the latest frame. */
    failureCount: number
    /** Cumulative native submit success count since renderer initialization. */
    totalSuccessCount: number
    /** Cumulative native submit failure count since renderer initialization. */
    totalFailureCount: number
  }
  /** Captures staged rect-batch qualification telemetry for the latest frame. */
  rectBatch: {
    /** Number of nodes eligible for native rect-batch in the latest frame. */
    eligibleCount: number
    /** First rejection reason for native rect-batch on the latest frame. */
    rejectedReason: NonNullable<EngineRenderStats['webgpuNativeRectBatchRejectedReason']> | 'unknown'
  }
  /** Captures native WebGPU 3D pass planning coverage from latest frame stats. */
  pass3d: {
    /** Number of renderable candidates considered for WebGPU 3D pass planning. */
    candidateCount: number
    /** Number of material/lighting/geometry batches planned for native WebGPU. */
    batchCount: number
    /** Number of candidates unsupported by the native WebGPU 3D pass planner. */
    unsupportedCount: number
    /** Native 3D pass planning coverage ratio in range [0, 1]. */
    nativeCoverageRatio: number
    /** Number of batches eligible for instanced submission semantics. */
    instancedBatchCount: number
    /** Number of batches requiring scene-light bindings. */
    litBatchCount: number
    /** Number of batches that render without scene-light bindings. */
    unlitBatchCount: number
  }
  /** Captures WebGPU 3D binding payload readiness from latest frame stats. */
  binding3d: {
    /** Estimated material uniform bytes required by planned WebGPU 3D bindings. */
    materialUniformBytes: number
    /** Estimated light uniform bytes required by planned WebGPU 3D bindings. */
    lightUniformBytes: number
    /** Estimated instance uniform bytes required by planned WebGPU 3D bindings. */
    instanceUniformBytes: number
    /** Estimated total uniform bytes required by planned WebGPU 3D bindings. */
    totalUniformBytes: number
  }
  /** Captures WebGPU timestamp-query capability and sampling state. */
  gpuTiming: {
    /** True when native WebGPU initialization reports timestamp-query support. */
    supported: boolean
    /** Current timestamp sampling state. */
    sampleState: NonNullable<EngineRenderStats['webgpuGpuTimingSampleState']>
    /** Current timestamp-query lifecycle plan state before readback is available. */
    queryPlanState: NonNullable<EngineRenderStats['webgpuGpuTimingQueryPlanState']>
    /** Number of timestamp writes expected by the current query lifecycle plan. */
    queryWriteCount: number
    /** Number of timestamp writes emitted during the latest native WebGPU pass. */
    lastWriteCount: number
    /** Number of timestamp query resolve commands emitted during the latest native WebGPU pass. */
    lastResolveCount: number
    /** Number of timestamp buffer copy commands emitted during the latest native WebGPU pass. */
    lastCopyCount: number
    /** Bytes reserved for timestamp readback during the latest native WebGPU pass. */
    readbackBufferBytes: number
    /** Last sampled GPU frame duration in milliseconds, when available. */
    frameMs: number | null
  }
  /** Captures WebGPU camera snapshot and uniform payload readiness from latest frame stats. */
  camera3d: EngineRuntimeDiagnosticsWebGPUCamera3D
}
