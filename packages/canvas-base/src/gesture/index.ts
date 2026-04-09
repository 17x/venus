import type { PointerState } from '@venus/shared-memory'
import type {CanvasViewportState} from '../viewport/types.ts'
import { applyMatrixToPoint } from '../viewport/matrix.ts'
import {zoomViewportState} from '../viewport/controller.ts'
import {handleZoomWheel, resetZoomSession} from '../zoom/index.ts'

const PAN_COMMIT_DELAY_MS = 200
const POINTER_SUPPRESS_AFTER_WHEEL_MS = 180

export interface ViewportGestureBindingOptions {
  element: HTMLElement
  getViewportState: () => CanvasViewportState
  onPointerMove?: (pointer: PointerState) => void
  onPointerDown?: (
    pointer: PointerState,
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
  ) => void
  onPointerUp?: VoidFunction
  onPointerLeave?: VoidFunction
  onZoomingChange?: (active: boolean) => void
  onZoomPreview?: (viewport: CanvasViewportState | null) => void
  onZoomCommitViewport?: (viewport: CanvasViewportState) => void
  onPanPreview?: (deltaX: number, deltaY: number) => void
  onPanCommit?: (deltaX: number, deltaY: number) => void
}

/**
 * Bind native browser gestures used by the shared viewport layer.
 *
 * This keeps framework adapters small:
 * - React/Vue/Solid only provide DOM refs and callbacks
 * - device-specific wheel/gesture heuristics stay inside canvas-base
 */
