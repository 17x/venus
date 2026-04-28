import {
  createTransformBatchCommand,
  type ShapeTransformBatchCommand,
  type TransformPreview,
  type TransformSession,
  type TransformShapeSource,
} from './transformSessionManager.ts'

export interface PointerUpTransformCommitResult {
  selectionShapeIds: string[]
  transformCommand: ShapeTransformBatchCommand | null
}

export function resolvePointerUpTransformCommit(
  transformSession: TransformSession | null,
  preview: TransformPreview | null | undefined,
  documentShapes: TransformShapeSource[],
): PointerUpTransformCommitResult | null {
  if (!transformSession) {
    return null
  }

  return {
    selectionShapeIds: transformSession.shapeIds,
    transformCommand: preview
      ? createTransformBatchCommand(documentShapes, preview)
      : null,
  }
}
