import type {DocumentNode, EditorDocument} from '../model/index.ts'
import {
  createTransformPreviewShape,
  createTransformSessionShape,
  type TransformHandleKind,
  type TransformPreview,
  type TransformPreviewShape,
  type TransformSessionShape,
} from './transformSessionManager.ts'
import {resolveMoveSnapPreview, type SnapGuide} from './snapping.ts'
import type {SelectionDragSession} from './selectionDragController.ts'

export interface DragStartTransformPayload {
  shapeIds: string[]
  sessionShapes: TransformSessionShape[]
  previewShapes: TransformPreviewShape[]
  pointer: SelectionDragSession['start']
  startBounds: SelectionDragSession['bounds']
}

export function resolveDragStartTransformPayload(
  session: SelectionDragSession,
  shapeById: Map<string, DocumentNode>,
): DragStartTransformPayload | null {
  const dragShapes = session.shapes
    .map((shape) => shapeById.get(shape.shapeId))
    .filter((shape): shape is DocumentNode => Boolean(shape))

  if (dragShapes.length === 0) {
    return null
  }

  return {
    shapeIds: dragShapes.map((shape) => shape.id),
    sessionShapes: dragShapes.map((shape) => createTransformSessionShape(shape)),
    previewShapes: dragShapes.map((shape) => createTransformPreviewShape(shape)),
    pointer: session.start,
    startBounds: session.bounds,
  }
}

/**
 * Resolves one transform preview with optional move-snap policy applied.
 * @param preview Current transform preview payload.
 * @param options Handle/snapping/document context including optional tolerance override.
 */
export function resolveSnappedTransformPreview(
  preview: TransformPreview,
  options: {
    handle: TransformHandleKind | null | undefined
    snappingEnabled: boolean
    previewDocument: EditorDocument
    snapToleranceWorld?: number
  },
): {preview: TransformPreview; guides: SnapGuide[]} {
  if (options.handle === 'move' && options.snappingEnabled) {
    return resolveMoveSnapPreview(preview, options.previewDocument, {
      tolerance: options.snapToleranceWorld,
    })
  }

  return {preview, guides: [] as SnapGuide[]}
}
