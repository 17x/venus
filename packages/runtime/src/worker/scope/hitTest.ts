import type {DocumentNode, EditorDocument} from '@venus/document-core'
import {
  isPointInsideEngineClipShape,
  isPointInsideEngineShapeHitArea,
} from '@venus/engine'
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
    allowFrameSelection?: boolean
    strictStrokeHitTest?: boolean
    preferGroupSelection?: boolean
  },
) {
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

  for (const candidate of sortedCandidates) {
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

    // For clipped elements, gate hit-test by clip source first so we do not
    // accidentally select through the unclipped host bounds.
    if (shape.clipPathId) {
      const clipSource = shapeById.get(shape.clipPathId)
      if (clipSource && !isPointInsideClipSource(pointer, clipSource, shapeById)) {
        continue
      }
    }

    if (!isPointInsideEngineShapeHitArea(pointer, shape, {
      allowFrameSelection,
      tolerance: Math.max(LINE_HIT_TOLERANCE, PATH_HIT_TOLERANCE, POLYGON_EDGE_HIT_TOLERANCE),
      strictStrokeHitTest,
      shapeById,
    })) {
      continue
    }

    const resolvedShape = preferGroupSelection
      ? resolveSelectableShape(shape, shapeById)
      : shape
    const shapeIndex = document.shapes.findIndex((item) => item.id === resolvedShape.id)
    if (shapeIndex < 0) {
      continue
    }

    hits.push({
      index: shapeIndex,
      shapeId: resolvedShape.id,
      shapeType: resolvedShape.type,
      hitType: 'shape-body',
      score: sortedCandidates.length - hits.length,
      zOrder: candidate.meta.order,
      hitPoint: pointer,
    })
  }

  return hits
}

function isPointInsideClipSource(
  pointer: {x: number; y: number},
  clipSource: DocumentNode,
  shapeById: Map<string, DocumentNode>,
) {
  return isPointInsideEngineClipShape(pointer, clipSource, {
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
