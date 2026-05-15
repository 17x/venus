import type { EngineRenderCamera } from '../../render/index.ts'
import { projectWorldPoint } from './project.ts'
import { unprojectScreenPoint } from './unproject.ts'

/**
 * Creates camera helper object that keeps project/unproject in one shared surface.
 * @param camera Camera snapshot used for project/unproject helpers.
 */
export function createRenderCameraProjector(camera: EngineRenderCamera) {
  return {
    /**
     * Projects world point to screen point with current camera snapshot.
     * @param point World-space point.
     */
    project(point: { x: number; y: number }) {
      return projectWorldPoint(point, camera)
    },
    /**
     * Unprojects screen point to world point with current camera snapshot.
     * @param point Screen-space point.
     */
    unproject(point: { x: number; y: number }) {
      return unprojectScreenPoint(point, camera)
    },
  }
}
