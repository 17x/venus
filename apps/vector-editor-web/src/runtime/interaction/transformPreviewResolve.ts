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
import {collectTransformLeafTargets} from './transformTargets.ts'

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
  document?: EditorDocument,
): DragStartTransformPayload | null {
  const dragShapes = session.shapes
    .map((shape) => shapeById.get(shape.shapeId))
    .filter((shape): shape is DocumentNode => Boolean(shape))

  if (dragShapes.length === 0) {
    return null
  }

  const transformTargets = document
    ? collectTransformLeafTargets(dragShapes, document)
    : dragShapes
  if (transformTargets.length === 0) {
    return null
  }

  return {
    shapeIds: session.selectionShapeIds.length > 0
      ? session.selectionShapeIds
      : dragShapes.map((shape) => shape.id),
    sessionShapes: transformTargets.map((shape) => createTransformSessionShape(shape)),
    previewShapes: transformTargets.map((shape) => createTransformPreviewShape(shape)),
    pointer: session.start,
    startBounds: resolveAggregateBounds(transformTargets),
  }
}

function resolveAggregateBounds(shapes: DocumentNode[]): SelectionDragSession['bounds'] {
  const first = shapes[0]
  if (!first) {
    return {minX: 0, minY: 0, maxX: 0, maxY: 0}
  }

  return shapes.reduce<SelectionDragSession['bounds']>(
    (acc, shape) => ({
      minX: Math.min(acc.minX, Math.min(shape.x, shape.x + shape.width)),
      minY: Math.min(acc.minY, Math.min(shape.y, shape.y + shape.height)),
      maxX: Math.max(acc.maxX, Math.max(shape.x, shape.x + shape.width)),
      maxY: Math.max(acc.maxY, Math.max(shape.y, shape.y + shape.height)),
    }),
    {
      minX: Math.min(first.x, first.x + first.width),
      minY: Math.min(first.y, first.y + first.height),
      maxX: Math.max(first.x, first.x + first.width),
      maxY: Math.max(first.y, first.y + first.height),
    },
  )
}

export function resolveSnappedTransformPreview(
  preview: TransformPreview,
  options: {
    handle: TransformHandleKind | null | undefined
    snappingEnabled: boolean
    previewDocument: EditorDocument
  },
): {preview: TransformPreview; guides: SnapGuide[]} {
  if (options.handle === 'move' && options.snappingEnabled) {
    return resolveMoveSnapPreview(preview, options.previewDocument)
  }

  return {preview, guides: [] as SnapGuide[]}
}
