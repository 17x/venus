import type { Mat3 } from './matrix.ts'

export interface CanvasViewportState {
  inverseMatrix: Mat3
  matrix: Mat3
  offsetX: number
  offsetY: number
  scale: number
  viewportWidth: number
  viewportHeight: number
}
