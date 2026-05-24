/**
 * Declares the runtime dimension mode contract used by staged 2D/3D migration.
 */
export type EngineDimensionMode = '2d' | '3d'

/**
 * Declares a 2D vector in engine-local numeric space.
 */
export interface EngineVec2 {
  /** X axis value in local/world units. */
  x: number
  /** Y axis value in local/world units. */
  y: number
}

/**
 * Declares a 3D vector in engine-local numeric space.
 */
export interface EngineVec3 {
  /** X axis value in local/world units. */
  x: number
  /** Y axis value in local/world units. */
  y: number
  /** Z axis value in local/world units. */
  z: number
}

/**
 * Declares a homogeneous 4D vector used by projection and clip-space math.
 */
export interface EngineVec4 {
  /** X axis value. */
  x: number
  /** Y axis value. */
  y: number
  /** Z axis value. */
  z: number
  /** Homogeneous W component. */
  w: number
}

/**
 * Declares the compatibility affine 2D matrix layout [a, b, c, d, e, f].
 */
export type EngineMat3Affine2D = readonly [number, number, number, number, number, number]

/**
 * Declares a row-major 3x3 matrix contract for 2D homogeneous transforms.
 */
export type EngineMat3 = readonly [number, number, number, number, number, number, number, number, number]

/**
 * Declares a row-major 4x4 matrix contract for 3D transforms and projection.
 */
export type EngineMat4 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

/**
 * Declares a 2D axis-aligned rectangle bounds contract.
 */
export interface EngineRect2 {
  /** Minimum X origin in world/local units. */
  x: number
  /** Minimum Y origin in world/local units. */
  y: number
  /** Positive width in world/local units. */
  width: number
  /** Positive height in world/local units. */
  height: number
}

/**
 * Declares a 3D axis-aligned bounds contract.
 */
export interface EngineAabb3 {
  /** Minimum X extent in world/local units. */
  minX: number
  /** Minimum Y extent in world/local units. */
  minY: number
  /** Minimum Z extent in world/local units. */
  minZ: number
  /** Maximum X extent in world/local units. */
  maxX: number
  /** Maximum Y extent in world/local units. */
  maxY: number
  /** Maximum Z extent in world/local units. */
  maxZ: number
}

/**
 * Declares a 3D ray contract used by camera-space and scene-space queries.
 */
export interface EngineRay3 {
  /** Ray origin in world or view space. */
  origin: EngineVec3
  /** Ray direction, expected to be normalized by caller policy. */
  direction: EngineVec3
}

/**
 * Declares one frustum plane as normalized plane equation ax + by + cz + d = 0.
 */
export interface EngineFrustumPlane {
  /** Plane normal X component. */
  x: number
  /** Plane normal Y component. */
  y: number
  /** Plane normal Z component. */
  z: number
  /** Plane distance component. */
  w: number
}

/**
 * Declares six clipping planes describing a camera frustum volume.
 */
export interface EngineFrustum {
  /** Left clipping plane. */
  left: EngineFrustumPlane
  /** Right clipping plane. */
  right: EngineFrustumPlane
  /** Top clipping plane. */
  top: EngineFrustumPlane
  /** Bottom clipping plane. */
  bottom: EngineFrustumPlane
  /** Near clipping plane. */
  near: EngineFrustumPlane
  /** Far clipping plane. */
  far: EngineFrustumPlane
}