import * as React from 'react'
import {
  createTransformPreviewCommitController,
  isTransformPreviewSynced,
  type DocumentShapeGeometry,
  type TransformPreviewState,
} from '@vector/runtime'
import type {TransformPreviewShape} from '../../runtime/interaction/index.ts'

export {isTransformPreviewSynced}

export function useTransformPreviewCommitBridge<T extends TransformPreviewShape>(options: {
  documentShapes: DocumentShapeGeometry[]
}) {
  const controllerRef = React.useRef(createTransformPreviewCommitController<T>())
  const previewRef = React.useRef<TransformPreviewState<T>>(null)
  const [preview, setPreviewState] = React.useState<TransformPreviewState<T>>(null)

  const setPreview = React.useCallback((next: TransformPreviewState<T>) => {
    controllerRef.current.setPreview(next)
    previewRef.current = next
    setPreviewState(next)
  }, [])

  const clearPreview = React.useCallback(() => {
    controllerRef.current.clearPreview()
    previewRef.current = null
    setPreviewState(null)
  }, [])

  const markCommitPending = React.useCallback(() => {
    controllerRef.current.markCommitPending()
  }, [])

  React.useEffect(() => {
    if (controllerRef.current.syncIfCommitted(options.documentShapes)) {
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