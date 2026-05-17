import {
  resolveEngineViewportState,
  type EngineCanvasViewportState,
} from '../../interaction/viewport/viewport.ts'
import type { EngineRenderStats } from '../../renderer/types/index.ts'
import type { EngineAnimationController, EngineEasingDefinition } from '../../animation/index.ts'
import { resolveViewportAnimationTarget } from './planning.ts'
import type { EngineInteractionMutationKind } from './strategy/strategy.ts'

/**
 * Builds interaction/camera lifecycle helpers shared by createEngine runtime flow.
 * @param options Mutable runtime dependencies for interaction/camera state.
 * @returns Lifecycle helper surface and mutable camera-animation state.
 */
export function createEngineInteractionLifecycle(options: {
  clockNow: () => number
  cameraAnimationController: EngineAnimationController
  defaultCameraAnimationDurationMs: number
  interactionSettleDelayMs: number
  framePlanMaxOverscanRatio: number
  tileConfig:
    | {
      enabled?: boolean
      overscanEnabled?: boolean
      overscanBorderPx?: number
    }
    | undefined
  getViewport: () => EngineCanvasViewportState
  setViewport: (next: EngineCanvasViewportState) => void
  setLastInteractionAtMs: (value: number) => void
  setLastInteractionKind: (kind: EngineInteractionMutationKind) => void
  settleSharpnessState: {
    pending: boolean
    deadlineAtMs: number
    deadlineMissRecorded: boolean
    forceSharpFrame: boolean
  }
}) {
  const CAMERA_ANIMATION_ID = 'engine.camera.viewport'
  let cameraAnimationTarget: EngineCanvasViewportState | null = null
  const cameraAnimationState = {
    active: false,
    cachePreviewOnly: false,
    previewHitCount: 0,
    previewMissCount: 0,
  }

  /**
   * Records one interaction mutation so strategy/settle timers update together.
   * @param kind Latest interaction mutation kind.
   */
  const markInteractionMutation = (kind: EngineInteractionMutationKind) => {
    const interactionAtMs = options.clockNow()
    options.setLastInteractionAtMs(interactionAtMs)
    options.setLastInteractionKind(kind)
    options.settleSharpnessState.pending = true
    options.settleSharpnessState.deadlineAtMs = interactionAtMs + options.interactionSettleDelayMs
    options.settleSharpnessState.deadlineMissRecorded = false
    options.settleSharpnessState.forceSharpFrame = false
  }

  /**
   * Resolves whether one render stats snapshot satisfies sharp-settle contract.
   * @param stats Render stats snapshot.
   * @returns True when snapshot is full-quality with no deferred detail.
   */
  const isSharpRenderStats = (stats: EngineRenderStats): boolean => {
    const deferredImageCount = stats.webglDeferredImageTextureCount ?? 0
    const deferredTextCount = stats.webglDeferredTextTextureCount ?? 0
    const interactiveTextFallbackCount = stats.webglInteractiveTextFallbackCount ?? 0
    const drawBudgetExceeded = Boolean(stats.webglDrawSubmitBudgetExceeded)
    return (
      stats.drawCount > 0 &&
      stats.engineFrameQuality === 'full' &&
      deferredImageCount === 0 &&
      deferredTextCount === 0 &&
      interactiveTextFallbackCount === 0 &&
      !drawBudgetExceeded
    )
  }

  /**
   * Stops camera animation and optionally commits the latest target viewport.
   * @param commitTarget Whether to apply target viewport on stop.
   */
  const stopCameraAnimationInternal = (commitTarget = true) => {
    options.cameraAnimationController.stop(CAMERA_ANIMATION_ID)
    if (commitTarget && cameraAnimationTarget) {
      options.setViewport(cameraAnimationTarget)
    }
    cameraAnimationTarget = null
    cameraAnimationState.active = false
    cameraAnimationState.cachePreviewOnly = false
  }

  /**
   * Resolves frame-plan world padding from tile overscan settings.
   * @param nextViewport Current viewport snapshot.
   * @returns World-space frame-plan padding.
   */
  const resolveFramePlanQueryPaddingWorld = (nextViewport: EngineCanvasViewportState): number => {
    if (!options.tileConfig?.enabled || !options.tileConfig.overscanEnabled) {
      return 0
    }

    const borderPx = options.tileConfig.overscanBorderPx ?? 0
    if (!Number.isFinite(borderPx) || borderPx <= 0) {
      return 0
    }

    const safeScale = Math.max(Number.EPSILON, Math.abs(nextViewport.scale))
    const overscanWorld = borderPx / safeScale
    const viewportWorldMaxEdge = Math.max(nextViewport.viewportWidth, nextViewport.viewportHeight) / safeScale
    return Math.min(overscanWorld, viewportWorldMaxEdge * options.framePlanMaxOverscanRatio)
  }

  /**
   * Starts camera animation toward one resolved viewport target.
   * @param target Viewport target patch.
   * @param animationOptions Camera animation behavior options.
   */
  const startCameraAnimationInternal = (
    target: {
      viewportWidth?: number
      viewportHeight?: number
      offsetX?: number
      offsetY?: number
      scale?: number
    },
    animationOptions?: {
      durationMs?: number
      easing?: EngineEasingDefinition
      cachePreviewOnly?: boolean
    },
  ) => {
    const viewport = options.getViewport()
    const resolvedTarget = resolveViewportAnimationTarget(viewport, target)
    cameraAnimationTarget = resolvedTarget
    cameraAnimationState.active = true
    cameraAnimationState.cachePreviewOnly = Boolean(animationOptions?.cachePreviewOnly)
    cameraAnimationState.previewHitCount = 0
    cameraAnimationState.previewMissCount = 0

    options.cameraAnimationController.start<EngineCanvasViewportState>({
      id: CAMERA_ANIMATION_ID,
      from: viewport,
      to: resolvedTarget,
      duration: Math.max(0, animationOptions?.durationMs ?? options.defaultCameraAnimationDurationMs),
      easing: animationOptions?.easing ?? 'easeOut',
      interpolate: (from, to, progress) => {
        return resolveEngineViewportState({
          viewportWidth: from.viewportWidth + (to.viewportWidth - from.viewportWidth) * progress,
          viewportHeight: from.viewportHeight + (to.viewportHeight - from.viewportHeight) * progress,
          offsetX: from.offsetX + (to.offsetX - from.offsetX) * progress,
          offsetY: from.offsetY + (to.offsetY - from.offsetY) * progress,
          scale: from.scale + (to.scale - from.scale) * progress,
        })
      },
      onUpdate: (nextViewport) => {
        options.setViewport(nextViewport)
      },
      onComplete: () => {
        stopCameraAnimationInternal(true)
      },
    })
  }

  return {
    cameraAnimationState,
    markInteractionMutation,
    isSharpRenderStats,
    stopCameraAnimationInternal,
    resolveFramePlanQueryPaddingWorld,
    startCameraAnimationInternal,
  }
}