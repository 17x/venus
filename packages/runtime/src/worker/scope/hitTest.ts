import type {DocumentNode, EditorDocument} from '@venus/document-core'
import {
  isPointInsideEngineClipShape,
  isPointInsideEngineShapeHitArea,
} from '@venus/engine'
import type {WorkerSpatialIndex} from './types.ts'

const LINE_HIT_TOLERANCE = 6
const PATH_HIT_TOLERANCE = 6
const POLYGON_EDGE_HIT_TOLERANCE = 6

export function hitTestDocument(
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  pointer: {x: number; y: number},
  options?: {
    allowFrameSelection?: boolean
    strictStrokeHitTest?: boolean
  },
) {
  const allowFrameSelection = options?.allowFrameSelection ?? true
  const strictStrokeHitTest = options?.strictStrokeHitTest ?? false
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const candidates = spatialIndex.search({
    minX: pointer.x - PATH_HIT_TOLERANCE,
    minY: pointer.y - PATH_HIT_TOLERANCE,
    maxX: pointer.x + PATH_HIT_TOLERANCE,
    maxY: pointer.y + PATH_HIT_TOLERANCE,
  })

  const sortedCandidates = [...candidates].sort((left, right) => right.meta.order - left.meta.order)

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

    return document.shapes.findIndex((item) => item.id === shape.id)
  }

  return -1
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
