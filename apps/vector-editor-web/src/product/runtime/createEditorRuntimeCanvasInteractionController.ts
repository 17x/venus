import {
  createPointerDownHandler,
} from './canvasInteractionController/canvasInteractionController.pointerDown.ts'
import {
  createPointerMoveHandler,
} from './canvasInteractionController/canvasInteractionController.pointerMove.ts'
import {
  createPointerLeaveHandler,
  createPointerUpHandler,
} from './canvasInteractionController/canvasInteractionController.pointerRelease.ts'
import type {
  EditorRuntimeCanvasInteractionControllerOptions,
  EditorRuntimeCanvasInteractionControllerState,
  EditorRuntimeCanvasInteractionHandlers,
} from './canvasInteractionController/canvasInteractionController.types.ts'

/**
 * Creates pure canvas interaction handlers by composing pointer lifecycle modules.
 */
export function createEditorRuntimeCanvasInteractionController(
  options: EditorRuntimeCanvasInteractionControllerOptions,
  controllerState: EditorRuntimeCanvasInteractionControllerState,
): EditorRuntimeCanvasInteractionHandlers {
  return {
    onPointerMove: createPointerMoveHandler(options, controllerState),
    onPointerDown: createPointerDownHandler(options, controllerState),
    onPointerUp: createPointerUpHandler(options, controllerState),
    onPointerLeave: createPointerLeaveHandler(options, controllerState),
    onViewportChange: options.defaultCanvasInteractions.onViewportChange,
    onViewportPan: options.defaultCanvasInteractions.onViewportPan,
    onViewportResize: options.defaultCanvasInteractions.onViewportResize,
    onViewportZoom: options.defaultCanvasInteractions.onViewportZoom,
    onContextMenu: options.defaultCanvasInteractions.onContextMenu,
  }
}
