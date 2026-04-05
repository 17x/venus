import type { CanvasViewportState } from './types.ts'

export interface ViewportPreviewState {
  panOffset: {
    x: number
    y: number
  }
  zoom: {
    factor: number
    anchor: { x: number; y: number } | null
  }
}

/**
 * Resolve the extra render margin used by the pan preview layer.
 *
 * Why:
 * - pan preview moves a cached renderer layer with CSS transforms
 * - a small overscan prevents edges from flashing blank while the real
 *   viewport commit catches up
 */
export function resolveViewportPreviewOverscan(viewport: CanvasViewportState) {
  const scaleFactor = viewport.scale < 0.25 ? 2 : viewport.scale < 0.5 ? 1.5 : 1
  const baseOverscan = 192 * scaleFactor

  return Math.max(192, Math.min(640, Math.ceil(baseOverscan)))
}

/**
 * Apply the lightweight DOM preview transform used during high-frequency pan
 * or zoom interactions before the runtime viewport state commits.
 */
export function applyViewportPreviewTransform(
  node: HTMLElement | null,
  preview: ViewportPreviewState,
  overscan: number,
) {
  if (!node) {
    return
  }

  const anchorX = (preview.zoom.anchor?.x ?? 0) + overscan
  const anchorY = (preview.zoom.anchor?.y ?? 0) + overscan
  const scale = preview.zoom.factor

  node.style.transform =
    `translate(${preview.panOffset.x}px, ${preview.panOffset.y}px) ` +
    `translate(${anchorX}px, ${anchorY}px) ` +
    `scale(${scale}) ` +
    `translate(${-anchorX}px, ${-anchorY}px)`
  node.style.willChange =
    preview.panOffset.x !== 0 || preview.panOffset.y !== 0 || scale !== 1
      ? 'transform'
      : ''
}

/**
 * Apply a relative viewport transform between an already rendered base
 * viewport and a preview target viewport.
 *
 * This is used for zoom preview so the cached renderer output can be scaled and
 * translated as one layer without committing intermediate viewport redraws.
 */
export function applyViewportTransitionTransform(
  node: HTMLElement | null,
  fromViewport: CanvasViewportState,
  toViewport: CanvasViewportState,
  overscan: number,
) {
  if (!node) {
    return
  }

  const scale = toViewport.scale / fromViewport.scale
  const sourceX = fromViewport.offsetX + overscan
  const sourceY = fromViewport.offsetY + overscan
  const targetX = toViewport.offsetX + overscan
  const targetY = toViewport.offsetY + overscan
  const translateX = targetX - scale * sourceX
  const translateY = targetY - scale * sourceY

  node.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`
  node.style.willChange =
    scale !== 1 || translateX !== 0 || translateY !== 0
      ? 'transform'
      : ''
}
