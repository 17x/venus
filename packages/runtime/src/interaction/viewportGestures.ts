import {
  accumulateEnginePointerPanOffset,
  accumulateEngineWheelPanOffset,
  applyMatrixToPoint,
  createEngineViewportPanOrigin,
  handleEngineZoomWheel,
  resetEngineZoomSession,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
} from '@venus/engine'
import type { PointerState } from '@venus/shared-memory'
import { resolveRuntimeZoomGestureScale } from './zoomPresets.ts'

const POINTER_SUPPRESS_AFTER_WHEEL_MS = 180

export interface ViewportGestureBindingOptions {
  element: HTMLElement
  getViewportState: () => EngineCanvasViewportState
  coalescePointerMove?: boolean
  onPointerMove?: (pointer: PointerState) => void
  onPointerDown?: (
    pointer: PointerState,
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
  ) => void
  onPointerUp?: VoidFunction
  onPointerLeave?: VoidFunction
  onZoomingChange?: (active: boolean) => void
  onZoomCommitViewport?: (viewport: EngineCanvasViewportState) => void
  onPanCommit?: (deltaX: number, deltaY: number) => void
}

/**
 * Bind native browser gestures used by shared runtime adapters.
 *
 * Ownership:
 * - runtime-interaction owns gesture collection/dispatch policy
 * - runtime owns viewport state transitions
 * - engine owns matrix projection + wheel/pointer pan delta mechanics
 */
export function bindViewportGestures({
  element,
  getViewportState,
  coalescePointerMove = true,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onZoomingChange,
  onZoomCommitViewport,
  onPanCommit,
}: ViewportGestureBindingOptions) {
  let zoomSession = resetEngineZoomSession()
  let panOffset = {x: 0, y: 0}
  let panOrigin: {x: number; y: number; pointerId: number} | null = null
  let latestPointerClient: {x: number; y: number} | null = null
  let pointerFrame: number | null = null
  let zoomSettleTimeout: number | null = null
  let zoomCommitFrame: number | null = null
  let panCommitFrame: number | null = null
  let pendingZoomViewport: EngineCanvasViewportState | null = null
  let interactionPointerId: number | null = null
  let suppressPointerUntil = 0

  const flushPanCommit = () => {
    const nextDelta = panOffset
    if (nextDelta.x === 0 && nextDelta.y === 0) {
      return
    }

    onPanCommit?.(nextDelta.x, nextDelta.y)
    panOffset = {x: 0, y: 0}
  }

  const schedulePanCommit = () => {
    if (panCommitFrame !== null) {
      return
    }

    panCommitFrame = requestAnimationFrame(() => {
      panCommitFrame = null
      flushPanCommit()
    })
  }

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
      const nextZoom = handleEngineZoomWheel(zoomSession, {
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
        zoomSession = resetEngineZoomSession()
        onZoomingChange?.(false)
      }, nextZoom.settleDelay)

      const baseViewport = getViewportState()
      const commitBaseViewport = pendingZoomViewport ?? baseViewport
      const proposedScale = commitBaseViewport.scale * nextZoom.factor
      const resolvedScale = resolveRuntimeZoomGestureScale(
        commitBaseViewport.scale,
        proposedScale,
        nextZoom.source,
      )
      const nextViewport = zoomEngineViewportState(
        commitBaseViewport,
        resolvedScale,
        nextZoom.anchor,
      )
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

    panOffset = accumulateEngineWheelPanOffset(panOffset, {
      deltaX: event.deltaX,
      deltaY: event.deltaY,
    })
    schedulePanCommit()
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
      panOrigin = createEngineViewportPanOrigin({
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      })
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
      const nextPan = accumulateEnginePointerPanOffset(panOffset, panOrigin, {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      })
      panOffset = nextPan.offset
      panOrigin = nextPan.origin
      schedulePanCommit()
      return
    }

    latestPointerClient = {
      x: event.clientX,
      y: event.clientY,
    }

    if (!coalescePointerMove) {
      onPointerMove?.(resolveWorldPointer(latestPointerClient.x, latestPointerClient.y))
      return
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
      if (panCommitFrame !== null) {
        cancelAnimationFrame(panCommitFrame)
        panCommitFrame = null
      }
      flushPanCommit()
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
    if (panCommitFrame !== null) {
      cancelAnimationFrame(panCommitFrame)
      panCommitFrame = null
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
