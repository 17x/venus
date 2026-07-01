// Core camera unprojection owns backend-neutral inverse point transforms;
// renderer backends must not duplicate camera inverse math.

import { applyMatrixToPoint } from '../../math/matrix/matrix.ts'
import type { EngineRenderCamera, EngineRenderPoint } from '../types.ts'

/**
 * Unprojects one screen-space point into world space using camera inverse matrix.
 * @param point Screen-space point.
 * @param camera Camera state snapshot.
 */
export function unprojectScreenPoint(
  point: EngineRenderPoint,
  camera: Pick<EngineRenderCamera, 'inverseMatrix'>,
): EngineRenderPoint {
  return applyMatrixToPoint(camera.inverseMatrix, point)
}
