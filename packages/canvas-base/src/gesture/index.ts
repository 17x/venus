import type { PointerState } from '@venus/shared-memory'
import type {CanvasViewportState} from '../viewport/types.ts'
import { applyMatrixToPoint } from '../viewport/matrix.ts'
import {handleZoomWheel, resetZoomSession} from '../zoom/index.ts'

const PAN_COMMIT_DELAY_MS = 200

export interface ViewportGestureBindingOptions {
  element: HTMLElement
  getViewportState: () => CanvasViewportState
  onPointerMove?: (pointer: PointerState) => void
  onPointerDown?: (pointer: PointerState) => void
  onPointerUp?: VoidFunction
  onPointerLeave?: VoidFunction
  onZoomingChange?: (active: boolean) => void
  onZoomCommit?: (nextScale: number, anchor: {x: number; y: number}) => void
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
  onZoomCommit,
  onPanPreview,
  onPanCommit,
}: ViewportGestureBindingOptions) {
  let zoomSession = resetZoomSession()
  let zoomTargetScale: number | null = null
  let zoomAnchor: {x: number; y: number} | null = null
  let panOffset = {x: 0, y: 0}
  let panOrigin: {x: number; y: number; pointerId: number} | null = null
  let latestPointerClient: {x: number; y: number} | null = null
  let wheelFrame: number | null = null
  let pointerFrame: number | null = null
  let panCommitTimeout: number | null = null
  let zoomSettleTimeout: number | null = null

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
    if (event.ctrlKey || event.metaKey) {
      if (event.cancelable) {
        event.preventDefault()
      }

      if (!onZoomCommit) {
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
        zoomTargetScale = null
        zoomAnchor = null
        onZoomingChange?.(false)
      }, nextZoom.settleDelay)

      if (zoomTargetScale === null) {
        zoomTargetScale = getViewportState().scale
      }
      zoomTargetScale *= nextZoom.factor
      zoomAnchor = nextZoom.anchor

      if (wheelFrame === null) {
        wheelFrame = requestAnimationFrame(() => {
          wheelFrame = null
          const nextScale = zoomTargetScale
          const anchor = zoomAnchor

          if (!anchor || nextScale === null) {
            return
          }

          onZoomCommit(nextScale, anchor)
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
    if (event.button === 1 || event.altKey) {
      panOrigin = {x: event.clientX, y: event.clientY, pointerId: event.pointerId}
      element.setPointerCapture(event.pointerId)
      return
    }

    onPointerDown?.(resolveWorldPointer(event.clientX, event.clientY))
  }

  const handlePointerMoveEvent = (event: PointerEvent) => {
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
    if (panOrigin && panOrigin.pointerId === event.pointerId) {
      panOrigin = null
      element.releasePointerCapture(event.pointerId)
      const nextDelta = panOffset
      if (nextDelta.x !== 0 || nextDelta.y !== 0) {
        onPanCommit?.(nextDelta.x, nextDelta.y)
        panOffset = {x: 0, y: 0}
      }
    }

    onPointerUp?.()
  }

  const handlePointerLeaveEvent = () => {
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
    if (wheelFrame !== null) {
      cancelAnimationFrame(wheelFrame)
    }
    if (pointerFrame !== null) {
      cancelAnimationFrame(pointerFrame)
    }
    if (panCommitTimeout !== null) {
      window.clearTimeout(panCommitTimeout)
    }
    if (zoomSettleTimeout !== null) {
      window.clearTimeout(zoomSettleTimeout)
    }

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
