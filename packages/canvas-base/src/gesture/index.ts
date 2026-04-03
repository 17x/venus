import type {CanvasViewportState} from '../viewport/types.ts'
import {handleZoomWheel, resetZoomSession} from '../zoom/index.ts'

export interface ViewportGestureBindingOptions {
  element: HTMLElement
  getViewportState: () => CanvasViewportState
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
  onZoomingChange,
  onZoomCommit,
  onPanPreview,
  onPanCommit,
}: ViewportGestureBindingOptions) {
  let zoomSession = resetZoomSession()
  let panOffset = {x: 0, y: 0}
  let wheelFrame: number | null = null
  let panCommitTimeout: number | null = null
  let zoomSettleTimeout: number | null = null

  const preventGesture = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
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
        onZoomingChange?.(false)
      }, nextZoom.settleDelay)

      if (wheelFrame === null) {
        wheelFrame = requestAnimationFrame(() => {
          wheelFrame = null
          const zoomFactor = zoomSession.factor
          const anchor = zoomSession.anchor
          zoomSession = resetZoomSession()

          if (!anchor) {
            return
          }

          onZoomCommit(getViewportState().scale * zoomFactor, anchor)
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
    }, 48)
  }

  element.addEventListener('wheel', handleWheel, {passive: false})
  element.addEventListener('gesturestart', preventGesture as EventListener, {passive: false})
  element.addEventListener('gesturechange', preventGesture as EventListener, {passive: false})
  element.addEventListener('gestureend', preventGesture as EventListener, {passive: false})

  return () => {
    if (wheelFrame !== null) {
      cancelAnimationFrame(wheelFrame)
    }
    if (panCommitTimeout !== null) {
      window.clearTimeout(panCommitTimeout)
    }
    if (zoomSettleTimeout !== null) {
      window.clearTimeout(zoomSettleTimeout)
    }

    element.removeEventListener('wheel', handleWheel)
    element.removeEventListener('gesturestart', preventGesture as EventListener)
    element.removeEventListener('gesturechange', preventGesture as EventListener)
    element.removeEventListener('gestureend', preventGesture as EventListener)
  }
}
