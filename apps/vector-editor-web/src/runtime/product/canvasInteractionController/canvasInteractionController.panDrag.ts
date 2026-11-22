import type {
  EditorRuntimeCanvasInteractionControllerOptions,
  EditorRuntimeCanvasInteractionControllerState,
} from './canvasInteractionController.types.ts'

/**
 * Commits the pending panning-tool delta using the engine's screen-space pan contract.
 */
export function flushPanDragOffset(
  options: EditorRuntimeCanvasInteractionControllerOptions,
  controllerState: EditorRuntimeCanvasInteractionControllerState,
) {
  const offset = controllerState.panDragOffset
  controllerState.panDragOffset = {x: 0, y: 0}
  if (offset.x === 0 && offset.y === 0) {
    return
  }

  options.defaultCanvasInteractions.onViewportPan(offset.x, offset.y)
}

/**
 * Coalesces high-frequency pointer moves into one viewport pan per animation frame.
 */
export function schedulePanDragCommit(
  options: EditorRuntimeCanvasInteractionControllerOptions,
  controllerState: EditorRuntimeCanvasInteractionControllerState,
) {
  if (controllerState.panDragCommitFrame !== null) {
    return
  }

  const requestFrame = globalThis.requestAnimationFrame
  if (typeof requestFrame !== 'function') {
    flushPanDragOffset(options, controllerState)
    return
  }

  controllerState.panDragCommitFrame = requestFrame(() => {
    controllerState.panDragCommitFrame = null
    flushPanDragOffset(options, controllerState)
  })
}

/**
 * Cancels a scheduled panning-tool frame before pointer release/leave cleanup.
 */
export function cancelPanDragCommit(controllerState: EditorRuntimeCanvasInteractionControllerState) {
  const frame = controllerState.panDragCommitFrame
  controllerState.panDragCommitFrame = null
  if (frame === null) {
    return
  }

  const cancelFrame = globalThis.cancelAnimationFrame
  if (typeof cancelFrame === 'function') {
    cancelFrame(frame)
  }
}
