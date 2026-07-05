import {useMemo, useRef} from 'react'
import {createPointerSelectorState} from '@venus/editor-primitive'
import {
  createEditorRuntimeCanvasInteractionController,
} from '../product/createEditorRuntimeCanvasInteractionController.ts'
import type {
  EditorRuntimeCanvasInteractionControllerOptions,
  EditorRuntimeCanvasInteractionControllerState,
} from '../product/canvasInteractionController/canvasInteractionController.types.ts'

/**
 * Creates initial mutable state consumed by the pure runtime interaction controller.
 */
function createInitialControllerState(): EditorRuntimeCanvasInteractionControllerState {
  return {
    hoverHitBudget: {
      lastAt: 0,
      lastPoint: null,
    },
    pointerSelectorState: createPointerSelectorState(),
    pointerSelectorStartScreen: null,
    pointerSelectorModifiers: undefined,
    panDragOrigin: null,
    panDragOffset: {x: 0, y: 0},
  }
}

/**
 * Thin React adapter that binds pure runtime interaction controller to stable mutable refs.
 */
export function useEditorRuntimeCanvasInteractions(options: EditorRuntimeCanvasInteractionControllerOptions) {
  const controllerStateRef = useRef<EditorRuntimeCanvasInteractionControllerState>(
    createInitialControllerState(),
  )

  return useMemo(() => {
    return createEditorRuntimeCanvasInteractionController(options, controllerStateRef.current)
  }, [options])
}
