// Module responsibility: keep createEngine bootstrap surface resize synchronization out of the main orchestrator.
// Non-responsibility: mutating viewport policy or renderer creation.

import type { EngineResizeOptions } from './createEngineContracts.ts'

/**
 * Intent: apply the initial renderer/canvas size synchronization during engine bootstrap.
 * @param options Initial resize dependencies.
 */
export function applyCreateEngineInitialResize(options: {
  /** Canvas whose backing size seeds the initial output size. */
  canvas: HTMLCanvasElement | OffscreenCanvas
  /** Current viewport width in CSS pixels. */
  viewportWidth: number
  /** Current viewport height in CSS pixels. */
  viewportHeight: number
  /** Effective output pixel ratio used when canvas size is unavailable. */
  outputPixelRatio: number
  /** Resize function that synchronizes renderer surface and viewport state. */
  applyResizeSurface: (size: EngineResizeOptions) => void
}): void {
  options.applyResizeSurface({
    viewportWidth: options.viewportWidth,
    viewportHeight: options.viewportHeight,
    outputWidth: Math.max(1, options.canvas.width ?? Math.round(options.viewportWidth * options.outputPixelRatio)),
    outputHeight: Math.max(1, options.canvas.height ?? Math.round(options.viewportHeight * options.outputPixelRatio)),
  })
}
