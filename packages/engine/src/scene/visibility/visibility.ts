import type {
  EngineAabb3,
  EngineFrustum,
  EngineFrustumPlane,
} from '../../math/dimension/types.ts'
import type { EngineNodeId, EngineRenderableNode, EngineSceneSnapshot } from '../types/types.ts'
import { resolveRenderableNodeBounds } from '../geometry/bbox.ts'
import type {
  EngineVisibleSet,
  EngineVisibilityBounds2DResolver,
  EngineVisibilityFrustum3DResolver,
  EngineVisibilityQuery,
  EngineVisibilityViewport2D,
} from './contracts.ts'

const VIEWPORT_PADDING_DOUBLE = 2
const FRUSTUM_PLANE_KEYS = ['left', 'right', 'top', 'bottom', 'near', 'far'] as const

/**
 * Declares configuration used by the visibility resolver subsystem.
 */
export interface CreateEngineVisibilityResolverOptions {
  /** Callback used for coarse 2D world-bounds candidate collection. */
  queryBounds2D: EngineVisibilityBounds2DResolver
  /** Optional callback used by true 3D frustum culling implementations. */
  queryFrustum3D?: EngineVisibilityFrustum3DResolver
}

/**
 * Declares one visibility resolver surface shared by runtime and frame planning.
 */
export interface EngineVisibilityResolver {
  /**
   * Resolves one visible-set snapshot from scene and visibility query payload.
   * @param scene Scene snapshot to evaluate.
   * @param query Visibility query payload.
   */
  resolveVisibleSet(scene: EngineSceneSnapshot, query: EngineVisibilityQuery): EngineVisibleSet
  /**
   * Resolves one visible-set snapshot from a 2D viewport camera payload.
   * @param scene Scene snapshot to evaluate.
   * @param viewport Viewport payload used to derive world bounds.
   * @param padding Optional world-space query padding.
   */
  resolveViewportVisibleSet(
    scene: EngineSceneSnapshot,
    viewport: EngineVisibilityViewport2D,
    padding?: number,
  ): EngineVisibleSet
}

/**
 * Creates one visibility resolver that centralizes coarse visible-set generation.
 * @param options Resolver construction options.
 */
export function createEngineVisibilityResolver(
  options: CreateEngineVisibilityResolverOptions,
): EngineVisibilityResolver {
  /**
   * Resolves one visible-set snapshot from scene and visibility query payload.
   * @param scene Scene snapshot to evaluate.
   * @param query Visibility query payload.
   */
  const resolveVisibleSet = (scene: EngineSceneSnapshot, query: EngineVisibilityQuery): EngineVisibleSet => {
    const sceneNodeCount = countSceneNodes(scene.nodes)
    if (sceneNodeCount === 0) {
      return {
        revision: scene.revision,
        mode: query.mode,
        nodeIds: [],
        visibleCount: 0,
        sceneNodeCount: 0,
        culledCount: 0,
        bounds2D: query.mode === 'bounds-2d'
          ? query.bounds
          : undefined,
      }
    }

    const nodeIds = query.mode === 'bounds-2d'
      ? options.queryBounds2D(query.bounds)
      : resolveFrustumNodeIds(options.queryFrustum3D, scene, query.frustum)
    const visibleCount = nodeIds.length

    return {
      revision: scene.revision,
      mode: query.mode,
      nodeIds,
      visibleCount,
      sceneNodeCount,
      culledCount: Math.max(0, sceneNodeCount - visibleCount),
      bounds2D: query.mode === 'bounds-2d'
        ? query.bounds
        : undefined,
    }
  }

  /**
   * Resolves one visible-set snapshot from a 2D viewport camera payload.
   * @param scene Scene snapshot to evaluate.
   * @param viewport Viewport payload used to derive world bounds.
   * @param padding Optional world-space query padding.
   */
  const resolveViewportVisibleSet = (
    scene: EngineSceneSnapshot,
    viewport: EngineVisibilityViewport2D,
    padding = 0,
  ): EngineVisibleSet => {
    return resolveVisibleSet(scene, resolveEngineBounds2DVisibilityQuery(viewport, padding))
  }

  return {
    resolveVisibleSet,
    resolveViewportVisibleSet,
  }
}

/**
 * Resolves one 2D bounds visibility query from viewport camera state.
 * @param viewport Viewport payload used to derive world bounds.
 * @param padding Optional world-space query padding.
 */
