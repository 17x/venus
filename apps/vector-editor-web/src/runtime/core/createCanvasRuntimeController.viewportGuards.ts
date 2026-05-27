import type {CanvasViewportState} from '../viewport/types.ts'

/**
 * Resolves whether the viewport has been measured with non-zero dimensions.
 * @param viewport Runtime viewport state snapshot to validate.
 */
export function hasMeasuredViewport(viewport: CanvasViewportState): boolean {
  return viewport.viewportWidth > 0 && viewport.viewportHeight > 0
}
