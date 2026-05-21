import { createWebGLEngineRenderer } from '../webgl/index.ts'
import type { EngineRenderFrame, EngineRenderStats, EngineRenderer } from '../types/index.ts'
import type { EngineRenderableNode } from '../../scene/types/types.ts'
import {
  initializeWebGPUNativeState,
  resolveWebGPURectBatchEligibility,
  submitWebGPUNativePass,
  submitWebGPUNativeRectBatchPass,
  type WebGPUNativePassResult,
  type WebGPUNativeState,
  type WebGPURectBatchEligibility,
} from './webgpuNativeRuntime.ts'
import {
  resolveEngineWebGPU3DPassPlan,
  type EngineWebGPU3DPassCandidate,
  type EngineWebGPU3DPassCoverage,
} from './webgpu3dPassPlan/webgpu3dPassPlan.ts'
import {
  resolveEngineWebGPUCameraUniformPlan,
} from './webgpuCameraUniformPlan/webgpuCameraUniformPlan.ts'
import {
  resolveEngineWebGPU3DBindingPlan,
  type EngineWebGPU3DBindingPlanSummary,
} from './webgpu3dBindingPlan/webgpu3dBindingPlan.ts'

/**
 * Creates one WebGPU renderer entrypoint with native-probe lifecycle and shared WebGL fallback rendering.
 * @param options Renderer creation options shared with the WebGL backend.
 */
export function createWebGPUEngineRenderer(
  options: Parameters<typeof createWebGLEngineRenderer>[0],
): EngineRenderer {
  // Keep output behavior stable through shared WebGL rendering while this
  // module incrementally grows native WebGPU execution coverage.
  const webglRenderer = createWebGLEngineRenderer(options)
  let nativeState: WebGPUNativeState | null = null
  let nativeInitializationAttempted = false

  return {
    id: webglRenderer.id.replace('webgl', 'webgpu-hybrid'),
    capabilities: {
      ...webglRenderer.capabilities,
      backend: 'webgpu',
    },
    init: async () => {
      await webglRenderer.init?.()
      nativeInitializationAttempted = true
      nativeState = await initializeWebGPUNativeState(options)
    },
    resize: webglRenderer.resize
      ? (size) => {
        webglRenderer.resize?.(size)
      }
      : undefined,
    setInteractionPreview: webglRenderer.setInteractionPreview
      ? (config) => {
        webglRenderer.setInteractionPreview?.(config)
      }
      : undefined,
    render: async (frame) => {
      if (!nativeState && !nativeInitializationAttempted) {
        // Some runtime hosts may skip explicit renderer.init calls.
        // Initialize lazily so WebGPU native diagnostics stay observable.
        nativeInitializationAttempted = true
        nativeState = await initializeWebGPUNativeState(options)
      }

      const rectBatchEligibility = resolveWebGPURectBatchEligibility(frame.scene.nodes)
      const passPlan = resolveEngineWebGPU3DPassPlan({
        candidates: resolveWebGPU3DPassCandidates(frame.scene.nodes),
        materialRegistry: frame.scene.materialRegistry,
        lightingRig: frame.scene.lightingRig,
      })
      const cameraUniformPlan = frame.context.camera3DSnapshot
        ? resolveEngineWebGPUCameraUniformPlan(frame.context.camera3DSnapshot)
        : null
      const bindingPlan = resolveEngineWebGPU3DBindingPlan({passPlan, cameraUniformPlan})
      const canUseNativeClearOnlyPath = frame.scene.nodes.length === 0
      const canUseNativeRectBatchPath =
        rectBatchEligibility.rejectedReason === 'none' && rectBatchEligibility.eligibleCount > 0
      const clearOnlyPassResult = canUseNativeClearOnlyPath
        ? submitWebGPUNativePass(nativeState)
        : {submitted: false, failed: false}

      if (canUseNativeClearOnlyPath && clearOnlyPassResult.submitted) {
        return resolveNativeClearOnlyStats(
          frame,
          nativeState,
          clearOnlyPassResult,
          rectBatchEligibility,
          passPlan.coverage,
          bindingPlan.summary,
        )
      }

      const rectBatchPassResult = canUseNativeRectBatchPath
        ? submitWebGPUNativeRectBatchPass(nativeState, frame.scene.nodes)
        : {submitted: false, failed: false}
      if (canUseNativeRectBatchPath && rectBatchPassResult.submitted) {
        return resolveNativeRectBatchStats(
          frame,
          nativeState,
          rectBatchPassResult,
          rectBatchEligibility,
          passPlan.coverage,
          bindingPlan.summary,
        )
      }

      // Keep one native submit probe on hybrid frames so diagnostics continue to
      // expose native readiness progression even when the frame is ineligible.
      const fallbackProbePassResult = canUseNativeClearOnlyPath || canUseNativeRectBatchPath
        ? canUseNativeClearOnlyPath
          ? clearOnlyPassResult
          : rectBatchPassResult
        : submitWebGPUNativePass(nativeState)
      const webglStats = await webglRenderer.render(frame)

      return {
        ...webglStats,
        webgpuRenderPath: 'hybrid-webgl',
        webgpuNativeSubmissionAttemptedCount: nativeState ? 1 : 0,
        webgpuNativeSubmissionSuccessCount: fallbackProbePassResult.submitted ? 1 : 0,
        webgpuNativeSubmissionFailureCount: fallbackProbePassResult.failed ? 1 : 0,
        webgpuNativeSubmissionTotalCount: nativeState?.submittedCount ?? 0,
        webgpuNativeSubmissionTotalFailureCount: nativeState?.failedCount ?? 0,
        webgpuNativeRectBatchEligibleCount: rectBatchEligibility.eligibleCount,
        webgpuNativeRectBatchRejectedReason: rectBatchEligibility.rejectedReason,
        ...resolveWebGPUGpuTimingStats(nativeState),
        ...resolveWebGPUCamera3DStats(frame),
        ...resolveWebGPU3DPassStats(passPlan.coverage),
        ...resolveWebGPU3DBindingStats(bindingPlan.summary),
      }
    },
    dispose: webglRenderer.dispose
      ? () => {
        nativeState = null
        webglRenderer.dispose?.()
      }
      : undefined,
  }
}

