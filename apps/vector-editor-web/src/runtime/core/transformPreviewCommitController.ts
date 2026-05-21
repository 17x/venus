import type {TransformPreviewShape} from '../interaction/index.ts'

/**
 * Declares minimal box-transform source consumed by preview sync checks.
 */
export interface BoxTransformSource {
  /** Stores left position in world coordinates. */
  x: number
  /** Stores top position in world coordinates. */
  y: number
  /** Stores width in world coordinates. */
  width: number
  /** Stores height in world coordinates. */
  height: number
  /** Stores optional rotation in degrees. */
  rotation?: number
  /** Stores optional horizontal flip flag. */
  flipX?: boolean
  /** Stores optional vertical flip flag. */
  flipY?: boolean
}

export type TransformPreviewState<T extends TransformPreviewShape> = {
  shapes: T[]
} | null

export type DocumentShapeGeometry = BoxTransformSource & {
  id: string
}

export interface TransformPreviewCommitController<T extends TransformPreviewShape> {
  getPreview: () => TransformPreviewState<T>
  setPreview: (next: TransformPreviewState<T>) => void
  clearPreview: () => void
  markCommitPending: () => void
  syncIfCommitted: (documentShapes: DocumentShapeGeometry[]) => boolean
}

export function isTransformPreviewSynced<T extends TransformPreviewShape>(
  documentShapes: DocumentShapeGeometry[],
  preview: TransformPreviewState<T>,
) {
  if (!preview) {
    return true
  }

  const shapeById = new Map(documentShapes.map((shape) => [shape.id, createShapeTransformRecord(shape)]))
  return preview.shapes.every((item) => {
    const shape = shapeById.get(item.shapeId)
    if (!shape) {
      return true
    }
    const previewShape = createShapeTransformRecord(item)

    return (
      shape.x === previewShape.x &&
      shape.y === previewShape.y &&
      shape.width === previewShape.width &&
      shape.height === previewShape.height &&
      shape.rotation === previewShape.rotation &&
      !!shape.flipX === !!previewShape.flipX &&
      !!shape.flipY === !!previewShape.flipY
    )
  })
}

/**
 * Resolves stable transform record for preview/document equality checks.
 * @param source Shape-like box transform payload from document or preview.
 */
function createShapeTransformRecord(source: BoxTransformSource) {
  const width = Math.max(1, source.width)
  const height = Math.max(1, source.height)
  return {
    x: source.x,
    y: source.y,
    width,
    height,
    rotation: source.rotation ?? 0,
    flipX: !!source.flipX,
    flipY: !!source.flipY,
  }
}

/**
 * Pure controller for transform-preview commit synchronization.
 */
export function createTransformPreviewCommitController<T extends TransformPreviewShape>():
TransformPreviewCommitController<T> {
  let preview: TransformPreviewState<T> = null
  let pendingCommit = false

  return {
    getPreview: () => preview,
    setPreview: (next) => {
      preview = next
    },
    clearPreview: () => {
      pendingCommit = false
      preview = null
    },
    markCommitPending: () => {
      pendingCommit = !!preview
    },
    syncIfCommitted: (documentShapes) => {
      if (!pendingCommit) {
        return false
      }

      // Clear preview only after document geometry catches up with the committed transform.
      if (isTransformPreviewSynced(documentShapes, preview)) {
        pendingCommit = false
        preview = null
        return true
      }

      return false
    },
  }
}