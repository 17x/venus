import * as React from 'react'
import type {TransformPreviewShape} from '../interaction/transformSessionManager.ts'

type TransformPreviewState<T extends TransformPreviewShape> = {
  shapes: T[]
} | null

type DocumentShapeGeometry = {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export function isTransformPreviewSynced<T extends TransformPreviewShape>(
  documentShapes: DocumentShapeGeometry[],
  preview: TransformPreviewState<T>,
) {
  if (!preview) {
    return true
  }

  const shapeById = new Map(documentShapes.map((shape) => [shape.id, shape]))
  return preview.shapes.every((item) => {
    const shape = shapeById.get(item.shapeId)
    if (!shape) {
      return true
    }

    return (
      shape.x === item.x &&
      shape.y === item.y &&
      shape.width === item.width &&
      shape.height === item.height &&
      (shape.rotation ?? 0) === (item.rotation ?? 0)
    )
  })
}

export function useTransformPreviewCommitState<T extends TransformPreviewShape>(options: {
  documentShapes: DocumentShapeGeometry[]
}) {
  const [preview, setPreviewState] = React.useState<TransformPreviewState<T>>(null)
  const previewRef = React.useRef<TransformPreviewState<T>>(null)
  const pendingCommitRef = React.useRef(false)

  const setPreview = React.useCallback((next: TransformPreviewState<T>) => {
    previewRef.current = next
    setPreviewState(next)
  }, [])

  const clearPreview = React.useCallback(() => {
    pendingCommitRef.current = false
    previewRef.current = null
    setPreviewState(null)
  }, [])

  const markCommitPending = React.useCallback(() => {
    pendingCommitRef.current = !!previewRef.current
  }, [])

  React.useEffect(() => {
    if (!pendingCommitRef.current) {
      return
    }

    if (isTransformPreviewSynced(options.documentShapes, previewRef.current)) {
      clearPreview()
    }
  }, [clearPreview, options.documentShapes])

  return {
    preview,
    previewRef,
    setPreview,
    clearPreview,
    markCommitPending,
  }
}
