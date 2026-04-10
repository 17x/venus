import * as React from 'react'
import type { EditorDocument } from '@venus/document-core'
import {
  applyViewportPreviewTransform,
  bindViewportGestures,
  resolveViewportPreviewOverscan,
  type CanvasViewportState,
} from '@venus/runtime'
import type { PointerState, SceneShapeSnapshot, SceneStats } from '@venus/shared-memory'
import type { CanvasOverlayRenderer, CanvasRenderer } from '../renderer/types.ts'
import {
  resolveCanvasRenderLodState,
  type CanvasRenderLodState,
} from '../renderer/lod.ts'

const SLOW_VIEWPORT_RENDER_MS = 8

interface CanvasViewportProps {
  document: EditorDocument
  renderer?: CanvasRenderer
  overlayRenderer?: CanvasOverlayRenderer
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  onPointerMove?: (pointer: PointerState) => void
  onPointerDown?: (
    pointer: PointerState,
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
  ) => void
  onPointerUp?: VoidFunction
  onPointerLeave?: VoidFunction
  onViewportChange?: (viewport: CanvasViewportState) => void
  onViewportPan?: (deltaX: number, deltaY: number) => void
  onViewportResize?: (width: number, height: number) => void
  onViewportZoom?: (nextScale: number, anchor?: { x: number; y: number }) => void
  onRenderLodChange?: (lodState: CanvasRenderLodState) => void
}

interface RendererLayerProps {
  document: EditorDocument
  renderer: CanvasRenderer
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  renderQuality: 'full' | 'interactive'
  lodLevel: CanvasRenderLodState['level']
}

function viewportEquals(previous: CanvasViewportState, next: CanvasViewportState) {
  return (
    previous.viewportWidth === next.viewportWidth &&
    previous.viewportHeight === next.viewportHeight &&
    previous.offsetX === next.offsetX &&
    previous.offsetY === next.offsetY &&
    previous.scale === next.scale &&
    previous.matrix[0] === next.matrix[0] &&
    previous.matrix[1] === next.matrix[1] &&
    previous.matrix[2] === next.matrix[2] &&
    previous.matrix[3] === next.matrix[3] &&
    previous.matrix[4] === next.matrix[4] &&
    previous.matrix[5] === next.matrix[5] &&
    previous.matrix[6] === next.matrix[6] &&
    previous.matrix[7] === next.matrix[7] &&
    previous.matrix[8] === next.matrix[8]
  )
}

const CanvasRendererLayer = React.memo(function CanvasRendererLayer({
  document,
  renderer: Renderer,
  shapes,
  stats,
  viewport,
  renderQuality,
  lodLevel,
}: RendererLayerProps) {
  return (
    <Renderer
      document={document}
      lodLevel={lodLevel}
      shapes={shapes}
      stats={stats}
      viewport={viewport}
      renderQuality={renderQuality}
    />
  )
}, (previous, next) => {
  // Keep the main renderer stable for hover-only/selection-only updates.
  return (
    previous.renderer === next.renderer &&
    previous.document === next.document &&
    previous.renderQuality === next.renderQuality &&
    previous.lodLevel === next.lodLevel &&
    previous.stats.shapeCount === next.stats.shapeCount &&
    viewportEquals(previous.viewport, next.viewport)
  )
})

/**
 * Shared viewport entry for all canvas renderers.
 *
 * Why:
 * - app UI should not know which concrete renderer package is in use.
 * - apps can choose a renderer or omit one entirely during bring-up.
 */
