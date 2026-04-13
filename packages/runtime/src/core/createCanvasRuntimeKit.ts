import type {EditorDocument} from '@venus/document-core'
import type {PointerState} from '@venus/runtime/shared-memory'
import {applyMatrixToPoint, type Point2D} from '../viewport/matrix.ts'
import type {CanvasViewportState} from '../viewport/types.ts'
import {
  createCanvasRuntimeController,
  type CanvasRuntimeController,
  type CanvasRuntimeControllerOptions,
  type CanvasRuntimeSnapshot,
} from './createCanvasRuntimeController.ts'

export interface CanvasRuntimeLayerRegistration {
  id: string
  zIndex?: number
  meta?: Record<string, unknown>
}

export interface CanvasRuntimeKitRenderRequest {
  reason: 'snapshot' | 'viewport' | 'command' | 'external'
  snapshotVersion: number
}

export interface CanvasRuntimeKitEngineBridge<TDocument extends EditorDocument> {
  render?: (
    snapshot: CanvasRuntimeSnapshot<TDocument>,
    request: CanvasRuntimeKitRenderRequest,
  ) => void | Promise<void>
  hitTest?: (input: {
    point: Point2D
    tolerance?: number
    viewport: CanvasViewportState
    snapshot: CanvasRuntimeSnapshot<TDocument>
  }) => unknown
  onViewportChange?: (viewport: CanvasViewportState) => void
}

export interface CreateCanvasRuntimeKitOptions<TDocument extends EditorDocument>
  extends CanvasRuntimeControllerOptions<TDocument> {
  engine?: CanvasRuntimeKitEngineBridge<TDocument>
}

export interface CanvasRuntimeKit<TDocument extends EditorDocument>
  extends CanvasRuntimeController<TDocument> {
  on: <TEvent extends keyof CanvasRuntimeKitEventMap<TDocument>>(
    event: TEvent,
    listener: (payload: CanvasRuntimeKitEventMap<TDocument>[TEvent]) => void,
  ) => () => void
  applyPanGesture: (deltaX: number, deltaY: number) => void
  applyScrollGesture: (deltaX: number, deltaY: number) => void
  applyZoomGesture: (nextScale: number, anchorInScreen?: Point2D) => void
  hitTestWorld: (point: Point2D, options?: {tolerance?: number}) => unknown
  hitTestScreen: (point: Point2D, options?: {tolerance?: number}) => unknown
  registerOverlayLayer: (layer: CanvasRuntimeLayerRegistration) => () => void
  registerDynamicLayer: (layer: CanvasRuntimeLayerRegistration) => () => void
  listOverlayLayers: () => CanvasRuntimeLayerRegistration[]
  listDynamicLayers: () => CanvasRuntimeLayerRegistration[]
  requestRender: (reason?: CanvasRuntimeKitRenderRequest['reason']) => void
  flushRender: () => Promise<void>
}

export interface CanvasRuntimeKitEventMap<TDocument extends EditorDocument> {
  snapshot: CanvasRuntimeSnapshot<TDocument>
  viewport: CanvasViewportState
  renderRequest: CanvasRuntimeKitRenderRequest
}

type EventListenerMap<TDocument extends EditorDocument> = {
  [K in keyof CanvasRuntimeKitEventMap<TDocument>]: Set<
    (payload: CanvasRuntimeKitEventMap<TDocument>[K]) => void
  >
}

function toSortedLayerList(source: Map<string, CanvasRuntimeLayerRegistration>) {
  return Array.from(source.values()).sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0))
}

