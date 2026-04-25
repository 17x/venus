import * as React from 'react'
import {type EditorDocument} from '@vector/model'
import type {CanvasViewportState, RuntimeEditingMode} from '@vector/runtime'
import type {
  Engine,
  EngineRenderScheduler,
} from '@vector/runtime/engine'
import {
  createEngine,
  createEngineRenderScheduler,
} from '@vector/runtime/engine'
import {
  bindViewportGestures,
  resolveCanvasLodProfile,
  type ViewportGestureBindingOptions,
} from '../../runtime/interaction/index.ts'
import {
  publishRuntimeRenderDiagnostics,
  publishRuntimeViewportSnapshot,
} from '../../runtime/events/index.ts'
import {
  buildDocumentImageAssetUrlMap,
  createEngineSceneFromRuntimeSnapshot,
  type CreateEngineSceneFromRuntimeSnapshotOptions,
} from '@vector/runtime/presets'
import type {SceneShapeSnapshot, SceneStats} from '@vector/runtime/shared-memory'
import {prepareRenderFrame} from '../render-prep/prepareFrame.ts'
import {
  resolveRuntimeRenderPolicy,
  DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY,
  DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY,
  DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY,
  DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY,
  type RuntimeLodConfig,
  type RuntimeRenderPhase,
} from './renderPolicy.ts'

export interface OverlayDiagnostics {
  degraded: boolean
  guideInputCount: number
  guideKeptCount: number
  guideDroppedCount: number
  guideSelectionStrategy: 'full' | 'axis-first' | 'axis-relevance'
  pathEditWhitelistActive: boolean
}

export interface CanvasRendererProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  protectedNodeIds?: readonly string[]
  overlayDiagnostics?: OverlayDiagnostics
  interactionPhase?: RuntimeRenderPhase
  viewportInteractionType?: 'pan' | 'zoom' | 'other'
  lodLevel?: 0 | 1 | 2 | 3
  lodConfig?: RuntimeLodConfig
}

export interface CanvasOverlayProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
}

export type CanvasRenderer = React.ComponentType<CanvasRendererProps>
export type CanvasOverlayRenderer = React.ComponentType<CanvasOverlayProps>

interface CanvasViewportProps {
  document: EditorDocument
  renderer?: CanvasRenderer
  overlayRenderer?: CanvasOverlayRenderer
  cursor?: string
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  protectedNodeIds?: readonly string[]
  overlayDiagnostics?: OverlayDiagnostics
  editingMode?: RuntimeEditingMode
  onPointerMove?: ViewportGestureBindingOptions['onPointerMove']
  onPointerDown?: ViewportGestureBindingOptions['onPointerDown']
  onPointerUp?: VoidFunction
  onPointerLeave?: VoidFunction
  onViewportChange?: (viewport: CanvasViewportState) => void
  onViewportPan?: (deltaX: number, deltaY: number) => void
  onViewportResize?: (width: number, height: number) => void
  onViewportZoom?: (nextScale: number, anchor?: {x: number; y: number}) => void
}

const ENABLE_RUNTIME_RENDER_DIAGNOSTICS = true

const ENGINE_RENDER_LOD_CONFIG: RuntimeLodConfig & {
  enabled: boolean
  options: {
    mode: 'conservative'
  }
} = {
  enabled: false,
  options: {
    mode: 'conservative',
  },
  lodLevelCapabilities: {
    0: {
      quality: 'full',
      dpr: 'auto',
      interactiveIntervalMs: 8,
    },
    1: {
      quality: 'full',
      dpr: 'auto',
      interactiveIntervalMs: 10,
    },
    2: {
      quality: 'interactive',
      dpr: 1.25,
      interactiveIntervalMs: 12,
    },
    3: {
      quality: 'interactive',
      dpr: 1,
      interactiveIntervalMs: 16,
    },
  },
  interactionCapabilities: {
    pan: {
      quality: 'interactive',
      dpr: 'auto',
      interactionActive: true,
      interactiveIntervalMs: 8,
      interactionPreview: {
        enabled: true,
        mode: 'interaction',
        maxScaleStep: 1.2,
        maxTranslatePx: 220,
      },
    },
    zoom: {
      quality: 'interactive',
      dpr: 1.5,
      interactionActive: true,
      interactiveIntervalMs: 8,
      interactionPreview: {
        enabled: true,
        mode: 'interaction',
        maxScaleStep: 1.2,
        maxTranslatePx: 220,
      },
    },
    drag: {
      quality: 'interactive',
      interactionActive: true,
      interactionPreview: false,
    },
    precision: {
      quality: 'full',
      interactionActive: false,
      interactionPreview: false,
    },
  },
}

