import { createEngineSpatialIndex } from "../engineSpatialIndex";
import { frustumIntersectsAABB } from "../../interaction/camera/cameraFrustum";
import type { EngineAABB3D } from "../../interaction/camera/cameraFrustum";
import type {
  EngineSpatialQueryBounds,
  EngineSpatialQueryModule,
  EngineSpatialQueryNode,
  EngineSpatialQueryPoint,
  EngineSpatialQueryResult,
} from "./spatialQuery.contract";

const SPATIAL_MARGIN_MULTIPLIER = 2;
const CENTER_HALF_DIVISOR = 2;

/**
 * Creates spatial-query module backed by canonical spatial index adapter.
 */
export function createEngineSpatialQueryModule(): EngineSpatialQueryModule {
  return {
    queryViewportCandidates: (nodes, bounds) => resolveQueryNodeIds(nodes, bounds),
    queryFrustumVisibleSet: (nodes, bounds, frustum) => {
      const candidateIds = resolveQueryNodeIds(nodes, bounds);
      // When frustum is provided and nodes carry z/depth bounds, apply true 3D frustum culling.
      if (frustum) {
        const nodesWithDepth = nodes.filter(
          (node) => typeof node.z === "number" && typeof node.depth === "number",
        );
        if (nodesWithDepth.length > 0) {
          const idSet = new Set(candidateIds);
          const frustumFilteredIds = candidateIds.filter((id) => {
            if (!idSet.has(id)) {
              return false;
            }
            const node = nodesWithDepth.find((entry) => entry.id === id);
            if (!node || typeof node.z !== "number" || typeof node.depth !== "number") {
              // Nodes without 3D bounds pass through when not all nodes have depth data.
              return true;
            }
            const aabb: EngineAABB3D = {
              minX: node.x,
              minY: node.y,
              minZ: node.z,
              maxX: node.x + node.width,
              maxY: node.y + node.height,
              maxZ: node.z + node.depth,
            };
            return frustumIntersectsAABB(frustum, aabb);
          });
          return { nodeIds: frustumFilteredIds };
        }
      }
      return { nodeIds: candidateIds };
    },
    queryPointCandidates: (nodes, point, tolerance) =>
      resolvePointCandidateIds(nodes, point, tolerance),
  };
}

/**
 * Resolves deterministic query node ids for one axis-aligned bounds payload.
 * @param nodes Spatial query nodes with coarse 2D bounds.
 * @param bounds Axis-aligned query bounds in world space.
 */
function resolveQueryNodeIds(
  nodes: readonly EngineSpatialQueryNode[],
  bounds: EngineSpatialQueryBounds,
): readonly string[] {
  const index = createEngineSpatialIndex<{ id: string }>({
    dimension: "2d",
  });

  index.load(
    nodes.map((node) => ({
      id: node.id,
      minX: node.x,
      minY: node.y,
      maxX: node.x + node.width,
      maxY: node.y + node.height,
      meta: {
        id: node.id,
      },
    })),
  );

  const results = index.search({
    minX: bounds.x,
    minY: bounds.y,
    maxX: bounds.x + bounds.width,
    maxY: bounds.y + bounds.height,
  });

  return results
    .map((item) => item.id)
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Resolves deterministic point-candidate ids by tolerance-expanded point bounds.
 * @param nodes Spatial query nodes with coarse 2D bounds.
 * @param point Query point in world space.
 * @param tolerance Point-query tolerance in world units.
 */
function resolvePointCandidateIds(
  nodes: readonly EngineSpatialQueryNode[],
  point: EngineSpatialQueryPoint,
  tolerance: number,
): readonly string[] {
  const clampedTolerance = Math.max(0, tolerance);
  const bounds: EngineSpatialQueryBounds = {
    x: point.x - clampedTolerance,
    y: point.y - clampedTolerance,
    width: clampedTolerance * SPATIAL_MARGIN_MULTIPLIER,
    height: clampedTolerance * SPATIAL_MARGIN_MULTIPLIER,
  };
  const candidateIds = resolveQueryNodeIds(nodes, bounds);
  return candidateIds
    .map((id) => {
      const node = nodes.find((entry) => entry.id === id);
      if (!node) {
        return null;
      }
        const centerX = node.x + node.width / CENTER_HALF_DIVISOR;
        const centerY = node.y + node.height / CENTER_HALF_DIVISOR;
      const dx = centerX - point.x;
      const dy = centerY - point.y;
      return {
        id,
        distanceSquared: dx * dx + dy * dy,
      };
    })
    .filter((candidate): candidate is { id: string; distanceSquared: number } => Boolean(candidate))
    .sort((left, right) => {
      if (left.distanceSquared === right.distanceSquared) {
        return left.id.localeCompare(right.id);
      }
      return left.distanceSquared - right.distanceSquared;
    })
    .map((candidate) => candidate.id);
}

/**
 * Resolves one strict EngineSpatialQueryResult from staged input.
 * @param nodes Spatial query nodes.
 * @param bounds Axis-aligned query bounds.
 */
export function resolveSpatialQueryResult(
  nodes: readonly EngineSpatialQueryNode[],
  bounds: EngineSpatialQueryBounds,
): EngineSpatialQueryResult {
  return {
    nodeIds: resolveQueryNodeIds(nodes, bounds),
  };
}
