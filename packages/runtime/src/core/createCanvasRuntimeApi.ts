import type {EditorDocument} from '@venus/document-core'
import {
  createDefaultCanvasInteractions,
  resolveHoverShape,
  type DefaultCanvasInteractions,
  type ResolveHoverShapeOptions,
} from '../interaction/index.ts'
import {
  createCanvasEditorInstance,
  type CanvasEditorInstance,
  type CanvasEditorInstanceOptions,
} from './createCanvasEditorInstance.ts'

export interface CanvasMarqueePresentationConfig {
  fill: string
  stroke: string
  strokeWidth: number
  strokeDasharray: string
}

export interface CanvasOverlayPresentationConfig {
  selectionStroke: string
  selectionStrokeWidth: number
  hoverStroke: string
  hoverCenterFill: string
  hoverCenterStroke: string
  handleFill: string
  handleStroke: string
  handleSize: number
  snapGuideStroke: string
  snapGuideDasharray: string
}

export interface CanvasPresentationConfig {
  marquee: CanvasMarqueePresentationConfig
  overlay: CanvasOverlayPresentationConfig
}

export interface CanvasPresentationConfigPatch {
  marquee?: Partial<CanvasMarqueePresentationConfig>
  overlay?: Partial<CanvasOverlayPresentationConfig>
}

export interface CanvasRuntimeApiOptions<TDocument extends EditorDocument>
  extends CanvasEditorInstanceOptions<TDocument> {
  onContextMenu?: (position: {x: number; y: number}) => void
  hoverResolveOptions?: ResolveHoverShapeOptions
  presentation?: CanvasPresentationConfigPatch
}

export interface CanvasRuntimeApi<TDocument extends EditorDocument> {
  interactions: DefaultCanvasInteractions
  clearHover: CanvasEditorInstance<TDocument>['clearHover']
  destroy: () => void
  dispatchCommand: CanvasEditorInstance<TDocument>['dispatchCommand']
  fitViewport: CanvasEditorInstance<TDocument>['fitViewport']
  getOverlayHoverShapeId: () => string | null
  getPresentationConfig: () => CanvasPresentationConfig
  getSnapshot: CanvasEditorInstance<TDocument>['getSnapshot']
  panViewport: CanvasEditorInstance<TDocument>['panViewport']
  postPointer: CanvasEditorInstance<TDocument>['postPointer']
  receiveRemoteOperation: CanvasEditorInstance<TDocument>['receiveRemoteOperation']
  resizeViewport: CanvasEditorInstance<TDocument>['resizeViewport']
  setOverlayHoverShapeId: (shapeId: string | null) => void
  setViewport: CanvasEditorInstance<TDocument>['setViewport']
  start: () => void
  subscribe: (listener: VoidFunction) => VoidFunction
  updateHoverFromPoint: (pointer: {x: number; y: number}) => void
  updatePresentationConfig: (patch: CanvasPresentationConfigPatch) => void
  zoomViewport: CanvasEditorInstance<TDocument>['zoomViewport']
}

const DEFAULT_CANVAS_PRESENTATION_CONFIG: CanvasPresentationConfig = {
  marquee: {
    fill: 'rgba(37, 99, 235, 0.12)',
    stroke: 'rgba(37, 99, 235, 0.95)',
    strokeWidth: 1,
    strokeDasharray: '4 3',
  },
  overlay: {
    selectionStroke: '#2563eb',
    selectionStrokeWidth: 1,
    hoverStroke: 'rgba(14, 165, 233, 0.9)',
    hoverCenterFill: 'rgba(14, 165, 233, 0.95)',
    hoverCenterStroke: 'rgba(14, 165, 233, 0.95)',
    handleFill: '#ffffff',
    handleStroke: '#2563eb',
    handleSize: 8,
    snapGuideStroke: 'rgba(248, 113, 113, 0.95)',
    snapGuideDasharray: '5 3',
  },
}

