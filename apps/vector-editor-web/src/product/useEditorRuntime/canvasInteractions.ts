import {useMemo, useRef} from 'react'
import {createPointerSelectorState} from '@venus/editor-primitive'
import {
  createEditorRuntimeCanvasInteractionController,
} from '../runtime/createEditorRuntimeCanvasInteractionController.ts'
import type {
  EditorRuntimeCanvasInteractionControllerOptions,
  EditorRuntimeCanvasInteractionControllerState,
} from '../runtime/canvasInteractionController/canvasInteractionController.types.ts'

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