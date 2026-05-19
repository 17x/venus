import type {
  EngineCameraPose,
  EngineCameraProjection,
  EngineOrthographicCameraProjection,
  EnginePerspectiveCameraProjection,
} from '../contracts.ts'
import type {
  EngineMat4,
  EngineVec3,
} from '../../math/dimension/types.ts'

const DEFAULT_CAMERA_UP: EngineVec3 = {x: 0, y: 1, z: 0}
const MIN_CAMERA_DISTANCE = 0.0001
const MAX_ABS_PITCH_RADIANS = Math.PI / 2 - 0.0001

/**
 * Declares the supported 3D camera controller families.
 */
export type EngineCamera3DControllerKind = 'orbit' | 'fly' | 'fps'

/**
 * Stores a complete camera snapshot that can be rendered, serialized, or replayed.
 */
export interface EngineCamera3DSnapshot {
  /** Controller family that produced this snapshot. */
  controller: EngineCamera3DControllerKind
  /** Projection contract paired with the pose matrices. */
  projection: EngineCameraProjection
  /** Pose and derived matrices for world-to-clip transforms. */
  pose: EngineCameraPose
}

/**
 * Stores orbit camera inputs around a stable target.
 */
export interface EngineOrbitCameraInput {
  /** World-space point the camera orbits around. */
  target: EngineVec3
  /** Positive camera distance from the target. */
  distance: number
  /** Horizontal yaw angle in radians around the up axis. */
  yawRadians: number
  /** Vertical pitch angle in radians, clamped away from the poles. */
  pitchRadians: number
  /** Optional world-space up axis; defaults to positive Y. */
  up?: EngineVec3
  /** Projection contract used to build the derived pose matrices. */
  projection: EngineCameraProjection
}

/**
 * Stores fly camera inputs that move freely through 3D space.
 */
export interface EngineFlyCameraInput {
  /** World-space camera position. */
  position: EngineVec3
  /** Horizontal yaw angle in radians. */
  yawRadians: number
  /** Vertical pitch angle in radians, clamped away from the poles. */
  pitchRadians: number
  /** Optional world-space up axis; defaults to positive Y. */
  up?: EngineVec3
  /** Projection contract used to build the derived pose matrices. */
  projection: EngineCameraProjection
}

/**
 * Stores first-person camera inputs with a fixed world-up horizon.
 */
export interface EngineFpsCameraInput {
  /** World-space eye position. */
  position: EngineVec3
  /** Horizontal yaw angle in radians. */
  yawRadians: number
  /** Vertical pitch angle in radians, clamped to avoid vertical flips. */
  pitchRadians: number
  /** Projection contract used to build the derived pose matrices. */
  projection: EngineCameraProjection
}

/**
 * Stores projection transition inputs for perspective/orthographic switching.
 */
export interface EngineCameraProjectionTransitionInput {
  /** Projection active at transition start. */
  from: EngineCameraProjection
  /** Projection active at transition end. */
  to: EngineCameraProjection
  /** Transition progress in range [0, 1]. */
  progress: number
}

/**
 * Stores projection transition output without hiding the discrete projection boundary.
 */
export interface EngineCameraProjectionTransition {
  /** Original projection contract. */
  from: EngineCameraProjection
  /** Target projection contract. */
  to: EngineCameraProjection
  /** Clamped blend ratio in range [0, 1]. */
  blendRatio: number
  /** Projection selected for renderer compatibility during this frame. */
  activeProjection: EngineCameraProjection
}

/**
 * Stores one replayable camera keyframe.
 */
export interface EngineCameraReplayKeyframe {
  /** Keyframe timestamp in milliseconds. */
  atMs: number
  /** Camera snapshot captured at this timestamp. */
  snapshot: EngineCamera3DSnapshot
}

/**
 * Creates one perspective projection contract.
 * @param options Perspective projection scalar inputs.
 */
export function createPerspectiveCameraProjection(options: {
  fovYRadians: number
  aspectRatio: number
  near: number
  far: number
}): EnginePerspectiveCameraProjection {
  return {
    kind: 'perspective',
    fovYRadians: options.fovYRadians,
    aspectRatio: options.aspectRatio,
    near: options.near,
    far: options.far,
  }
}

/**
 * Creates one orthographic projection contract.
 * @param options Orthographic projection bounds and clip range.
 */