export function bindViewportGestures({
  element,
  getViewportState,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onZoomingChange,
  onZoomPreview,
  onZoomCommitViewport,
  onPanPreview,
  onPanCommit,
}: ViewportGestureBindingOptions) {
  let zoomSession = resetZoomSession()
  let panOffset = {x: 0, y: 0}
  let panOrigin: {x: number; y: number; pointerId: number} | null = null
  let latestPointerClient: {x: number; y: number} | null = null
  let pointerFrame: number | null = null
  let panCommitTimeout: number | null = null
  let zoomSettleTimeout: number | null = null
  let zoomCommitFrame: number | null = null
  let pendingZoomViewport: CanvasViewportState | null = null
  let interactionPointerId: number | null = null
  let suppressPointerUntil = 0

  const preventGesture = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const resolveWorldPointer = (clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect()
    return applyMatrixToPoint(getViewportState().inverseMatrix, {
      x: clientX - rect.left,
      y: clientY - rect.top,
    })
  }

  const handleWheel = (event: WheelEvent) => {
    suppressPointerUntil = performance.now() + POINTER_SUPPRESS_AFTER_WHEEL_MS

    if (event.ctrlKey || event.metaKey) {
      if (event.cancelable) {
        event.preventDefault()
      }

      if (!onZoomCommitViewport) {
        return
      }

      const rect = element.getBoundingClientRect()
      const nextZoom = handleZoomWheel(zoomSession, {
        clientX: event.clientX - rect.left,
        clientY: event.clientY - rect.top,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        deltaMode: event.deltaMode,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        timeStamp: event.timeStamp,
      })

      zoomSession = nextZoom.session
      onZoomingChange?.(true)

      if (zoomSettleTimeout !== null) {
        window.clearTimeout(zoomSettleTimeout)
      }
      zoomSettleTimeout = window.setTimeout(() => {
        zoomSettleTimeout = null
        zoomSession = resetZoomSession()
        onZoomPreview?.(null)
        onZoomingChange?.(false)
      }, nextZoom.settleDelay)

      const baseViewport = getViewportState()
      const commitBaseViewport = pendingZoomViewport ?? baseViewport
      const nextViewport = zoomViewportState(
        commitBaseViewport,
        commitBaseViewport.scale * nextZoom.factor,
        nextZoom.anchor,
      )
      onZoomPreview?.(nextViewport)
      pendingZoomViewport = nextViewport

      if (zoomCommitFrame === null) {
        zoomCommitFrame = requestAnimationFrame(() => {
          zoomCommitFrame = null
          if (!pendingZoomViewport) {
            return
          }
          const targetViewport = pendingZoomViewport
          pendingZoomViewport = null
          onZoomCommitViewport(targetViewport)
        })
      }

      return
    }

    if (!onPanCommit) {
      return
    }

    if (event.cancelable) {
      event.preventDefault()
    }

    panOffset = {
      x: panOffset.x - event.deltaX,
      y: panOffset.y - event.deltaY,
    }
    onPanPreview?.(panOffset.x, panOffset.y)

    if (panCommitTimeout !== null) {
      window.clearTimeout(panCommitTimeout)
    }

    panCommitTimeout = window.setTimeout(() => {
      panCommitTimeout = null
      const nextDelta = panOffset
      if (nextDelta.x === 0 && nextDelta.y === 0) {
        return
      }

      onPanCommit(nextDelta.x, nextDelta.y)
      panOffset = {x: 0, y: 0}
    }, PAN_COMMIT_DELAY_MS)
  }

  const handlePointerDownEvent = (event: PointerEvent) => {
    if (performance.now() < suppressPointerUntil) {
      return
    }

    interactionPointerId = event.pointerId
    if (typeof element.setPointerCapture === 'function') {
      element.setPointerCapture(event.pointerId)
    }

    if (event.button === 1) {
      panOrigin = {x: event.clientX, y: event.clientY, pointerId: event.pointerId}
      return
    }

    onPointerDown?.(resolveWorldPointer(event.clientX, event.clientY), {
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
    })
  }

  const handlePointerMoveEvent = (event: PointerEvent) => {
    if (interactionPointerId !== null && event.pointerId !== interactionPointerId) {
      return
    }

    if (panOrigin && onPanCommit) {
      const deltaX = event.clientX - panOrigin.x
      const deltaY = event.clientY - panOrigin.y
      panOrigin = {x: event.clientX, y: event.clientY, pointerId: event.pointerId}
      panOffset = {
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY,
      }
      onPanPreview?.(panOffset.x, panOffset.y)
      return
    }

    latestPointerClient = {
      x: event.clientX,
      y: event.clientY,
    }

    if (pointerFrame === null) {
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = null
        const nextPointer = latestPointerClient
        if (!nextPointer || !onPointerMove) {
          return
        }

        onPointerMove(resolveWorldPointer(nextPointer.x, nextPointer.y))
      })
    }
  }

  const handlePointerUpEvent = (event: PointerEvent) => {
    const wasInteractionPointer = interactionPointerId === event.pointerId
    const wasPanPointer = panOrigin?.pointerId === event.pointerId

    if (interactionPointerId !== null && event.pointerId !== interactionPointerId) {
      return
    }

    if (panOrigin && panOrigin.pointerId === event.pointerId) {
      panOrigin = null
      const nextDelta = panOffset
      if (nextDelta.x !== 0 || nextDelta.y !== 0) {
        onPanCommit?.(nextDelta.x, nextDelta.y)
        panOffset = {x: 0, y: 0}
      }
    }

    if (
      interactionPointerId === event.pointerId &&
      typeof element.releasePointerCapture === 'function' &&
      element.hasPointerCapture?.(event.pointerId)
    ) {
      element.releasePointerCapture(event.pointerId)
    }
    interactionPointerId = null

    if (wasInteractionPointer || wasPanPointer) {
      onPointerUp?.()
    }
  }

  const handlePointerLeaveEvent = () => {
    if (interactionPointerId !== null) {
      return
    }
    onPointerLeave?.()
  }

  element.addEventListener('wheel', handleWheel, {passive: false})
  element.addEventListener('pointerdown', handlePointerDownEvent)
  element.addEventListener('pointermove', handlePointerMoveEvent)
  element.addEventListener('pointerup', handlePointerUpEvent)
  element.addEventListener('pointerleave', handlePointerLeaveEvent)
  element.addEventListener('pointercancel', handlePointerUpEvent)
  element.addEventListener('gesturestart', preventGesture as EventListener, {passive: false})
  element.addEventListener('gesturechange', preventGesture as EventListener, {passive: false})
  element.addEventListener('gestureend', preventGesture as EventListener, {passive: false})

  return () => {
    if (pointerFrame !== null) {
      cancelAnimationFrame(pointerFrame)
    }
    if (panCommitTimeout !== null) {
      window.clearTimeout(panCommitTimeout)
    }
    if (zoomSettleTimeout !== null) {
      window.clearTimeout(zoomSettleTimeout)
      zoomSettleTimeout = null
    }
    if (zoomCommitFrame !== null) {
      cancelAnimationFrame(zoomCommitFrame)
      zoomCommitFrame = null
    }
    pendingZoomViewport = null
    if (
      interactionPointerId !== null &&
      typeof element.releasePointerCapture === 'function' &&
      element.hasPointerCapture?.(interactionPointerId)
    ) {
      element.releasePointerCapture(interactionPointerId)
    }
    interactionPointerId = null

    element.removeEventListener('wheel', handleWheel)
    element.removeEventListener('pointerdown', handlePointerDownEvent)
    element.removeEventListener('pointermove', handlePointerMoveEvent)
    element.removeEventListener('pointerup', handlePointerUpEvent)
    element.removeEventListener('pointerleave', handlePointerLeaveEvent)
    element.removeEventListener('pointercancel', handlePointerUpEvent)
    element.removeEventListener('gesturestart', preventGesture as EventListener)
    element.removeEventListener('gesturechange', preventGesture as EventListener)
    element.removeEventListener('gestureend', preventGesture as EventListener)
  }
}
