import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@venus/runtime/shared-memory'
import {isPointInsideEngineClipShape, isPointInsideEngineShapeHitArea} from '@venus/engine'

export interface ResolveTopHitShapeIdOptions {
  allowFrameSelection?: boolean
  tolerance?: number
  strictStrokeHitTest?: boolean
  excludeClipBoundImage?: boolean
  clipTolerance?: number
}

export function resolveTopHitShapeId(
  document: EditorDocument,
  snapshots: SceneShapeSnapshot[],
  pointer: {x: number; y: number},
  options?: ResolveTopHitShapeIdOptions,
) {
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const allowFrameSelection = options?.allowFrameSelection ?? true
  const tolerance = options?.tolerance ?? 6
  const clipTolerance = options?.clipTolerance ?? 1.5
  const excludeClipBoundImage = options?.excludeClipBoundImage ?? true

  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const snapshot = snapshots[index]
    const source = shapeById.get(snapshot?.id ?? '')
    if (!snapshot || !source) {
      continue
    }

    if (excludeClipBoundImage && source.type === 'image' && source.clipPathId) {
      continue
    }

    if (source.clipPathId) {
      const clipSource = shapeById.get(source.clipPathId)
      if (clipSource && !isPointInsideEngineClipShape(pointer, clipSource, {
        tolerance: clipTolerance,
        shapeById,
      })) {
        continue
      }
    }

    if (isPointInsideEngineShapeHitArea(pointer, source, {
      allowFrameSelection,
      tolerance,
      strictStrokeHitTest: options?.strictStrokeHitTest,
      shapeById,
    })) {
      return source.id
    }
  }

  return null
}