export function createCanvasRuntimeKit<TDocument extends EditorDocument>(
  options: CreateCanvasRuntimeKitOptions<TDocument>,
): CanvasRuntimeKit<TDocument> {
  const controller = createCanvasRuntimeController(options)
  const eventListeners: EventListenerMap<TDocument> = {
    snapshot: new Set(),
    viewport: new Set(),
    renderRequest: new Set(),
  }
  const overlayLayers = new Map<string, CanvasRuntimeLayerRegistration>()
  const dynamicLayers = new Map<string, CanvasRuntimeLayerRegistration>()

  let scheduledRenderReason: CanvasRuntimeKitRenderRequest['reason'] = 'external'
  let renderScheduled = false
  let renderInFlight = false
  let renderRequeued = false

  const emit = <TEvent extends keyof CanvasRuntimeKitEventMap<TDocument>>(
    event: TEvent,
    payload: CanvasRuntimeKitEventMap<TDocument>[TEvent],
  ) => {
    eventListeners[event].forEach((listener) => listener(payload))
  }

  const resolveZoomAnchorInWorld = (anchorInScreen?: Point2D) => {
    if (!anchorInScreen) {
      return undefined
    }

    return applyMatrixToPoint(controller.getSnapshot().viewport.inverseMatrix, anchorInScreen)
  }

  const scheduleRender = (reason: CanvasRuntimeKitRenderRequest['reason']) => {
    if (!options.engine?.render) {
      return
    }

    scheduledRenderReason = reason
    if (renderScheduled) {
      renderRequeued = true
      return
    }

    renderScheduled = true
    const flush = () => {
      renderScheduled = false
      void runRender(scheduledRenderReason)
    }

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => flush())
      return
    }

    queueMicrotask(flush)
  }

  const runRender = async (reason: CanvasRuntimeKitRenderRequest['reason']) => {
    if (!options.engine?.render) {
      return
    }

    if (renderInFlight) {
      renderRequeued = true
      scheduledRenderReason = reason
      return
    }

    renderInFlight = true
    try {
      const snapshot = controller.getSnapshot()
      const request: CanvasRuntimeKitRenderRequest = {
        reason,
        snapshotVersion: snapshot.stats.version,
      }
      emit('renderRequest', request)
      await options.engine.render(snapshot, request)
    } finally {
      renderInFlight = false
      if (renderRequeued) {
        renderRequeued = false
        await runRender(scheduledRenderReason)
      }
    }
  }

  const notifyViewport = (viewport: CanvasViewportState) => {
    options.engine?.onViewportChange?.(viewport)
    emit('viewport', viewport)
    scheduleRender('viewport')
  }

  const removeLayer = (
    source: Map<string, CanvasRuntimeLayerRegistration>,
    id: string,
  ) => {
    source.delete(id)
  }

  const subscribeRuntime = controller.subscribe(() => {
    const snapshot = controller.getSnapshot()
    emit('snapshot', snapshot)
    scheduleRender('snapshot')
  })

  return {
    ...controller,
    on: (event, listener) => {
      eventListeners[event].add(listener)
      return () => {
        eventListeners[event].delete(listener)
      }
    },
    applyPanGesture: (deltaX, deltaY) => {
      controller.panViewport(deltaX, deltaY)
      notifyViewport(controller.getSnapshot().viewport)
    },
    applyScrollGesture: (deltaX, deltaY) => {
      controller.panViewport(deltaX, deltaY)
      notifyViewport(controller.getSnapshot().viewport)
    },
    applyZoomGesture: (nextScale, anchorInScreen) => {
      controller.zoomViewport(nextScale, resolveZoomAnchorInWorld(anchorInScreen))
      notifyViewport(controller.getSnapshot().viewport)
    },
    hitTestWorld: (point, hitTestOptions) => {
      return options.engine?.hitTest?.({
        point,
        tolerance: hitTestOptions?.tolerance,
        viewport: controller.getSnapshot().viewport,
        snapshot: controller.getSnapshot(),
      }) ?? null
    },
    hitTestScreen: (point, hitTestOptions) => {
      const snapshot = controller.getSnapshot()
      const worldPoint = applyMatrixToPoint(snapshot.viewport.inverseMatrix, point)
      return options.engine?.hitTest?.({
        point: worldPoint,
        tolerance: hitTestOptions?.tolerance,
        viewport: snapshot.viewport,
        snapshot,
      }) ?? null
    },
    registerOverlayLayer: (layer) => {
      overlayLayers.set(layer.id, layer)
      return () => removeLayer(overlayLayers, layer.id)
    },
    registerDynamicLayer: (layer) => {
      dynamicLayers.set(layer.id, layer)
      return () => removeLayer(dynamicLayers, layer.id)
    },
    listOverlayLayers: () => toSortedLayerList(overlayLayers),
    listDynamicLayers: () => toSortedLayerList(dynamicLayers),
    requestRender: (reason = 'external') => {
      scheduleRender(reason)
    },
    flushRender: async () => {
      await runRender('external')
    },
    destroy: () => {
      subscribeRuntime()
      overlayLayers.clear()
      dynamicLayers.clear()
      controller.destroy()
    },
    dispatchCommand: (command) => {
      controller.dispatchCommand(command)
      scheduleRender('command')
    },
    fitViewport: () => {
      controller.fitViewport()
      notifyViewport(controller.getSnapshot().viewport)
    },
    panViewport: (deltaX, deltaY) => {
      controller.panViewport(deltaX, deltaY)
      notifyViewport(controller.getSnapshot().viewport)
    },
    setViewport: (viewport) => {
      controller.setViewport(viewport)
      notifyViewport(viewport)
    },
    zoomViewport: (nextScale, anchor) => {
      controller.zoomViewport(nextScale, anchor)
      notifyViewport(controller.getSnapshot().viewport)
    },
    resizeViewport: (width, height) => {
      controller.resizeViewport(width, height)
      notifyViewport(controller.getSnapshot().viewport)
    },
    postPointer: (
      type: 'pointermove' | 'pointerdown',
      pointer: PointerState,
      modifiers?: {shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean},
    ) => {
      controller.postPointer(type, pointer, modifiers)
      scheduleRender('external')
    },
  }
}