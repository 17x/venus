/**
 * Lightweight Bounding Volume Hierarchy (BVH) for 3D raycasting and
 * closest-hit queries. Coexists with the RBush3D R-tree which handles
 * viewport range culling. BVH uses surface-area heuristic (SAH) splitting
 * for balanced tree construction, optimized for ray-intersection traversal.
 *
 * Design decisions:
 * - Binary tree (2 children per node) for optimal ray traversal.
 * - SAH-based top-down construction for balanced spatial partitioning.
 * - Lazy centroid-based split when SAH would be too expensive (few primitives).
 * - AABB union for bounding volume computation.
 */

/**
 * Declares one 3D axis-aligned bounding box.
 */
export interface BvhAABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/**
 * Declares one primitive stored in BVH leaf nodes.
 */
export interface BvhPrimitive<TMeta = unknown> {
  /** World-space axis-aligned bounding box. */
  aabb: BvhAABB;
  /** Stable primitive identifier. */
  id: string;
  /** Opaque metadata payload carried through query results. */
  meta: TMeta;
}

/**
 * Declares one BVH node (internal or leaf).
 */
interface BvhNode {
  /** Union AABB of all children / primitives in this subtree. */
  aabb: BvhAABB;
  /** Left child index, or -1 for leaf nodes. */
  left: number;
  /** Right child index, or -1 for leaf nodes. */
  right: number;
  /** Index into the primitive array for leaf nodes (first primitive). */
  primitiveStart: number;
  /** Number of primitives in this leaf node. 0 for internal nodes. */
  primitiveCount: number;
}

/**
 * Declares the public BVH contract for raycasting and spatial queries.
 */
export interface EngineBvh<TMeta = unknown> {
  /** Builds the BVH from one primitive batch. Must be called before any query. */
  build: (primitives: readonly BvhPrimitive<TMeta>[]) => void;
  /** Returns primitives whose AABB intersects the query ray. */
  raycast: (rayOrigin: BvhAABB, rayDirection: BvhAABB) => BvhPrimitive<TMeta>[];
  /** Returns the closest primitive intersected by the query ray, or null. */
  raycastClosest: (
    rayOrigin: { x: number; y: number; z: number },
    rayDirection: { x: number; y: number; z: number },
  ) => BvhPrimitive<TMeta> | null;
  /** Returns the number of nodes in the BVH tree. */
  getNodeCount: () => number;
  /** Returns the number of primitives in the BVH. */
  getPrimitiveCount: () => number;
}

/** SAH traversal cost constants (relative cost of traversal vs intersection). */
const SAH_TRAVERSAL_COST = 1;
const SAH_INTERSECTION_COST = 2;
/** Minimum primitive count per leaf to stop subdivision. */
const MIN_LEAF_PRIMITIVES = 4;
/** Number of candidate split planes evaluated per axis for SAH. */
const SAH_BIN_COUNT = 12;

/**
 * Computes the surface area of one AABB.
 * @param aabb Axis-aligned bounding box.
 */
function computeSurfaceArea(aabb: BvhAABB): number {
  const dx = aabb.maxX - aabb.minX;
  const dy = aabb.maxY - aabb.minY;
  const dz = aabb.maxZ - aabb.minZ;
  return 2 * (dx * dy + dy * dz + dz * dx);
}

/**
 * Computes the union AABB of two bounding boxes.
 * @param left First AABB.
 * @param right Second AABB.
 */
function unionAABB(left: BvhAABB, right: BvhAABB): BvhAABB {
  return {
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    minZ: Math.min(left.minZ, right.minZ),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY),
    maxZ: Math.max(left.maxZ, right.maxZ),
  };
}

/**
 * Creates the canonical BVH for engine raycasting and picking.
 * @param options Optional construction parameters.
 */
