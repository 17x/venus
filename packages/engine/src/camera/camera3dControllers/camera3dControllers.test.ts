import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createOrthographicCameraProjection,
  createPerspectiveCameraProjection,
  resolveCameraProjectionTransition,
  resolveCameraReplaySnapshot,
  resolveFlyCameraSnapshot,
  resolveFpsCameraSnapshot,
  resolveOrbitCameraSnapshot,
  type EngineCameraReplayKeyframe,
} from './camera3dControllers.ts'

const EPSILON = 1e-8

/**
 * Verifies orbit camera resolves a stable look-at pose and row-major view matrix.
 */
test('resolveOrbitCameraSnapshot creates orbit pose around target', () => {
  const projection = createPerspectiveCameraProjection({
    fovYRadians: Math.PI / 3,
    aspectRatio: 1,
    near: 0.1,
    far: 100,
  })

  const snapshot = resolveOrbitCameraSnapshot({
    target: {x: 0, y: 0, z: 0},
    distance: 10,
    yawRadians: 0,
    pitchRadians: 0,
    projection,
  })

  assert.equal(snapshot.controller, 'orbit')
  assert.equal(snapshot.pose.position.x, 0)
  assert.equal(snapshot.pose.position.y, 0)
  assert.equal(snapshot.pose.position.z, 10)
  assert.equal(snapshot.pose.viewMatrix[0], 1)
  assert.equal(snapshot.pose.viewMatrix[5], 1)
  assert.equal(snapshot.pose.viewMatrix[10], 1)
  assert.equal(snapshot.pose.viewMatrix[11], -10)
})

/**
 * Verifies fly camera resolves forward target from yaw/pitch.
 */
test('resolveFlyCameraSnapshot creates free-look target from yaw and pitch', () => {
  const projection = createPerspectiveCameraProjection({
    fovYRadians: Math.PI / 3,
    aspectRatio: 1,
    near: 0.1,
    far: 100,
  })

  const snapshot = resolveFlyCameraSnapshot({
    position: {x: 3, y: 4, z: 5},
    yawRadians: Math.PI / 2,
    pitchRadians: 0,
    projection,
  })

  assert.equal(snapshot.controller, 'fly')
  assert.ok(Math.abs(snapshot.pose.target.x - 4) < EPSILON)
  assert.ok(Math.abs(snapshot.pose.target.y - 4) < EPSILON)
  assert.ok(Math.abs(snapshot.pose.target.z - 5) < EPSILON)
})

/**
 * Verifies FPS camera clamps pitch to avoid horizon flips.
 */
test('resolveFpsCameraSnapshot clamps pitch near vertical poles', () => {
  const projection = createPerspectiveCameraProjection({
    fovYRadians: Math.PI / 3,
    aspectRatio: 1,
    near: 0.1,
    far: 100,
  })

  const snapshot = resolveFpsCameraSnapshot({
    position: {x: 0, y: 0, z: 0},
    yawRadians: 0,
    pitchRadians: Math.PI,
    projection,
  })

  assert.equal(snapshot.controller, 'fps')
  assert.ok(snapshot.pose.target.y < 1)
  assert.ok(snapshot.pose.target.y > 0.999)
  assert.equal(snapshot.pose.up.x, 0)
  assert.equal(snapshot.pose.up.y, 1)
  assert.equal(snapshot.pose.up.z, 0)
})

/**
 * Verifies projection transition keeps discrete renderer-safe projection kinds.
 */
test('resolveCameraProjectionTransition switches active projection at halfway point', () => {
  const perspective = createPerspectiveCameraProjection({
    fovYRadians: Math.PI / 3,
    aspectRatio: 1,
    near: 0.1,
    far: 100,
  })
  const orthographic = createOrthographicCameraProjection({
    left: -10,
    right: 10,
    top: 5,
    bottom: -5,
    near: 0.1,
    far: 100,
  })

  const early = resolveCameraProjectionTransition({
    from: perspective,
    to: orthographic,
    progress: 0.25,
  })
  const late = resolveCameraProjectionTransition({
    from: perspective,
    to: orthographic,
    progress: 0.75,
  })

  assert.equal(early.blendRatio, 0.25)
  assert.equal(early.activeProjection.kind, 'perspective')
  assert.equal(late.blendRatio, 0.75)
  assert.equal(late.activeProjection.kind, 'orthographic')
})

/**
 * Verifies replay lookup is deterministic for unsorted camera keyframes.
 */
test('resolveCameraReplaySnapshot selects latest snapshot at or before timestamp', () => {
  const projection = createPerspectiveCameraProjection({
    fovYRadians: Math.PI / 3,
    aspectRatio: 1,
    near: 0.1,
    far: 100,
  })
  const firstSnapshot = resolveOrbitCameraSnapshot({
    target: {x: 0, y: 0, z: 0},
    distance: 5,
    yawRadians: 0,
    pitchRadians: 0,
    projection,
  })
  const secondSnapshot = resolveOrbitCameraSnapshot({
    target: {x: 0, y: 0, z: 0},
    distance: 9,
    yawRadians: 0,
    pitchRadians: 0,
    projection,
  })
  const keyframes: EngineCameraReplayKeyframe[] = [
    {atMs: 100, snapshot: secondSnapshot},
    {atMs: 0, snapshot: firstSnapshot},
  ]

  const selected = resolveCameraReplaySnapshot(keyframes, 50)

  assert.equal(selected, firstSnapshot)
})
