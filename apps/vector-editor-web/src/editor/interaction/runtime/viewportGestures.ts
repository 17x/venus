import {
  accumulateEnginePointerPanOffset,
  accumulateEngineWheelPanOffset,
  createEngineViewportPanOrigin,
  handleEngineZoomWheel,
  resetEngineZoomSession,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
} from '@vector/runtime/engine'
import {applyMatrixToPoint} from '@vector/runtime'
import type {PointerState} from '@vector/runtime/shared-memory'
import {resolveRuntimeZoomGestureScale} from './zoomPresets.ts'

const POINTER_SUPPRESS_AFTER_WHEEL_MS = 180
const MAX_ZOOM_STEP_FACTOR_PER_COMMIT = 1.8
const TRACKPAD_CENTER_ANCHOR_FACTOR_THRESHOLD = 1.35

export interface ViewportZoomDiagnostic {
  phase: 'wheel' | 'commit'
  source: string
  factor: number
  baseScale: number
  nextScale: number
  anchorX: number
  anchorY: number
  viewportWidth: number
  viewportHeight: number
}

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
  onZoomDiagnostic?: (diagnostic: ViewportZoomDiagnostic) => void
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
  onZoomDiagnostic,
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
  let pendingZoomDiagnostic: Omit<ViewportZoomDiagnostic, 'phase'> | null = null
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
      const measuredViewport = getViewportState()
      // Defer wheel zoom until resize has produced a concrete viewport size.
      // Cold-start zoom on a 0x0 viewport can lock in invalid transforms.
      if (measuredViewport.viewportWidth <= 1 || measuredViewport.viewportHeight <= 1) {
        return
      }
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

      const baseViewport = measuredViewport
      // Always anchor each wheel event to the latest committed viewport.
      // This avoids rapid event bursts compounding against pending transforms
      // and pushing content outside the visible candidate window.
      const commitBaseViewport = baseViewport
      // Use center anchoring for mouse-wheel and bursty trackpad deltas so
      // fast zoom input cannot fling content out of view around cursor edges.
      const useCenterAnchor = nextZoom.source !== 'trackpad'
        || nextZoom.factor >= TRACKPAD_CENTER_ANCHOR_FACTOR_THRESHOLD
        || nextZoom.factor <= (1 / TRACKPAD_CENTER_ANCHOR_FACTOR_THRESHOLD)
      const zoomAnchor = useCenterAnchor
        ? {
          x: commitBaseViewport.viewportWidth > 0
            ? commitBaseViewport.viewportWidth * 0.5
            : rect.width * 0.5,
          y: commitBaseViewport.viewportHeight > 0
            ? commitBaseViewport.viewportHeight * 0.5
            : rect.height * 0.5,
        }
        : nextZoom.anchor
      const proposedScale = commitBaseViewport.scale * nextZoom.factor
      const resolvedScale = resolveRuntimeZoomGestureScale(
        commitBaseViewport.scale,
        proposedScale,
        nextZoom.source,
      )
      // Cap each committed zoom step so burst wheel input cannot jump to a
      // distant scale in one frame and temporarily eject visible content.
      const boundedScale = Math.min(
        commitBaseViewport.scale * MAX_ZOOM_STEP_FACTOR_PER_COMMIT,
        Math.max(
          commitBaseViewport.scale / MAX_ZOOM_STEP_FACTOR_PER_COMMIT,
          resolvedScale,
        ),
      )
      const nextViewport = zoomEngineViewportState(
        commitBaseViewport,
        boundedScale,
        zoomAnchor,
      )
      pendingZoomViewport = nextViewport
        // Emit wheel-stage diagnostics before commit so blank-frame reports can
        // be tied back to the exact source/factor/base-scale chain.
        const nextDiagnostic = {
          source: nextZoom.source,
          factor: nextZoom.factor,
          baseScale: commitBaseViewport.scale,
          nextScale: nextViewport.scale,
          anchorX: zoomAnchor.x,
          anchorY: zoomAnchor.y,
          viewportWidth: commitBaseViewport.viewportWidth,
          viewportHeight: commitBaseViewport.viewportHeight,
        } satisfies Omit<ViewportZoomDiagnostic, 'phase'>
        pendingZoomDiagnostic = nextDiagnostic
        onZoomDiagnostic?.({
          ...nextDiagnostic,
          phase: 'wheel',
        })

      if (zoomCommitFrame === null) {
        zoomCommitFrame = requestAnimationFrame(() => {
          zoomCommitFrame = null
          if (!pendingZoomViewport) {
            return
          }
          const targetViewport = pendingZoomViewport
            const commitDiagnostic = pendingZoomDiagnostic
          pendingZoomViewport = null
            pendingZoomDiagnostic = null
            if (commitDiagnostic) {
              onZoomDiagnostic?.({
                ...commitDiagnostic,
                phase: 'commit',
              })
            }
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