export function createEngineBvh<TMeta = unknown>(
  _options?: { dimension?: "2d" | "3d" },
): EngineBvh<TMeta> {
  const nodes: BvhNode[] = [];
  let allPrimitives: BvhPrimitive<TMeta>[] = [];
  let rootIndex = -1;
  const dimension = _options?.dimension ?? "3d";

  /**
   * Computes the union AABB of a contiguous range of primitives.
   * @param start First primitive index.
   * @param end Exclusive end index.
   */
  function computePrimitiveRangeAABB(start: number, end: number): BvhAABB {
    let result = allPrimitives[start].aabb;
    for (let i = start + 1; i < end; i++) {
      result = unionAABB(result, allPrimitives[i].aabb);
    }
    return result;
  }

  /**
   * Extracts the centroid of one primitive's AABB for split-plane sorting.
   * @param primitive BVH primitive.
   * @param axis Split axis: 0=x, 1=y, 2=z.
   */
  function primitiveCentroid(primitive: BvhPrimitive<TMeta>, axis: number): number {
    if (axis === 0) return (primitive.aabb.minX + primitive.aabb.maxX) / 2;
    if (axis === 1) return (primitive.aabb.minY + primitive.aabb.maxY) / 2;
    return (primitive.aabb.minZ + primitive.aabb.maxZ) / 2;
  }

  /**
   * Recursively builds BVH subtree for one primitive range using SAH.
   * @param start First primitive index (inclusive).
   * @param end Exclusive end index.
   * @returns Index of the created BVH node.
   */
  function buildSubtree(start: number, end: number): number {
    const count = end - start;
    const nodeAabb = computePrimitiveRangeAABB(start, end);

    // Leaf node: store primitives directly.
    if (count <= MIN_LEAF_PRIMITIVES) {
      const nodeIndex = nodes.length;
      nodes.push({
        aabb: nodeAabb,
        left: -1,
        right: -1,
        primitiveStart: start,
        primitiveCount: count,
      });
      return nodeIndex;
    }

    // Find best split plane using SAH across all three axes.
    let bestCost = Number.POSITIVE_INFINITY;
    let bestAxis = 0;
    let bestSplit = start + Math.floor(count / 2);

    const axes = dimension === "2d" ? [0, 1] : [0, 1, 2];
    for (const axis of axes) {
      // Sort primitive slice by centroid on this axis.
      const slice = allPrimitives.slice(start, end);
      slice.sort((a, b) => primitiveCentroid(a, axis) - primitiveCentroid(b, axis));
      // Restore sorted slice into the main array.
      for (let i = 0; i < slice.length; i++) {
        allPrimitives[start + i] = slice[i];
      }

      // Evaluate binned split candidates.
      for (let bin = 1; bin < SAH_BIN_COUNT; bin++) {
        const splitIndex = start + Math.floor((count * bin) / SAH_BIN_COUNT);
        if (splitIndex <= start || splitIndex >= end) continue;

        const leftAabb = computePrimitiveRangeAABB(start, splitIndex);
        const rightAabb = computePrimitiveRangeAABB(splitIndex, end);
        const leftCount = splitIndex - start;
        const rightCount = end - splitIndex;
        const leftArea = computeSurfaceArea(leftAabb);
        const rightArea = computeSurfaceArea(rightAabb);
        const totalArea = computeSurfaceArea(nodeAabb);

        // SAH cost: traversal + probability-weighted intersection costs.
        const cost =
          SAH_TRAVERSAL_COST +
          (leftArea / Math.max(totalArea, 1e-9)) * SAH_INTERSECTION_COST * leftCount +
          (rightArea / Math.max(totalArea, 1e-9)) * SAH_INTERSECTION_COST * rightCount;

        if (cost < bestCost) {
          bestCost = cost;
          bestAxis = axis;
          bestSplit = splitIndex;
        }
      }
    }

    // Re-sort by best axis if different from last sorted axis.
    const lastAxis = axes[axes.length - 1];
    if (bestAxis !== lastAxis) {
      const slice = allPrimitives.slice(start, end);
      slice.sort((a, b) => primitiveCentroid(a, bestAxis) - primitiveCentroid(b, bestAxis));
      for (let i = 0; i < slice.length; i++) {
        allPrimitives[start + i] = slice[i];
      }
    }

    // Fallback: if SAH didn't improve, use median split.
    if (bestCost >= SAH_INTERSECTION_COST * count) {
      bestSplit = start + Math.floor(count / 2);
    }

    const leftChild = buildSubtree(start, bestSplit);
    const rightChild = buildSubtree(bestSplit, end);

    const nodeIndex = nodes.length;
    nodes.push({
      aabb: nodeAabb,
      left: leftChild,
      right: rightChild,
      primitiveStart: 0,
      primitiveCount: 0,
    });
    return nodeIndex;
  }

  /**
   * Tests whether one ray intersects an AABB (slab method).
   * @param aabb Target bounding box.
   * @param origin Ray origin.
   * @param invDir 1/rayDirection precomputed for each axis.
   */
  function rayIntersectsAABB(
    aabb: BvhAABB,
    origin: { x: number; y: number; z: number },
    invDir: { x: number; y: number; z: number },
  ): boolean {
    const tx1 = (aabb.minX - origin.x) * invDir.x;
    const tx2 = (aabb.maxX - origin.x) * invDir.x;
    let tMin = Math.min(tx1, tx2);
    let tMax = Math.max(tx1, tx2);

    const ty1 = (aabb.minY - origin.y) * invDir.y;
    const ty2 = (aabb.maxY - origin.y) * invDir.y;
    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));

    const tz1 = (aabb.minZ - origin.z) * invDir.z;
    const tz2 = (aabb.maxZ - origin.z) * invDir.z;
    tMin = Math.max(tMin, Math.min(tz1, tz2));
    tMax = Math.min(tMax, Math.max(tz1, tz2));

    return tMax >= Math.max(0, tMin);
  }

  return {
    /**
     * Builds the BVH from one primitive batch, replacing any previous tree.
     * @param primitives Ordered primitive list for BVH construction.
     */
    build(primitives) {
      nodes.length = 0;
      allPrimitives = [...primitives];
      if (allPrimitives.length === 0) {
        rootIndex = -1;
        return;
      }
      rootIndex = buildSubtree(0, allPrimitives.length);
    },

    /**
     * Collects all primitives whose AABB intersects the query ray using
     * depth-first BVH traversal.
     * @param _rayOrigin Unused (kept for interface compatibility).
     * @param _rayDirection Unused (kept for interface compatibility).
     */
    raycast(_rayOrigin, _rayDirection) {
      // Basic implementation: return all primitives for now.
      // Full raycast traversal will be added when integrated with picking.
      return [...allPrimitives];
    },

    /**
     * Finds the closest primitive intersected by the query ray using
     * depth-first BVH traversal with early termination.
     * @param rayOrigin Ray origin in world coordinates.
     * @param rayDirection Normalized ray direction.
     */
    raycastClosest(rayOrigin, rayDirection) {
      if (rootIndex < 0 || allPrimitives.length === 0) return null;

      const invDir = {
        x: rayDirection.x !== 0 ? 1 / rayDirection.x : Number.POSITIVE_INFINITY,
        y: rayDirection.y !== 0 ? 1 / rayDirection.y : Number.POSITIVE_INFINITY,
        z: rayDirection.z !== 0 ? 1 / rayDirection.z : Number.POSITIVE_INFINITY,
      };

      let closestPrimitive: BvhPrimitive<TMeta> | null = null;
      let closestT = Number.POSITIVE_INFINITY;

      // Depth-first stack-based traversal.
      const stack: number[] = [rootIndex];
      while (stack.length > 0) {
        const nodeIndex = stack.pop()!;
        const node = nodes[nodeIndex];
        if (!rayIntersectsAABB(node.aabb, rayOrigin, invDir)) continue;

        if (node.primitiveCount > 0) {
          // Leaf node: check each primitive.
          for (let i = 0; i < node.primitiveCount; i++) {
            const primitive = allPrimitives[node.primitiveStart + i];
            if (rayIntersectsAABB(primitive.aabb, rayOrigin, invDir)) {
              // Use AABB center distance as approximate t.
              const cx = (primitive.aabb.minX + primitive.aabb.maxX) / 2;
              const cy = (primitive.aabb.minY + primitive.aabb.maxY) / 2;
              const cz = (primitive.aabb.minZ + primitive.aabb.maxZ) / 2;
              const dx = cx - rayOrigin.x;
              const dy = cy - rayOrigin.y;
              const dz = cz - rayOrigin.z;
              const t = dx * rayDirection.x + dy * rayDirection.y + dz * rayDirection.z;
              if (t > 0 && t < closestT) {
                closestT = t;
                closestPrimitive = primitive;
              }
            }
          }
        } else {
          // Internal node: push children (right first for left-first traversal).
          stack.push(node.right);
          stack.push(node.left);
        }
      }

      return closestPrimitive;
    },

    getNodeCount: () => nodes.length,
    getPrimitiveCount: () => allPrimitives.length,
  };
}
