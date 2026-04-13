import {useCallback, useRef} from 'react'
import type {ElementProps} from '@lite-u/editor/types'
import type {ToolName} from '@venus/document-core'
import {
  appendPenPoint,
  createPencilPathElement,
  createPolylinePathElement,
  isPenTool,
} from './editorRuntimeHelpers.ts'

interface PenDraftState {
  points: Array<{x: number; y: number}>
}

/**
 * Keeps freehand path drafting isolated from the runtime shell.
 */
export function usePenTool(options: {
  currentTool: ToolName
  insertElement: (element: ElementProps) => void
  onDraftPointsChange?: (points: Array<{x: number; y: number}> | null) => void
}) {
  const {currentTool, insertElement, onDraftPointsChange} = options
  const penDraftRef = useRef<PenDraftState | null>(null)

  const handlePointerMove = useCallback((point: {x: number; y: number}) => {
    if (!penDraftRef.current || !isPenTool(currentTool)) {
      return false
    }

    const minDistance = currentTool === 'path' ? 8 : 3
    appendPenPoint(penDraftRef.current, point, minDistance)
    onDraftPointsChange?.(penDraftRef.current.points.map((item) => ({...item})))
    return true
  }, [currentTool, onDraftPointsChange])

  const handlePointerDown = useCallback((point: {x: number; y: number}) => {
    if (!isPenTool(currentTool)) {
      return false
    }

    penDraftRef.current = {
      points: [point],
    }
    onDraftPointsChange?.([{...point}])
    return true
  }, [currentTool, onDraftPointsChange])

  const handlePointerUp = useCallback(() => {
    const draft = penDraftRef.current
    penDraftRef.current = null
    onDraftPointsChange?.(null)

    if (!draft || draft.points.length < 2 || !isPenTool(currentTool)) {
      return
    }

    const first = draft.points[0]
    const last = draft.points[draft.points.length - 1]
    if (Math.hypot(last.x - first.x, last.y - first.y) < 2 && draft.points.length < 4) {
      return
    }

    if (currentTool === 'path') {
      // Path tool keeps literal anchors so users can continue node-level editing.
      insertElement(createPolylinePathElement(draft.points))
      return
    }

    insertElement(createPencilPathElement(draft.points))
  }, [currentTool, insertElement, onDraftPointsChange])

  const clearDraft = useCallback(() => {
    penDraftRef.current = null
    onDraftPointsChange?.(null)
  }, [onDraftPointsChange])

  return {
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    clearDraft,
  }
}
