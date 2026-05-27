import * as React from 'react'

import type {RuntimeEngine as Engine} from '../../engine.ts'
import {type RuntimeRenderPhase} from '../engineTypes.ts'

/**
 * Runs interaction settle transitions for renderer interaction diagnostics state.
 * @param interactionSettledInput Input bundle for interaction settle effect.
 */
export function useEngineRendererInteractionSettleEffect(interactionSettledInput: {
  isInteractionPhase: (phase: RuntimeRenderPhase) => boolean
  effectiveInteractionPhase: RuntimeRenderPhase
  interactionSettleMs: number
  viewportOffsetX: number
  viewportOffsetY: number
  viewportScale: number
  interactionSettleTimerRef: React.MutableRefObject<number | null>
  lastInteractionAtRef: React.MutableRefObject<number>
  setIsInteracting: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const {
    isInteractionPhase,
    effectiveInteractionPhase,
    interactionSettleMs,
    viewportOffsetX,
    viewportOffsetY,
    viewportScale,
    interactionSettleTimerRef,
    lastInteractionAtRef,
    setIsInteracting,
  } = interactionSettledInput

  React.useEffect(() => {
    if (!isInteractionPhase(effectiveInteractionPhase)) {
      if (interactionSettleTimerRef.current !== null) {
        window.clearTimeout(interactionSettleTimerRef.current)
        interactionSettleTimerRef.current = null
      }
      setIsInteracting(false)
      return
    }

    lastInteractionAtRef.current = performance.now()
    setIsInteracting(true)
    if (interactionSettleTimerRef.current !== null) {
      window.clearTimeout(interactionSettleTimerRef.current)
    }
    interactionSettleTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false)
      interactionSettleTimerRef.current = null
    }, interactionSettleMs)
  }, [
    effectiveInteractionPhase,
    interactionSettleMs,
    isInteractionPhase,
    setIsInteracting,
    interactionSettleTimerRef,
    lastInteractionAtRef,
    viewportOffsetX,
    viewportOffsetY,
    viewportScale,
  ])
}

/**
 * Runs overlay-node sync and render request scheduling for renderer lifecycle.
 * @param overlaySyncInput Input bundle for overlay sync effect.
 */
export function useEngineRendererOverlaySyncEffect(overlaySyncInput: {
  engineRef: React.MutableRefObject<Engine | null>
  overlayNodes: readonly import('../../engine.ts').EngineOverlayDrawNode[] | undefined
  interactionPhase: RuntimeRenderPhase
  effectiveInteractionPhase: RuntimeRenderPhase
  requestEngineRender: (
    mode?: 'interactive' | 'normal',
    reason?:
      | 'scene-dirty'
      | 'deferred-image-drain'
      | 'idle-redraw'
      | 'interactive-viewport'
      | 'camera-animation'
      | 'overlay-dirty',
  ) => void
}) {
  const {
    engineRef,
    overlayNodes,
    interactionPhase,
    effectiveInteractionPhase,
    requestEngineRender,
  } = overlaySyncInput

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine) {
      return
    }

    const overlayEnabledEngine = engine as Engine & {
      setOverlayNodes?: (nodes?: readonly import('../../engine.ts').EngineOverlayDrawNode[]) => void
    }
    overlayEnabledEngine.setOverlayNodes?.(overlayNodes)
    const overlayRenderMode: 'interactive' | 'normal' = (
      interactionPhase === 'pan' ||
      effectiveInteractionPhase === 'zoom' ||
      effectiveInteractionPhase === 'drag' ||
      effectiveInteractionPhase === 'precision'
    )
      ? 'interactive'
      : 'normal'
    requestEngineRender(overlayRenderMode, 'overlay-dirty')
  }, [effectiveInteractionPhase, engineRef, interactionPhase, overlayNodes, requestEngineRender])
}

/**
 * Runs deferred visual recovery after interaction settles.
 * @param deferredRecoveryInput Input bundle for deferred-recovery effect.
 */
export function useEngineRendererDeferredRecoveryEffect(deferredRecoveryInput: {
  isInteracting: boolean
  deferredVisualRecoveryAfterInteractionRef: React.MutableRefObject<boolean>
  deferredVisualRecoveryPendingRef: React.MutableRefObject<boolean>
  requestEngineRender: (
    mode?: 'interactive' | 'normal',
    reason?:
      | 'scene-dirty'
      | 'deferred-image-drain'
      | 'idle-redraw'
      | 'interactive-viewport'
      | 'camera-animation'
      | 'overlay-dirty',
  ) => void
}) {
  const {
    isInteracting,
    deferredVisualRecoveryAfterInteractionRef,
    deferredVisualRecoveryPendingRef,
    requestEngineRender,
  } = deferredRecoveryInput

  React.useEffect(() => {
    if (isInteracting || !deferredVisualRecoveryAfterInteractionRef.current) {
      return
    }

    deferredVisualRecoveryAfterInteractionRef.current = false
    deferredVisualRecoveryPendingRef.current = true
    requestEngineRender('normal', 'idle-redraw')
  }, [isInteracting, deferredVisualRecoveryAfterInteractionRef, deferredVisualRecoveryPendingRef, requestEngineRender])
}

/**
 * Syncs overlay diagnostics fields into render request stats.
 * @param overlayDiagnosticsInput Input bundle for overlay diagnostics sync effect.
 */
export function useEngineRendererOverlayDiagnosticsEffect(overlayDiagnosticsInput: {
  overlayDiagnostics: {
    degraded?: boolean
    guideInputCount?: number
    guideKeptCount?: number
    guideDroppedCount?: number
    guideSelectionStrategy?: 'full' | 'axis-first' | 'axis-relevance'
    pathEditWhitelistActive?: boolean
  } | undefined
  renderRequestStatsRef: React.MutableRefObject<{
    overlayDegraded: boolean
    overlayGuideInputCount: number
    overlayGuideKeptCount: number
    overlayGuideDroppedCount: number
    overlayGuideSelectionStrategy: 'full' | 'axis-first' | 'axis-relevance'
    overlayPathEditWhitelistActive: boolean
  }>
}) {
  const {overlayDiagnostics, renderRequestStatsRef} = overlayDiagnosticsInput

  React.useEffect(() => {
    renderRequestStatsRef.current.overlayDegraded = overlayDiagnostics?.degraded ?? false
    renderRequestStatsRef.current.overlayGuideInputCount = overlayDiagnostics?.guideInputCount ?? 0
    renderRequestStatsRef.current.overlayGuideKeptCount = overlayDiagnostics?.guideKeptCount ?? 0
    renderRequestStatsRef.current.overlayGuideDroppedCount = overlayDiagnostics?.guideDroppedCount ?? 0
    renderRequestStatsRef.current.overlayGuideSelectionStrategy =
      overlayDiagnostics?.guideSelectionStrategy ?? 'full'
    renderRequestStatsRef.current.overlayPathEditWhitelistActive =
      overlayDiagnostics?.pathEditWhitelistActive ?? false
  }, [overlayDiagnostics, renderRequestStatsRef])
}