/**
 * Builds one render stats payload for native rect-batch WebGPU frames.
 * @param frame Current render frame payload.
 * @param state Initialized native WebGPU state.
 * @param passResult Native submit attempt result.
 * @param rectBatchEligibility Current rect-batch eligibility snapshot.
 * @param passCoverage Current WebGPU 3D pass coverage snapshot.
 * @param bindingSummary Current WebGPU 3D binding plan payload summary.
 */
function resolveNativeRectBatchStats(
  frame: EngineRenderFrame,
  state: WebGPUNativeState | null,
  passResult: WebGPUNativePassResult,
  rectBatchEligibility: WebGPURectBatchEligibility,
  passCoverage: EngineWebGPU3DPassCoverage,
  bindingSummary: EngineWebGPU3DBindingPlanSummary,
): EngineRenderStats {
  return {
    drawCount: 1,
    visibleCount: frame.scene.nodes.length,
    culledCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    frameReuseHits: 0,
    frameReuseMisses: 0,
    frameMs: 0,
    engineFrameQuality: frame.context.quality,
    webgpuRenderPath: 'native-rect-batch',
    webgpuNativeSubmissionAttemptedCount: state ? 1 : 0,
    webgpuNativeSubmissionSuccessCount: passResult.submitted ? 1 : 0,
    webgpuNativeSubmissionFailureCount: passResult.failed ? 1 : 0,
    webgpuNativeSubmissionTotalCount: state?.submittedCount ?? 0,
    webgpuNativeSubmissionTotalFailureCount: state?.failedCount ?? 0,
    webgpuNativeRectBatchEligibleCount: rectBatchEligibility.eligibleCount,
    webgpuNativeRectBatchRejectedReason: rectBatchEligibility.rejectedReason,
    ...resolveWebGPUGpuTimingStats(state),
    ...resolveWebGPUCamera3DStats(frame),
    ...resolveWebGPU3DPassStats(passCoverage),
    ...resolveWebGPU3DBindingStats(bindingSummary),
  }
}

