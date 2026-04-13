import {
  createTransformBatchCommand,
  type ShapeTransformBatchCommand,
  type TransformPreview,
  type TransformSession,
  type TransformShapeSource,
} from './transformSessionManager.ts'
import {
  resolveMarqueeBounds,
  resolveMarqueeSelection,
  type MarqueeSelectionMatchMode,
  type MarqueeSelectableShape,
  type MarqueeState,
} from './marqueeSelection.ts'

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

export interface PointerUpMarqueeSelectionResult {
  shapeIds: string[]
  mode: MarqueeState['mode']
}

export function resolvePointerUpMarqueeSelection(
  marquee: MarqueeState | null,
  shapes: MarqueeSelectableShape[],
  options?: {
    matchMode?: MarqueeSelectionMatchMode
    excludeShape?: (shape: MarqueeSelectableShape) => boolean
  },
): PointerUpMarqueeSelectionResult | null {
  if (!marquee) {
    return null
  }

  return {
    shapeIds: resolveMarqueeSelection(shapes, resolveMarqueeBounds(marquee), {
      matchMode: options?.matchMode,
      excludeShape: options?.excludeShape,
    }),
    mode: marquee.mode,
  }
}
