import type { EngineCameraState } from "./cameraCommandProtocol";

/**
 * Declares one frustum plane in Hessian normal form: normal · point + offset = 0.
 * Points where dot(normal, point) + offset > 0 lie inside the frustum half-space.
 */
export type EngineCameraFrustumPlane = {
  /** Unit-length plane normal pointing inward toward frustum interior. */
  normalX: number;
  /** Unit-length plane normal pointing inward toward frustum interior. */
  normalY: number;
  /** Unit-length plane normal pointing inward toward frustum interior. */
  normalZ: number;
  /** Signed plane offset from world origin along normal direction. */
  offset: number;
};

/**
 * Declares one camera frustum as an ordered set of six inward-facing planes.
 * Order: left, right, bottom, top, near, far.
 */
export type EngineCameraFrustum = {
  /** Left clipping plane (inward normal points right). */
  left: EngineCameraFrustumPlane;
  /** Right clipping plane (inward normal points left). */
  right: EngineCameraFrustumPlane;
  /** Bottom clipping plane (inward normal points up). */
  bottom: EngineCameraFrustumPlane;
  /** Top clipping plane (inward normal points down). */
  top: EngineCameraFrustumPlane;
  /** Near clipping plane (inward normal points forward from camera). */
  near: EngineCameraFrustumPlane;
  /** Far clipping plane (inward normal points backward toward camera). */
  far: EngineCameraFrustumPlane;
};

/**
 * Declares an axis-aligned bounding box in 3D world space for frustum intersection testing.
 */
export type EngineAABB3D = {
  /** Minimum x coordinate in world units. */
  minX: number;
  /** Minimum y coordinate in world units. */
  minY: number;
  /** Minimum z coordinate in world units. */
  minZ: number;
  /** Maximum x coordinate in world units. */
  maxX: number;
  /** Maximum y coordinate in world units. */
  maxY: number;
  /** Maximum z coordinate in world units. */
  maxZ: number;
};

/**
 * Derives a camera frustum from engine camera state using standard orbit-camera forward/right/up decomposition.
 * Supports both perspective and orthographic projection modes.
 * @param state Engine camera state carrying yaw, pitch, distance, target, and projection parameters.
 * @param aspect Viewport aspect ratio (width/height).
 * @returns Six-plane frustum with inward-facing normals.
 */
export function deriveCameraFrustum(
  state: EngineCameraState,
  aspect: number,
): EngineCameraFrustum {
  const projectionMode = state.projectionMode ?? "perspective";
  const fovY = state.perspectiveFovY ?? 50;
  const near = state.near ?? 0.1;
  const far = state.far ?? 5000;

  // Compute camera world-space basis vectors from yaw/pitch orbit model.
  const yawRad = (state.yaw * Math.PI) / 180;
  const pitchRad = (state.pitch * Math.PI) / 180;

  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);
  const cosPitch = Math.cos(pitchRad);
  const sinPitch = Math.sin(pitchRad);

  // Forward direction from target to camera (camera looks toward target).
  const forwardX = cosPitch * sinYaw;
  const forwardY = sinPitch;
  const forwardZ = cosPitch * cosYaw;

  // Right direction orthogonal to forward and world-up.
  const rightX = cosYaw;
  const rightY = 0;
  const rightZ = -sinYaw;

  // Up direction orthogonal to forward and right.
  const upX = -sinPitch * sinYaw;
  const upY = cosPitch;
  const upZ = -sinPitch * cosYaw;

  // Camera world-space position.
  const cameraX = state.targetX + forwardX * state.distance;
  const cameraY = state.targetY + forwardY * state.distance;
  const cameraZ = state.targetZ + forwardZ * state.distance;

  // Near and far plane centers along forward direction.
  const nearCenterX = cameraX - forwardX * near;
  const nearCenterY = cameraY - forwardY * near;
  const nearCenterZ = cameraZ - forwardZ * near;

  const farCenterX = cameraX - forwardX * far;
  const farCenterY = cameraY - forwardY * far;
  const farCenterZ = cameraZ - forwardZ * far;

  // Compute half-extents at near plane based on projection mode.
  let nearHalfH: number;
  let nearHalfV: number;

  if (projectionMode === "perspective") {
    const fovYRad = (fovY * Math.PI) / 180;
    nearHalfV = near * Math.tan(fovYRad * 0.5);
    nearHalfH = nearHalfV * aspect;
  } else {
    const halfSize = state.orthographicHalfSize ?? 600;
    nearHalfV = halfSize;
    nearHalfH = halfSize * aspect;
  }

  // Build frustum planes; each plane normal points inward toward frustum interior.
  // Each plane is derived from camera position and two adjacent near-plane corner points.
  const planeTopLeft = [
    nearCenterX - rightX * nearHalfH + upX * nearHalfV,
    nearCenterY - rightY * nearHalfH + upY * nearHalfV,
    nearCenterZ - rightZ * nearHalfH + upZ * nearHalfV,
  ];
  const planeTopRight = [
    nearCenterX + rightX * nearHalfH + upX * nearHalfV,
    nearCenterY + rightY * nearHalfH + upY * nearHalfV,
    nearCenterZ + rightZ * nearHalfH + upZ * nearHalfV,
  ];
  const planeBottomLeft = [
    nearCenterX - rightX * nearHalfH - upX * nearHalfV,
    nearCenterY - rightY * nearHalfH - upY * nearHalfV,
    nearCenterZ - rightZ * nearHalfH - upZ * nearHalfV,
  ];
  const planeBottomRight = [
    nearCenterX + rightX * nearHalfH - upX * nearHalfV,
    nearCenterY + rightY * nearHalfH - upY * nearHalfV,
    nearCenterZ + rightZ * nearHalfH - upZ * nearHalfV,
  ];

  const left = planeFromPoints(
    cameraX, cameraY, cameraZ,
    planeTopLeft[0], planeTopLeft[1], planeTopLeft[2],
    planeBottomLeft[0], planeBottomLeft[1], planeBottomLeft[2],
    rightX, rightY, rightZ,
  );

  const rightPlane = planeFromPoints(
    cameraX, cameraY, cameraZ,
    planeBottomRight[0], planeBottomRight[1], planeBottomRight[2],
    planeTopRight[0], planeTopRight[1], planeTopRight[2],
    -rightX, -rightY, -rightZ,
  );

  const bottom = planeFromPoints(
    cameraX, cameraY, cameraZ,
    planeBottomRight[0], planeBottomRight[1], planeBottomRight[2],
    planeBottomLeft[0], planeBottomLeft[1], planeBottomLeft[2],
    upX, upY, upZ,
  );

  const top = planeFromPoints(
    cameraX, cameraY, cameraZ,
    planeTopLeft[0], planeTopLeft[1], planeTopLeft[2],
    planeTopRight[0], planeTopRight[1], planeTopRight[2],
    -upX, -upY, -upZ,
  );

  // Near plane: interior is away from camera toward target; normal points in -forward direction.
  // offset = -(normal · nearCenter) = -((-forward) · nearCenter) = +forward · nearCenter
  const nearPlane: EngineCameraFrustumPlane = {
    normalX: -forwardX,
    normalY: -forwardY,
    normalZ: -forwardZ,
    offset: forwardX * nearCenterX + forwardY * nearCenterY + forwardZ * nearCenterZ,
  };

  // Far plane: interior is toward camera from far distance; normal points in +forward direction.
  // offset = -(normal · farCenter) = -(forward · farCenter)
  const farPlane: EngineCameraFrustumPlane = {
    normalX: forwardX,
    normalY: forwardY,
    normalZ: forwardZ,
    offset: -(forwardX * farCenterX + forwardY * farCenterY + forwardZ * farCenterZ),
  };

  return {
    left,
    right: rightPlane,
    bottom,
    top,
    near: nearPlane,
    far: farPlane,
  };
}

