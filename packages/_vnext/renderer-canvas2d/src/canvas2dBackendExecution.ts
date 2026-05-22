import type {
  RendererBackendExecutionContract,
  RendererExecutionPacket,
} from '../../renderer-shared/src/contracts/rendererBackendContract'

/**
 * Describes one canvas-like target used by Canvas2D backend execution.
 */
export interface Canvas2DBackendCanvasLike {
  /** Resolves one rendering context by type token. */
  getContext: (type: '2d') => unknown
}

/**
 * Describes one minimal 2D context shape required by staging execution.
 */
export interface Canvas2DRenderingContextLike {
  /** Saves current rendering state stack frame. */
  save: () => void
  /** Restores rendering state stack frame. */
  restore: () => void
  /** Resets and applies transform matrix values. */
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void
  /** Clears one rectangular region in pixel coordinates. */
  clearRect: (x: number, y: number, width: number, height: number) => void
}

/**
 * Describes one render surface payload accepted by Canvas2D backend execution.
 */
export interface Canvas2DBackendSurface {
  /** Surface width in pixels. */
  width: number
  /** Surface height in pixels. */
  height: number
  /** Optional canvas-like host target. */
  canvas?: Canvas2DBackendCanvasLike | null
}

/**
 * Declares optional draw hook called after deterministic clear operation.
 */
export interface Canvas2DBackendExecutionHooks {
  /** Draw hook returning optional draw count for diagnostics. */
  drawFrame?: (context: Canvas2DRenderingContextLike, timestampMs: number) => number
}

/**
 * Creates one Canvas2D backend execution contract for renderer split staging.
 * @param surface Initial render surface payload.
 * @param hooks Optional draw hooks for compatibility staging.
 * @returns Canvas2D backend execution contract.
 */
export function createCanvas2DBackendExecution(
  surface: Canvas2DBackendSurface,
  hooks?: Canvas2DBackendExecutionHooks,
): RendererBackendExecutionContract {
  let currentSurface = surface
  let currentContext = resolveContext(surface)

  /**
   * Narrows an unknown context into required Canvas2D context-like shape.
   * @param context Candidate context value returned by canvas-like target.
   * @returns Whether candidate satisfies required Canvas2D context-like methods.
   */
  function isCanvas2DRenderingContextLike(context: unknown): context is Canvas2DRenderingContextLike {
    if (!context || typeof context !== 'object') {
      return false
    }
    return 'clearRect' in context && 'setTransform' in context && 'save' in context && 'restore' in context
  }

  /**
   * Resolves one valid Canvas2D context-like target from surface payload.
   * @param nextSurface Candidate surface payload that may hold a canvas-like target.
   * @returns Canvas2D context-like target when available; otherwise null.
   */
  function resolveContext(nextSurface: Canvas2DBackendSurface): Canvas2DRenderingContextLike | null {
    const canvas = nextSurface.canvas
    if (!canvas) {
      return null
    }
    const context = canvas.getContext('2d')
    return isCanvas2DRenderingContextLike(context) ? context : null
  }

  return {
    mode: 'canvas2d',
    capabilities: {
      offscreenSurface: false,
      gpuInstancing: false,
      asyncUpload: false,
    },
    limits: {
      maxRenderTargetSize: 16384,
      maxPacketsPerFrame: 100000,
    },
    executePackets: (timestampMs: number, packets: readonly RendererExecutionPacket[]) => {
      if (!currentContext) {
        return 0
      }

      currentContext.save()
      currentContext.setTransform(1, 0, 0, 1, 0, 0)
      currentContext.clearRect(0, 0, currentSurface.width, currentSurface.height)
      hooks?.drawFrame?.(currentContext, timestampMs)
      currentContext.restore()
      return packets.length
    },
    resize: (width: number, height: number) => {
      currentSurface = {
        ...currentSurface,
        width,
        height,
      }
      currentContext = resolveContext(currentSurface)
    },
    dispose: () => {
      currentContext = null
    },
  }
}
