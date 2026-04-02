import * as React from 'react'
import type { EditorDocument } from '@venus/document-core'
import type { PointerState, SceneShapeSnapshot, SceneStats } from '@venus/shared-memory'
import type { CanvasRenderer } from '../renderer/types.ts'
import { applyMatrixToPoint } from '../viewport/matrix.ts'
import type { CanvasViewportState } from '../viewport/types.ts'

interface CanvasViewportProps {
  document: EditorDocument
  renderer?: CanvasRenderer
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  onPointerMove?: (pointer: PointerState) => void
  onPointerDown?: (pointer: PointerState) => void
  onPointerUp?: VoidFunction
  onPointerLeave?: VoidFunction
  onViewportPan?: (deltaX: number, deltaY: number) => void
  onViewportResize?: (width: number, height: number) => void
  onViewportZoom?: (nextScale: number, anchor?: { x: number; y: number }) => void
}

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
  shapes,
  stats,
  viewport,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onViewportPan,
  onViewportResize,
  onViewportZoom,
}: CanvasViewportProps) {
  const [renderQuality, setRenderQuality] = React.useState<'full' | 'interactive'>('full')
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const previewLayerRef = React.useRef<HTMLDivElement | null>(null)
  const panOriginRef = React.useRef<{ x: number; y: number } | null>(null)
  const previewPanOffsetRef = React.useRef({ x: 0, y: 0 })
  const wheelZoomRef = React.useRef<{ factor: number; anchor: { x: number; y: number } | null }>({
    factor: 1,
    anchor: null,
  })
  const wheelCommitTimeoutRef = React.useRef<number | null>(null)
  const zoomSettleTimeoutRef = React.useRef<number | null>(null)
  const latestPointerClientRef = React.useRef<{ x: number; y: number } | null>(null)
  const frameStateRef = React.useRef<{ wheel: number | null; pointer: number | null }>({
    wheel: null,
    pointer: null,
  })
  const pendingViewportSyncRef = React.useRef(false)
  const viewportStateRef = React.useRef(viewport)
  const onViewportPanRef = React.useRef(onViewportPan)
  const onViewportZoomRef = React.useRef(onViewportZoom)
  const onPointerMoveRef = React.useRef(onPointerMove)

  viewportStateRef.current = viewport
  onViewportPanRef.current = onViewportPan
  onViewportZoomRef.current = onViewportZoom
  onPointerMoveRef.current = onPointerMove

  React.useEffect(() => {
    if (!pendingViewportSyncRef.current) {
      return
    }

    pendingViewportSyncRef.current = false
    previewPanOffsetRef.current = { x: 0, y: 0 }
    applyPreviewTransform(
      previewLayerRef.current,
      previewPanOffsetRef.current,
      { factor: 1, anchor: null },
      resolvePanOverscan(viewport),
    )
  }, [viewport.matrix[2], viewport.matrix[5], viewport.scale])

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

    // Some browsers surface trackpad pinch as native wheel/gesture events that
    // can zoom the whole page. We explicitly consume them on the canvas region
    // so only the editor viewport responds.
    const handleNativeWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.cancelable) {
          event.preventDefault()
        }

        const handleZoom = onViewportZoomRef.current
        if (!handleZoom) {
          return
        }

        const rect = node.getBoundingClientRect()
        const deltaScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 0.06
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? 0.12
            : 0.02
        const normalizedDelta = Math.max(-160, Math.min(160, event.deltaY))
        const delta = Math.exp(-normalizedDelta * deltaScale)
        setRenderQuality((current) => (current === 'interactive' ? current : 'interactive'))
        wheelZoomRef.current.factor *= delta
        wheelZoomRef.current.anchor = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }

        if (zoomSettleTimeoutRef.current !== null) {
          window.clearTimeout(zoomSettleTimeoutRef.current)
        }
        zoomSettleTimeoutRef.current = window.setTimeout(() => {
          zoomSettleTimeoutRef.current = null
          setRenderQuality('full')
        }, 120)

        if (frameStateRef.current.wheel === null) {
          frameStateRef.current.wheel = requestAnimationFrame(() => {
            frameStateRef.current.wheel = null
            const zoomFactor = wheelZoomRef.current.factor
            const anchor = wheelZoomRef.current.anchor
            wheelZoomRef.current.factor = 1
            wheelZoomRef.current.anchor = null

            if (!anchor) {
              return
            }

            handleZoom(viewportStateRef.current.scale * zoomFactor, anchor)
          })
        }

        return
      }

      const handlePan = onViewportPanRef.current
      if (!handlePan) {
        return
      }

      if (event.cancelable) {
        event.preventDefault()
      }
      previewPanOffsetRef.current = {
        x: previewPanOffsetRef.current.x - event.deltaX,
        y: previewPanOffsetRef.current.y - event.deltaY,
      }
      applyPreviewTransform(
        previewLayerRef.current,
        previewPanOffsetRef.current,
        { factor: 1, anchor: null },
        resolvePanOverscan(viewportStateRef.current),
      )

      if (wheelCommitTimeoutRef.current !== null) {
        window.clearTimeout(wheelCommitTimeoutRef.current)
      }

      wheelCommitTimeoutRef.current = window.setTimeout(() => {
        wheelCommitTimeoutRef.current = null
        const nextDelta = previewPanOffsetRef.current
        if (nextDelta.x === 0 && nextDelta.y === 0) {
          return
        }

        pendingViewportSyncRef.current = true
        handlePan(nextDelta.x, nextDelta.y)
      }, 48)
    }
    const preventGesture = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    }

    node.addEventListener('wheel', handleNativeWheel, { passive: false })
    node.addEventListener('gesturestart', preventGesture as EventListener, { passive: false })
    node.addEventListener('gesturechange', preventGesture as EventListener, { passive: false })
    node.addEventListener('gestureend', preventGesture as EventListener, { passive: false })

    return () => {
      if (frameStateRef.current.wheel !== null) {
        cancelAnimationFrame(frameStateRef.current.wheel)
        frameStateRef.current.wheel = null
      }
      if (wheelCommitTimeoutRef.current !== null) {
        window.clearTimeout(wheelCommitTimeoutRef.current)
        wheelCommitTimeoutRef.current = null
      }
      if (zoomSettleTimeoutRef.current !== null) {
        window.clearTimeout(zoomSettleTimeoutRef.current)
        zoomSettleTimeoutRef.current = null
      }

      node.removeEventListener('wheel', handleNativeWheel)
      node.removeEventListener('gesturestart', preventGesture as EventListener)
      node.removeEventListener('gesturechange', preventGesture as EventListener)
      node.removeEventListener('gestureend', preventGesture as EventListener)
    }
  }, [])

  const resolvePointer = (
    event: React.PointerEvent<HTMLDivElement>,
    handler?: (pointer: PointerState) => void,
  ) => {
    if (!handler) {
      return
    }

    // Pointer events originate in screen space and must be converted into
    // world space before hit testing can happen in the worker.
    const rect = event.currentTarget.getBoundingClientRect()
    handler(
      applyMatrixToPoint(viewport.inverseMatrix, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }),
    )
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Middle mouse or Alt+drag enters viewport-pan mode without involving the
    // worker because it only changes presentation state.
    if (event.button === 1 || event.altKey) {
      panOriginRef.current = { x: event.clientX, y: event.clientY }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    resolvePointer(event, onPointerDown)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panOriginRef.current && onViewportPanRef.current) {
      const deltaX = event.clientX - panOriginRef.current.x
      const deltaY = event.clientY - panOriginRef.current.y
      panOriginRef.current = { x: event.clientX, y: event.clientY }
      previewPanOffsetRef.current = {
        x: previewPanOffsetRef.current.x + deltaX,
        y: previewPanOffsetRef.current.y + deltaY,
      }
      applyPreviewTransform(
        previewLayerRef.current,
        previewPanOffsetRef.current,
        { factor: 1, anchor: null },
        resolvePanOverscan(viewportStateRef.current),
      )
      return
    }

    latestPointerClientRef.current = {
      x: event.clientX,
      y: event.clientY,
    }

    if (frameStateRef.current.pointer === null) {
      frameStateRef.current.pointer = requestAnimationFrame(() => {
        frameStateRef.current.pointer = null
        const latestPointer = latestPointerClientRef.current
        const node = viewportRef.current
        const handleMove = onPointerMoveRef.current

        if (!latestPointer || !node || !handleMove) {
          return
        }

        const rect = node.getBoundingClientRect()
        handleMove(
          applyMatrixToPoint(viewportStateRef.current.inverseMatrix, {
            x: latestPointer.x - rect.left,
            y: latestPointer.y - rect.top,
          }),
        )
      })
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panOriginRef.current) {
      panOriginRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
      const nextDelta = previewPanOffsetRef.current
      if (nextDelta.x !== 0 || nextDelta.y !== 0) {
        pendingViewportSyncRef.current = true
        onViewportPanRef.current?.(nextDelta.x, nextDelta.y)
      }
    }
  }

  const rendererNode = React.useMemo(() => {
    if (!Renderer) {
      return null
    }

    const panOverscan = resolvePanOverscan(viewport)

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
        <Renderer
          document={document}
          shapes={shapes}
          stats={stats}
          viewport={renderViewport}
          renderQuality={renderQuality}
        />
      </div>
    )
  }, [Renderer, document, renderQuality, shapes, stats, viewport])

  React.useEffect(() => {
    return () => {
      if (frameStateRef.current.pointer !== null) {
        cancelAnimationFrame(frameStateRef.current.pointer)
      }
    }
  }, [])

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
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={(event) => {
            handlePointerUp(event)
            onPointerUp?.()
          }}
          onPointerLeave={onPointerLeave}
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
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={(event) => {
          handlePointerUp(event)
          onPointerUp?.()
        }}
        onPointerLeave={onPointerLeave}
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
          onPointerMove={(event) => resolvePointer(event, onPointerMove)}
          onPointerDown={(event) => resolvePointer(event, onPointerDown)}
          onPointerLeave={onPointerLeave}
        >
          <span>{shapes.length} shapes loaded, but no renderer is attached.</span>
        </div>
      </div>
    </section>
  )
}

function resolvePanOverscan(viewport: CanvasViewportState) {
  const scaleFactor = viewport.scale < 0.25 ? 2 : viewport.scale < 0.5 ? 1.5 : 1
  const baseOverscan = 192 * scaleFactor

  return Math.max(192, Math.min(640, Math.ceil(baseOverscan)))
}

function applyPreviewTransform(
  node: HTMLDivElement | null,
  panOffset: {x: number; y: number},
  zoomPreview: {
    factor: number
    anchor: {x: number; y: number} | null
  },
  overscan: number,
) {
  if (!node) {
    return
  }

  const anchorX = (zoomPreview.anchor?.x ?? 0) + overscan
  const anchorY = (zoomPreview.anchor?.y ?? 0) + overscan
  const scale = zoomPreview.factor

  node.style.transform =
    `translate(${panOffset.x}px, ${panOffset.y}px) ` +
    `translate(${anchorX}px, ${anchorY}px) ` +
    `scale(${scale}) ` +
    `translate(${-anchorX}px, ${-anchorY}px)`
  node.style.willChange =
    panOffset.x !== 0 || panOffset.y !== 0 || scale !== 1
      ? 'transform'
      : ''
}
