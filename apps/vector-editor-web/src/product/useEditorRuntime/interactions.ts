import {useCallback, type MutableRefObject} from 'react'
import {createDocumentNodeFromElement} from '../../runtime/adapters/fileDocument/fileDocument.ts'
import type {ElementProps} from '../../runtime/types/index.ts'
import type {EditorRuntimeCommand} from '../../runtime/worker/index.ts'
import type {PointRef} from '../../views/statusBar/StatusBar.tsx'

/**
 * Declares command callbacks derived from runtime command controller.
 */
export interface RuntimeCommandActions {
  // Dispatches one low-level runtime command.
  handleCommand: (command: EditorRuntimeCommand) => void
  // Inserts one shape element via runtime command path.
  insertElement: (element: ElementProps) => void
  // Inserts multiple shape elements via one batch command.
  insertElementsBatch: (elements: ElementProps[]) => void
}

/**
 * Builds stable command callbacks backed by the runtime command controller.
 * @param commandController Command controller that owns runtime dispatch behavior.
 */
export function useEditorRuntimeCommandActions(input: {
  commandController: {handleRuntimeCommand: (command: EditorRuntimeCommand) => void}
}): RuntimeCommandActions {
  const handleCommand = useCallback((command: EditorRuntimeCommand) => {
    input.commandController.handleRuntimeCommand(command)
  }, [input.commandController])

  const insertElement = useCallback((element: ElementProps) => {
    handleCommand({
      type: 'shape.insert',
      shape: createDocumentNodeFromElement(element),
    })
  }, [handleCommand])

  const insertElementsBatch = useCallback((elements: ElementProps[]) => {
    if (elements.length === 0) {
      return
    }
    handleCommand({
      type: 'shape.insert.batch',
      shapes: elements.map((element) => createDocumentNodeFromElement(element)),
    })
  }, [handleCommand])

  return {
    handleCommand,
    insertElement,
    insertElementsBatch,
  }
}

/**
 * Declares pointer callback set wired into canvas runtime and input router.
 */
export interface RuntimePointerHandlers {
  // Handles pointer move events in world coordinates.
  onPointerMove: (point: {x: number; y: number}) => void
  // Handles pointer down events in world coordinates.
  onPointerDown: (
    point: {x: number; y: number},
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
  ) => void
  // Handles pointer up events.
  onPointerUp: () => void
  // Handles pointer leave events.
  onPointerLeave: () => void
}

/**
 * Builds stable pointer handlers that fan out to router, refs, and canvas interactions.
 * @param input Pointer dependencies used by handlers.
 */
export function useEditorRuntimePointerHandlers(input: {
  runtimeInputRouter: {
    dispatch: (event: {
      type: 'pointermove' | 'pointerdown' | 'pointerup' | 'pointerleave'
      point: {x: number; y: number}
      modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean}
    }) => void
  }
  canvasInteractions: {
    onPointerMove: (point: {x: number; y: number}) => void
    onPointerDown: (
      point: {x: number; y: number},
      modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
    ) => void
    onPointerUp: () => void
    onPointerLeave: () => void
  }
  lastCanvasPointRef: MutableRefObject<{x: number; y: number} | null>
  worldPointRef: MutableRefObject<PointRef | null>
}): RuntimePointerHandlers {
  const onPointerMove = useCallback((point: {x: number; y: number}) => {
    input.runtimeInputRouter.dispatch({
      type: 'pointermove',
      point,
    })
    input.lastCanvasPointRef.current = point
    input.worldPointRef.current?.set(point)
    input.canvasInteractions.onPointerMove(point)
  }, [input])

  const onPointerDown = useCallback((
    point: {x: number; y: number},
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
  ) => {
    input.runtimeInputRouter.dispatch({
      type: 'pointerdown',
      point,
      modifiers,
    })
    input.lastCanvasPointRef.current = point
    input.worldPointRef.current?.set(point)
    input.canvasInteractions.onPointerDown(point, modifiers)
  }, [input])

  const onPointerUp = useCallback(() => {
    input.runtimeInputRouter.dispatch({
      type: 'pointerup',
      point: {x: 0, y: 0},
    })
    input.canvasInteractions.onPointerUp()
  }, [input])

  const onPointerLeave = useCallback(() => {
    input.runtimeInputRouter.dispatch({
      type: 'pointerleave',
      point: {x: 0, y: 0},
    })
    input.canvasInteractions.onPointerLeave()
  }, [input])

  return {
    onPointerMove,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
  }
}
