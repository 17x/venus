// Core camera projection owns backend-neutral point transforms; renderer
// backends consume projected coordinates but must not own camera math.

import { applyMatrixToPoint } from '../../math/matrix/matrix.ts'
import type { EngineRenderCamera, EngineRenderPoint } from '../types.ts'

/**
 * Projects one world-space point into screen space using camera matrix.
 * @param point World-space point.
 * @param camera Camera state snapshot.
 */
export function projectWorldPoint(
  point: EngineRenderPoint,
  camera: Pick<EngineRenderCamera, 'matrix'>,
): EngineRenderPoint {
  return applyMatrixToPoint(camera.matrix, point)
}
