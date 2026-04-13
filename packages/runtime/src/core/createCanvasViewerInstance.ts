import type {EditorDocument} from '@venus/document-core'
import type {EditorRuntimeCommand} from '../worker/index.ts'
import type {PointerState} from '@venus/runtime/shared-memory'
import {createCanvasElementRegistry, type CanvasElementBehavior, type CanvasElementRegistry} from '../extensibility/elements.ts'
import {
  createCanvasViewerController,
  type CanvasViewerController,
  type CanvasViewerControllerOptions,
  type CanvasViewerSnapshot,
} from './createCanvasViewerController.ts'
import {
  createCanvasModuleRunner,
  type CanvasRuntimeModule,
  type CanvasViewerModulePointerEvent,
} from './modules.ts'

export interface CanvasViewerInstanceOptions<TDocument extends EditorDocument>
  extends CanvasViewerControllerOptions<TDocument> {
  elements?: CanvasElementBehavior[]
  modules?: Array<
    CanvasRuntimeModule<
      CanvasViewerSnapshot<TDocument>,
      CanvasViewerModulePointerEvent,
      EditorRuntimeCommand
    >
  >
}

export interface CanvasViewerInstance<TDocument extends EditorDocument> {
  mode: 'viewer'
  controller: CanvasViewerController<TDocument>
  elements: CanvasElementRegistry
  clearHover: () => void
  destroy: () => void
  dispatchCommand: (command: EditorRuntimeCommand) => void
  fitViewport: () => void
  getSnapshot: () => CanvasViewerSnapshot<TDocument>
  panViewport: (deltaX: number, deltaY: number) => void
  postPointer: (type: 'pointermove' | 'pointerdown', pointer: PointerState) => void
  resizeViewport: (width: number, height: number) => void
  setViewport: CanvasViewerController<TDocument>['setViewport']
  start: () => void
  subscribe: CanvasViewerController<TDocument>['subscribe']
  zoomViewport: (nextScale: number, anchor?: {x: number; y: number}) => void
}

/**
 * High-level viewer runtime constructor with optional element registry and
 * optional runtime modules, suitable for renderer-only embed scenarios.
 */
export function createCanvasViewerInstance<TDocument extends EditorDocument>(
  options: CanvasViewerInstanceOptions<TDocument>,
): CanvasViewerInstance<TDocument> {
  const {elements: elementBehaviors = [], modules = [], ...controllerOptions} = options
  const controller = createCanvasViewerController(controllerOptions)
  const elements = createCanvasElementRegistry(elementBehaviors)
  const moduleRunner = createCanvasModuleRunner<
    CanvasViewerSnapshot<TDocument>,
    CanvasViewerModulePointerEvent,
    EditorRuntimeCommand
  >({
    mode: 'viewer',
    getSnapshot: () => controller.getSnapshot(),
    modules,
  })

  return {
    mode: 'viewer',
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
    postPointer: (type, pointer) => {
      const event: CanvasViewerModulePointerEvent = {
        type,
        pointer,
      }
      moduleRunner.beforePointer(event)
      controller.postPointer(type, pointer)
      moduleRunner.afterPointer(event)
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
