import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@venus/shared-memory'
import {
  resolveTopHitShapeId,
  type ResolveTopHitShapeIdOptions,
} from '../shapeHitTest.ts'

export interface ResolveHoverShapeOptions extends ResolveTopHitShapeIdOptions {
  includeSelectedShape?: boolean
}

/**
 * Shared hover resolver used by runtime overlays.
 *
 * Hover stays in overlay-local state to avoid high-frequency pointer updates
 * mutating worker scene flags.
 */
export function resolveHoverShape(
  document: EditorDocument,
  snapshots: SceneShapeSnapshot[],
  pointer: {x: number; y: number},
  options?: ResolveHoverShapeOptions,
) {
  const hitShapeId = resolveTopHitShapeId(document, snapshots, pointer, {
    allowFrameSelection: options?.allowFrameSelection ?? false,
    tolerance: options?.tolerance ?? 6,
    strictStrokeHitTest: options?.strictStrokeHitTest,
    excludeClipBoundImage: options?.excludeClipBoundImage ?? true,
    clipTolerance: options?.clipTolerance ?? 1.5,
  })
  if (!hitShapeId) {
    return null
  }

  if (options?.includeSelectedShape) {
    return hitShapeId
  }

  const hitShape = snapshots.find((shape) => shape.id === hitShapeId)
  if (hitShape?.isSelected) {
    return null
  }

  return hitShapeId
}