import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@vector/runtime/shared-memory'
import {isPointInsideEngineClipShape, isPointInsideEngineShapeHitArea} from '@venus/engine'

export interface ResolveTopHitShapeIdOptions {
  allowFrameSelection?: boolean
  tolerance?: number
  strictStrokeHitTest?: boolean
  excludeClipBoundImage?: boolean
  clipTolerance?: number
  preferGroupSelection?: boolean
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
  const preferGroupSelection = options?.preferGroupSelection ?? false

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
      return preferGroupSelection
        ? resolveTopmostGroupAncestorId(source.id, shapeById)
        : source.id
    }
  }

  return null
}

function resolveTopmostGroupAncestorId(
  shapeId: string,
  shapeById: Map<string, EditorDocument['shapes'][number]>,
) {
  let current = shapeById.get(shapeId)
  let resolvedId = shapeId

  while (current?.parentId) {
    const parent = shapeById.get(current.parentId)
    if (!parent) {
      break
    }

    if (parent.type === 'group') {
      resolvedId = parent.id
    }
    current = parent
  }

  return resolvedId
}
