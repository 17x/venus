import type {DocumentNode, EditorDocument} from '@venus/document-core'
import {
  isPointInsideEngineClipShape,
  isPointInsideEngineShapeHitArea,
} from '@venus/engine'
import {withResolvedPathHints} from '../../../interaction/pathHitTestHints.ts'
import type {WorkerSpatialIndex} from './types.ts'

const LINE_HIT_TOLERANCE = 6
const PATH_HIT_TOLERANCE = 6
const POLYGON_EDGE_HIT_TOLERANCE = 6

export interface WorkerHitTestCandidate {
  index: number
  shapeId: string
  shapeType: DocumentNode['type']
  hitType: 'shape-body'
  score: number
  zOrder: number
  hitPoint: {x: number; y: number}
}

export function hitTestDocument(
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  pointer: {x: number; y: number},
  options?: {
    hitMode?: 'exact' | 'bbox_then_exact' | 'bbox'
    maxExactCandidateCount?: number
    allowFrameSelection?: boolean
    strictStrokeHitTest?: boolean
  },
) {
  const candidates = hitTestDocumentCandidates(document, spatialIndex, pointer, options)
  return candidates[0]?.index ?? -1
}

export function hitTestDocumentCandidates(
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  pointer: {x: number; y: number},
  options?: {
    hitMode?: 'exact' | 'bbox_then_exact' | 'bbox'
    maxExactCandidateCount?: number
    allowFrameSelection?: boolean
    strictStrokeHitTest?: boolean
    preferGroupSelection?: boolean
  },
) {
  const hitMode = options?.hitMode ?? 'exact'
  const maxExactCandidateCount = Math.max(1, options?.maxExactCandidateCount ?? 4)
  const allowFrameSelection = options?.allowFrameSelection ?? true
  const strictStrokeHitTest = options?.strictStrokeHitTest ?? false
  const preferGroupSelection = options?.preferGroupSelection ?? false
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const candidates = spatialIndex.search({
    minX: pointer.x - PATH_HIT_TOLERANCE,
    minY: pointer.y - PATH_HIT_TOLERANCE,
    maxX: pointer.x + PATH_HIT_TOLERANCE,
    maxY: pointer.y + PATH_HIT_TOLERANCE,
  })

  const sortedCandidates = [...candidates].sort((left, right) => right.meta.order - left.meta.order)
  const hits: WorkerHitTestCandidate[] = []
  const emittedShapeIds = new Set<string>()
  let exactCandidateCount = 0

  for (let candidateRank = 0; candidateRank < sortedCandidates.length; candidateRank += 1) {
    const candidate = sortedCandidates[candidateRank]
    const shape = shapeById.get(candidate.meta.shapeId)
    if (!shape) {
      continue
    }
    if (!allowFrameSelection && shape.type === 'frame') {
      continue
    }
    // Masked images should not be directly hit-tested as interactive targets.
    if (shape.type === 'image' && shape.clipPathId) {
      continue
    }

    // Coarse bounds prefilter before exact geometry checks so non-precision
    // interactions can avoid paying exact cost for all spatial candidates.
    if (!isPointInsideShapeBounds(pointer, shape, PATH_HIT_TOLERANCE)) {
      continue
    }

    if (hitMode === 'bbox') {
      appendHitCandidate(hits, emittedShapeIds, document, sortedCandidates.length, candidateRank, candidate.meta.order, pointer, shape, shapeById, preferGroupSelection)
      continue
    }

    if (hitMode === 'bbox_then_exact' && exactCandidateCount >= maxExactCandidateCount) {
      appendHitCandidate(hits, emittedShapeIds, document, sortedCandidates.length, candidateRank, candidate.meta.order, pointer, shape, shapeById, preferGroupSelection)
      continue
    }

    // For clipped elements, gate hit-test by clip source first so we do not
    // accidentally select through the unclipped host bounds.
    if (shape.clipPathId) {
      const clipSource = shapeById.get(shape.clipPathId)
      if (clipSource && !isPointInsideClipSource(pointer, clipSource, shapeById)) {
        continue
      }
    }

    exactCandidateCount += 1

    if (!isPointInsideEngineShapeHitArea(pointer, withResolvedPathHints(shape), {
      allowFrameSelection,
      tolerance: Math.max(LINE_HIT_TOLERANCE, PATH_HIT_TOLERANCE, POLYGON_EDGE_HIT_TOLERANCE),
      strictStrokeHitTest,
      shapeById,
    })) {
      continue
    }

    appendHitCandidate(hits, emittedShapeIds, document, sortedCandidates.length, candidateRank, candidate.meta.order, pointer, shape, shapeById, preferGroupSelection)
  }

  return hits
}

function isPointInsideShapeBounds(
  pointer: {x: number; y: number},
  shape: DocumentNode,
  tolerance: number,
) {
  const minX = Math.min(shape.x, shape.x + shape.width) - tolerance
  const maxX = Math.max(shape.x, shape.x + shape.width) + tolerance
  const minY = Math.min(shape.y, shape.y + shape.height) - tolerance
  const maxY = Math.max(shape.y, shape.y + shape.height) + tolerance
  return (
    pointer.x >= minX &&
    pointer.x <= maxX &&
    pointer.y >= minY &&
    pointer.y <= maxY
  )
}

function appendHitCandidate(
  hits: WorkerHitTestCandidate[],
  emittedShapeIds: Set<string>,
  document: EditorDocument,
  candidateCount: number,
  candidateRank: number,
  zOrder: number,
  pointer: {x: number; y: number},
  shape: DocumentNode,
  shapeById: Map<string, DocumentNode>,
  preferGroupSelection: boolean,
) {
  const resolvedShape = preferGroupSelection
    ? resolveSelectableShape(shape, shapeById)
    : shape
  const shapeIndex = document.shapes.findIndex((item) => item.id === resolvedShape.id)
  if (shapeIndex < 0) {
    return
  }
  if (emittedShapeIds.has(resolvedShape.id)) {
    return
  }
  emittedShapeIds.add(resolvedShape.id)

  hits.push({
    index: shapeIndex,
    shapeId: resolvedShape.id,
    shapeType: resolvedShape.type,
    hitType: 'shape-body',
    score: Math.max(1, candidateCount - candidateRank),
    zOrder,
    hitPoint: pointer,
  })
}

function isPointInsideClipSource(
  pointer: {x: number; y: number},
  clipSource: DocumentNode,
  shapeById: Map<string, DocumentNode>,
) {
  return isPointInsideEngineClipShape(pointer, withResolvedPathHints(clipSource), {
    tolerance: 1.5,
    shapeById,
  })
}


function resolveSelectableShape(shape: DocumentNode, shapeById: Map<string, DocumentNode>) {
  let current: DocumentNode = shape

  while (current.parentId) {
    const parent = shapeById.get(current.parentId)
    if (!parent) {
      break
    }
    if (parent.type === 'group') {
      return parent
    }
    current = parent
  }

  return shape
}