/**
 * Derives a frustum plane from three points (camera position + two near-plane corners).
 * The plane normal is oriented toward the frustum interior using the inwardGuide direction.
 * @param p0x Camera position x.
 * @param p0y Camera position y.
 * @param p0z Camera position z.
 * @param p1x First near-plane corner x.
 * @param p1y First near-plane corner y.
 * @param p1z First near-plane corner z.
 * @param p2x Second near-plane corner x.
 * @param p2y Second near-plane corner y.
 * @param p2z Second near-plane corner z.
 * @param guideX X component of desired inward direction.
 * @param guideY Y component of desired inward direction.
 * @param guideZ Z component of desired inward direction.
 */
function planeFromPoints(
  p0x: number, p0y: number, p0z: number,
  p1x: number, p1y: number, p1z: number,
  p2x: number, p2y: number, p2z: number,
  guideX: number, guideY: number, guideZ: number,
): EngineCameraFrustumPlane {
  // Edge vectors from camera position to near-plane corners.
  const e1x = p1x - p0x;
  const e1y = p1y - p0y;
  const e1z = p1z - p0z;
  const e2x = p2x - p0x;
  const e2y = p2y - p0y;
  const e2z = p2z - p0z;

  // Cross product of the two edges gives plane normal.
  const cx = e1y * e2z - e1z * e2y;
  const cy = e1z * e2x - e1x * e2z;
  const cz = e1x * e2y - e1y * e2x;
  const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
  if (len < 1e-12) {
    return { normalX: 0, normalY: 0, normalZ: 1, offset: 0 };
  }
  // Flip cross-product result if it points opposite to the desired inward direction.
  const dot = cx * guideX + cy * guideY + cz * guideZ;
  const sign = dot < 0 ? -1 : 1;
  const nx = (cx / len) * sign;
  const ny = (cy / len) * sign;
  const nz = (cz / len) * sign;
  // Use camera position as the point on the plane for offset computation.
  const offset = -(nx * p0x + ny * p0y + nz * p0z);
  return { normalX: nx, normalY: ny, normalZ: nz, offset };
}

/**
 * Tests whether a 3D axis-aligned bounding box intersects or lies inside a camera frustum.
 * Uses plane-AABB intersection test: an AABB is outside the frustum iff all 8 corners lie
 * on the outside half-space of any single frustum plane.
 * @param frustum Six-plane camera frustum with inward-facing normals.
 * @param aabb Axis-aligned bounding box in world space.
 * @returns True when the AABB is at least partially inside the frustum.
 */
export function frustumIntersectsAABB(
  frustum: EngineCameraFrustum,
  aabb: EngineAABB3D,
): boolean {
  const planes: readonly EngineCameraFrustumPlane[] = [
    frustum.left,
    frustum.right,
    frustum.bottom,
    frustum.top,
    frustum.near,
    frustum.far,
  ];

  for (const plane of planes) {
    // Determine the AABB corner farthest along the plane normal direction (positive vertex).
    const pvx = plane.normalX > 0 ? aabb.maxX : aabb.minX;
    const pvy = plane.normalY > 0 ? aabb.maxY : aabb.minY;
    const pvz = plane.normalZ > 0 ? aabb.maxZ : aabb.minZ;

    // If the positive vertex lies outside the plane, the entire AABB is outside the frustum.
    const dist = plane.normalX * pvx + plane.normalY * pvy + plane.normalZ * pvz + plane.offset;
    if (dist < 0) {
      return false;
    }
  }

  return true;
}
