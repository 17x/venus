import type {EditorDocument} from '../model/index.ts'
import {
  resolveEngineGeometryPayload,
  type EngineGeometryPayload,
  type ResolveEngineGeometryPayloadOptions,
} from '../engine-bridge/engine.ts'
import {
  createDefaultCanvasInteractions,
  type DefaultCanvasInteractions,
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

/**
 * Declares hover hit-test options used by runtime pointer controllers.
 */
export interface ResolveHoverShapeOptions {
  /** Stores whether selected shapes can remain hover targets. */
  includeSelectedShape?: boolean
  /** Stores whether frame nodes can be hovered as direct targets. */
  allowFrameSelection?: boolean
  /** Stores pointer tolerance in world units. */
  tolerance?: number
  /** Stores strict stroke-only hit-test mode. */
  strictStrokeHitTest?: boolean
  /** Stores whether clip-bound image hosts are filtered out. */
  excludeClipBoundImage?: boolean
  /** Stores clip-shape tolerance in world units. */
  clipTolerance?: number
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
  /** Resolves unified engine geometry payload for vector outline/marquee/hint strategy. */
  requestEngineGeometry: (
    options: Omit<ResolveEngineGeometryPayloadOptions, 'nodes'>,
  ) => EngineGeometryPayload
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
    // Route geometry queries through engine so product layer stays policy-only.
    requestEngineGeometry: (requestOptions) => resolveEngineGeometryPayload({
      ...requestOptions,
      nodes: snapshot.document.shapes,
    }),
    updateHoverFromPoint: (pointer) => {
      // Route hover hit resolution through engine payload so vector no longer owns hit geometry.
      const geometryPayload = resolveEngineGeometryPayload({
        nodes: snapshot.document.shapes,
        pointer,
        tolerance: hoverResolveOptions?.tolerance ?? 6,
        clipTolerance: hoverResolveOptions?.clipTolerance ?? 1.5,
        allowFrameSelection: hoverResolveOptions?.allowFrameSelection ?? false,
        strictStrokeHitTest: hoverResolveOptions?.strictStrokeHitTest ?? false,
        excludeClipBoundImage: hoverResolveOptions?.excludeClipBoundImage ?? true,
        resolveHoveredFromPointer: true,
        outlineLevel: 'low',
      })
      const resolvedHoverId = geometryPayload.hovered?.nodeId ?? null

      if (hoverResolveOptions?.includeSelectedShape) {
        setOverlayHoverShapeId(resolvedHoverId)
        return
      }

      const hoveredSnapshot = snapshot.shapes.find((shape) => shape.id === resolvedHoverId)
      if (hoveredSnapshot?.isSelected) {
        setOverlayHoverShapeId(null)
        return
      }

      setOverlayHoverShapeId(resolvedHoverId)
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