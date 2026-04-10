import type { Mat3 } from './matrix.ts'

/**
 * Fully resolved viewport state shared between runtime, renderer, and UI.
 *
 * `matrix` maps world -> screen, while `inverseMatrix` maps screen -> world.
 */
export interface CanvasViewportState {
  inverseMatrix: Mat3
  matrix: Mat3
  offsetX: number
  offsetY: number
  scale: number
  viewportWidth: number
  viewportHeight: number
}
