import type {EditorDocument} from '@vector/model'
import type {EditorRuntimeCommand} from '../worker/index.ts'
import type {PointerState} from '@vector/runtime/shared-memory'
import {createCanvasElementRegistry, type CanvasElementBehavior, type CanvasElementRegistry} from '../extensibility/elements.ts'
import {
  createCanvasRuntimeController,
  type CanvasRuntimeController,
  type CanvasRuntimeControllerOptions,
  type CanvasRuntimeSnapshot,
} from './createCanvasRuntimeController.ts'
import {
  createCanvasModuleRunner,
  type CanvasEditorModulePointerEvent,
  type CanvasRuntimeModule,
} from './modules.ts'

export interface CanvasEditorInstanceOptions<TDocument extends EditorDocument>
  extends CanvasRuntimeControllerOptions<TDocument> {
  elements?: CanvasElementBehavior[]
  modules?: Array<
    CanvasRuntimeModule<
      CanvasRuntimeSnapshot<TDocument>,
      CanvasEditorModulePointerEvent,
      EditorRuntimeCommand
    >
  >
}

export interface CanvasEditorInstance<TDocument extends EditorDocument> {
  mode: 'editor'
  controller: CanvasRuntimeController<TDocument>
  elements: CanvasElementRegistry
  clearHover: () => void
  destroy: () => void
  dispatchCommand: (command: EditorRuntimeCommand) => void
  fitViewport: () => void
  getSnapshot: () => CanvasRuntimeSnapshot<TDocument>
  panViewport: (deltaX: number, deltaY: number) => void
  postPointer: (
    type: 'pointermove' | 'pointerdown',
    pointer: PointerState,
    modifiers?: {shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean},
  ) => void
  receiveRemoteOperation: CanvasRuntimeController<TDocument>['receiveRemoteOperation']
  resizeViewport: (width: number, height: number) => void
  setViewport: CanvasRuntimeController<TDocument>['setViewport']
  start: () => void
  subscribe: CanvasRuntimeController<TDocument>['subscribe']
  zoomViewport: (nextScale: number, anchor?: {x: number; y: number}) => void
}

/**
 * High-level editor runtime constructor with optional element behaviors and
 * optional runtime modules (snapping, selection policy, analytics, etc.).
 */
export function createCanvasEditorInstance<TDocument extends EditorDocument>(
  options: CanvasEditorInstanceOptions<TDocument>,
): CanvasEditorInstance<TDocument> {
  const {elements: elementBehaviors = [], modules = [], ...controllerOptions} = options
  const controller = createCanvasRuntimeController(controllerOptions)
  const elements = createCanvasElementRegistry(elementBehaviors)
  const moduleRunner = createCanvasModuleRunner<
    CanvasRuntimeSnapshot<TDocument>,
    CanvasEditorModulePointerEvent,
    EditorRuntimeCommand
  >({
    mode: 'editor',
    getSnapshot: () => controller.getSnapshot(),
    modules,
  })

  return {
    mode: 'editor',
    controller,
    elements,
    clearHover: () => {
      controller.clearHover()
    },
    destroy: () => {
      moduleRunner.onDestroy()
      controller.destroy()
    },
    dispatchCommand: (command) => {
      moduleRunner.beforeCommand(command)
      controller.dispatchCommand(command)
      moduleRunner.afterCommand(command)
    },
    fitViewport: () => {
      controller.fitViewport()
    },
    getSnapshot: () => controller.getSnapshot(),
    panViewport: (deltaX, deltaY) => {
      controller.panViewport(deltaX, deltaY)
    },
    postPointer: (type, pointer, modifiers) => {
      const event: CanvasEditorModulePointerEvent = {
        type,
        pointer,
        modifiers,
      }
      moduleRunner.beforePointer(event)
      controller.postPointer(type, pointer, modifiers)
      moduleRunner.afterPointer(event)
    },
    receiveRemoteOperation: (operation) => {
      controller.receiveRemoteOperation(operation)
    },
    resizeViewport: (width, height) => {
      controller.resizeViewport(width, height)
    },
    setViewport: (viewport) => {
      controller.setViewport(viewport)
    },
    start: () => {
      controller.start()
      moduleRunner.onStart()
    },
    subscribe: (listener) => controller.subscribe(listener),
    zoomViewport: (nextScale, anchor) => {
      controller.zoomViewport(nextScale, anchor)
    },
  }
}
