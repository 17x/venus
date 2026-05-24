import type {
  EngineMat4,
  EngineVec3,
} from '../math/dimension/types.ts'

/**
 * Declares supported camera projection modes for staged 2D/3D runtime migration.
 */
export type EngineCameraProjectionKind = 'orthographic' | 'perspective'

/**
 * Declares near/far clip range shared by all camera projection contracts.
 */
export interface EngineCameraClipRange {
  /** Near clipping distance in camera space units. */
  near: number
  /** Far clipping distance in camera space units. */
  far: number
}

/**
 * Declares orthographic projection bounds in camera space units.
 */
export interface EngineOrthographicCameraProjection extends EngineCameraClipRange {
  /** Projection discriminant used by runtime narrowing. */
  kind: 'orthographic'
  /** Left clip plane in camera space units. */
  left: number
  /** Right clip plane in camera space units. */
  right: number
  /** Top clip plane in camera space units. */
  top: number
  /** Bottom clip plane in camera space units. */
  bottom: number
}

/**
 * Declares perspective projection shape in camera space units.
 */
export interface EnginePerspectiveCameraProjection extends EngineCameraClipRange {
  /** Projection discriminant used by runtime narrowing. */
  kind: 'perspective'
  /** Vertical field-of-view angle in radians. */
  fovYRadians: number
  /** Viewport aspect ratio width / height. */
  aspectRatio: number
}

/**
 * Declares camera projection as a discriminated union for 2D/3D compatibility.
 */
export type EngineCameraProjection =
  | EngineOrthographicCameraProjection
  | EnginePerspectiveCameraProjection

/**
 * Declares world-space camera pose and derived matrix snapshots.
 */
export interface EngineCameraPose {
  /** Camera world-space position. */
  position: EngineVec3
  /** Camera world-space look-at target. */
  target: EngineVec3
  /** Camera world-space up axis direction. */
  up: EngineVec3
  /** World-to-view transform matrix. */
  viewMatrix: EngineMat4
  /** View-to-clip projection matrix. */
  projectionMatrix: EngineMat4
  /** World-to-clip matrix, usually projection * view. */
  viewProjectionMatrix: EngineMat4
}