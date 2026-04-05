import {useCallback, useRef} from 'react'
import type {ElementProps} from '@lite-u/editor/types'
import type {ToolName} from '@venus/document-core'
import {appendPenPoint, createPathElement, isPenTool} from './editorRuntimeHelpers.ts'

interface PenDraftState {
  points: Array<{x: number; y: number}>
}

/**
 * Keeps freehand path drafting isolated from the runtime shell.
 */
export function usePenTool(options: {
  currentTool: ToolName
  insertElement: (element: ElementProps) => void
}) {
  const {currentTool, insertElement} = options
  const penDraftRef = useRef<PenDraftState | null>(null)

  const handlePointerMove = useCallback((point: {x: number; y: number}) => {
    if (!penDraftRef.current || !isPenTool(currentTool)) {
      return false
    }

    appendPenPoint(penDraftRef.current, point)
    return true
  }, [currentTool])

  const handlePointerDown = useCallback((point: {x: number; y: number}) => {
    if (!isPenTool(currentTool)) {
      return false
    }

    penDraftRef.current = {
      points: [point],
    }
    return true
  }, [currentTool])

  const handlePointerUp = useCallback(() => {
    const draft = penDraftRef.current
    penDraftRef.current = null

    if (!draft || draft.points.length < 2 || !isPenTool(currentTool)) {
      return
    }

    const first = draft.points[0]
    const last = draft.points[draft.points.length - 1]
    if (Math.hypot(last.x - first.x, last.y - first.y) < 2 && draft.points.length < 4) {
      return
    }

    insertElement(createPathElement(draft.points))
  }, [currentTool, insertElement])

  const clearDraft = useCallback(() => {
    penDraftRef.current = null
  }, [])

  return {
    handlePointerMove,
    handlePointerDown,
    handlePointerUp,
    clearDraft,
  }
}
