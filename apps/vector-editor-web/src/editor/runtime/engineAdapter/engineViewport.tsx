import * as React from 'react'
import {bindViewportGestures, resolveCanvasLodProfile} from '../../../runtime/interaction/index.ts'
import {publishRuntimeViewportSnapshot} from '../../../runtime/events/index.ts'
import type {RuntimeRenderPhase} from '../renderPolicy.ts'
import {ENGINE_RENDER_LOD_CONFIG, type EngineViewportProps} from './engineTypes.ts'

export function EngineViewport({
  document,
  renderer: Renderer,
  overlayRenderer: OverlayRenderer,
  cursor,
  shapes,
  stats,
  viewport,
  protectedNodeIds,
  overlayDiagnostics,
  editingMode = 'idle',
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onViewportChange,
  onViewportPan,
  onViewportResize,
  onViewportZoom,
}: EngineViewportProps) {
  const VIEWPORT_VELOCITY_SETTLE_MS = 110
  const VIEWPORT_ZOOM_VELOCITY_WEIGHT = 520
  const VIEWPORT_INTERACTION_EPSILON = 0.5
  const imageCount = React.useMemo(
    () => document.shapes.reduce((count, shape) => count + (shape.type === 'image' ? 1 : 0), 0),
    [document.shapes],
  )
  const [viewportVelocity, setViewportVelocity] = React.useState(0)
  const [viewportInteractionType, setViewportInteractionType] = React.useState<'pan' | 'zoom' | 'other'>('other')
  const zoomGestureActiveRef = React.useRef(false)
  const previousLodLevelRef = React.useRef<0 | 1 | 2 | 3>(0)
  const velocitySettleHandleRef = React.useRef<number | null>(null)
  const viewportMotionRef = React.useRef({
    offsetX: viewport.offsetX,
    offsetY: viewport.offsetY,
    scale: viewport.scale,
    at: performance.now(),
  })

  const lodProfile = React.useMemo(
    () => resolveCanvasLodProfile({
      shapeCount: stats.shapeCount,
      imageCount,
      scale: viewport.scale,
      isInteracting: viewportVelocity > 1,
      interactionVelocity: viewportVelocity,
      interactionType: viewportInteractionType,
      previousLodLevel: previousLodLevelRef.current,
    }),
    [imageCount, stats.shapeCount, viewport.scale, viewportInteractionType, viewportVelocity],
  )
  const runtimeRenderPhase = React.useMemo<RuntimeRenderPhase>(() => {
    if (editingMode === 'panning') {
      return 'pan'
    }

    if (editingMode === 'zooming') {
      return 'zoom'
    }

    // Keep precision editing out of drag degradation so path/text work can
    // retain full-fidelity overlay and render policy.
    if (editingMode === 'pathEditing' || editingMode === 'textEditing') {
      return 'precision'
    }

    if (
      editingMode === 'dragging' ||
      editingMode === 'resizing' ||
      editingMode === 'rotating' ||
      editingMode === 'drawingPath' ||
      editingMode === 'drawingPencil' ||
      editingMode === 'insertingShape'
    ) {
      return 'drag'
    }

    if (viewportVelocity <= 1) {
      return editingMode === 'idle' || editingMode === 'selecting'
        ? 'static'
        : 'settled'
    }

    if (viewportInteractionType === 'pan') {
      return 'pan'
    }

    if (viewportInteractionType === 'zoom') {
      return 'zoom'
    }

    return 'settled'
  }, [editingMode, viewportInteractionType, viewportVelocity])

  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const viewportStateRef = React.useRef(viewport)
  const onViewportChangeRef = React.useRef(onViewportChange)
  const onViewportPanRef = React.useRef(onViewportPan)
  const onViewportZoomRef = React.useRef(onViewportZoom)
  const onPointerMoveRef = React.useRef(onPointerMove)
  const onPointerDownRef = React.useRef(onPointerDown)
  const onPointerUpRef = React.useRef(onPointerUp)
  const onPointerLeaveRef = React.useRef(onPointerLeave)
  const lastZoomDiagnosticRef = React.useRef<{
    phase: 'wheel' | 'commit'
    source: string
    factor: number
    baseScale: number
    nextScale: number
    anchorX: number
    anchorY: number
    viewportWidth: number
    viewportHeight: number
    at: number
  } | null>(null)

  viewportStateRef.current = viewport
  onViewportChangeRef.current = onViewportChange
  onViewportPanRef.current = onViewportPan
  onViewportZoomRef.current = onViewportZoom
  onPointerMoveRef.current = onPointerMove
  onPointerDownRef.current = onPointerDown
  onPointerUpRef.current = onPointerUp
  onPointerLeaveRef.current = onPointerLeave

  React.useEffect(() => {
    const now = performance.now()
    const previous = viewportMotionRef.current
    const elapsedMs = Math.max(1, now - previous.at)
    const deltaX = viewport.offsetX - previous.offsetX
    const deltaY = viewport.offsetY - previous.offsetY
    const panDistance = Math.hypot(deltaX, deltaY)
    const zoomDelta = Math.abs(Math.log2(Math.max(0.0001, viewport.scale / previous.scale)))
    const zoomDistance = zoomDelta * VIEWPORT_ZOOM_VELOCITY_WEIGHT
    const nextVelocity = ((panDistance + zoomDistance) / elapsedMs) * 1000

    // Classify the dominant viewport motion so engine LOD can preserve full
    // fidelity for pan/zoom while leaving other interaction degradation intact.
    const nextInteractionType: 'pan' | 'zoom' | 'other' =
      // Keep wheel/pinch sessions pinned to zoom so render policy does not
      // misclassify anchor-induced offset changes as pan.
      zoomGestureActiveRef.current
        ? 'zoom'
        : panDistance > VIEWPORT_INTERACTION_EPSILON && panDistance >= zoomDistance
          ? 'pan'
          : zoomDistance > VIEWPORT_INTERACTION_EPSILON
            ? 'zoom'
            : 'other'

    setViewportVelocity((current) =>
      Math.abs(current - nextVelocity) < 24
        ? current
        : nextVelocity,
    )
    setViewportInteractionType((current) => current === nextInteractionType ? current : nextInteractionType)

    viewportMotionRef.current = {
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
      scale: viewport.scale,
      at: now,
    }

    if (velocitySettleHandleRef.current !== null) {
      window.clearTimeout(velocitySettleHandleRef.current)
    }

    velocitySettleHandleRef.current = window.setTimeout(() => {
      velocitySettleHandleRef.current = null
      setViewportVelocity(0)
      setViewportInteractionType('other')
    }, VIEWPORT_VELOCITY_SETTLE_MS)

    return () => {
      if (velocitySettleHandleRef.current !== null) {
        window.clearTimeout(velocitySettleHandleRef.current)
        velocitySettleHandleRef.current = null
      }
    }
  }, [
    VIEWPORT_INTERACTION_EPSILON,
    VIEWPORT_VELOCITY_SETTLE_MS,
    VIEWPORT_ZOOM_VELOCITY_WEIGHT,
    viewport.offsetX,
    viewport.offsetY,
    viewport.scale,
  ])

  previousLodLevelRef.current = lodProfile.lodLevel

  React.useEffect(() => {
    if (!viewportRef.current || !onViewportResize || typeof ResizeObserver === 'undefined') {
      return
    }

    const node = viewportRef.current
    const observer = new ResizeObserver(([entry]) => {
      onViewportResize(entry.contentRect.width, entry.contentRect.height)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [onViewportResize])

  React.useEffect(() => {
    publishRuntimeViewportSnapshot({
      scale: viewport.scale,
    })
  }, [viewport.scale])

  React.useEffect(() => {
    const node = viewportRef.current
    if (!node) {
      return
    }

    return bindViewportGestures({
      element: node,
      getViewportState: () => viewportStateRef.current,
      onPointerMove: (pointer) => onPointerMoveRef.current?.(pointer),
      onPointerDown: (pointer, modifiers) => onPointerDownRef.current?.(pointer, modifiers),
      onPointerUp: () => onPointerUpRef.current?.(),
      onPointerLeave: () => onPointerLeaveRef.current?.(),
      onZoomingChange: (active) => {
        zoomGestureActiveRef.current = active
        if (active) {
          setViewportInteractionType('zoom')
        }
      },
      onZoomDiagnostic: (diagnostic) => {
        // Keep a local/event-entry trace so visible=0 investigations can map
        // render failures back to the exact wheel/commit zoom payload.
        const nextEntry = {
          ...diagnostic,
          at: performance.now(),
        }
        lastZoomDiagnosticRef.current = nextEntry

        const hostWindow = window as Window & {
          __venusZoomDebugLog?: Array<typeof nextEntry>
          __venusLastZoomDiagnostic?: typeof nextEntry
        }
        hostWindow.__venusLastZoomDiagnostic = nextEntry
        const log = hostWindow.__venusZoomDebugLog ?? []
        log.push(nextEntry)
        if (log.length > 240) {
          log.splice(0, log.length - 240)
        }
        hostWindow.__venusZoomDebugLog = log
      },
      onZoomCommitViewport: (targetViewport) => {
        if (onViewportChangeRef.current) {
          onViewportChangeRef.current(targetViewport)
        } else {
          const current = viewportStateRef.current
          if (current.scale !== targetViewport.scale) {
            onViewportZoomRef.current?.(targetViewport.scale)
          }
          const deltaX = targetViewport.offsetX - current.offsetX
          const deltaY = targetViewport.offsetY - current.offsetY
          if (deltaX !== 0 || deltaY !== 0) {
            onViewportPanRef.current?.(deltaX, deltaY)
          }
        }
      },
      onPanCommit: (deltaX, deltaY) => {
        onViewportPanRef.current?.(deltaX, deltaY)
      },
    })
  }, [])

  return (
    <section className={'flex h-full w-full min-h-0 min-w-0'}>
      <div
        ref={viewportRef}
        className={'relative h-full w-full min-h-0 min-w-0 overflow-hidden'}
        style={{
          background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.8), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)',
          cursor,
          touchAction: 'none',
          overscrollBehavior: 'none',
        }}
      >
        {Renderer && (
          <Renderer
            document={document}
            shapes={shapes}
            stats={stats}
            viewport={viewport}
            protectedNodeIds={protectedNodeIds}
            overlayDiagnostics={overlayDiagnostics}
            interactionPhase={runtimeRenderPhase}
            viewportInteractionType={viewportInteractionType}
            lodLevel={lodProfile.lodLevel}
            lodConfig={ENGINE_RENDER_LOD_CONFIG}
          />
        )}
        {OverlayRenderer && (
          <OverlayRenderer
            document={document}
            shapes={shapes}
            stats={stats}
            viewport={viewport}
          />
        )}
      </div>
    </section>
  )
}
