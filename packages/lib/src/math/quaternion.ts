/**
 * Represents a quaternion as [x, y, z, w] for 3D rotation.
 */
export type Quat = readonly [number, number, number, number];

/**
 * Creates an identity quaternion (no rotation).
 */
export function createIdentityQuat(): Quat {
  return [0, 0, 0, 1];
}

/**
 * Creates a quaternion from Euler angles (XYZ order) in radians.
 * @param rx Rotation around x-axis in radians.
 * @param ry Rotation around y-axis in radians.
 * @param rz Rotation around z-axis in radians.
 */
export function quatFromEuler(rx: number, ry: number, rz: number): Quat {
  const cx = Math.cos(rx * 0.5);
  const sx = Math.sin(rx * 0.5);
  const cy = Math.cos(ry * 0.5);
  const sy = Math.sin(ry * 0.5);
  const cz = Math.cos(rz * 0.5);
  const sz = Math.sin(rz * 0.5);

  return [
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz,
  ];
}

/**
 * Multiplies two quaternions: q1 * q2 (applies q2 then q1).
 * @param q1 First quaternion.
 * @param q2 Second quaternion.
 */
export function multiplyQuats(q1: Quat, q2: Quat): Quat {
  const [x1, y1, z1, w1] = q1;
  const [x2, y2, z2, w2] = q2;
  return [
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
  ];
}

/**
 * Spherical linear interpolation between two quaternions.
 * @param q1 Start quaternion.
 * @param q2 End quaternion.
 * @param t Interpolation factor (0–1).
 */
export function slerpQuats(q1: Quat, q2: Quat, t: number): Quat {
  const [x1, y1, z1, w1] = q1;
  let [x2, y2, z2, w2] = q2;

  let dot = x1 * x2 + y1 * y2 + z1 * z2 + w1 * w2;

  // Take the shortest path.
  if (dot < 0) {
    dot = -dot;
    x2 = -x2;
    y2 = -y2;
    z2 = -z2;
    w2 = -w2;
  }

  const DOT_THRESHOLD = 0.9995;
  if (dot > DOT_THRESHOLD) {
    // Linear interpolation for near-parallel quaternions.
    const result: Quat = [
      x1 + t * (x2 - x1),
      y1 + t * (y2 - y1),
      z1 + t * (z2 - z1),
      w1 + t * (w2 - w1),
    ];
    // Normalize.
    return normalizeQuat(result);
  }

  const theta0 = Math.acos(dot);
  const sinTheta0 = Math.sin(theta0);
  const a = Math.sin((1 - t) * theta0) / sinTheta0;
  const b = Math.sin(t * theta0) / sinTheta0;

  return [
    a * x1 + b * x2,
    a * y1 + b * y2,
    a * z1 + b * z2,
    a * w1 + b * w2,
  ];
}

/**
 * Normalizes a quaternion to unit length.
 * @param q Quaternion to normalize.
 */
export function normalizeQuat(q: Quat): Quat {
  const [x, y, z, w] = q;
  const len = Math.sqrt(x * x + y * y + z * z + w * w);
  if (len < 1e-12) {
    return createIdentityQuat();
  }
  return [x / len, y / len, z / len, w / len];
}
