import type { EngineAABB3D } from "../interaction/camera/cameraFrustum";

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
  if (!Array.isArray(positions) || positions.length < 3) {
    return { minX: -0.5, minY: -0.5, minZ: -0.5, maxX: 0.5, maxY: 0.5, maxZ: 0.5 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let i = 0; i + 2 < positions.length; i += 3) {
    const x = positions[i] ?? 0;
    const y = positions[i + 1] ?? 0;
    const z = positions[i + 2] ?? 0;

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
    return { minX: -0.5, minY: -0.5, minZ: -0.5, maxX: 0.5, maxY: 0.5, maxZ: 0.5 };
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