export function createOrthographicCameraProjection(options: {
  left: number
  right: number
  top: number
  bottom: number
  near: number
  far: number
}): EngineOrthographicCameraProjection {
  return {
    kind: 'orthographic',
    left: options.left,
    right: options.right,
    top: options.top,
    bottom: options.bottom,
    near: options.near,
    far: options.far,
  }
}

/**
 * Resolves an orbit camera snapshot from spherical controller inputs.
 * @param input Orbit controller input.
 */
export function resolveOrbitCameraSnapshot(input: EngineOrbitCameraInput): EngineCamera3DSnapshot {
  const pitchRadians = clampPitch(input.pitchRadians)
  const distance = Math.max(MIN_CAMERA_DISTANCE, input.distance)
  const cosPitch = Math.cos(pitchRadians)
  const position = {
    x: input.target.x + distance * Math.sin(input.yawRadians) * cosPitch,
    y: input.target.y + distance * Math.sin(pitchRadians),
    z: input.target.z + distance * Math.cos(input.yawRadians) * cosPitch,
  }

  return createCameraSnapshot('orbit', position, input.target, input.up ?? DEFAULT_CAMERA_UP, input.projection)
}

/**
 * Resolves a fly camera snapshot from free-look yaw/pitch inputs.
 * @param input Fly controller input.
 */
export function resolveFlyCameraSnapshot(input: EngineFlyCameraInput): EngineCamera3DSnapshot {
  const forward = resolveForwardVector(input.yawRadians, input.pitchRadians)
  const target = addVec3(input.position, forward)

  return createCameraSnapshot('fly', input.position, target, input.up ?? DEFAULT_CAMERA_UP, input.projection)
}

/**
 * Resolves a first-person camera snapshot with a fixed positive-Y up axis.
 * @param input FPS controller input.
 */
export function resolveFpsCameraSnapshot(input: EngineFpsCameraInput): EngineCamera3DSnapshot {
  const forward = resolveForwardVector(input.yawRadians, input.pitchRadians)
  const target = addVec3(input.position, forward)

  return createCameraSnapshot('fps', input.position, target, DEFAULT_CAMERA_UP, input.projection)
}

/**
 * Resolves a projection transition descriptor for perspective/orthographic switching.
 * @param input Projection transition input.
 */
export function resolveCameraProjectionTransition(
  input: EngineCameraProjectionTransitionInput,
): EngineCameraProjectionTransition {
  const blendRatio = clamp01(input.progress)
  return {
    from: input.from,
    to: input.to,
    blendRatio,
    // Keep the projection kind discrete so renderers do not receive an invalid
    // mixed projection contract while animation UI still has a stable blend.
    activeProjection: blendRatio < 0.5 ? input.from : input.to,
  }
}

/**
 * Resolves the latest replay keyframe snapshot at or before the requested time.
 * @param keyframes Replay keyframes in arbitrary order.
 * @param atMs Requested replay timestamp in milliseconds.
 */
export function resolveCameraReplaySnapshot(
  keyframes: readonly EngineCameraReplayKeyframe[],
  atMs: number,
): EngineCamera3DSnapshot | null {
  if (keyframes.length === 0) {
    return null
  }

  const orderedKeyframes = [...keyframes].sort((left, right) => left.atMs - right.atMs)
  let selected = orderedKeyframes[0]
  for (const keyframe of orderedKeyframes) {
    if (keyframe.atMs > atMs) {
      // Replay is step-based for deterministic debugging; interpolation can be
      // layered above this without changing the keyframe selection contract.
      break
    }
    selected = keyframe
  }

  return selected.snapshot
}

/**
 * Creates one camera snapshot and derives view/projection matrices.
 * @param controller Controller family that produced the snapshot.
 * @param position Camera position.
 * @param target Camera look-at target.
 * @param up Camera up axis.
 * @param projection Projection contract.
 */
function createCameraSnapshot(
  controller: EngineCamera3DControllerKind,
  position: EngineVec3,
  target: EngineVec3,
  up: EngineVec3,
  projection: EngineCameraProjection,
): EngineCamera3DSnapshot {
  const viewMatrix = resolveLookAtMatrix(position, target, up)
  const projectionMatrix = resolveProjectionMatrix(projection)
  return {
    controller,
    projection,
    pose: {
      position,
      target,
      up: normalizeVec3(up),
      viewMatrix,
      projectionMatrix,
      viewProjectionMatrix: multiplyMat4(projectionMatrix, viewMatrix),
    },
  }
}

/**
 * Resolves a normalized forward vector from yaw and pitch.
 * @param yawRadians Horizontal yaw angle in radians.
 * @param pitchRadians Vertical pitch angle in radians.
 */
