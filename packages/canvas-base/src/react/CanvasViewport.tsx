import * as React from 'react'
import type { EditorDocument } from '@venus/document-core'
import type { PointerState, SceneShapeSnapshot } from '@venus/shared-memory'
import type { CanvasRenderer } from '../renderer/types.ts'
import { applyMatrixToPoint } from '../viewport/matrix.ts'
import type { CanvasViewportState } from '../viewport/types.ts'

interface CanvasViewportProps {
  document: EditorDocument
  renderer?: CanvasRenderer
  shapes: SceneShapeSnapshot[]
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
  viewport,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onViewportPan,
  onViewportResize,
  onViewportZoom,
}: CanvasViewportProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const panOriginRef = React.useRef<{ x: number; y: number } | null>(null)

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
      if ((event.ctrlKey || event.metaKey) && event.cancelable) {
        event.preventDefault()
      }
    }
    const preventGesture = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault()
      }
    }

    node.addEventListener('wheel', handleNativeWheel, { passive: false })
    node.addEventListener('gesturestart', preventGesture as EventListener, { passive: false })
    node.addEventListener('gesturechange', preventGesture as EventListener, { passive: false })
    node.addEventListener('gestureend', preventGesture as EventListener, { passive: false })

    return () => {
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

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) {
      if (event.cancelable) {
        event.preventDefault()
      }
      if (!onViewportZoom) {
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      // Zoom uses the pointer location as the anchor so content grows/shrinks
      // around the user's focus point instead of the top-left corner.
      const delta = event.deltaY < 0 ? 1.08 : 1 / 1.08
      onViewportZoom(viewport.scale * delta, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      })
      return
    }

    if (!onViewportPan) {
      return
    }

    if (event.cancelable) {
      event.preventDefault()
    }
    onViewportPan(-event.deltaX, -event.deltaY)
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
    if (panOriginRef.current && onViewportPan) {
      const deltaX = event.clientX - panOriginRef.current.x
      const deltaY = event.clientY - panOriginRef.current.y
      panOriginRef.current = { x: event.clientX, y: event.clientY }
      onViewportPan(deltaX, deltaY)
      return
    }

    resolvePointer(event, onPointerMove)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panOriginRef.current) {
      panOriginRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  if (Renderer) {
    return (
      <section className="stage-shell">
        <div
          ref={viewportRef}
          className="stage-viewport"
          onWheel={handleWheel}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={(event) => {
            handlePointerUp(event)
            onPointerUp?.()
          }}
          onPointerLeave={onPointerLeave}
        >
          <Renderer document={document} shapes={shapes} viewport={viewport} />
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
        onWheel={handleWheel}
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