export function CanvasViewport({
  document,
  renderer: Renderer,
  overlayRenderer: OverlayRenderer,
  shapes,
  stats,
  viewport,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onViewportChange,
  onViewportPan,
  onViewportResize,
  onViewportZoom,
  onRenderLodChange,
}: CanvasViewportProps) {
  const renderStart = performance.now()
  const [renderQuality, setRenderQuality] = React.useState<'full' | 'interactive'>('full')
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const previewLayerRef = React.useRef<HTMLDivElement | null>(null)
  const previewPanOffsetRef = React.useRef({ x: 0, y: 0 })
  const pendingViewportSyncRef = React.useRef(false)
  const viewportStateRef = React.useRef(viewport)
  const onViewportChangeRef = React.useRef(onViewportChange)
  const onViewportPanRef = React.useRef(onViewportPan)
  const onViewportZoomRef = React.useRef(onViewportZoom)
  const onPointerMoveRef = React.useRef(onPointerMove)
  const onPointerDownRef = React.useRef(onPointerDown)
  const onPointerUpRef = React.useRef(onPointerUp)
  const onPointerLeaveRef = React.useRef(onPointerLeave)
  const zoomingRef = React.useRef(false)
  const onRenderLodChangeRef = React.useRef(onRenderLodChange)
  const previousRenderLodStateRef = React.useRef<CanvasRenderLodState | null>(null)

  viewportStateRef.current = viewport
  onViewportChangeRef.current = onViewportChange
  onViewportPanRef.current = onViewportPan
  onViewportZoomRef.current = onViewportZoom
  onPointerMoveRef.current = onPointerMove
  onPointerDownRef.current = onPointerDown
  onPointerUpRef.current = onPointerUp
  onPointerLeaveRef.current = onPointerLeave
  onRenderLodChangeRef.current = onRenderLodChange

  const imageCount = React.useMemo(
    () => document.shapes.reduce((count, shape) => count + (shape.type === 'image' ? 1 : 0), 0),
    [document],
  )
  const renderLodState = React.useMemo(
    () => resolveCanvasRenderLodState({
      imageCount,
      renderQuality,
      scale: viewport.scale,
      shapeCount: stats.shapeCount,
    }),
    [imageCount, renderQuality, stats.shapeCount, viewport.scale],
  )
  const panOverscan = resolveViewportPreviewOverscan(viewport)

  React.useEffect(() => {
    const previous = previousRenderLodStateRef.current
    const unchanged =
      previous?.level === renderLodState.level &&
      previous?.renderQuality === renderLodState.renderQuality &&
      previous?.shapeCount === renderLodState.shapeCount &&
      previous?.imageCount === renderLodState.imageCount &&
      previous?.scale === renderLodState.scale

    if (unchanged) {
      return
    }

    previousRenderLodStateRef.current = renderLodState
    onRenderLodChangeRef.current?.(renderLodState)
  }, [renderLodState])

  React.useEffect(() => {
    if (!pendingViewportSyncRef.current) {
      return
    }

    pendingViewportSyncRef.current = false
    previewPanOffsetRef.current = { x: 0, y: 0 }
    applyViewportPreviewTransform(
      previewLayerRef.current,
      {
        panOffset: previewPanOffsetRef.current,
        zoom: { factor: 1, anchor: null },
      },
      panOverscan,
    )
  }, [panOverscan, viewport.matrix[2], viewport.matrix[5], viewport.scale])

  React.useEffect(() => {
    // Resize is resolved here so apps do not need to wire DOM measurement into
    // runtime state manually.
    if (!viewportRef.current || !onViewportResize || typeof ResizeObserver === 'undefined') {
      return
    }

    const node = viewportRef.current
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      const height = entry.contentRect.height
      onViewportResize(width, height)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [onViewportResize])

  React.useEffect(() => {
    const node = viewportRef.current

    if (!node) {
      return
    }

    return bindViewportGestures({
      element: node,
      getViewportState: () => viewportStateRef.current,
      onPointerMove: (pointer) => {
        if (zoomingRef.current) {
          return
        }
        onPointerMoveRef.current?.(pointer)
      },
      onPointerDown: (pointer, modifiers) => {
        onPointerDownRef.current?.(pointer, modifiers)
      },
      onPointerUp: () => {
        onPointerUpRef.current?.()
      },
      onPointerLeave: () => {
        onPointerLeaveRef.current?.()
      },
      onZoomingChange: (active) => {
        if (active && !zoomingRef.current) {
          onPointerLeaveRef.current?.()
        }
        if (!active) {
          applyViewportPreviewTransform(
            previewLayerRef.current,
            {
              panOffset: previewPanOffsetRef.current,
              zoom: { factor: 1, anchor: null },
            },
            resolveViewportPreviewOverscan(viewportStateRef.current),
          )
        }
        zoomingRef.current = active
        setRenderQuality(active ? 'interactive' : 'full')
      },
      onZoomPreview: () => {
        // Zoom preview transform is temporarily disabled in the default
        // commit-immediately path because applying both preview and committed
        // viewport in the same loop can cause visible offset drift.
      },
      onZoomCommitViewport: (targetViewport) => {
        if (onViewportChangeRef.current) {
          onViewportChangeRef.current(targetViewport)
          return
        }

        const currentViewport = viewportStateRef.current
        if (currentViewport.scale !== targetViewport.scale) {
          onViewportZoomRef.current?.(targetViewport.scale)
        }
        const deltaX = targetViewport.offsetX - currentViewport.offsetX
        const deltaY = targetViewport.offsetY - currentViewport.offsetY
        if ((deltaX !== 0 || deltaY !== 0) && onViewportPanRef.current) {
          onViewportPanRef.current(deltaX, deltaY)
        }
      },
      onPanPreview: (deltaX, deltaY) => {
        previewPanOffsetRef.current = { x: deltaX, y: deltaY }
        applyViewportPreviewTransform(
          previewLayerRef.current,
          {
            panOffset: previewPanOffsetRef.current,
            zoom: { factor: 1, anchor: null },
          },
          resolveViewportPreviewOverscan(viewportStateRef.current),
        )
      },
      onPanCommit: (deltaX, deltaY) => {
        pendingViewportSyncRef.current = true
        onViewportPanRef.current?.(deltaX, deltaY)
      },
    })
  }, [])

  const rendererNode = React.useMemo(() => {
    if (!Renderer) {
      return null
    }

    const renderViewport = {
      ...viewport,
      matrix: [
        viewport.matrix[0],
        viewport.matrix[1],
        viewport.matrix[2] + panOverscan,
        viewport.matrix[3],
        viewport.matrix[4],
        viewport.matrix[5] + panOverscan,
        viewport.matrix[6],
        viewport.matrix[7],
        viewport.matrix[8],
      ] as typeof viewport.matrix,
      viewportWidth: viewport.viewportWidth + panOverscan * 2,
      viewportHeight: viewport.viewportHeight + panOverscan * 2,
    }

    return (
      <div
        ref={previewLayerRef}
        style={{
          width: `calc(100% + ${panOverscan * 2}px)`,
          height: `calc(100% + ${panOverscan * 2}px)`,
          marginLeft: -panOverscan,
          marginTop: -panOverscan,
          transform: 'translate(0px, 0px)',
        }}
        >
        <CanvasRendererLayer
          document={document}
          renderer={Renderer}
          lodLevel={renderLodState.level}
          shapes={shapes}
          stats={stats}
          viewport={renderViewport}
          renderQuality={renderQuality}
        />
        {OverlayRenderer && (
          <OverlayRenderer
            document={document}
            shapes={shapes}
            stats={stats}
            viewport={renderViewport}
          />
        )}
      </div>
    )
  }, [OverlayRenderer, Renderer, document, panOverscan, renderLodState.level, renderQuality, shapes, stats, viewport])

  const renderMs = performance.now() - renderStart
  if (renderMs >= SLOW_VIEWPORT_RENDER_MS) {
    console.debug('CANVAS-BASE slow viewport render', {
      renderMs: Number(renderMs.toFixed(2)),
      shapeCount: stats.shapeCount,
      scale: Number(viewport.scale.toFixed(3)),
      renderQuality,
    })
  }

  if (Renderer) {
    return (
      <section className="stage-shell">
        <div
          ref={viewportRef}
          className="stage-viewport"
        style={{
          touchAction: 'none',
          overscrollBehavior: 'none',
        }}
      >
          {rendererNode}
        </div>
      </section>
    )
  }

  return (
    <section className="stage-shell">
      {/* Fallback path used while bring-up is in progress or when an app wants
          to inspect runtime data before attaching a concrete renderer. */}
      <div className="stage-meta">
        <span>Renderer</span>
        <strong>No renderer selected</strong>
      </div>

      <div
        ref={viewportRef}
        className="stage-viewport"
        style={{
          touchAction: 'none',
          overscrollBehavior: 'none',
        }}
      >
        <div
          className="stage-transform stage-fallback-canvas"
          style={{
            width: document.width,
            height: document.height,
            transform: `matrix(${viewport.matrix[0]}, ${viewport.matrix[3]}, ${viewport.matrix[1]}, ${viewport.matrix[4]}, ${viewport.matrix[2]}, ${viewport.matrix[5]})`,
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(15, 23, 42, 0.6)',
            fontWeight: 600,
          }}
        >
          <span>{shapes.length} shapes loaded, but no renderer is attached.</span>
        </div>
      </div>
    </section>
  )
}
