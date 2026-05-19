// Module responsibility: normalize 3D camera snapshots into WebGPU-ready uniform payloads.
// Non-responsibility: creating GPU buffers, bind groups, or issuing queue uploads.

import type { EngineCamera3DSnapshot } from '../../../camera/camera3dControllers/camera3dControllers.ts'

const MATRIX_FLOAT_COUNT = 16
const CAMERA_VECTOR_FLOAT_COUNT = 4
const CAMERA_UNIFORM_FLOAT_COUNT = MATRIX_FLOAT_COUNT * 3 + CAMERA_VECTOR_FLOAT_COUNT * 2

/**
 * Declares one WebGPU camera uniform payload prepared from a 3D camera snapshot.
 */
export interface EngineWebGPUCameraUniformPlan {
  /** Controller family represented by this uniform payload. */
  controller: EngineCamera3DSnapshot['controller']
  /** Projection kind represented by this uniform payload. */
  projectionKind: EngineCamera3DSnapshot['projection']['kind']
  /** Packed Float32 uniform data: view, projection, viewProjection, position, target. */
  data: Float32Array
  /** Byte size required to upload this camera uniform payload. */
  byteLength: number
}

/**
 * Intent: build one WebGPU-ready camera uniform payload from a 3D camera snapshot.
 * @param snapshot 3D camera snapshot to pack for WebGPU camera uniforms.
 * @returns WebGPU camera uniform payload.
 */
export function resolveEngineWebGPUCameraUniformPlan(
  snapshot: EngineCamera3DSnapshot,
): EngineWebGPUCameraUniformPlan {
  const data = new Float32Array(CAMERA_UNIFORM_FLOAT_COUNT)
  data.set(snapshot.pose.viewMatrix, 0)
  data.set(snapshot.pose.projectionMatrix, MATRIX_FLOAT_COUNT)
  data.set(snapshot.pose.viewProjectionMatrix, MATRIX_FLOAT_COUNT * 2)
  data.set(
    [snapshot.pose.position.x, snapshot.pose.position.y, snapshot.pose.position.z, 1],
    MATRIX_FLOAT_COUNT * 3,
  )
  data.set(
    [snapshot.pose.target.x, snapshot.pose.target.y, snapshot.pose.target.z, 1],
    MATRIX_FLOAT_COUNT * 3 + CAMERA_VECTOR_FLOAT_COUNT,
  )

  return {
    controller: snapshot.controller,
    projectionKind: snapshot.projection.kind,
    data,
    byteLength: data.byteLength,
  }
}
