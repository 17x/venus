import { resolveEngineViewportState, type EngineCanvasViewportState } from '../../interaction/viewport/viewport.ts'

/**
 * Builds resize/output-surface lifecycle helpers for createEngine runtime.
 * @param options Mutable resize dependencies and callbacks.
 * @returns Resize helper surface exposing applyResizeSurface.
 */
export function createEngineResizeLifecycle(options: {
  canvas: unknown
  renderer: { resize?: (size: { viewportWidth: number; viewportHeight: number; outputWidth: number; outputHeight: number; outputPixelRatio: number }) => void }
  setOutputPixelRatio: (value: number) => void
  setRenderContextOutputPixelRatio: (value: number) => void
  getViewport: () => EngineCanvasViewportState
  setViewport: (next: EngineCanvasViewportState) => void
}) {
  /**
   * Resolves normalized viewport/output dimensions and derived output DPR.
   * @param size Host-provided resize payload.
   * @returns Normalized resize payload.
   */
  const resolveResizeSurface = (size: {
    viewportWidth: number
    viewportHeight: number
    outputWidth: number
    outputHeight: number
  }) => {
    const viewportWidth = Math.max(1, Math.round(size.viewportWidth))
    const viewportHeight = Math.max(1, Math.round(size.viewportHeight))
    const outputWidth = Math.max(1, Math.round(size.outputWidth))
    const outputHeight = Math.max(1, Math.round(size.outputHeight))

    return {
      viewportWidth,
      viewportHeight,
      outputWidth,
      outputHeight,
      outputPixelRatio: Math.max(
        1,
        Math.min(outputWidth / viewportWidth, outputHeight / viewportHeight),
      ),
    }
  }

  /**
   * Resolves whether dev-only canvas output-size warnings should be emitted.
   * @returns True when validation warnings should be enabled.
   */
  const shouldValidateCanvasOutputSize = () => {
    const runtimeProcess = (globalThis as Record<string, unknown>)['process'] as
      | {env?: {NODE_ENV?: string}}
      | undefined
    if (runtimeProcess?.env?.NODE_ENV) {
      return runtimeProcess.env.NODE_ENV !== 'production'
    }

    if (typeof location !== 'undefined') {
      return location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    }

    return false
  }

  /**
   * Validates host-owned canvas buffer dimensions against resize payload.
   * @param size Normalized resize payload.
   */
  const validateCanvasOutputSize = (size: {
    outputWidth: number
    outputHeight: number
  }) => {
    const hostCanvas = options.canvas as {width?: number; height?: number}
    if (typeof console === 'undefined' || !shouldValidateCanvasOutputSize()) {
      return
    }

    if (hostCanvas.width !== size.outputWidth || hostCanvas.height !== size.outputHeight) {
      console.warn(
        '[venus/engine] resize() expected app-owned canvas buffer size',
        {
          expectedWidth: size.outputWidth,
          expectedHeight: size.outputHeight,
          actualWidth: hostCanvas.width,
          actualHeight: hostCanvas.height,
        },
      )
    }
  }

  /**
   * Applies one resize payload to renderer, output DPR, and viewport state.
   * @param size Host-provided resize payload.
   * @returns Updated viewport state.
   */
  const applyResizeSurface = (size: {
    viewportWidth: number
    viewportHeight: number
    outputWidth: number
    outputHeight: number
  }) => {
    const resolvedSize = resolveResizeSurface(size)
    options.setOutputPixelRatio(resolvedSize.outputPixelRatio)
    options.setRenderContextOutputPixelRatio(resolvedSize.outputPixelRatio)
    validateCanvasOutputSize(resolvedSize)
    options.renderer.resize?.(resolvedSize)

    const viewport = options.getViewport()
    const nextViewport = resolveEngineViewportState({
      viewportWidth: resolvedSize.viewportWidth,
      viewportHeight: resolvedSize.viewportHeight,
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
      scale: viewport.scale,
    })
    options.setViewport(nextViewport)
    return nextViewport
  }

  return {
    applyResizeSurface,
  }
}