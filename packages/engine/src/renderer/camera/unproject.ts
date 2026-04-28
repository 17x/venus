import { applyMatrixToPoint } from '../../math/matrix/matrix.ts'
import type { EngineRenderCamera, EngineRenderPoint } from '../../core/types.ts'

/**
 * Unprojects one screen-space point into world space using camera inverse matrix.
  * @param point point parameter.
 * @param camera Camera state snapshot.
*/
export function unprojectScreenPoint(
  point: EngineRenderPoint,
  camera: Pick<EngineRenderCamera, 'inverseMatrix'>,
): EngineRenderPoint {
  return applyMatrixToPoint(camera.inverseMatrix, point)
}
