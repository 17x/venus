import type { EngineAABB3D } from "../interaction/camera/cameraFrustum";

const POSITION_DIMENSIONS = 3;
const POSITION_Z_OFFSET = 2;
const DEFAULT_BOUNDS_HALF_EXTENT = 0.5;

/**
 * Derives a 3D axis-aligned bounding box from a flat position array.
 * Falls back to a unit bounding box around origin when input is invalid.
 * @param positions Packed xyz position array [x0,y0,z0, x1,y1,z1, ...].
 * @param padding Optional padding added to each axis extent (default 0).
 */
export function deriveBoundsFromPositions(
  positions: readonly number[],
  padding = 0,
): EngineAABB3D {
  if (!Array.isArray(positions) || positions.length < POSITION_DIMENSIONS) {
    return {
      minX: -DEFAULT_BOUNDS_HALF_EXTENT,
      minY: -DEFAULT_BOUNDS_HALF_EXTENT,
      minZ: -DEFAULT_BOUNDS_HALF_EXTENT,
      maxX: DEFAULT_BOUNDS_HALF_EXTENT,
      maxY: DEFAULT_BOUNDS_HALF_EXTENT,
      maxZ: DEFAULT_BOUNDS_HALF_EXTENT,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let i = 0; i + POSITION_Z_OFFSET < positions.length; i += POSITION_DIMENSIONS) {
    const x = positions[i] ?? 0;
    const y = positions[i + 1] ?? 0;
    const z = positions[i + POSITION_Z_OFFSET] ?? 0;

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      continue;
    }

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  // Fallback when all values were non-finite.
  if (!Number.isFinite(minX)) {
    return {
      minX: -DEFAULT_BOUNDS_HALF_EXTENT,
      minY: -DEFAULT_BOUNDS_HALF_EXTENT,
      minZ: -DEFAULT_BOUNDS_HALF_EXTENT,
      maxX: DEFAULT_BOUNDS_HALF_EXTENT,
      maxY: DEFAULT_BOUNDS_HALF_EXTENT,
      maxZ: DEFAULT_BOUNDS_HALF_EXTENT,
    };
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    minZ: minZ - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    maxZ: maxZ + padding,
  };
}