/**
 * Builds one render stats payload for native clear-only WebGPU frames.
 * @param frame Current render frame payload.
 * @param state Initialized native WebGPU state.
 * @param passResult Native submit attempt result.
 * @param rectBatchEligibility Current rect-batch eligibility snapshot.
 * @param passCoverage Current WebGPU 3D pass coverage snapshot.
 * @param bindingSummary Current WebGPU 3D binding plan payload summary.
 */
function resolveNativeClearOnlyStats(
  frame: EngineRenderFrame,
  state: WebGPUNativeState | null,
  passResult: WebGPUNativePassResult,
  rectBatchEligibility: WebGPURectBatchEligibility,
  passCoverage: EngineWebGPU3DPassCoverage,
  bindingSummary: EngineWebGPU3DBindingPlanSummary,
): EngineRenderStats {
  return {
    drawCount: 0,
    visibleCount: 0,
    culledCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    frameReuseHits: 0,
    frameReuseMisses: 0,
    frameMs: 0,
    engineFrameQuality: frame.context.quality,
    webgpuRenderPath: 'native-clear-only',
    webgpuNativeSubmissionAttemptedCount: state ? 1 : 0,
    webgpuNativeSubmissionSuccessCount: passResult.submitted ? 1 : 0,
    webgpuNativeSubmissionFailureCount: passResult.failed ? 1 : 0,
    webgpuNativeSubmissionTotalCount: state?.submittedCount ?? 0,
    webgpuNativeSubmissionTotalFailureCount: state?.failedCount ?? 0,
    webgpuNativeRectBatchEligibleCount: rectBatchEligibility.eligibleCount,
    webgpuNativeRectBatchRejectedReason: rectBatchEligibility.rejectedReason,
    ...resolveWebGPUGpuTimingStats(state),
    ...resolveWebGPUCamera3DStats(frame),
    ...resolveWebGPU3DPassStats(passCoverage),
    ...resolveWebGPU3DBindingStats(bindingSummary),
  }
}

/**
 * Intent: map WebGPU 3D binding payload readiness into render stats.
 * @param summary Binding plan payload summary for the current frame.
 * @returns Partial render stats payload for WebGPU binding readiness.
 */
function resolveWebGPU3DBindingStats(
  summary: EngineWebGPU3DBindingPlanSummary,
): Pick<
  EngineRenderStats,
  | 'webgpu3DBindingMaterialUniformBytes'
  | 'webgpu3DBindingLightUniformBytes'
  | 'webgpu3DBindingInstanceUniformBytes'
  | 'webgpu3DBindingTotalUniformBytes'
> {
  return {
    webgpu3DBindingMaterialUniformBytes: summary.materialUniformBytes,
    webgpu3DBindingLightUniformBytes: summary.lightUniformBytes,
    webgpu3DBindingInstanceUniformBytes: summary.instanceUniformBytes,
    webgpu3DBindingTotalUniformBytes: summary.totalUniformBytes,
  }
}

/**
 * Intent: map the renderer-frame 3D camera context into WebGPU render stats.
 * @param frame Current render frame payload.
 * @returns Partial WebGPU camera stats.
 */
function resolveWebGPUCamera3DStats(
  frame: EngineRenderFrame,
): Pick<
  EngineRenderStats,
  | 'webgpuCamera3DActive'
  | 'webgpuCamera3DController'
  | 'webgpuCamera3DProjectionKind'
  | 'webgpuCamera3DUniformBytes'
  | 'webgpuCamera3DUniformFloatCount'
> {
  const snapshot = frame.context.camera3DSnapshot
  const uniformPlan = snapshot ? resolveEngineWebGPUCameraUniformPlan(snapshot) : null
  return {
    webgpuCamera3DActive: Boolean(snapshot),
    webgpuCamera3DController: snapshot?.controller ?? 'none',
    webgpuCamera3DProjectionKind: snapshot?.projection.kind ?? 'none',
    webgpuCamera3DUniformBytes: uniformPlan?.byteLength ?? 0,
    webgpuCamera3DUniformFloatCount: uniformPlan?.data.length ?? 0,
  }
}

/**
 * Intent: map native WebGPU GPU timing capability/sample state into renderer stats.
 * @param state Initialized native WebGPU state.
 * @returns Partial render stats payload.
 */
