import * as React from 'react'
import type {
  RuntimeEngine as Engine,
} from '../../engine.ts'
import type {CanvasViewportState as EngineViewportState} from '../../../index.ts'
import {type RuntimeRenderPhase} from '../engineTypes.ts'
import {VECTOR_ENGINE_SCENE_PROFILE} from './engineSceneProfile.ts'
import {resolveViewportSettleDirtyBounds} from './viewportSettleDirtyBounds/viewportSettleDirtyBounds.ts'
import {commitViewportState, invalidateSceneRegions} from '../../engineContractAdapters.ts'

const OVERSCAN_PX = VECTOR_ENGINE_SCENE_PROFILE.overscanPx
const FULL_REDRAW_QUIET_WINDOW_MS = 140
const FULL_REDRAW_IDLE_TIMEOUT_MS = 80
const FULL_REDRAW_DEFER_MS = 32
const RESIZE_COMMIT_DEFER_MS = 260
const RESIZE_COMMIT_THRESHOLD_PX = 96
const HIGH_ZOOM_FORCE_NORMAL_RENDER_SCALE = 2

/**
 * Commits viewport and output size updates into the engine with interaction-aware scheduling.
 * @param params Viewport inputs, renderer refs, and render scheduling callbacks.
 */
export function useEngineRendererViewport(params: {
  viewport: EngineViewportState
  interactionPhase: RuntimeRenderPhase
  interactionActive: boolean
  renderSurfaceRef: React.MutableRefObject<HTMLCanvasElement | null>
  engineRef: React.MutableRefObject<Engine | null>
  appliedRenderSizeRef: React.MutableRefObject<{width: number; height: number} | null>
  appliedOutputSizeRef: React.MutableRefObject<{width: number; height: number} | null>
  appliedViewportRef: React.MutableRefObject<{
    viewportWidth: number
    viewportHeight: number
    offsetX: number
    offsetY: number
    scale: number
  } | null>
  hasCommittedInitialViewportFrameRef: React.MutableRefObject<boolean>
  viewportReadyRef: React.MutableRefObject<boolean>
  pendingSceneRenderRef: React.MutableRefObject<boolean>
  isInteractingRef: React.MutableRefObject<boolean>
  lastInteractionAtRef: React.MutableRefObject<number>
  deferredFullRedrawHandleRef: React.MutableRefObject<number | null>
  deferredResizeCommitHandleRef: React.MutableRefObject<number | null>
  pendingRenderSizeRef: React.MutableRefObject<{width: number; height: number} | null>
  deferredFullRedrawTokenRef: React.MutableRefObject<number>
  runtimeStageTimingMsRef: React.MutableRefObject<{
    scenePrepareMs: number
    sceneApplyMs: number
    viewportCommitMs: number
    viewportResizeMs: number
    viewportStateUpdateMs: number
    diagnosticsPublishMs: number
    plannerSampleMs: number
    schedulerQueueWaitMs: number
    schedulerThrottleDelayMs: number
    presentRafDelayMs: number
  }>
  renderRequestStatsRef: React.MutableRefObject<{
    renderPhase: RuntimeRenderPhase
    renderPhaseTransitionCount: number
    lastRenderPhaseTransition: string
    renderPolicyQuality: 'full' | 'interactive'
    renderPolicyDpr: number | 'auto'
    overlayMode: 'full' | 'degraded'
    renderPolicyTransitionCount: number
    lastRenderPolicyTransition: string
    canvasResizeCommitCount: number
    canvasResizeDeferredCommitCount: number
    canvasResizeLastCommitReason: string
    canvasResizeLastOutputSize: string
  }>
  cancelDeferredFullRedraw: () => void
  cancelDeferredResizeCommit: () => void
  cancelScheduledRender: () => void
  requestEngineRender: (
    mode?: 'interactive' | 'normal',
    reason?: 'scene-dirty' | 'deferred-image-drain' | 'idle-redraw' | 'interactive-viewport' | 'camera-animation' | 'overlay-dirty',
  ) => void
}): void {
  React.useEffect(() => {
    const renderSurface = params.renderSurfaceRef.current
    const engine = params.engineRef.current
    if (!renderSurface || !engine) {
      return
    }
    const viewportCommitStart = performance.now()
    let viewportResizeMs = 0
    let viewportStateUpdateMs = 0
    const recordViewportCommitMs = () => {
      // Track viewport policy/commit overhead independently from draw time.
      params.runtimeStageTimingMsRef.current.viewportCommitMs =
        performance.now() - viewportCommitStart
      params.runtimeStageTimingMsRef.current.viewportResizeMs = viewportResizeMs
      params.runtimeStageTimingMsRef.current.viewportStateUpdateMs = viewportStateUpdateMs
    }

    const previousPhase = params.renderRequestStatsRef.current.renderPhase
    const previousQuality = params.renderRequestStatsRef.current.renderPolicyQuality
    const previousDpr = params.renderRequestStatsRef.current.renderPolicyDpr
    const previousOverlayMode = params.renderRequestStatsRef.current.overlayMode
    const wasInteractionActive =
      previousPhase === 'pan' ||
      previousPhase === 'zoom' ||
      previousPhase === 'drag' ||
      previousPhase === 'precision'

    // Invalidate the current world viewport against tile cache when output
    // sampling policy changes so stale low-detail tiles cannot survive settle.
    const markViewportWorldBoundsDirty = (viewportState: {
      viewportWidth: number
      viewportHeight: number
      offsetX: number
      offsetY: number
      scale: number
    }) => {
      const dirtyBounds = resolveViewportSettleDirtyBounds(viewportState)
      if (!dirtyBounds) {
        // At extreme zoom-out, forced settle invalidation is intentionally skipped
        // to avoid unbounded world dirty expansion and frame-thread lockups.
        return
      }

      invalidateSceneRegions(engine, {
        reason: 'viewport-settle-dirty-bounds',
        regions: [dirtyBounds],
      })
    }

    params.renderRequestStatsRef.current.renderPhase = params.interactionPhase
    params.renderRequestStatsRef.current.overlayMode = 'full'
    const nextDpr = params.renderRequestStatsRef.current.renderPolicyDpr
    params.renderRequestStatsRef.current.renderPolicyDpr = nextDpr
    const nextQuality = params.renderRequestStatsRef.current.renderPolicyQuality
    params.renderRequestStatsRef.current.renderPolicyQuality = nextQuality

    // Keep a compact transition trail so policy tuning can verify phase and
    // degradation switches instead of relying only on the current snapshot.
    if (previousPhase !== params.interactionPhase) {
      params.renderRequestStatsRef.current.renderPhaseTransitionCount += 1
      params.renderRequestStatsRef.current.lastRenderPhaseTransition = `${previousPhase}->${params.interactionPhase}`
    }

    if (
      previousQuality !== nextQuality ||
      previousDpr !== nextDpr ||
      previousOverlayMode !== 'full'
    ) {
      params.renderRequestStatsRef.current.renderPolicyTransitionCount += 1
      params.renderRequestStatsRef.current.lastRenderPolicyTransition =
        `${previousQuality}/${String(previousDpr)}/${previousOverlayMode}` +
        `->${nextQuality}/${String(nextDpr)}/full`
    }

    // Treat runtime viewport updates as the single resize authority. This avoids
    // feeding canvas self-measurements back into canvas width/height commits.
    const measuredViewportWidth = params.viewport.viewportWidth
    const measuredViewportHeight = params.viewport.viewportHeight
    const runtimeViewportMeasured = params.viewport.viewportWidth > 1 && params.viewport.viewportHeight > 1

    if (measuredViewportWidth <= 1 || measuredViewportHeight <= 1 || !runtimeViewportMeasured) {
      // Wait for both the host DOM measurement and the runtime viewport fit.
      // The bootstrap runtime viewport carries the temporary 48px offset, so
      // letting the engine paint before runtime resize+fit completes can leave
      // the base canvas visibly shifted while overlay already uses the fitted matrix.
      params.viewportReadyRef.current = false
      recordViewportCommitMs()
      return
    }

    params.viewportReadyRef.current = true
    // Use host canvas client size as resize baseline so zoom-time viewport
    // math changes do not force backing-store reallocations.
    const width = Math.max(1, Math.floor(measuredViewportWidth))
    const height = Math.max(1, Math.floor(measuredViewportHeight))
    const outputDpr = Math.min(window.devicePixelRatio || 1, 2)
    const renderWidth = width + OVERSCAN_PX * 2
    const renderHeight = height + OVERSCAN_PX * 2
    const outputWidth = Math.max(1, Math.round(renderWidth * outputDpr))
    const outputHeight = Math.max(1, Math.round(renderHeight * outputDpr))
    const renderSizeChanged =
      !params.appliedRenderSizeRef.current ||
      params.appliedRenderSizeRef.current.width !== renderWidth ||
      params.appliedRenderSizeRef.current.height !== renderHeight
    const outputSizeChanged =
      !params.appliedOutputSizeRef.current ||
      params.appliedOutputSizeRef.current.width !== outputWidth ||
      params.appliedOutputSizeRef.current.height !== outputHeight
    const renderSizeDeltaWidth = Math.abs((params.appliedRenderSizeRef.current?.width ?? renderWidth) - renderWidth)
    const renderSizeDeltaHeight = Math.abs((params.appliedRenderSizeRef.current?.height ?? renderHeight) - renderHeight)
    const shouldCommitResize =
      renderSizeDeltaWidth >= RESIZE_COMMIT_THRESHOLD_PX ||
      renderSizeDeltaHeight >= RESIZE_COMMIT_THRESHOLD_PX
    if (
      !params.appliedRenderSizeRef.current ||
      params.appliedRenderSizeRef.current.width !== renderWidth ||
      params.appliedRenderSizeRef.current.height !== renderHeight ||
      outputSizeChanged
    ) {
      if (!params.appliedRenderSizeRef.current) {
        // First frame commits both host-managed canvas buffer size and engine viewport size.
        renderSurface.width = outputWidth
        renderSurface.height = outputHeight
        // Track direct canvas buffer writes so hover-regression checks can
        // confirm whether width/height mutations still occur.
        params.renderRequestStatsRef.current.canvasResizeCommitCount += 1
        params.renderRequestStatsRef.current.canvasResizeLastCommitReason = 'initial-commit'
        params.renderRequestStatsRef.current.canvasResizeLastOutputSize = `${outputWidth}x${outputHeight}`
        const resizeStart = performance.now()
        engine.resize(renderWidth, renderHeight)
        viewportResizeMs += performance.now() - resizeStart
        params.appliedRenderSizeRef.current = {width: renderWidth, height: renderHeight}
        params.appliedOutputSizeRef.current = {width: outputWidth, height: outputHeight}
        params.pendingRenderSizeRef.current = null
      } else if (params.interactionActive) {
        // Freeze backing-store realloc while interacting; commit once settled.
        params.pendingRenderSizeRef.current = {width: renderWidth, height: renderHeight}
        params.cancelDeferredResizeCommit()
      } else if (!shouldCommitResize) {
        // Ignore micro resize jitter to avoid repeated expensive realloc.
        params.pendingRenderSizeRef.current = {width: renderWidth, height: renderHeight}
        params.cancelDeferredResizeCommit()
      } else {
        // Defer follow-up resizes to collapse rapid layout size changes.
        params.pendingRenderSizeRef.current = {width: renderWidth, height: renderHeight}
        params.cancelDeferredResizeCommit()
        params.deferredResizeCommitHandleRef.current = window.setTimeout(() => {
          const commitResizeWhenQuiet = () => {
            const liveEngine = params.engineRef.current
            const pendingRenderSize = params.pendingRenderSizeRef.current
            if (!liveEngine || !pendingRenderSize) {
              params.deferredResizeCommitHandleRef.current = null
              return
            }

            const quietForMs = performance.now() - params.lastInteractionAtRef.current
            if (quietForMs < FULL_REDRAW_QUIET_WINDOW_MS) {
              params.deferredResizeCommitHandleRef.current = window.setTimeout(
                commitResizeWhenQuiet,
                Math.max(0, FULL_REDRAW_QUIET_WINDOW_MS - quietForMs),
              )
              return
            }

            params.deferredResizeCommitHandleRef.current = null
            const pendingOutputWidth = Math.max(1, Math.round(pendingRenderSize.width * outputDpr))
            const pendingOutputHeight = Math.max(1, Math.round(pendingRenderSize.height * outputDpr))
            renderSurface.width = pendingOutputWidth
            renderSurface.height = pendingOutputHeight
            // Track deferred canvas buffer writes to isolate noisy resize loops.
            params.renderRequestStatsRef.current.canvasResizeCommitCount += 1
            params.renderRequestStatsRef.current.canvasResizeDeferredCommitCount += 1
            params.renderRequestStatsRef.current.canvasResizeLastCommitReason = 'deferred-commit'
            params.renderRequestStatsRef.current.canvasResizeLastOutputSize = `${pendingOutputWidth}x${pendingOutputHeight}`
            liveEngine.resize(pendingRenderSize.width, pendingRenderSize.height)
            params.appliedRenderSizeRef.current = pendingRenderSize
            params.appliedOutputSizeRef.current = {
              width: pendingOutputWidth,
              height: pendingOutputHeight,
            }
            params.pendingRenderSizeRef.current = null
            params.requestEngineRender('normal', 'idle-redraw')
          }

          commitResizeWhenQuiet()
        }, RESIZE_COMMIT_DEFER_MS)
      }
    }
    const committedRenderSize = params.appliedRenderSizeRef.current ?? {
      width: renderWidth,
      height: renderHeight,
    }
    const nextViewportState = {
      viewportWidth: committedRenderSize.width,
      viewportHeight: committedRenderSize.height,
      offsetX: params.viewport.offsetX + OVERSCAN_PX,
      offsetY: params.viewport.offsetY + OVERSCAN_PX,
      scale: params.viewport.scale,
    }
    const viewportChanged =
      !params.appliedViewportRef.current ||
      params.appliedViewportRef.current.viewportWidth !== nextViewportState.viewportWidth ||
      params.appliedViewportRef.current.viewportHeight !== nextViewportState.viewportHeight ||
      params.appliedViewportRef.current.offsetX !== nextViewportState.offsetX ||
      params.appliedViewportRef.current.offsetY !== nextViewportState.offsetY ||
      params.appliedViewportRef.current.scale !== nextViewportState.scale
    if (viewportChanged) {
      const viewportStateUpdateStart = performance.now()
      // Keep pan/drag input strictly follow-finger by committing directly.
      // Only wheel/pinch zoom uses short interpolation during active gesture.
      if (
        params.interactionActive &&
        params.interactionPhase === 'zoom' &&
        VECTOR_ENGINE_SCENE_PROFILE.cameraAnimation.interactiveZoomEnabled
      ) {
        const viewportCommitResult = commitViewportState(engine, {
          viewport: nextViewportState,
          interactionPhase: params.interactionPhase,
          source: 'interaction-zoom',
        })
        params.appliedViewportRef.current = viewportCommitResult.snapshot
      } else if (
        !params.interactionActive &&
        wasInteractionActive &&
        VECTOR_ENGINE_SCENE_PROFILE.cameraAnimation.settleEnabled
      ) {
        // Keep one short settle animation so the first post-gesture frame can
        // converge smoothly to the latest runtime viewport target.
        const viewportCommitResult = commitViewportState(engine, {
          viewport: nextViewportState,
          interactionPhase: params.interactionPhase,
          source: 'settle-animation',
        })
        params.appliedViewportRef.current = viewportCommitResult.snapshot
      } else {
        // Preserve immediate commit semantics for non-gesture viewport updates
        // such as first layout, explicit fit, and resize follow-up commits.
        const viewportCommitResult = commitViewportState(engine, {
          viewport: nextViewportState,
          interactionPhase: params.interactionPhase,
          source: 'runtime-commit',
        })
        params.appliedViewportRef.current = viewportCommitResult.snapshot
      }
      viewportStateUpdateMs += performance.now() - viewportStateUpdateStart
    }

    const exitedInteractionPhase = wasInteractionActive && !params.interactionActive
    const renderStateChanged =
      renderSizeChanged ||
      viewportChanged ||
      exitedInteractionPhase
    const shouldFlushPendingSceneRender =
      params.pendingSceneRenderRef.current && Boolean(params.appliedViewportRef.current) && params.viewportReadyRef.current

    if (params.interactionActive) {
      params.cancelDeferredFullRedraw()
      // Do not cancel the scheduler on every pointer move: repeatedly
      // cancel+request can starve RAF execution under high-frequency input,
      // which manifests as "moves once then stalls until interaction stops".
      // Keep single-flight coalescing and only enqueue interactive priority.
      const highZoomInteraction =
        params.interactionPhase === 'zoom' &&
        nextViewportState.scale >= HIGH_ZOOM_FORCE_NORMAL_RENDER_SCALE
      // High-zoom gesture frames prioritize normal scheduling so texture/detail
      // convergence is not starved by repeated interactive-only throttling.
      params.requestEngineRender(highZoomInteraction ? 'normal' : 'interactive', 'interactive-viewport')
      recordViewportCommitMs()
      return
    }

    if (!renderStateChanged && !shouldFlushPendingSceneRender) {
      recordViewportCommitMs()
      return
    }

    if (!params.hasCommittedInitialViewportFrameRef.current) {
      // Make the first post-layout frame immediate so startup does not show a
      // stale pre-layout viewport offset before deferred redraw kicks in.
      params.hasCommittedInitialViewportFrameRef.current = true
      params.cancelDeferredFullRedraw()
      params.cancelScheduledRender()
      if (shouldFlushPendingSceneRender) {
        params.pendingSceneRenderRef.current = false
        params.requestEngineRender('normal', 'scene-dirty')
      } else {
        params.requestEngineRender('normal', 'idle-redraw')
      }
      recordViewportCommitMs()
      return
    }

    if (shouldFlushPendingSceneRender) {
      params.pendingSceneRenderRef.current = false
      params.cancelDeferredFullRedraw()
      params.cancelScheduledRender()
      params.requestEngineRender('normal', 'scene-dirty')
      recordViewportCommitMs()
      return
    }

    if (exitedInteractionPhase) {
      // When gestures settle, force one immediate non-interactive frame so
      // high-zoom content sharpens without requiring extra pointer movement.
      // Mark current viewport tiles dirty before settle redraw so snapshot-era
      // or low-DPR cache entries cannot survive the phase transition.
      markViewportWorldBoundsDirty(nextViewportState)
      // AI-TEMP: settle-phase redraw is forced for blur recovery; remove when
      // tile cache tracks DPR in validity key and settles become self-sharpening; ref packages/engine/docs/task/snapshot-and-tiles-task-list.md
      params.cancelDeferredFullRedraw()
      params.cancelScheduledRender()
      params.requestEngineRender('normal', 'scene-dirty')
      recordViewportCommitMs()
      return
    }

    // Defer full-quality redraw so a quick next pan can cancel it and keep
    // interaction input responsive on very large scenes.
    params.cancelDeferredFullRedraw()
    const redrawToken = ++params.deferredFullRedrawTokenRef.current
    const runDeferredFullRedraw = () => {
      if (params.deferredFullRedrawTokenRef.current !== redrawToken || params.isInteractingRef.current) {
        return
      }

      const quietForMs = performance.now() - params.lastInteractionAtRef.current
      if (quietForMs < FULL_REDRAW_QUIET_WINDOW_MS) {
        params.deferredFullRedrawHandleRef.current = window.setTimeout(() => {
          params.deferredFullRedrawHandleRef.current = null
          runDeferredFullRedraw()
        }, Math.max(0, FULL_REDRAW_QUIET_WINDOW_MS - quietForMs))
        return
      }

      params.requestEngineRender('normal', 'idle-redraw')
    }

    const idleApi = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    }
    if (idleApi.requestIdleCallback) {
      params.deferredFullRedrawHandleRef.current = idleApi.requestIdleCallback(() => {
        params.deferredFullRedrawHandleRef.current = null
        runDeferredFullRedraw()
      }, {timeout: FULL_REDRAW_IDLE_TIMEOUT_MS})
      return
    }

    params.deferredFullRedrawHandleRef.current = window.setTimeout(() => {
      params.deferredFullRedrawHandleRef.current = null
      runDeferredFullRedraw()
    }, FULL_REDRAW_DEFER_MS)
    recordViewportCommitMs()
  }, [
    params.viewport,
    params.interactionPhase,
    params.interactionActive,
    params.renderSurfaceRef,
    params.engineRef,
    params.appliedRenderSizeRef,
    params.appliedOutputSizeRef,
    params.appliedViewportRef,
    params.hasCommittedInitialViewportFrameRef,
    params.viewportReadyRef,
    params.pendingSceneRenderRef,
    params.isInteractingRef,
    params.lastInteractionAtRef,
    params.deferredFullRedrawHandleRef,
    params.deferredResizeCommitHandleRef,
    params.pendingRenderSizeRef,
    params.deferredFullRedrawTokenRef,
    params.runtimeStageTimingMsRef,
    params.renderRequestStatsRef,
    params.cancelDeferredFullRedraw,
    params.cancelDeferredResizeCommit,
    params.cancelScheduledRender,
    params.requestEngineRender,
  ])
}
