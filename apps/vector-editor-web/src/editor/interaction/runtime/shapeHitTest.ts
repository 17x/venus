import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@vector/runtime/shared-memory'
import {isPointInsideEngineClipShape, isPointInsideEngineShapeHitArea} from '@vector/runtime/engine'
import {withResolvedPathHints} from '../pathHitTestHints.ts'

export interface ResolveTopHitShapeIdOptions {
  hitMode?: 'exact' | 'bbox_then_exact' | 'bbox'
  maxExactCandidateCount?: number
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
  const hitMode = options?.hitMode ?? 'exact'
  const maxExactCandidateCount = Math.max(1, options?.maxExactCandidateCount ?? 4)
  const allowFrameSelection = options?.allowFrameSelection ?? true
  const tolerance = options?.tolerance ?? 6
  const clipTolerance = options?.clipTolerance ?? 1.5
  const excludeClipBoundImage = options?.excludeClipBoundImage ?? true
  const preferGroupSelection = options?.preferGroupSelection ?? false
  let firstBoundsHitShapeId: string | null = null
  let exactCandidateCount = 0

  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const snapshot = snapshots[index]
    const source = shapeById.get(snapshot?.id ?? '')
    if (!snapshot || !source) {
      continue
    }

    if (excludeClipBoundImage && source.type === 'image' && source.clipPathId) {
      continue
    }

    // Coarse first-pass bounds filter keeps high-frequency hover hit-testing
    // from running full geometry checks for obviously unrelated shapes.
    if (!isPointInsideSourceBounds(pointer, source, tolerance)) {
      continue
    }

    const resolvedHitShapeId = preferGroupSelection
      ? resolveTopmostGroupAncestorId(source.id, shapeById)
      : source.id
    if (!firstBoundsHitShapeId) {
      firstBoundsHitShapeId = resolvedHitShapeId
    }
    if (hitMode === 'bbox') {
      return resolvedHitShapeId
    }

    if (hitMode === 'bbox_then_exact' && exactCandidateCount >= maxExactCandidateCount) {
      continue
    }

    if (source.clipPathId) {
      const clipSource = shapeById.get(source.clipPathId)
      if (clipSource && !isPointInsideEngineClipShape(pointer, withResolvedPathHints(clipSource), {
        tolerance: clipTolerance,
        shapeById,
      })) {
        continue
      }
    }

    exactCandidateCount += 1

    if (isPointInsideEngineShapeHitArea(pointer, withResolvedPathHints(source), {
      allowFrameSelection,
      tolerance,
      strictStrokeHitTest: options?.strictStrokeHitTest,
      shapeById,
    })) {
      return resolvedHitShapeId
    }
  }

  // If no exact match was found under the capped refinement budget, keep a
  // stable top-most bounds candidate for non-precision interactions.
  if (hitMode === 'bbox_then_exact') {
    return firstBoundsHitShapeId
  }

  return null
}

function isPointInsideSourceBounds(
  pointer: {x: number; y: number},
  source: EditorDocument['shapes'][number],
  tolerance: number,
) {
  const minX = Math.min(source.x, source.x + source.width) - tolerance
  const maxX = Math.max(source.x, source.x + source.width) + tolerance
  const minY = Math.min(source.y, source.y + source.height) - tolerance
  const maxY = Math.max(source.y, source.y + source.height) + tolerance
  return (
    pointer.x >= minX &&
    pointer.x <= maxX &&
    pointer.y >= minY &&
    pointer.y <= maxY
  )
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