function resolveWebGPUGpuTimingStats(
  state: WebGPUNativeState | null,
): Pick<
  EngineRenderStats,
  | 'webgpuGpuTimingSupported'
  | 'webgpuGpuTimingSampleState'
  | 'webgpuGpuTimingQueryPlanState'
  | 'webgpuGpuTimingQueryWriteCount'
  | 'webgpuGpuTimingLastWriteCount'
  | 'webgpuGpuTimingLastResolveCount'
  | 'webgpuGpuTimingLastCopyCount'
  | 'webgpuGpuTimingReadbackBufferBytes'
  | 'webgpuGpuFrameMs'
> {
  return {
    webgpuGpuTimingSupported: state?.gpuTimingSupported ?? false,
    webgpuGpuTimingSampleState: state?.gpuTimingSampleState ?? 'unsupported',
    webgpuGpuTimingQueryPlanState: state?.gpuTimingQueryPlanState ?? 'unsupported',
    webgpuGpuTimingQueryWriteCount: state?.gpuTimingQueryWriteCount ?? 0,
    webgpuGpuTimingLastWriteCount: state?.gpuTimingLastWriteCount ?? 0,
    webgpuGpuTimingLastResolveCount: state?.gpuTimingLastResolveCount ?? 0,
    webgpuGpuTimingLastCopyCount: state?.gpuTimingLastCopyCount ?? 0,
    webgpuGpuTimingReadbackBufferBytes: state?.gpuTimingReadbackBufferBytes ?? 0,
    webgpuGpuFrameMs: undefined,
  }
}

/**
 * Intent: flatten renderable scene leaves into WebGPU 3D pass planning candidates.
 * @param nodes Scene nodes to flatten.
 * @returns WebGPU 3D pass candidates in traversal order.
 */
function resolveWebGPU3DPassCandidates(nodes: readonly EngineRenderableNode[]): EngineWebGPU3DPassCandidate[] {
  const candidates: EngineWebGPU3DPassCandidate[] = []

  for (const node of nodes) {
    if (node.type === 'group') {
      candidates.push(...resolveWebGPU3DPassCandidates(node.children))
      continue
    }

    candidates.push({
      nodeId: node.id,
      nodeType: node.type,
      materialId: node.materialId,
      lightingMode: node.lightingMode,
      geometryKey: resolveWebGPU3DGeometryKey(node),
    })
  }

  return candidates
}

/**
 * Intent: resolve a stable geometry grouping key for WebGPU 3D pass readiness telemetry.
 * @param node Renderable leaf node.
 * @returns Geometry grouping key.
 */
function resolveWebGPU3DGeometryKey(node: Exclude<EngineRenderableNode, {type: 'group'}>): string {
  if (node.type === 'shape') {
    return `shape:${node.shape}`
  }

  if (node.type === 'image') {
    return `image:${node.assetId}`
  }

  return `${node.type}:default`
}

/**
 * Intent: map WebGPU 3D pass coverage into renderer stats fields.
 * @param coverage WebGPU 3D pass coverage snapshot.
 * @returns Partial render stats payload.
 */
function resolveWebGPU3DPassStats(
  coverage: EngineWebGPU3DPassCoverage,
): Pick<
  EngineRenderStats,
  | 'webgpu3DPassCandidateCount'
  | 'webgpu3DPassBatchCount'
  | 'webgpu3DPassUnsupportedCount'
  | 'webgpu3DPassNativeCoverageRatio'
  | 'webgpu3DPassInstancedBatchCount'
  | 'webgpu3DPassLitBatchCount'
  | 'webgpu3DPassUnlitBatchCount'
> {
  return {
    webgpu3DPassCandidateCount: coverage.supportedCount + coverage.unsupportedCount,
    webgpu3DPassBatchCount: coverage.litBatchCount + coverage.unlitBatchCount,
    webgpu3DPassUnsupportedCount: coverage.unsupportedCount,
    webgpu3DPassNativeCoverageRatio: coverage.nativeCoverageRatio,
    webgpu3DPassInstancedBatchCount: coverage.instancedBatchCount,
    webgpu3DPassLitBatchCount: coverage.litBatchCount,
    webgpu3DPassUnlitBatchCount: coverage.unlitBatchCount,
  }
}
