import {
  createTransformBatchCommand,
  resolveMarqueeBounds,
  resolveMarqueeSelection,
  type MarqueeSelectionMatchMode,
  type MarqueeSelectableShape,
  type MarqueeState,
  type TransformPreview,
  type TransformSession,
} from '@vector/runtime/interaction'

type TransformShapeSource = Parameters<typeof createTransformBatchCommand>[0][number]
type ShapeTransformBatchCommand = Exclude<ReturnType<typeof createTransformBatchCommand>, null>

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