export function CanvasViewport({
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
}: CanvasViewportProps) {
  const VIEWPORT_VELOCITY_SETTLE_MS = 110
  const VIEWPORT_ZOOM_VELOCITY_WEIGHT = 520
  const VIEWPORT_INTERACTION_EPSILON = 0.5
  const imageCount = React.useMemo(
    () => document.shapes.reduce((count, shape) => count + (shape.type === 'image' ? 1 : 0), 0),
    [document.shapes],
  )
  const [viewportVelocity, setViewportVelocity] = React.useState(0)
  const [viewportInteractionType, setViewportInteractionType] = React.useState<'pan' | 'zoom' | 'other'>('other')
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
      panDistance > VIEWPORT_INTERACTION_EPSILON && panDistance >= zoomDistance
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
      onZoomCommitViewport: (targetViewport) => {
        if (onViewportChangeRef.current) {
          onViewportChangeRef.current(targetViewport)
          return
        }

        const current = viewportStateRef.current
        if (current.scale !== targetViewport.scale) {
          onViewportZoomRef.current?.(targetViewport.scale)
        }
        const deltaX = targetViewport.offsetX - current.offsetX
        const deltaY = targetViewport.offsetY - current.offsetY
        if (deltaX !== 0 || deltaY !== 0) {
          onViewportPanRef.current?.(deltaX, deltaY)
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

export function Canvas2DRenderer({
  document,
  shapes,
  stats,
  viewport,
  protectedNodeIds,
  overlayDiagnostics,
  interactionPhase = 'settled',
  viewportInteractionType = 'other',
  lodLevel = 0,
  lodConfig,
}: CanvasRendererProps) {
  const INTERACTION_SETTLE_MS = 120
  const PLAN_DIAGNOSTIC_SAMPLE_MS = 1200
  const FULL_REDRAW_QUIET_WINDOW_MS = 140
  const FULL_REDRAW_IDLE_TIMEOUT_MS = 80
  const FULL_REDRAW_DEFER_MS = 32
  const SCENE_DIRTY_SKIP_FORCE_RENDER_FRAMES =
    DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.sceneDirtySkipForceRenderFrames
  const DIRTY_BOUNDS_SMALL_AREA_PX2 =
    DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.dirtyBoundsSmallAreaPx2
  const DIRTY_BOUNDS_MEDIUM_AREA_PX2 =
    DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.dirtyBoundsMediumAreaPx2
  const OVERSCAN_PX = 240
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const engineRef = React.useRef<Engine | null>(null)
  const drawSerialRef = React.useRef(0)
  const assetUrlByIdRef = React.useRef<Map<string, string>>(new Map())
  const imageCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map())
  const appliedQualityRef = React.useRef<'full' | 'interactive' | null>(null)
  const appliedDprRef = React.useRef<number | 'auto' | null>(null)
  const appliedRenderSizeRef = React.useRef<{width: number; height: number} | null>(null)
  const appliedViewportRef = React.useRef<{
    viewportWidth: number
    viewportHeight: number
    offsetX: number
    offsetY: number
    scale: number
  } | null>(null)
  const hasCommittedInitialViewportFrameRef = React.useRef(false)
  const viewportReadyRef = React.useRef(false)
  const pendingSceneRenderRef = React.useRef(false)
  const [isInteracting, setIsInteracting] = React.useState(false)
  const isInteractingRef = React.useRef(isInteracting)
  const lastInteractionAtRef = React.useRef(0)
  const interactionSettleTimerRef = React.useRef<number | null>(null)
  const deferredFullRedrawHandleRef = React.useRef<number | null>(null)
  const deferredFullRedrawTokenRef = React.useRef(0)
  const renderSchedulerRef = React.useRef<EngineRenderScheduler | null>(null)
  const deferredImageWakeupPendingRef = React.useRef(false)
  const renderRequestStatsRef = React.useRef({
    lastReason: 'none',
    renderPhase: 'settled' as RuntimeRenderPhase,
    renderPhaseTransitionCount: 0,
    lastRenderPhaseTransition: 'none',
    renderPolicyQuality: 'full' as 'full' | 'interactive',
    renderPolicyDpr: 'auto' as number | 'auto',
    viewportInteractionType: 'other' as 'pan' | 'zoom' | 'other',
    overlayMode: 'full' as 'full' | 'degraded',
    renderPolicyTransitionCount: 0,
    lastRenderPolicyTransition: 'none',
    overlayDegraded: false,
    overlayGuideInputCount: 0,
    overlayGuideKeptCount: 0,
    overlayGuideDroppedCount: 0,
    overlayGuideSelectionStrategy: 'full' as 'full' | 'axis-first' | 'axis-relevance',
    overlayPathEditWhitelistActive: false,
    sceneDirtyCount: 0,
    deferredImageDrainCount: 0,
    idleRedrawCount: 0,
    interactiveCount: 0,
    offscreenSceneDirtySkipCount: 0,
    forcedSceneDirtyRenderCount: 0,
    offscreenSceneDirtySkipConsecutiveMaxCount: 0,
    dirtyBoundsMarkSmallAreaCount: 0,
    dirtyBoundsMarkMediumAreaCount: 0,
    dirtyBoundsMarkLargeAreaCount: 0,
  })
  const latestRenderPrepStatsRef = React.useRef({
    dirtyCandidateCount: 0,
    dirtyOffscreenCount: 0,
    offscreenSceneDirtySkipConsecutiveCount: 0,
    dirtyBoundsMarkCount: 0,
    dirtyBoundsMarkArea: 0,
  })
  const latestPlanDiagnosticsRef = React.useRef({
    framePlanVersion: 0,
    framePlanCandidateCount: 0,
    framePlanSceneNodeCount: 0,
    framePlanVisibleRatio: 0,
    framePlanShortlistActive: false,
    framePlanShortlistCandidateRatio: 0,
    framePlanShortlistAppliedCandidateCount: 0,
    framePlanShortlistPendingState: null as boolean | null,
    framePlanShortlistPendingFrameCount: 0,
    framePlanShortlistToggleCount: 0,
    framePlanShortlistDebounceBlockedToggleCount: 0,
    framePlanShortlistEnterRatioThreshold: 0,
    framePlanShortlistLeaveRatioThreshold: 0,
    framePlanShortlistStableFrameCount: 0,
    hitPlanVersion: 0,
    hitPlanCandidateCount: 0,
    hitPlanHitCount: 0,
    hitPlanExactCheckCount: 0,
  })
  const lastPlanDiagnosticSampleAtRef = React.useRef(0)
  const protectedNodeSignatureRef = React.useRef('')
  const previewSceneRevisionRef = React.useRef(0)
  const previousRenderPrepRef = React.useRef<{
    revision: number
    document: EditorDocument
    shapes: SceneShapeSnapshot[]
    viewport: CanvasViewportState
  } | null>(null)
  const replayScenePayload = React.useMemo<CreateEngineSceneFromRuntimeSnapshotOptions>(
    () => ({
      document,
      shapes,
      revision: stats.version,
      backgroundFill: '#ffffff',
      backgroundStroke: '#d0d7de',
    }),
    [document, shapes, stats.version],
  )
  const renderPolicy = React.useMemo(
    () => resolveRuntimeRenderPolicy({
      phase: interactionPhase,
      lodLevel,
      lodConfig,
    }),
    [interactionPhase, lodConfig, lodLevel],
  )

  isInteractingRef.current = isInteracting

  const cancelDeferredFullRedraw = React.useCallback(() => {
    if (deferredFullRedrawHandleRef.current === null) {
      return
    }

    const idleApi = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (idleApi.cancelIdleCallback) {
      idleApi.cancelIdleCallback(deferredFullRedrawHandleRef.current)
    } else {
      window.clearTimeout(deferredFullRedrawHandleRef.current)
    }

    deferredFullRedrawHandleRef.current = null
  }, [])

  const cancelScheduledRender = React.useCallback(() => {
    renderSchedulerRef.current?.cancel()
  }, [])

  const requestEngineRender = React.useCallback((
    mode: 'interactive' | 'normal' = 'normal',
    reason: 'scene-dirty' | 'deferred-image-drain' | 'idle-redraw' | 'interactive-viewport' = 'scene-dirty',
  ) => {
    // Track request sources in the app adapter so idle redraw churn can be
    // attributed without touching the engine scheduler contract.
    renderRequestStatsRef.current.lastReason = reason
    if (reason === 'scene-dirty') {
      renderRequestStatsRef.current.sceneDirtyCount += 1
    } else if (reason === 'deferred-image-drain') {
      renderRequestStatsRef.current.deferredImageDrainCount += 1
    } else if (reason === 'idle-redraw') {
      renderRequestStatsRef.current.idleRedrawCount += 1
    } else if (reason === 'interactive-viewport') {
      renderRequestStatsRef.current.interactiveCount += 1
    }
    renderSchedulerRef.current?.request(mode)
  }, [])

  React.useEffect(() => {
    assetUrlByIdRef.current = buildDocumentImageAssetUrlMap(document)
  }, [document])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const engine = createEngine({
      canvas,
      // Keep culling as a top-level engine option for clearer host config.
      culling: true,
      // LOD is now configured at createEngine top-level.
      lod: ENGINE_RENDER_LOD_CONFIG as {
        enabled: boolean
        options?: {
          mode?: 'conservative' | 'moderate' | 'aggressive'
        }
      },
      // Overscan is also a top-level knob and will merge into tile config.
      overscan: {
        enabled: false,
        borderPx: 240,
      },
      render: {
        quality: 'full',
        webglClearColor: [0.9529, 0.9569, 0.9647, 1],
        // Enable tile-based caching with multiple zoom levels
        tileConfig: {
          // Tile cache path is not fully wired in WebGL yet (invalidation/render
          // reuse is still TODO), so keep it off to avoid cache-related drift.
          enabled: false,
          tileSizePx: 512,
          maxCacheSize: 64,
        },
        // Enable initial render optimization with low-DPR preview
        initialRender: {
          // Progressive startup currently switches DPR after first committed
          // frame, which can present a transient transform drift.
          enabled: false,
          lowDprPreview: 0.5, // Keep preview readable while still reducing startup cost
          previewDelayMs: 50,  // Show preview after 50ms
          detailPassDelayMs: 200,  // Start detail pass after 200ms
        },
        interactionPreview: {
          enabled: false,
        },
      },
      resource: {
        loader: {
          resolveImage: (assetId) => {
            const src = assetUrlByIdRef.current.get(assetId)
            if (!src) {
              return null
            }

            const cached = imageCacheRef.current.get(src)
            if (cached) {
              return cached.complete && cached.naturalWidth > 0
                ? cached
                : null
            }

            const image = new Image()
            image.decoding = 'async'
            // Resume a settled render only when the browser has an actual image
            // ready, instead of spinning deferred drain frames with no upload progress.
            image.onload = () => {
              if (
                isInteractingRef.current ||
                deferredImageWakeupPendingRef.current
              ) {
                return
              }

              deferredImageWakeupPendingRef.current = true
              requestEngineRender('normal', 'idle-redraw')
            }
            image.onerror = () => {
              imageCacheRef.current.delete(src)
            }
            image.src = src
            imageCacheRef.current.set(src, image)
            return null
          },
        },
      },
      debug: {
        onStats: (nextStats) => {
          if (!ENABLE_RUNTIME_RENDER_DIAGNOSTICS) {
            return
          }
          const webglStats = nextStats as typeof nextStats & {
            engineFrameQuality?: 'full' | 'interactive'
            webglRenderPath?: 'model-complete' | 'packet'
            webglInteractiveTextFallbackCount?: number
            webglImageTextureUploadCount?: number
            webglImageTextureUploadBytes?: number
            webglDeferredImageTextureCount?: number
            webglTextTextureUploadCount?: number
            webglTextTextureUploadBytes?: number
            webglTextCacheHitCount?: number
            webglPrecomputedTextCacheKeyCount?: number
            webglFallbackTextCacheKeyCount?: number
            webglCompositeUploadBytes?: number
            canvas2dTrivialPathFastPathCount?: number
            canvas2dContourParseCount?: number
            canvas2dSingleLineTextFastPathCount?: number
            canvas2dPrecomputedTextLineHeightCount?: number
            l0PreviewHitCount?: number
            l0PreviewMissCount?: number
            l1CompositeHitCount?: number
            l1CompositeMissCount?: number
            l2TileHitCount?: number
            l2TileMissCount?: number
            cacheFallbackReason?: string
          }
          const now = performance.now()
          if (now - lastPlanDiagnosticSampleAtRef.current >= PLAN_DIAGNOSTIC_SAMPLE_MS) {
            // Poll planner diagnostics at a lower cadence so debug introspection
            // does not add fixed per-frame overhead to interactive rendering.
            const runtimeDiagnostics = engineRef.current?.getDiagnostics()
            const shortlistDiagnostics = (runtimeDiagnostics as {
              shortlist?: {
                active?: boolean
                candidateRatio?: number
                appliedCandidateCount?: number
                pendingState?: boolean | null
                pendingFrameCount?: number
                toggleCount?: number
                debounceBlockedToggleCount?: number
                enterRatioThreshold?: number
                leaveRatioThreshold?: number
                stableFrameCount?: number
              }
            } | undefined)?.shortlist
            const framePlanVersion = runtimeDiagnostics?.framePlan?.planVersion ?? 0
            const framePlanCandidateCount = runtimeDiagnostics?.framePlan?.candidateCount ?? 0
            const framePlanSceneNodeCount = runtimeDiagnostics?.framePlan?.sceneNodeCount ?? 0
            const framePlanVisibleRatio = framePlanSceneNodeCount > 0
              ? framePlanCandidateCount / framePlanSceneNodeCount
              : 0
            latestPlanDiagnosticsRef.current = {
              framePlanVersion,
              framePlanCandidateCount,
              framePlanSceneNodeCount,
              framePlanVisibleRatio,
              framePlanShortlistActive: shortlistDiagnostics?.active ?? false,
              framePlanShortlistCandidateRatio: shortlistDiagnostics?.candidateRatio ?? 0,
              framePlanShortlistAppliedCandidateCount:
                shortlistDiagnostics?.appliedCandidateCount ?? 0,
              framePlanShortlistPendingState:
                shortlistDiagnostics?.pendingState ?? null,
              framePlanShortlistPendingFrameCount:
                shortlistDiagnostics?.pendingFrameCount ?? 0,
              framePlanShortlistToggleCount:
                shortlistDiagnostics?.toggleCount ?? 0,
              framePlanShortlistDebounceBlockedToggleCount:
                shortlistDiagnostics?.debounceBlockedToggleCount ?? 0,
              framePlanShortlistEnterRatioThreshold:
                shortlistDiagnostics?.enterRatioThreshold ?? 0,
              framePlanShortlistLeaveRatioThreshold:
                shortlistDiagnostics?.leaveRatioThreshold ?? 0,
              framePlanShortlistStableFrameCount:
                shortlistDiagnostics?.stableFrameCount ?? 0,
              hitPlanVersion: runtimeDiagnostics?.hitPlan?.planVersion ?? 0,
              hitPlanCandidateCount: runtimeDiagnostics?.hitPlan?.candidateCount ?? 0,
              hitPlanHitCount: runtimeDiagnostics?.hitPlan?.hitCount ?? 0,
              hitPlanExactCheckCount: (
                runtimeDiagnostics?.hitPlan as {exactCheckCount?: number} | null | undefined
              )?.exactCheckCount ?? 0,
            }
            lastPlanDiagnosticSampleAtRef.current = now
          }
          const planDiagnostics = latestPlanDiagnosticsRef.current
          const renderPrepDirtyCandidateCount = latestRenderPrepStatsRef.current.dirtyCandidateCount
          const renderPrepDirtyOffscreenCount = latestRenderPrepStatsRef.current.dirtyOffscreenCount
          const offscreenSceneDirtySkipConsecutiveCount =
            latestRenderPrepStatsRef.current.offscreenSceneDirtySkipConsecutiveCount
          const dirtyBoundsMarkCount = latestRenderPrepStatsRef.current.dirtyBoundsMarkCount
          const dirtyBoundsMarkArea = latestRenderPrepStatsRef.current.dirtyBoundsMarkArea
          const deferredImageTextureCount =
            webglStats.webglDeferredImageTextureCount ?? 0
          const renderRequestStats = renderRequestStatsRef.current
          const groupCollapseStats = nextStats as {
            groupCollapseCount?: number
            groupCollapseCulledCount?: number
          }

          deferredImageWakeupPendingRef.current = false

          drawSerialRef.current += 1
          publishRuntimeRenderDiagnostics({
            frameCount: drawSerialRef.current,
            drawCount: nextStats.drawCount,
            drawMs: nextStats.frameMs,
            engineFrameQuality: webglStats.engineFrameQuality ?? 'full',
            fpsInstantaneous: 0,
            fpsEstimate: 0,
            fpsPeak: 0,
            fpsEstimatePeak: 0,
            fpsReached60: false,
            fpsReached120: false,
            visibleShapeCount: nextStats.visibleCount,
            groupCollapseCount: groupCollapseStats.groupCollapseCount ?? 0,
            groupCollapseCulledCount: groupCollapseStats.groupCollapseCulledCount ?? 0,
            framePlanVersion: planDiagnostics.framePlanVersion,
            framePlanCandidateCount: planDiagnostics.framePlanCandidateCount,
            framePlanSceneNodeCount: planDiagnostics.framePlanSceneNodeCount,
            framePlanVisibleRatio: planDiagnostics.framePlanVisibleRatio,
            framePlanShortlistActive: planDiagnostics.framePlanShortlistActive,
            framePlanShortlistCandidateRatio: planDiagnostics.framePlanShortlistCandidateRatio,
            framePlanShortlistAppliedCandidateCount:
              planDiagnostics.framePlanShortlistAppliedCandidateCount,
            framePlanShortlistPendingState:
              planDiagnostics.framePlanShortlistPendingState,
            framePlanShortlistPendingFrameCount:
              planDiagnostics.framePlanShortlistPendingFrameCount,
            framePlanShortlistToggleCount:
              planDiagnostics.framePlanShortlistToggleCount,
            framePlanShortlistDebounceBlockedToggleCount:
              planDiagnostics.framePlanShortlistDebounceBlockedToggleCount,
            framePlanShortlistEnterRatioThreshold:
              planDiagnostics.framePlanShortlistEnterRatioThreshold,
            framePlanShortlistLeaveRatioThreshold:
              planDiagnostics.framePlanShortlistLeaveRatioThreshold,
            framePlanShortlistStableFrameCount:
              planDiagnostics.framePlanShortlistStableFrameCount,
            hitPlanVersion: planDiagnostics.hitPlanVersion,
            hitPlanCandidateCount: planDiagnostics.hitPlanCandidateCount,
            hitPlanHitCount: planDiagnostics.hitPlanHitCount,
            hitPlanExactCheckCount: planDiagnostics.hitPlanExactCheckCount,
            renderPrepDirtyCandidateCount,
            renderPrepDirtyOffscreenCount,
            offscreenSceneDirtyForceRenderFrameThreshold:
              SCENE_DIRTY_SKIP_FORCE_RENDER_FRAMES,
            dirtyBoundsSmallAreaThreshold: DIRTY_BOUNDS_SMALL_AREA_PX2,
            dirtyBoundsMediumAreaThreshold: DIRTY_BOUNDS_MEDIUM_AREA_PX2,
            offscreenSceneDirtySkipConsecutiveCount,
            offscreenSceneDirtySkipConsecutiveMaxCount:
              renderRequestStats.offscreenSceneDirtySkipConsecutiveMaxCount,
            offscreenSceneDirtyRiskWatchSkipRateThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY.watchSkipRateThreshold,
            offscreenSceneDirtyRiskHighSkipRateThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY.highSkipRateThreshold,
            offscreenSceneDirtyRiskHighForcedPerSecondThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY.highForcedPerSecondThreshold,
            sceneDirtyProlongedHighRiskSecondsThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY.prolongedHighRiskSecondsThreshold,
            sceneDirtyTransitionRateWatchThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY.transitionRateWatchThreshold,
            sceneDirtyTrendWindowFrames:
              DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY.trendWindowFrames,
            offscreenSceneDirtyForcedSpikePerSecondThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY.forcedSpikePerSecondThreshold,
            offscreenSceneDirtySkipSpikePerSecondThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY.skipSpikePerSecondThreshold,
            sceneDirtyRiskScoreHighThreshold:
              DEFAULT_RUNTIME_DIRTY_REGION_TREND_POLICY.riskScoreHighThreshold,
            sceneDirtyRiskScoreSkipWeight:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY.skipWeight,
            sceneDirtyRiskScoreForcedWeight:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY.forcedWeight,
            sceneDirtyRiskScoreStreakWeight:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY.streakWeight,
            sceneDirtyRiskScoreForcedRateScale:
              DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY.forcedRateScale,
            dirtyBoundsMarkCount,
            dirtyBoundsMarkArea,
            dirtyBoundsMarkSmallAreaCount:
              renderRequestStats.dirtyBoundsMarkSmallAreaCount,
            dirtyBoundsMarkMediumAreaCount:
              renderRequestStats.dirtyBoundsMarkMediumAreaCount,
            dirtyBoundsMarkLargeAreaCount:
              renderRequestStats.dirtyBoundsMarkLargeAreaCount,
            cacheHitCount: nextStats.cacheHits,
            cacheMissCount: nextStats.cacheMisses,
            frameReuseHitCount: nextStats.frameReuseHits,
            frameReuseMissCount: nextStats.frameReuseMisses,
            cacheMode: nextStats.frameReuseHits > 0 ? 'frame' : 'none',
            webglRenderPath: webglStats.webglRenderPath ?? 'none',
            webglInteractiveTextFallbackCount:
              webglStats.webglInteractiveTextFallbackCount ?? 0,
            webglImageTextureUploadCount:
              webglStats.webglImageTextureUploadCount ?? 0,
            webglImageTextureUploadBytes:
              webglStats.webglImageTextureUploadBytes ?? 0,
            webglImageDownsampledUploadCount:
              webglStats.webglImageDownsampledUploadCount ?? 0,
            webglImageDownsampledUploadBytesSaved:
              webglStats.webglImageDownsampledUploadBytesSaved ?? 0,
            webglDeferredImageTextureCount:
              deferredImageTextureCount,
            webglTextTextureUploadCount:
              webglStats.webglTextTextureUploadCount ?? 0,
            webglTextTextureUploadBytes:
              webglStats.webglTextTextureUploadBytes ?? 0,
            webglTextCacheHitCount:
              webglStats.webglTextCacheHitCount ?? 0,
            webglPrecomputedTextCacheKeyCount:
              webglStats.webglPrecomputedTextCacheKeyCount ?? 0,
            webglFallbackTextCacheKeyCount:
              webglStats.webglFallbackTextCacheKeyCount ?? 0,
            webglFrameReuseEdgeRedrawCount:
              webglStats.webglFrameReuseEdgeRedrawCount ?? 0,
            webglCompositeUploadBytes:
              webglStats.webglCompositeUploadBytes ?? 0,
            canvas2dTrivialPathFastPathCount:
              webglStats.canvas2dTrivialPathFastPathCount ?? 0,
            canvas2dContourParseCount:
              webglStats.canvas2dContourParseCount ?? 0,
            canvas2dSingleLineTextFastPathCount:
              webglStats.canvas2dSingleLineTextFastPathCount ?? 0,
            canvas2dPrecomputedTextLineHeightCount:
              webglStats.canvas2dPrecomputedTextLineHeightCount ?? 0,
            l0PreviewHitCount:
              webglStats.l0PreviewHitCount ?? 0,
            l0PreviewMissCount:
              webglStats.l0PreviewMissCount ?? 0,
            l1CompositeHitCount:
              webglStats.l1CompositeHitCount ?? 0,
            l1CompositeMissCount:
              webglStats.l1CompositeMissCount ?? 0,
            l2TileHitCount:
              webglStats.l2TileHitCount ?? 0,
            l2TileMissCount:
              webglStats.l2TileMissCount ?? 0,
            cacheFallbackReason:
              webglStats.cacheFallbackReason ?? 'none',
            lastRenderRequestReason: renderRequestStats.lastReason,
            renderPhase: renderRequestStats.renderPhase,
            renderPhaseTransitionCount:
              renderRequestStats.renderPhaseTransitionCount,
            lastRenderPhaseTransition:
              renderRequestStats.lastRenderPhaseTransition,
            renderPolicyQuality: renderRequestStats.renderPolicyQuality,
            renderPolicyDpr: renderRequestStats.renderPolicyDpr,
            viewportInteractionType: renderRequestStats.viewportInteractionType,
            overlayMode: renderRequestStats.overlayMode,
            renderPolicyTransitionCount:
              renderRequestStats.renderPolicyTransitionCount,
            lastRenderPolicyTransition:
              renderRequestStats.lastRenderPolicyTransition,
            overlayDegraded: renderRequestStats.overlayDegraded,
            overlayGuideInputCount: renderRequestStats.overlayGuideInputCount,
            overlayGuideKeptCount: renderRequestStats.overlayGuideKeptCount,
            overlayGuideDroppedCount: renderRequestStats.overlayGuideDroppedCount,
            overlayGuideSelectionStrategy:
              renderRequestStats.overlayGuideSelectionStrategy,
            overlayPathEditWhitelistActive:
              renderRequestStats.overlayPathEditWhitelistActive,
            sceneDirtyRequestCount: renderRequestStats.sceneDirtyCount,
            deferredImageDrainRequestCount: renderRequestStats.deferredImageDrainCount,
            idleRedrawRequestCount: renderRequestStats.idleRedrawCount,
            interactiveRequestCount: renderRequestStats.interactiveCount,
            offscreenSceneDirtySkipRequestCount:
              renderRequestStats.offscreenSceneDirtySkipCount,
            forcedSceneDirtyRequestCount:
              renderRequestStats.forcedSceneDirtyRenderCount,
          })

          // No auto-drain chaining here: image uploads wake rendering via
          // image.onload to prevent self-sustaining deferred request loops.
        },
      },
    })
    engineRef.current = engine
    renderSchedulerRef.current = createEngineRenderScheduler({
      render: () => engine.renderFrame(),
      interactiveIntervalMs: renderPolicy.interactiveIntervalMs,
    })

    return () => {
      cancelDeferredFullRedraw()
      cancelScheduledRender()
      if (interactionSettleTimerRef.current !== null) {
        window.clearTimeout(interactionSettleTimerRef.current)
        interactionSettleTimerRef.current = null
      }
      renderSchedulerRef.current?.dispose()
      renderSchedulerRef.current = null
      appliedQualityRef.current = null
      appliedDprRef.current = null
      appliedRenderSizeRef.current = null
      appliedViewportRef.current = null
      hasCommittedInitialViewportFrameRef.current = false
      viewportReadyRef.current = false
      pendingSceneRenderRef.current = false
      deferredImageWakeupPendingRef.current = false
      engineRef.current = null
      engine.dispose()
    }
  }, [cancelDeferredFullRedraw, cancelScheduledRender, renderPolicy.interactiveIntervalMs])

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine) {
      return
    }

    renderSchedulerRef.current?.dispose()
    renderSchedulerRef.current = createEngineRenderScheduler({
      render: () => engine.renderFrame(),
      interactiveIntervalMs: renderPolicy.interactiveIntervalMs,
    })

    return () => {
      renderSchedulerRef.current?.dispose()
      renderSchedulerRef.current = null
    }
  }, [renderPolicy.interactiveIntervalMs])

  React.useEffect(() => {
    lastInteractionAtRef.current = performance.now()
    setIsInteracting(true)
    if (interactionSettleTimerRef.current !== null) {
      window.clearTimeout(interactionSettleTimerRef.current)
    }
    interactionSettleTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false)
      interactionSettleTimerRef.current = null
    }, INTERACTION_SETTLE_MS)
  }, [INTERACTION_SETTLE_MS, viewport.offsetX, viewport.offsetY, viewport.scale])

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine) {
      return
    }

    const sceneDirtyRenderMode: 'interactive' | 'normal' =
      interactionPhase === 'pan' || interactionPhase === 'zoom'
        ? 'interactive'
        : 'normal'

    const normalizedProtectedNodeIds = (
      protectedNodeIds
      ? [...protectedNodeIds]
      : shapes.filter((shape) => shape.isSelected).map((shape) => shape.id)
    ).sort()
    const protectedNodeSignature = normalizedProtectedNodeIds.join('|')
    if (protectedNodeSignatureRef.current !== protectedNodeSignature) {
      // Keep selected nodes and their ancestor groups out of aggressive
      // collapse so active manipulation remains visually stable.
      const engineWithProtectedNodes = engine as Engine & {
        setProtectedNodeIds?: (nodeIds?: readonly string[]) => void
      }
      engineWithProtectedNodes.setProtectedNodeIds?.(normalizedProtectedNodeIds)
      protectedNodeSignatureRef.current = protectedNodeSignature
    }

    const previous = previousRenderPrepRef.current
    const previousFrameCandidateIds =
      engine.getDiagnostics().framePlan?.candidateNodeIds
    const preparedFrame = prepareRenderFrame({
      revision: stats.version,
      document,
      previousDocument: previous?.document ?? null,
      shapes,
      previousShapes: previous?.shapes ?? [],
      previousFrameCandidateIds,
      overlay: {
        selectedShapeIds: shapes.filter((shape) => shape.isSelected).map((shape) => shape.id),
        hoveredShapeId: shapes.find((shape) => shape.isHovered)?.id ?? null,
        marqueeActive: false,
        snapGuideCount: 0,
      },
      includePicking: false,
      cameraDirty:
        !previous ||
        previous.viewport.scale !== viewport.scale ||
        previous.viewport.offsetX !== viewport.offsetX ||
        previous.viewport.offsetY !== viewport.offsetY ||
        previous.viewport.viewportWidth !== viewport.viewportWidth ||
        previous.viewport.viewportHeight !== viewport.viewportHeight,
    })
    const shouldForcePreviewOnlySceneReload = Boolean(
      previous &&
      previous.revision === stats.version &&
      previous.document !== document &&
      !preparedFrame.scene.dirty &&
      interactionPhase !== 'pan' &&
      interactionPhase !== 'zoom',
    )

    if (preparedFrame.scene.dirty || shouldForcePreviewOnlySceneReload) {
      let dirtyBoundsMarkCount = 0
      let dirtyBoundsMarkArea = 0
      const shouldRenderSceneDirtyNow =
        shouldForcePreviewOnlySceneReload ||
        preparedFrame.dirtyState.sceneStructureDirty ||
        preparedFrame.dirtyState.dirtyCandidateCount > 0 ||
        preparedFrame.dirtyState.previousFrameCandidateCount === 0
      const nextOffscreenSceneDirtySkipConsecutiveCount = shouldRenderSceneDirtyNow
        ? 0
        : latestRenderPrepStatsRef.current.offscreenSceneDirtySkipConsecutiveCount + 1
      const shouldForceOffscreenSceneDirtyRender =
        nextOffscreenSceneDirtySkipConsecutiveCount >= SCENE_DIRTY_SKIP_FORCE_RENDER_FRAMES
      if (preparedFrame.dirtyState.sceneStructureDirty || !previous || shouldForcePreviewOnlySceneReload) {
        const nextEngineScene = createEngineSceneFromRuntimeSnapshot(
          shouldForcePreviewOnlySceneReload
            ? {
                ...replayScenePayload,
                revision: `${stats.version}:preview:${++previewSceneRevisionRef.current}`,
              }
            : replayScenePayload,
        )
        engine.loadScene(nextEngineScene)
      } else {
        const changedIds = resolveExpandedChangedIds(preparedFrame.dirtyState.sceneInstanceIds, document)
        const incrementalScene = createEngineSceneFromRuntimeSnapshot({
          ...replayScenePayload,
          includeShapeIds: changedIds,
          includeDocumentBackground: false,
        })
        const upsertNodes = incrementalScene.nodes

        if (upsertNodes.length > 0) {
          engine.applyScenePatchBatch({
            patches: [{
              revision: stats.version,
              upsertNodes,
            }],
          })
          // Coalesce dirty marks to one merged region so tile invalidation can
          // stay local even when many nodes are updated in one patch burst.
          // Include both previous and next positions so moved nodes invalidate
          // the tiles they vacated as well as the tiles they now occupy.
          const mergedDirtyBounds = resolveMergedNodeBounds({
            nodes: upsertNodes,
            currentDocument: document,
            previousDocument: previous.document,
            changedIds,
          })
          if (mergedDirtyBounds) {
            engine.markDirtyBounds(mergedDirtyBounds)
            dirtyBoundsMarkCount = 1
            dirtyBoundsMarkArea = Math.max(
              0,
              Math.abs(mergedDirtyBounds.width * mergedDirtyBounds.height),
            )
            // Bucket dirty invalidation area to spot whether redraw pressure is
            // dominated by tiny local edits or broad invalidation bursts.
            if (dirtyBoundsMarkArea <= DIRTY_BOUNDS_SMALL_AREA_PX2) {
              renderRequestStatsRef.current.dirtyBoundsMarkSmallAreaCount += 1
            } else if (dirtyBoundsMarkArea <= DIRTY_BOUNDS_MEDIUM_AREA_PX2) {
              renderRequestStatsRef.current.dirtyBoundsMarkMediumAreaCount += 1
            } else {
              renderRequestStatsRef.current.dirtyBoundsMarkLargeAreaCount += 1
            }
          }
        }
      }

      if (!shouldRenderSceneDirtyNow && !shouldForceOffscreenSceneDirtyRender) {
        // Keep scene state in sync but skip immediate redraw when all dirty
        // nodes are outside the previous frame's candidate set.
        renderRequestStatsRef.current.lastReason = 'offscreen-scene-dirty-skip'
        renderRequestStatsRef.current.offscreenSceneDirtySkipCount += 1
        // Track peak skip streak so long-run starvation pressure is visible
        // even after intermittent forced flushes reset the live streak.
        renderRequestStatsRef.current.offscreenSceneDirtySkipConsecutiveMaxCount = Math.max(
          renderRequestStatsRef.current.offscreenSceneDirtySkipConsecutiveMaxCount,
          nextOffscreenSceneDirtySkipConsecutiveCount,
        )
      } else if (!appliedViewportRef.current) {
        // Queue scene-driven render until viewport alignment is committed to
        // avoid one startup frame using stale/default viewport transforms.
        pendingSceneRenderRef.current = true
        if (shouldForceOffscreenSceneDirtyRender) {
          renderRequestStatsRef.current.forcedSceneDirtyRenderCount += 1
        }
      } else {
        requestEngineRender(sceneDirtyRenderMode, 'scene-dirty')
        if (shouldForceOffscreenSceneDirtyRender) {
          renderRequestStatsRef.current.forcedSceneDirtyRenderCount += 1
        }
      }

      latestRenderPrepStatsRef.current = {
        dirtyCandidateCount: preparedFrame.dirtyState.dirtyCandidateCount,
        dirtyOffscreenCount: preparedFrame.dirtyState.dirtyOffscreenCount,
        offscreenSceneDirtySkipConsecutiveCount:
          shouldRenderSceneDirtyNow || shouldForceOffscreenSceneDirtyRender
            ? 0
            : nextOffscreenSceneDirtySkipConsecutiveCount,
        dirtyBoundsMarkCount,
        dirtyBoundsMarkArea,
      }
    } else {
      latestRenderPrepStatsRef.current = {
        dirtyCandidateCount: preparedFrame.dirtyState.dirtyCandidateCount,
        dirtyOffscreenCount: preparedFrame.dirtyState.dirtyOffscreenCount,
        offscreenSceneDirtySkipConsecutiveCount: 0,
        dirtyBoundsMarkCount: 0,
        dirtyBoundsMarkArea: 0,
      }
    }

    previousRenderPrepRef.current = {
      revision: stats.version,
      document,
      shapes,
      viewport,
    }
  }, [
    document,
    protectedNodeIds,
    replayScenePayload,
    requestEngineRender,
    interactionPhase,
    shapes,
    stats.version,
    viewport,
  ])

  React.useEffect(() => {
    const canvas = canvasRef.current
    const engine = engineRef.current
    if (!canvas || !engine) {
      return
    }

    const previousPhase = renderRequestStatsRef.current.renderPhase
    const previousQuality = renderRequestStatsRef.current.renderPolicyQuality
    const previousDpr = renderRequestStatsRef.current.renderPolicyDpr
    const previousOverlayMode = renderRequestStatsRef.current.overlayMode
    renderRequestStatsRef.current.renderPhase = interactionPhase
    renderRequestStatsRef.current.overlayMode = renderPolicy.overlayMode
    renderRequestStatsRef.current.overlayDegraded = overlayDiagnostics?.degraded ?? false
    renderRequestStatsRef.current.overlayGuideInputCount = overlayDiagnostics?.guideInputCount ?? 0
    renderRequestStatsRef.current.overlayGuideKeptCount = overlayDiagnostics?.guideKeptCount ?? 0
    renderRequestStatsRef.current.overlayGuideDroppedCount = overlayDiagnostics?.guideDroppedCount ?? 0
    renderRequestStatsRef.current.overlayGuideSelectionStrategy =
      overlayDiagnostics?.guideSelectionStrategy ?? 'full'
    renderRequestStatsRef.current.overlayPathEditWhitelistActive =
      overlayDiagnostics?.pathEditWhitelistActive ?? false
    const nextDpr = renderPolicy.dpr
    const dprChanged = appliedDprRef.current !== nextDpr
    renderRequestStatsRef.current.renderPolicyDpr = nextDpr
    if (appliedDprRef.current !== nextDpr) {
      engine.setDpr(nextDpr, {maxDpr: 2})
      appliedDprRef.current = nextDpr
    }

    // Keep quality transitions policy-driven so phase tuning does not spread.
    const nextQuality = renderPolicy.quality
    const qualityChanged = appliedQualityRef.current !== nextQuality
    renderRequestStatsRef.current.renderPolicyQuality = nextQuality
    if (appliedQualityRef.current !== nextQuality) {
      engine.setQuality(nextQuality)
      appliedQualityRef.current = nextQuality
    }

    const previewConfigurableEngine = engine as Engine & {
      setInteractionPreview?: (config?: {enabled?: boolean; mode?: 'interaction' | 'zoom-only'; maxScaleStep?: number; maxTranslatePx?: number}) => void
    }
    previewConfigurableEngine.setInteractionPreview?.(
      renderPolicy.interactionPreview === false
        ? {enabled: false}
        : renderPolicy.interactionPreview,
    )

    // Keep a compact transition trail so policy tuning can verify phase and
    // degradation switches instead of relying only on the current snapshot.
    if (previousPhase !== interactionPhase) {
      renderRequestStatsRef.current.renderPhaseTransitionCount += 1
      renderRequestStatsRef.current.lastRenderPhaseTransition = `${previousPhase}->${interactionPhase}`
    }

    if (
      previousQuality !== nextQuality ||
      previousDpr !== nextDpr ||
      previousOverlayMode !== renderPolicy.overlayMode
    ) {
      renderRequestStatsRef.current.renderPolicyTransitionCount += 1
      renderRequestStatsRef.current.lastRenderPolicyTransition =
        `${previousQuality}/${String(previousDpr)}/${previousOverlayMode}` +
        `->${nextQuality}/${String(nextDpr)}/${renderPolicy.overlayMode}`
    }

    if (viewport.viewportWidth <= 1 || viewport.viewportHeight <= 1) {
      // Only trust runtime-measured viewport dimensions here.
      // Rendering against DOM fallback size can paint one pre-fit frame and
      // then snap when runtime applies the first fitViewport transform.
      viewportReadyRef.current = false
      return
    }

    viewportReadyRef.current = true
    const width = Math.max(1, Math.floor(viewport.viewportWidth))
    const height = Math.max(1, Math.floor(viewport.viewportHeight))
    const renderWidth = width + OVERSCAN_PX * 2
    const renderHeight = height + OVERSCAN_PX * 2
    const renderSizeChanged =
      !appliedRenderSizeRef.current ||
      appliedRenderSizeRef.current.width !== renderWidth ||
      appliedRenderSizeRef.current.height !== renderHeight
    if (
      !appliedRenderSizeRef.current ||
      appliedRenderSizeRef.current.width !== renderWidth ||
      appliedRenderSizeRef.current.height !== renderHeight
    ) {
      engine.resize(renderWidth, renderHeight)
      appliedRenderSizeRef.current = {width: renderWidth, height: renderHeight}
    }
    const nextViewportState = {
      viewportWidth: renderWidth,
      viewportHeight: renderHeight,
      offsetX: viewport.offsetX + OVERSCAN_PX,
      offsetY: viewport.offsetY + OVERSCAN_PX,
      scale: viewport.scale,
    }
    const viewportChanged =
      !appliedViewportRef.current ||
      appliedViewportRef.current.viewportWidth !== nextViewportState.viewportWidth ||
      appliedViewportRef.current.viewportHeight !== nextViewportState.viewportHeight ||
      appliedViewportRef.current.offsetX !== nextViewportState.offsetX ||
      appliedViewportRef.current.offsetY !== nextViewportState.offsetY ||
      appliedViewportRef.current.scale !== nextViewportState.scale
    if (viewportChanged) {
      engine.setViewport(nextViewportState)
      appliedViewportRef.current = nextViewportState
    }

    const renderStateChanged =
      dprChanged ||
      qualityChanged ||
      renderSizeChanged ||
      viewportChanged
    const shouldFlushPendingSceneRender =
      pendingSceneRenderRef.current && Boolean(appliedViewportRef.current) && viewportReadyRef.current

    if (renderPolicy.interactionActive) {
      cancelDeferredFullRedraw()
      cancelScheduledRender()
      requestEngineRender('interactive', 'interactive-viewport')
      return
    }

    if (!renderStateChanged && !shouldFlushPendingSceneRender) {
      return
    }

    if (!hasCommittedInitialViewportFrameRef.current) {
      // Make the first post-layout frame immediate so startup does not show a
      // stale pre-layout viewport offset before deferred redraw kicks in.
      hasCommittedInitialViewportFrameRef.current = true
      cancelDeferredFullRedraw()
      cancelScheduledRender()
      if (shouldFlushPendingSceneRender) {
        pendingSceneRenderRef.current = false
        requestEngineRender('normal', 'scene-dirty')
      } else {
        requestEngineRender('normal', 'idle-redraw')
      }
      return
    }

    if (shouldFlushPendingSceneRender) {
      pendingSceneRenderRef.current = false
      cancelDeferredFullRedraw()
      cancelScheduledRender()
      requestEngineRender('normal', 'scene-dirty')
      return
    }

    // Defer full-quality redraw so a quick next pan can cancel it and keep
    // interaction input responsive on very large scenes.
    cancelDeferredFullRedraw()
    const redrawToken = ++deferredFullRedrawTokenRef.current
    const runDeferredFullRedraw = () => {
      if (deferredFullRedrawTokenRef.current !== redrawToken || isInteractingRef.current) {
        return
      }

      const quietForMs = performance.now() - lastInteractionAtRef.current
      if (quietForMs < FULL_REDRAW_QUIET_WINDOW_MS) {
        deferredFullRedrawHandleRef.current = window.setTimeout(() => {
          deferredFullRedrawHandleRef.current = null
          runDeferredFullRedraw()
        }, Math.max(0, FULL_REDRAW_QUIET_WINDOW_MS - quietForMs))
        return
      }

      requestEngineRender('normal', 'idle-redraw')
    }

    const idleApi = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    }
    if (idleApi.requestIdleCallback) {
      deferredFullRedrawHandleRef.current = idleApi.requestIdleCallback(() => {
        deferredFullRedrawHandleRef.current = null
        runDeferredFullRedraw()
      }, {timeout: FULL_REDRAW_IDLE_TIMEOUT_MS})
      return
    }

    deferredFullRedrawHandleRef.current = window.setTimeout(() => {
      deferredFullRedrawHandleRef.current = null
      runDeferredFullRedraw()
    }, FULL_REDRAW_DEFER_MS)
  }, [
    FULL_REDRAW_DEFER_MS,
    FULL_REDRAW_IDLE_TIMEOUT_MS,
    FULL_REDRAW_QUIET_WINDOW_MS,
    cancelDeferredFullRedraw,
    cancelScheduledRender,
    isInteracting,
    overlayDiagnostics,
    interactionPhase,
    viewportInteractionType,
    viewport,
    requestEngineRender,
  ])

  React.useEffect(() => {
    imageCacheRef.current.clear()
  }, [document.id])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'absolute',
        left: -OVERSCAN_PX,
        top: -OVERSCAN_PX,
        width: `calc(100% + ${OVERSCAN_PX * 2}px)`,
        height: `calc(100% + ${OVERSCAN_PX * 2}px)`,
        pointerEvents: 'none',
      }}
    />
  )
}

