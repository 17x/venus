import { applyMatrixToPoint } from '../../math/matrix/matrix.ts'
import type { EngineRenderCamera, EngineRenderPoint } from '../../render/index.ts'

/**
 * Projects one world-space point into screen space using camera matrix.
  * @param point point parameter.
 * @param camera Camera state snapshot.
*/
export function projectWorldPoint(
  point: EngineRenderPoint,
  camera: Pick<EngineRenderCamera, 'matrix'>,
): EngineRenderPoint {
  return applyMatrixToPoint(camera.matrix, point)
}