function mergePresentationConfig(
  base: CanvasPresentationConfig,
  patch?: CanvasPresentationConfigPatch,
) {
  if (!patch) {
    return base
  }

  return {
    marquee: {
      ...base.marquee,
      ...patch.marquee,
    },
    overlay: {
      ...base.overlay,
      ...patch.overlay,
    },
  }
}

function resolveValidOverlayHoverShapeId(
  snapshot: ReturnType<CanvasEditorInstance<EditorDocument>['getSnapshot']>,
  shapeId: string | null,
) {
  if (!shapeId) {
    return null
  }

  const shape = snapshot.shapes.find((item) => item.id === shapeId)
  if (!shape || shape.isSelected) {
    return null
  }

  return shapeId
}

/**
 * Runtime API object for app-layer communication without framework coupling.
 */
export function createCanvasRuntimeApi<TDocument extends EditorDocument>(
  options: CanvasRuntimeApiOptions<TDocument>,
): CanvasRuntimeApi<TDocument> {
  const {
    onContextMenu,
    hoverResolveOptions,
    presentation,
    ...instanceOptions
  } = options
  const instance = createCanvasEditorInstance(instanceOptions)
  let snapshot = instance.getSnapshot()
  let overlayHoverShapeId: string | null = null
  let presentationConfig = mergePresentationConfig(DEFAULT_CANVAS_PRESENTATION_CONFIG, presentation)
  const listeners = new Set<VoidFunction>()
  let unsubscribeRuntime: VoidFunction | null = null

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const ensureRuntimeSubscription = () => {
    if (unsubscribeRuntime) {
      return
    }

    unsubscribeRuntime = instance.subscribe(() => {
      snapshot = {...instance.getSnapshot()}
      overlayHoverShapeId = resolveValidOverlayHoverShapeId(snapshot, overlayHoverShapeId)
      notify()
    })
  }

  const setOverlayHoverShapeId = (shapeId: string | null) => {
    const nextHoverShapeId = resolveValidOverlayHoverShapeId(snapshot, shapeId)
    if (nextHoverShapeId === overlayHoverShapeId) {
      return
    }

    overlayHoverShapeId = nextHoverShapeId
    notify()
  }

  const interactions = createDefaultCanvasInteractions({
    getRuntime: () => ({
      postPointer: instance.postPointer,
      clearHover: instance.clearHover,
      setViewport: instance.setViewport,
      panViewport: instance.panViewport,
      resizeViewport: instance.resizeViewport,
      zoomViewport: instance.zoomViewport,
      viewport: snapshot.viewport,
    }),
    onContextMenu,
  })

  return {
    interactions,
    clearHover: instance.clearHover,
    destroy: () => {
      if (unsubscribeRuntime) {
        unsubscribeRuntime()
        unsubscribeRuntime = null
      }
      listeners.clear()
      instance.destroy()
    },
    dispatchCommand: instance.dispatchCommand,
    fitViewport: instance.fitViewport,
    getOverlayHoverShapeId: () => overlayHoverShapeId,
    getPresentationConfig: () => presentationConfig,
    getSnapshot: () => snapshot,
    panViewport: instance.panViewport,
    postPointer: instance.postPointer,
    receiveRemoteOperation: instance.receiveRemoteOperation,
    resizeViewport: instance.resizeViewport,
    setOverlayHoverShapeId,
    setViewport: instance.setViewport,
    start: () => {
      instance.start()
      ensureRuntimeSubscription()
      snapshot = {...instance.getSnapshot()}
      notify()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    updateHoverFromPoint: (pointer) => {
      setOverlayHoverShapeId(resolveHoverShape(
        snapshot.document,
        snapshot.shapes,
        pointer,
        hoverResolveOptions,
      ))
    },
    updatePresentationConfig: (patch) => {
      presentationConfig = mergePresentationConfig(presentationConfig, patch)
      notify()
    },
    zoomViewport: instance.zoomViewport,
  }
}

export {
  DEFAULT_CANVAS_PRESENTATION_CONFIG,
}