export function resolveEngineBounds2DVisibilityQuery(
  viewport: EngineVisibilityViewport2D,
  padding = 0,
): EngineVisibilityQuery {
  const resolvedPadding = Math.max(0, padding)
  const safeScale = Math.max(Number.EPSILON, Math.abs(viewport.scale))
  return {
    mode: 'bounds-2d',
    bounds: {
      x: -viewport.offsetX / safeScale - resolvedPadding,
      y: -viewport.offsetY / safeScale - resolvedPadding,
      width: viewport.viewportWidth / safeScale + resolvedPadding * VIEWPORT_PADDING_DOUBLE,
      height: viewport.viewportHeight / safeScale + resolvedPadding * VIEWPORT_PADDING_DOUBLE,
    },
  }
}

/**
 * Resolves one frustum visible-id list with conservative fallback behavior.
 * @param resolver Optional true 3D frustum culling callback.
 * @param scene Scene snapshot.
 * @param frustum Query frustum.
 */
function resolveFrustumNodeIds(
  resolver: EngineVisibilityFrustum3DResolver | undefined,
  scene: EngineSceneSnapshot,
  frustum: EngineFrustum,
): EngineNodeId[] {
  if (resolver) {
    return resolver(scene, frustum)
  }

  return resolveFrustumFallbackNodeIds(scene.nodes, frustum)
}

/**
 * Resolves one frustum-candidate id list by evaluating coarse node bounds.
 * @param nodes Scene node list.
 * @param frustum Query frustum.
 */
function resolveFrustumFallbackNodeIds(
  nodes: readonly EngineRenderableNode[],
  frustum: EngineFrustum,
): EngineNodeId[] {
  const ids: EngineNodeId[] = []

  /**
   * Visits one node subtree and appends stable ids only when coarse-frustum visible.
   * @param node Node to visit.
   * @param output Output id list in traversal order.
   */
  const visitNode = (node: EngineRenderableNode, output: EngineNodeId[]): boolean => {
    if (node.type === 'group') {
      const childIds: EngineNodeId[] = []
      node.children.forEach((child) => {
        visitNode(child, childIds)
      })
      if (childIds.length === 0) {
        return false
      }

      output.push(node.id, ...childIds)
      return true
    }

    const nodeBounds = resolveRenderableNodeBounds(node)
    if (!doesFrustumIntersectNodeBounds(nodeBounds, frustum)) {
      return false
    }

    output.push(node.id)
    return true
  }

  nodes.forEach((node) => {
    visitNode(node, ids)
  })
  return ids
}

/**
 * Evaluates whether one node's coarse bounds can intersect the query frustum.
 * @param nodeBounds Coarse node bounds in world XY space.
 * @param frustum Query frustum.
 */
function doesFrustumIntersectNodeBounds(
  nodeBounds: {x: number; y: number; width: number; height: number},
  frustum: EngineFrustum,
): boolean {
  const aabb = resolveNodeAabb3(nodeBounds)
  for (const planeKey of FRUSTUM_PLANE_KEYS) {
    if (!doesAabbPassFrustumPlane(aabb, frustum[planeKey])) {
      return false
    }
  }

  return true
}

/**
 * Resolves one zero-depth 3D AABB used by coarse frustum plane testing.
 * @param bounds Coarse node bounds in world XY space.
 */
function resolveNodeAabb3(bounds: {x: number; y: number; width: number; height: number}): EngineAabb3 {
  const minX = Math.min(bounds.x, bounds.x + bounds.width)
  const minY = Math.min(bounds.y, bounds.y + bounds.height)
  const maxX = Math.max(bounds.x, bounds.x + bounds.width)
  const maxY = Math.max(bounds.y, bounds.y + bounds.height)

  return {
    minX,
    minY,
    minZ: 0,
    maxX,
    maxY,
    maxZ: 0,
  }
}

/**
 * Evaluates one frustum plane against the AABB positive support vertex.
 * @param aabb Axis-aligned bounds in world space.
 * @param plane One frustum clipping plane.
 */
function doesAabbPassFrustumPlane(
  aabb: EngineAabb3,
  plane: EngineFrustumPlane,
): boolean {
  const supportX = plane.x >= 0 ? aabb.maxX : aabb.minX
  const supportY = plane.y >= 0 ? aabb.maxY : aabb.minY
  const supportZ = plane.z >= 0 ? aabb.maxZ : aabb.minZ
  const signedDistance =
    plane.x * supportX +
    plane.y * supportY +
    plane.z * supportZ +
    plane.w

  return signedDistance >= 0
}

/**
 * Counts flattened scene nodes for visibility diagnostics and culling ratios.
 * @param nodes Scene node list.
 */
function countSceneNodes(nodes: readonly EngineRenderableNode[]): number {
  let count = 0
  for (const node of nodes) {
    count += 1
    if (node.type === 'group') {
      count += countSceneNodes(node.children)
    }
  }
  return count
}
