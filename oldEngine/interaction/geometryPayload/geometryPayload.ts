import {createEngineSpatialIndex} from '../../spatial/index.ts'
import type {EngineEditorHitTestNode, EngineEditorPoint} from '../hitTest/hitTest.ts'
import {
  resolveHintsForNode,
} from './geometryPayloadHints.ts'
import {
  resolveMarqueeNodeIds,
  resolvePointHitNodeIds,
} from './geometryPayloadSelection.ts'
import {
  resolveDetailOutlinesForNode,
  resolveNodeBounds,
  resolveOutlineForNode,
  type GeometryMatrix2D,
} from './geometryPayloadTransform.ts'
import type {
  EngineGeometryNodePayload,
  EngineGeometryPayload,
  ResolveEngineGeometryPayloadOptions,
} from './geometryPayloadTypes.ts'

export type {
  EngineGeometryBounds,
  EngineGeometryHint,
  EngineGeometryMarqueeBounds,
  EngineGeometryNodePayload,
  EngineGeometryOutline,
  EngineGeometryPayload,
  ResolveEngineGeometryPayloadOptions,
} from './geometryPayloadTypes.ts'

const MIN_GEOMETRY_TOLERANCE = 0.5
const DEFAULT_GEOMETRY_TOLERANCE = 6
const MIN_CLIP_TOLERANCE = 0.25
const DEFAULT_CLIP_TOLERANCE = 1.5
const MIN_EXACT_CANDIDATE_COUNT = 1
const OUTLINE_LEVEL_HIGH_EXACT_CANDIDATE_COUNT = 24
const OUTLINE_LEVEL_MEDIUM_EXACT_CANDIDATE_COUNT = 12
const OUTLINE_LEVEL_LOW_EXACT_CANDIDATE_COUNT = 8

/**
 * Resolves hover/selection/marquee geometry in one engine-side pass.
 * @param options Unified geometry query options from vector/editor runtime.
 */
export function resolveEngineGeometryPayload(
  options: ResolveEngineGeometryPayloadOptions,
): EngineGeometryPayload {
  const nodeById = new Map(options.nodes.map((node) => [node.id, node]))
  const nodeOrderById = new Map(options.nodes.map((node, index) => [node.id, index]))
  const worldMatrixCache = new Map<string, GeometryMatrix2D>()
  const tolerance = Math.max(MIN_GEOMETRY_TOLERANCE, options.tolerance ?? DEFAULT_GEOMETRY_TOLERANCE)
  const clipTolerance = Math.max(MIN_CLIP_TOLERANCE, options.clipTolerance ?? DEFAULT_CLIP_TOLERANCE)
  const outlineLevel = options.outlineLevel ?? 'medium'
  const maxExactCandidateCount = Math.max(
    MIN_EXACT_CANDIDATE_COUNT,
    options.maxExactCandidateCount
      ?? (outlineLevel === 'high'
        ? OUTLINE_LEVEL_HIGH_EXACT_CANDIDATE_COUNT
        : outlineLevel === 'medium'
          ? OUTLINE_LEVEL_MEDIUM_EXACT_CANDIDATE_COUNT
          : OUTLINE_LEVEL_LOW_EXACT_CANDIDATE_COUNT),
  )

  // Build one coarse spatial index so marquee candidate resolution stays O(log n).
  const spatialIndex = createEngineSpatialIndex<{nodeId: string}>()
  const spatialItems = options.nodes.map((node) => {
    const bounds = resolveNodeBounds(node, nodeById, worldMatrixCache)
    return {
      id: node.id,
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      meta: {nodeId: node.id},
    }
  })
  spatialIndex.load(spatialItems)

  const pointHitNodeIds = resolvePointHitNodeIds({
    nodes: options.nodes,
    nodeById,
    spatialIndex,
    pointer: options.pointer ?? null,
    tolerance,
    clipTolerance,
    allowFrameSelection: options.allowFrameSelection ?? true,
    preferGroupSelection: options.preferGroupSelection ?? false,
    strictStrokeHitTest: options.strictStrokeHitTest ?? false,
    preferBoundsFallback: options.preferPointBoundsFallback ?? false,
    excludeClipBoundImage: options.excludeClipBoundImage ?? true,
    maxExactCandidateCount,
  })

  const resolvedHoveredNodeId = options.hoveredNodeId ?? (
    options.resolveHoveredFromPointer === false
      ? null
      : (pointHitNodeIds[0] ?? null)
  )
  // Hover payload is optional so callers can skip hover rendering with null checks.
  const hoveredNode = resolvedHoveredNodeId ? (nodeById.get(resolvedHoveredNodeId) ?? null) : null
  const hovered = hoveredNode
    ? buildNodeGeometryPayload({
      node: hoveredNode,
      nodeById,
      worldMatrixCache,
      pointer: options.pointer ?? null,
      tolerance,
      outlineLevel,
    })
    : null

  // Preserve selected id order so caller strategy remains deterministic.
  const selected: EngineGeometryNodePayload[] = []
  for (const selectedNodeId of options.selectedNodeIds ?? []) {
    const node = nodeById.get(selectedNodeId)
    if (!node) {
      continue
    }

    selected.push(buildNodeGeometryPayload({
      node,
      nodeById,
      worldMatrixCache,
      pointer: null,
      tolerance,
      outlineLevel,
    }))
  }

  const marqueeSearchResults = options.marqueeBounds
    ? spatialIndex.search(options.marqueeBounds)
    : []
  const marqueeCandidateNodeIds = marqueeSearchResults
    .map((item) => item.id)
    .sort((leftId, rightId) => (nodeOrderById.get(leftId) ?? 0) - (nodeOrderById.get(rightId) ?? 0))
  const marqueeResolvedNodeIds = resolveMarqueeNodeIds({
    candidateNodeIds: marqueeCandidateNodeIds,
    marqueeBounds: options.marqueeBounds ?? null,
    marqueeMode: options.marqueeMode ?? 'intersect',
    nodeById,
  })

  return {
    hovered,
    pointHitNodeIds,
    selected,
    marqueeCandidateNodeIds,
    marqueeResolvedNodeIds,
  }
}

/**
 * Builds one node geometry payload including outline and optional hover hints.
 * @param options Node-scoped geometry payload build context.
 */
function buildNodeGeometryPayload(options: {
  node: EngineEditorHitTestNode
  nodeById: Map<string, EngineEditorHitTestNode>
  worldMatrixCache: Map<string, GeometryMatrix2D>
  pointer: EngineEditorPoint | null
  tolerance: number
  outlineLevel: 'low' | 'medium' | 'high'
}): EngineGeometryNodePayload {
  const bounds = resolveNodeBounds(options.node, options.nodeById, options.worldMatrixCache)
  const outline = resolveOutlineForNode(options.node, bounds, options.outlineLevel, options.nodeById, options.worldMatrixCache)
  const detailOutlines = resolveDetailOutlinesForNode(options.node, options.outlineLevel, options.nodeById, options.worldMatrixCache)

  // Hint generation only runs when pointer exists to avoid unnecessary segment scans.
  const hints = options.pointer
    ? resolveHintsForNode(options.node, options.pointer, options.tolerance)
    : []

  return {
    nodeId: options.node.id,
    nodeType: options.node.type,
    bounds,
    outline,
    detailOutlines,
    hints,
  }
}
