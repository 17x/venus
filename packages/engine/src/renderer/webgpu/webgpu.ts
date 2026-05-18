import { createWebGLEngineRenderer } from '../webgl/index.ts'
import type { EngineRenderFrame, EngineRenderStats, EngineRenderer } from '../types/index.ts'
import {
  initializeWebGPUNativeState,
  resolveWebGPURectBatchEligibility,
  submitWebGPUNativePass,
  submitWebGPUNativeRectBatchPass,
  type WebGPUNativePassResult,
  type WebGPUNativeState,
  type WebGPURectBatchEligibility,
} from './webgpuNativeRuntime.ts'

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
      const canUseNativeClearOnlyPath = frame.scene.nodes.length === 0
      const canUseNativeRectBatchPath =
        rectBatchEligibility.rejectedReason === 'none' && rectBatchEligibility.eligibleCount > 0
      const initialPassResult = canUseNativeClearOnlyPath
        ? submitWebGPUNativePass(nativeState)
        : {submitted: false, failed: false}

      if (canUseNativeClearOnlyPath && initialPassResult.submitted) {
        return resolveNativeClearOnlyStats(frame, nativeState, initialPassResult, rectBatchEligibility)
      }

      const webglStats = await webglRenderer.render(frame)
      const passResult = canUseNativeClearOnlyPath
        ? initialPassResult
        : canUseNativeRectBatchPath
          ? submitWebGPUNativeRectBatchPass(nativeState, frame.scene.nodes)
          : submitWebGPUNativePass(nativeState)
      const renderPath: NonNullable<EngineRenderStats['webgpuRenderPath']> =
        canUseNativeRectBatchPath && passResult.submitted
          ? 'native-rect-batch'
          : 'hybrid-webgl'

      return {
        ...webglStats,
        // AI-TEMP: keep WebGL presentation as compatibility fallback while native rect path is being verified; remove when native rect draw submission fully replaces fallback for eligible scenes; ref B3-webgpu-native-main-pass.
        webgpuRenderPath: renderPath,
        webgpuNativeSubmissionAttemptedCount: nativeState ? 1 : 0,
        webgpuNativeSubmissionSuccessCount: passResult.submitted ? 1 : 0,
        webgpuNativeSubmissionFailureCount: passResult.failed ? 1 : 0,
        webgpuNativeSubmissionTotalCount: nativeState?.submittedCount ?? 0,
        webgpuNativeSubmissionTotalFailureCount: nativeState?.failedCount ?? 0,
        webgpuNativeRectBatchEligibleCount: rectBatchEligibility.eligibleCount,
        webgpuNativeRectBatchRejectedReason: rectBatchEligibility.rejectedReason,
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
 * Builds one render stats payload for native clear-only WebGPU frames.
 * @param frame Current render frame payload.
 * @param state Initialized native WebGPU state.
 * @param passResult Native submit attempt result.
 * @param rectBatchEligibility Current rect-batch eligibility snapshot.
 */
function resolveNativeClearOnlyStats(
  frame: EngineRenderFrame,
  state: WebGPUNativeState | null,
  passResult: WebGPUNativePassResult,
  rectBatchEligibility: WebGPURectBatchEligibility,
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
  }
}
