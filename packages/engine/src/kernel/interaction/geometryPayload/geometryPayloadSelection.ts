import { createEngineSpatialIndex } from '../../spatial/engineSpatialIndex.ts'
import type { EngineEditorHitTestNode, EngineEditorPoint } from '../hitTest.ts'
import {
  isPointInsideEngineClipShape,
  isPointInsideEngineShapeHitArea,
} from '../hitTest.ts'
import {
  withResolvedPathHints,
} from './geometryPayloadPath.ts'
import {
  resolveNodeBounds,
  type GeometryMatrix2D,
} from './geometryPayloadTransform.ts'
import type {
  EngineGeometryMarqueeBounds,
} from './geometryPayloadTypes.ts'

/**
 * Resolves final marquee node ids from coarse candidates using mode policy.
 * @param options Marquee candidate ids and resolution policy context.
 */
export function resolveMarqueeNodeIds(options: {
  candidateNodeIds: readonly string[]
  marqueeBounds: EngineGeometryMarqueeBounds | null
  marqueeMode: 'contain' | 'intersect'
  nodeById: Map<string, EngineEditorHitTestNode>
}): string[] {
  if (!options.marqueeBounds || options.candidateNodeIds.length === 0) {
    return []
  }

  const resolvedNodeIds: string[] = []
  const worldMatrixCache = new Map<string, GeometryMatrix2D>()

  for (const nodeId of options.candidateNodeIds) {
    const node = options.nodeById.get(nodeId)
    if (!node) {
      continue
    }

    const nodeBounds = resolveNodeBounds(node, options.nodeById, worldMatrixCache)
    // Keep mode semantics owned by engine so vector remains policy-only caller.
    if (options.marqueeMode === 'contain') {
      const isContained = (
        nodeBounds.minX >= options.marqueeBounds.minX &&
        nodeBounds.maxX <= options.marqueeBounds.maxX &&
        nodeBounds.minY >= options.marqueeBounds.minY &&
        nodeBounds.maxY <= options.marqueeBounds.maxY
      )
      if (isContained) {
        resolvedNodeIds.push(nodeId)
      }
      continue
    }

    const isOverlapped = !(
      nodeBounds.maxX < options.marqueeBounds.minX ||
      nodeBounds.minX > options.marqueeBounds.maxX ||
      nodeBounds.maxY < options.marqueeBounds.minY ||
      nodeBounds.minY > options.marqueeBounds.maxY
    )
    if (isOverlapped) {
      resolvedNodeIds.push(nodeId)
    }
  }

  return resolvedNodeIds
}

/**
 * Resolves pointer hit candidates with engine-owned coarse+exact filtering.
 * @param options Point-hit query options including tolerance and policy switches.
 */
export function resolvePointHitNodeIds(options: {
  nodes: readonly EngineEditorHitTestNode[]
  nodeById: Map<string, EngineEditorHitTestNode>
  spatialIndex: ReturnType<typeof createEngineSpatialIndex<{nodeId: string}>>
  pointer: EngineEditorPoint | null
  tolerance: number
  clipTolerance: number
  allowFrameSelection: boolean
  preferGroupSelection: boolean
  strictStrokeHitTest: boolean
  preferBoundsFallback: boolean
  excludeClipBoundImage: boolean
  maxExactCandidateCount: number
}): string[] {
  if (!options.pointer) {
    return []
  }

  const queryRadius = Math.max(0, options.tolerance)
  const rawCandidateIds = options.spatialIndex.search({
    minX: options.pointer.x - queryRadius,
    minY: options.pointer.y - queryRadius,
    maxX: options.pointer.x + queryRadius,
    maxY: options.pointer.y + queryRadius,
  }).map((item) => item.id)

  if (rawCandidateIds.length === 0) {
    return []
  }

  // Sort by source order so the top-most visual candidate is evaluated first.
  const nodeOrderById = new Map(options.nodes.map((node, index) => [node.id, index]))
  const sortedCandidateIds = rawCandidateIds.sort((leftId, rightId) => {
    const leftOrder = nodeOrderById.get(leftId) ?? -1
    const rightOrder = nodeOrderById.get(rightId) ?? -1
    return rightOrder - leftOrder
  })

  const shapeById = options.nodeById
  const hitIds: string[] = []
  const emittedIds = new Set<string>()
  let firstBoundsCandidateId: string | null = null
  let exactCandidateChecks = 0

  for (const candidateId of sortedCandidateIds) {
    const candidate = shapeById.get(candidateId)
    if (!candidate) {
      continue
    }

    // Keep masked image hosts non-interactive when the caller opts out.
    if (options.excludeClipBoundImage && candidate.type === 'image' && candidate.clipPathId) {
      continue
    }

    // Capture first coarse candidate for optional bounds-only fallback behavior.
    if (!firstBoundsCandidateId) {
      firstBoundsCandidateId = candidate.id
    }

    // Keep exact-hit work bounded under dense overlap stacks.
    if (exactCandidateChecks >= options.maxExactCandidateCount) {
      continue
    }
    exactCandidateChecks += 1

    // Always validate clip source before exact target hit checks.
    if (candidate.clipPathId) {
      const clipSource = shapeById.get(candidate.clipPathId)
      if (clipSource && !isPointInsideEngineClipShape(options.pointer, withResolvedPathHints(clipSource), {
        tolerance: options.clipTolerance,
        shapeById,
      })) {
        continue
      }
    }

    if (!isPointInsideEngineShapeHitArea(options.pointer, withResolvedPathHints(candidate), {
      allowFrameSelection: options.allowFrameSelection,
      tolerance: options.tolerance,
      strictStrokeHitTest: options.strictStrokeHitTest,
      shapeById,
    })) {
      continue
    }

    const resolvedHitNodeId = options.preferGroupSelection
      ? resolveTopmostGroupAncestorId(candidate.id, shapeById)
      : candidate.id

    if (emittedIds.has(resolvedHitNodeId)) {
      continue
    }

    emittedIds.add(resolvedHitNodeId)
    hitIds.push(resolvedHitNodeId)
  }

  // Preserve bbox-then-exact behavior when caller opts into click-robust fallback.
  if (hitIds.length === 0 && options.preferBoundsFallback && firstBoundsCandidateId) {
    return [firstBoundsCandidateId]
  }

  return hitIds
}

/**
 * Resolves top-most ancestor group id for point-hit selection policy.
 * @param nodeId Candidate hit node id.
 * @param nodeById Node lookup map for parent-chain traversal.
 */
function resolveTopmostGroupAncestorId(
  nodeId: string,
  nodeById: Map<string, EngineEditorHitTestNode>,
): string {
  let current = nodeById.get(nodeId)
  let resolvedNodeId = nodeId

  while (current?.parentId) {
    const parent = nodeById.get(current.parentId)
    if (!parent) {
      break
    }

    if (parent.type === 'group') {
      resolvedNodeId = parent.id
    }
    current = parent
  }

  return resolvedNodeId
}