function resolveForwardVector(yawRadians: number, pitchRadians: number): EngineVec3 {
  const clampedPitch = clampPitch(pitchRadians)
  const cosPitch = Math.cos(clampedPitch)
  return normalizeVec3({
    x: Math.sin(yawRadians) * cosPitch,
    y: Math.sin(clampedPitch),
    z: Math.cos(yawRadians) * cosPitch,
  })
}

/**
 * Resolves a row-major look-at matrix.
 * @param position Camera position.
 * @param target Camera look-at target.
 * @param up Camera up axis.
 */
function resolveLookAtMatrix(position: EngineVec3, target: EngineVec3, up: EngineVec3): EngineMat4 {
  const forward = normalizeVec3(subtractVec3(target, position))
  const side = normalizeVec3(crossVec3(forward, up))
  const trueUp = crossVec3(side, forward)

  return [
    side.x, side.y, side.z, -dotVec3(side, position),
    trueUp.x, trueUp.y, trueUp.z, -dotVec3(trueUp, position),
    -forward.x, -forward.y, -forward.z, dotVec3(forward, position),
    0, 0, 0, 1,
  ]
}

/**
 * Resolves a row-major projection matrix for the provided projection contract.
 * @param projection Projection contract.
 */
function resolveProjectionMatrix(projection: EngineCameraProjection): EngineMat4 {
  if (projection.kind === 'perspective') {
    const focalLength = 1 / Math.tan(projection.fovYRadians / 2)
    const depthScale = (projection.far + projection.near) / (projection.near - projection.far)
    const depthOffset = (2 * projection.far * projection.near) / (projection.near - projection.far)
    return [
      focalLength / projection.aspectRatio, 0, 0, 0,
      0, focalLength, 0, 0,
      0, 0, depthScale, depthOffset,
      0, 0, -1, 0,
    ]
  }

  const width = projection.right - projection.left
  const height = projection.top - projection.bottom
  const depth = projection.far - projection.near
  return [
    2 / width, 0, 0, -(projection.right + projection.left) / width,
    0, 2 / height, 0, -(projection.top + projection.bottom) / height,
    0, 0, -2 / depth, -(projection.far + projection.near) / depth,
    0, 0, 0, 1,
  ]
}

/**
 * Multiplies two row-major 4x4 matrices.
 * @param left Left matrix.
 * @param right Right matrix.
 */
function multiplyMat4(left: EngineMat4, right: EngineMat4): EngineMat4 {
  const output = new Array<number>(16).fill(0)
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      output[row * 4 + column] =
        left[row * 4] * right[column]
        + left[row * 4 + 1] * right[4 + column]
        + left[row * 4 + 2] * right[8 + column]
        + left[row * 4 + 3] * right[12 + column]
    }
  }

  return [
    output[0], output[1], output[2], output[3],
    output[4], output[5], output[6], output[7],
    output[8], output[9], output[10], output[11],
    output[12], output[13], output[14], output[15],
  ]
}

/**
 * Adds two vectors component-wise.
 * @param left Left vector.
 * @param right Right vector.
 */
function addVec3(left: EngineVec3, right: EngineVec3): EngineVec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z,
  }
}

/**
 * Subtracts two vectors component-wise.
 * @param left Left vector.
 * @param right Right vector.
 */
function subtractVec3(left: EngineVec3, right: EngineVec3): EngineVec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z,
  }
}

/**
 * Computes a vector dot product.
 * @param left Left vector.
 * @param right Right vector.
 */
function dotVec3(left: EngineVec3, right: EngineVec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z
}

/**
 * Computes a vector cross product.
 * @param left Left vector.
 * @param right Right vector.
 */
function crossVec3(left: EngineVec3, right: EngineVec3): EngineVec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  }
}

/**
 * Normalizes one vector with deterministic zero-vector guard.
 * @param vector Vector to normalize.
 */
function normalizeVec3(vector: EngineVec3): EngineVec3 {
  const length = Math.max(Number.EPSILON, Math.hypot(vector.x, vector.y, vector.z))

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  }
}

/**
 * Clamps pitch away from camera pole singularities.
 * @param value Pitch angle in radians.
 */
function clampPitch(value: number): number {
  return Math.max(-MAX_ABS_PITCH_RADIANS, Math.min(MAX_ABS_PITCH_RADIANS, value))
}

/**
 * Clamps scalar progress into normalized transition range.
 * @param value Candidate progress value.
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}
