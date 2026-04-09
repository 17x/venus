import * as React from 'react'
import {createShapeTransformRecord, type BoxTransformSource} from '@venus/document-core'
import type {TransformPreviewShape} from '../interaction/transformSessionManager.ts'

type TransformPreviewState<T extends TransformPreviewShape> = {
  shapes: T[]
} | null

type DocumentShapeGeometry = BoxTransformSource & {
  id: string
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
