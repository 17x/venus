/**
 * Declares fallback diagnostics payload required for backend render-path classification.
 */
export interface EngineBackendRenderPathClassificationInput {
  /** Stores resolved backend name from engine diagnostics. */
  backendResolved: string
  /** Stores frame draw count from render result for path fallback derivation. */
  drawCount: number
  /** Stores frame visible node count used to detect empty-scene no-op frames. */
  visibleCount: number
  /** Stores whether backend present phase completed for current frame render chain. */
  backendPresentCompleted: boolean
  /** Stores optional backend-provided WebGL render path when already resolved upstream. */
  backendWebglRenderPath?: 'model-complete' | 'packet' | 'none'
  /** Stores optional backend-provided WebGPU render path when already resolved upstream. */
  backendWebgpuRenderPath?: 'hybrid-webgl' | 'native-clear-only' | 'native-rect-batch' | 'native-model-complete'
}

/**
 * Declares normalized backend render-path output consumed by runtime diagnostics publication.
 */
export interface EngineBackendRenderPathClassificationResult {
  /** Stores normalized WebGL render path classification for current frame. */
  webglRenderPath: 'model-complete' | 'packet' | 'none'
  /** Stores normalized WebGPU render path classification for current frame. */
  webgpuRenderPath: 'hybrid-webgl' | 'native-clear-only' | 'native-rect-batch' | 'native-model-complete'
}

/**
 * Resolves backend render-path diagnostics with consistent fallback semantics across WebGL/WebGPU.
 * @param input Backend/render-result payload used for classification.
 */
export function resolveEngineBackendRenderPaths(
  input: EngineBackendRenderPathClassificationInput,
): EngineBackendRenderPathClassificationResult {
  const safeDrawCount = Number.isFinite(input.drawCount) ? Math.max(0, input.drawCount) : 0
  const safeVisibleCount = Number.isFinite(input.visibleCount) ? Math.max(0, input.visibleCount) : 0

  const webglRenderPath: EngineBackendRenderPathClassificationResult['webglRenderPath'] =
    input.backendWebglRenderPath
      ?? (
        input.backendResolved !== 'webgl'
          ? 'none'
          : (
            // Empty WebGL frames should report none so parity checks do not treat clear-only frames as packet rendering.
            safeDrawCount <= 0 && safeVisibleCount <= 0
              ? 'none'
              : 'packet'
          )
      )

  const webgpuRenderPath: EngineBackendRenderPathClassificationResult['webgpuRenderPath'] =
    input.backendWebgpuRenderPath
      ?? (
        input.backendResolved !== 'webgpu'
          ? 'hybrid-webgl'
          : (
            // If native present did not complete, classify the frame as hybrid fallback instead of native rect batch.
            !input.backendPresentCompleted
              ? 'hybrid-webgl'
              : (safeDrawCount > 0 ? 'native-rect-batch' : 'native-clear-only')
          )
      )

  return {
    webglRenderPath,
    webgpuRenderPath,
  }
}