function resolveMergedNodeBounds(input: {
  nodes: ReadonlyArray<object>
  currentDocument?: EditorDocument | null
  previousDocument?: EditorDocument | null
  changedIds?: readonly string[]
}) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const includeBounds = (bounds: {
    x?: unknown
    y?: unknown
    width?: unknown
    height?: unknown
  }) => {
    const x = typeof bounds.x === 'number' ? bounds.x : null
    const y = typeof bounds.y === 'number' ? bounds.y : null
    const width = typeof bounds.width === 'number' ? bounds.width : null
    const height = typeof bounds.height === 'number' ? bounds.height : null
    if (x === null || y === null || width === null || height === null) {
      return
    }

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }

  for (const node of input.nodes) {
    const boundsNode = node as {
      x?: unknown
      y?: unknown
      width?: unknown
      height?: unknown
    }
    includeBounds(boundsNode)
  }

  const changedIdSet = input.changedIds ? new Set(input.changedIds) : null
  if (changedIdSet && input.currentDocument) {
    for (const shape of input.currentDocument.shapes) {
      if (changedIdSet.has(shape.id)) {
        includeBounds(shape)
      }
    }
  }

  if (changedIdSet && input.previousDocument) {
    for (const shape of input.previousDocument.shapes) {
      if (changedIdSet.has(shape.id)) {
        includeBounds(shape)
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

function resolveExpandedChangedIds(
  changedIds: readonly string[],
  document: EditorDocument,
) {
  if (changedIds.length === 0) {
    return []
  }

  const changedIdSet = new Set(changedIds)
  const expanded = new Set(changedIds)
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const childrenByParentId = new Map<string, string[]>()

  for (const shape of document.shapes) {
    if (!shape.parentId) {
      continue
    }

    const siblings = childrenByParentId.get(shape.parentId)
    if (siblings) {
      siblings.push(shape.id)
      continue
    }

    childrenByParentId.set(shape.parentId, [shape.id])
  }

  // Keep incremental patch ids closed over hierarchy so grouped edits do not
  // emit only container/group nodes and accidentally drop visible descendants.
  const includeDescendants = (parentId: string) => {
    const queue = [...(childrenByParentId.get(parentId) ?? [])]
    while (queue.length > 0) {
      const childId = queue.shift()
      if (!childId) {
        continue
      }

      if (!expanded.has(childId)) {
        expanded.add(childId)
      }

      const grandChildren = childrenByParentId.get(childId)
      if (grandChildren && grandChildren.length > 0) {
        queue.push(...grandChildren)
      }
    }
  }

  // Also keep ancestor groups in the patch set so parent bounds and hierarchy
  // metadata remain synchronized when only child geometry changes.
  const includeAncestors = (shapeId: string) => {
    let parentId = shapeById.get(shapeId)?.parentId ?? null
    while (parentId) {
      if (expanded.has(parentId)) {
        break
      }

      expanded.add(parentId)
      parentId = shapeById.get(parentId)?.parentId ?? null
    }
  }

  for (const shapeId of changedIds) {
    includeDescendants(shapeId)
    includeAncestors(shapeId)
  }

  // If a clip source changed, clipped images also need refresh.
  // If a clipped image changed, keep its clip source in the patch set too.
  for (const shape of document.shapes) {
    if (!shape.clipPathId) {
      continue
    }

    if (changedIdSet.has(shape.clipPathId)) {
      expanded.add(shape.id)
    }
    if (changedIdSet.has(shape.id)) {
      expanded.add(shape.clipPathId)
    }
  }

  return Array.from(expanded)
}
