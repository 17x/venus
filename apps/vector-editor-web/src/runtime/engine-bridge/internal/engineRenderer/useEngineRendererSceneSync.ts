import * as React from 'react'
import {type EditorDocument} from '../../../model/index.ts'
import type {CanvasViewportState as EngineViewportState} from '../../../index.ts'
import type {
  RuntimeEngine as Engine,
} from '../../engine.ts'
import {
  createEngineSceneFromRuntimeSnapshot,
  type CreateEngineSceneFromRuntimeSnapshotOptions,
} from '../../../presets/index.ts'
import type {SceneShapeSnapshot} from '../../../shared-memory/index.ts'
import {prepareRenderFrame} from '../../../render-prep/prepareFrame.ts'
import {DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY} from '../../renderPolicy.ts'
import {resolveExpandedChangedIds, resolveMergedNodeBounds} from '../scenePatch.ts'
import {type RuntimeRenderPhase} from '../engineTypes.ts'
import {resolveSceneDirtyRenderPolicy} from '../sceneDirtyRenderPolicy/sceneDirtyRenderPolicy.ts'
import {resolveInteractionActiveNodeIds} from './resolveInteractionActiveNodeIds.ts'

const DIRTY_BOUNDS_SMALL_AREA_PX2 =
  DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.dirtyBoundsSmallAreaPx2
const DIRTY_BOUNDS_MEDIUM_AREA_PX2 =
  DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.dirtyBoundsMediumAreaPx2
const SCENE_DIRTY_SKIP_FORCE_RENDER_FRAMES =
  DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY.sceneDirtySkipForceRenderFrames

/**
 * Determines whether scene preparation can be skipped for viewport-only updates.
 * @param input Scene revision and interaction state for fast-path evaluation.
 * @returns True when scene prep can safely be skipped.
 */
export function canSkipScenePreparationForViewportOnlyUpdate(input: {
  shouldBootstrapScene: boolean
  previousRevision: number | null
  nextRevision: number
  transformPreviewActive: boolean
  effectiveInteractionPhase: RuntimeRenderPhase
}): boolean {
  if (input.shouldBootstrapScene) {
    return false
  }

  if (input.previousRevision === null || input.previousRevision !== input.nextRevision) {
    return false
  }

  if (input.transformPreviewActive) {
    return false
  }

  return input.effectiveInteractionPhase !== 'drag' && input.effectiveInteractionPhase !== 'precision'
}

/**
 * Synchronizes runtime scene data into the engine and schedules scene-driven renders.
 * @param params Scene synchronization inputs, refs, and render request callbacks.
 */
export function useEngineRendererSceneSync(params: {
  document: EditorDocument
  replayScenePayload: CreateEngineSceneFromRuntimeSnapshotOptions
  shapes: SceneShapeSnapshot[]
  statsVersion: number
  viewport: EngineViewportState
  protectedNodeIds?: readonly string[]
  transformPreviewActive: boolean
  interactionPhase: RuntimeRenderPhase
  effectiveInteractionPhase: RuntimeRenderPhase
  engineRef: React.MutableRefObject<Engine | null>
  previousRenderPrepRef: React.MutableRefObject<{
    revision: number
    document: EditorDocument
    shapes: SceneShapeSnapshot[]
    viewport: EngineViewportState
  } | null>
  hasLoadedSceneInEngineRef: React.MutableRefObject<boolean>
  previewSceneRevisionRef: React.MutableRefObject<number>
  protectedNodeSignatureRef: React.MutableRefObject<string>
  interactionActiveNodeSignatureRef: React.MutableRefObject<string>
  appliedViewportRef: React.MutableRefObject<{
    viewportWidth: number
    viewportHeight: number
    offsetX: number
    offsetY: number
    scale: number
  } | null>
  pendingSceneRenderRef: React.MutableRefObject<boolean>
  latestRenderPrepStatsRef: React.MutableRefObject<{
    dirtyCandidateCount: number
    dirtyOffscreenCount: number
    offscreenSceneDirtySkipConsecutiveCount: number
    dirtyBoundsMarkCount: number
    dirtyBoundsMarkArea: number
  }>
  sceneApplyDebugRef: React.MutableRefObject<{
    lastSceneApplyMode: 'none' | 'full-load' | 'preview-load' | 'incremental-patch'
    lastSceneApplyRevision: string
    lastSceneShapeCount: number
    lastScenePatchUpsertCount: number
    sceneLoadCount: number
    scenePatchCount: number
  }>
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
    lastReason: string
    sceneDirtyCount: number
    deferredImageDrainCount: number
    idleRedrawCount: number
    interactiveCount: number
    offscreenSceneDirtySkipCount: number
    forcedSceneDirtyRenderCount: number
    offscreenSceneDirtySkipConsecutiveMaxCount: number
    dirtyBoundsMarkSmallAreaCount: number
    dirtyBoundsMarkMediumAreaCount: number
    dirtyBoundsMarkLargeAreaCount: number
  }>
  requestEngineRender: (
    mode?: 'interactive' | 'normal',
    reason?: 'scene-dirty' | 'deferred-image-drain' | 'idle-redraw' | 'interactive-viewport' | 'camera-animation' | 'overlay-dirty',
  ) => void
}): void {
  React.useEffect(() => {
    const engine = params.engineRef.current
    if (!engine) {
      return
    }
    let scenePrepareMs = 0
    let sceneApplyMs = 0

    const sceneDirtyRenderMode: 'interactive' | 'normal' =
      params.effectiveInteractionPhase === 'pan' ||
      params.effectiveInteractionPhase === 'zoom' ||
      params.effectiveInteractionPhase === 'drag' ||
      params.effectiveInteractionPhase === 'precision'
        ? 'interactive'
        : 'normal'

    const normalizedProtectedNodeIds = (
      params.protectedNodeIds
      ? [...params.protectedNodeIds]
      : params.shapes.filter((shape) => shape.isSelected).map((shape) => shape.id)
    ).sort()
    const allShapeIds = params.shapes.map((shape) => shape.id)
    const engineWithLayerRouting = engine as Engine & {
      setProtectedNodeIds?: (nodeIds?: readonly string[]) => void
      setInteractionActiveNodeIds?: (nodeIds?: readonly string[]) => void
    }
    const protectedNodeSignature = normalizedProtectedNodeIds.join('|')
    if (params.protectedNodeSignatureRef.current !== protectedNodeSignature) {
      // Keep selected nodes and their ancestor groups out of aggressive
      // collapse so active manipulation remains visually stable.
      engineWithLayerRouting.setProtectedNodeIds?.(normalizedProtectedNodeIds)
      params.protectedNodeSignatureRef.current = protectedNodeSignature
    }
    const baselineInteractionActiveNodeIds = resolveInteractionActiveNodeIds({
      interactionPhase: params.effectiveInteractionPhase,
      allShapeIds,
      protectedNodeIds: normalizedProtectedNodeIds,
    })
    const baselineInteractionActiveNodeSignature = baselineInteractionActiveNodeIds.join('|')
    if (params.interactionActiveNodeSignatureRef.current !== baselineInteractionActiveNodeSignature) {
      // Publish editing-scope active ids before scene prep so viewport-only
      // frames still keep base/active split aligned with current editing mode.
      engineWithLayerRouting.setInteractionActiveNodeIds?.(baselineInteractionActiveNodeIds)
      params.interactionActiveNodeSignatureRef.current = baselineInteractionActiveNodeSignature
    }

    const previous = params.previousRenderPrepRef.current
    const shouldBootstrapScene = !params.hasLoadedSceneInEngineRef.current
    const shouldSkipScenePreparation = canSkipScenePreparationForViewportOnlyUpdate({
      shouldBootstrapScene,
      previousRevision: previous?.revision ?? null,
      nextRevision: params.statsVersion,
      transformPreviewActive: params.transformPreviewActive,
      effectiveInteractionPhase: params.effectiveInteractionPhase,
    })

    // Skip expensive scene diff/prep for viewport-only updates (common during
    // wheel/pinch zoom) when scene revision and document identity are stable.
    if (shouldSkipScenePreparation) {
      // Explicitly record fast-path scene timings so viewport-only frames are
      // distinguishable from full scene-prep frames in diagnostics.
      params.runtimeStageTimingMsRef.current.scenePrepareMs = 0
      params.runtimeStageTimingMsRef.current.sceneApplyMs = 0
      params.latestRenderPrepStatsRef.current = {
        dirtyCandidateCount: 0,
        dirtyOffscreenCount: 0,
        offscreenSceneDirtySkipConsecutiveCount: 0,
        dirtyBoundsMarkCount: 0,
        dirtyBoundsMarkArea: 0,
      }
      params.renderRequestStatsRef.current.lastReason = 'viewport-only-scene-skip'
      params.previousRenderPrepRef.current = {
        revision: params.statsVersion,
        document: params.document,
        shapes: params.shapes,
        viewport: params.viewport,
      }
      return
    }

    const previousFrameCandidateIds =
      engine.getDiagnostics().framePlan?.candidateNodeIds
    const scenePrepareStart = performance.now()
    const preparedFrame = prepareRenderFrame({
      revision: params.statsVersion,
      document: params.document,
      previousDocument: previous?.document ?? null,
      shapes: params.shapes,
      previousShapes: previous?.shapes ?? [],
      previousFrameCandidateIds,
      overlay: {
        selectedShapeIds: params.shapes.filter((shape) => shape.isSelected).map((shape) => shape.id),
        hoveredShapeId: params.shapes.find((shape) => shape.isHovered)?.id ?? null,
        marqueeActive: false,
        snapGuideCount: 0,
      },
      includePicking: false,
      cameraDirty:
        !previous ||
        previous.viewport.scale !== params.viewport.scale ||
        previous.viewport.offsetX !== params.viewport.offsetX ||
        previous.viewport.offsetY !== params.viewport.offsetY ||
        previous.viewport.viewportWidth !== params.viewport.viewportWidth ||
        previous.viewport.viewportHeight !== params.viewport.viewportHeight,
    })
    scenePrepareMs = performance.now() - scenePrepareStart
    const shouldForcePreviewOnlySceneReload = false
    let incrementalChangedNodeIds: readonly string[] = []

    if (shouldBootstrapScene || preparedFrame.scene.dirty || shouldForcePreviewOnlySceneReload) {
      const sceneApplyStart = performance.now()
      let dirtyBoundsMarkCount = 0
      let dirtyBoundsMarkArea = 0
      const baselineShouldRenderSceneDirtyNow =
        shouldBootstrapScene ||
        shouldForcePreviewOnlySceneReload ||
        preparedFrame.dirtyState.sceneStructureDirty ||
        preparedFrame.dirtyState.dirtyCandidateCount > 0 ||
        preparedFrame.dirtyState.previousFrameCandidateCount === 0
      const nextOffscreenSceneDirtySkipConsecutiveCount = baselineShouldRenderSceneDirtyNow
        ? 0
        : params.latestRenderPrepStatsRef.current.offscreenSceneDirtySkipConsecutiveCount + 1
      const sceneDirtyRenderPolicy = resolveSceneDirtyRenderPolicy({
        sceneDirtyRenderMode,
        shouldBootstrapScene,
        shouldForcePreviewOnlySceneReload,
        sceneStructureDirty: preparedFrame.dirtyState.sceneStructureDirty,
        dirtyCandidateCount: preparedFrame.dirtyState.dirtyCandidateCount,
        previousFrameCandidateCount: preparedFrame.dirtyState.previousFrameCandidateCount,
        nextOffscreenSceneDirtySkipConsecutiveCount,
        sceneDirtySkipForceRenderFrames: SCENE_DIRTY_SKIP_FORCE_RENDER_FRAMES,
      })
      const shouldRenderSceneDirtyNow = sceneDirtyRenderPolicy.shouldRenderSceneDirtyNow
      const shouldForceOffscreenSceneDirtyRender =
        sceneDirtyRenderPolicy.shouldForceOffscreenSceneDirtyRender
      if (shouldBootstrapScene || preparedFrame.dirtyState.sceneStructureDirty || !previous || shouldForcePreviewOnlySceneReload) {
        const isPreviewLoad = shouldForcePreviewOnlySceneReload
        const debugRevision = isPreviewLoad
          ? `${params.statsVersion}:preview:${params.previewSceneRevisionRef.current + 1}`
          : String(params.statsVersion)
        const nextEngineScene = createEngineSceneFromRuntimeSnapshot(
          isPreviewLoad
            ? {
                ...params.replayScenePayload,
                revision: `${params.statsVersion}:preview:${++params.previewSceneRevisionRef.current}`,
              }
            : params.replayScenePayload,
        )
        engine.setGraph(nextEngineScene)
        params.hasLoadedSceneInEngineRef.current = true
        // Track scene load mode/count so visible=0 episodes can be tied back
        // to the last scene mutation path before render diagnostics dropped.
        params.sceneApplyDebugRef.current.lastSceneApplyMode = isPreviewLoad ? 'preview-load' : 'full-load'
        params.sceneApplyDebugRef.current.lastSceneApplyRevision = debugRevision
        params.sceneApplyDebugRef.current.lastSceneShapeCount = params.replayScenePayload.shapes.length
        params.sceneApplyDebugRef.current.lastScenePatchUpsertCount = 0
        params.sceneApplyDebugRef.current.sceneLoadCount += 1
      } else {
        const changedIds = resolveExpandedChangedIds(preparedFrame.dirtyState.sceneInstanceIds, params.document)
        incrementalChangedNodeIds = changedIds
        const incrementalScene = createEngineSceneFromRuntimeSnapshot({
          ...params.replayScenePayload,
          includeShapeIds: changedIds,
          includeDocumentBackground: false,
        })
        const upsertNodes = incrementalScene.nodes

        if (upsertNodes.length > 0) {
          engine.updateGraph({
            patches: [{
              revision: params.statsVersion,
              upsertNodes,
            }],
          })
          params.hasLoadedSceneInEngineRef.current = true
          // Keep incremental patch telemetry so event-entry debugging can
          // confirm whether the scene was patched or fully replaced.
          params.sceneApplyDebugRef.current.lastSceneApplyMode = 'incremental-patch'
          params.sceneApplyDebugRef.current.lastSceneApplyRevision = String(params.statsVersion)
          params.sceneApplyDebugRef.current.lastSceneShapeCount = params.replayScenePayload.shapes.length
          params.sceneApplyDebugRef.current.lastScenePatchUpsertCount = upsertNodes.length
          params.sceneApplyDebugRef.current.scenePatchCount += 1
          // Coalesce dirty marks to one merged region so tile invalidation can
          // stay local even when many nodes are updated in one patch burst.
          // Include both previous and next positions so moved nodes invalidate
          // the tiles they vacated as well as the tiles they now occupy.
          const mergedDirtyBounds = resolveMergedNodeBounds({
            nodes: upsertNodes,
            currentDocument: params.document,
            previousDocument: previous.document,
            changedIds,
          })
          if (mergedDirtyBounds) {
            engine.invalidate({
              reason: 'scene-dirty-merged-bounds',
              region: mergedDirtyBounds,
            })
            dirtyBoundsMarkCount = 1
            dirtyBoundsMarkArea = Math.max(
              0,
              Math.abs(mergedDirtyBounds.width * mergedDirtyBounds.height),
            )
            // Bucket dirty invalidation area to spot whether redraw pressure is
            // dominated by tiny local edits or broad invalidation bursts.
            if (dirtyBoundsMarkArea <= DIRTY_BOUNDS_SMALL_AREA_PX2) {
              params.renderRequestStatsRef.current.dirtyBoundsMarkSmallAreaCount += 1
            } else if (dirtyBoundsMarkArea <= DIRTY_BOUNDS_MEDIUM_AREA_PX2) {
              params.renderRequestStatsRef.current.dirtyBoundsMarkMediumAreaCount += 1
            } else {
              params.renderRequestStatsRef.current.dirtyBoundsMarkLargeAreaCount += 1
            }
          }
        }
      }

      if (!shouldRenderSceneDirtyNow && !shouldForceOffscreenSceneDirtyRender) {
        // Keep scene state in sync but skip immediate redraw when all dirty
        // nodes are outside the previous frame's candidate set.
        params.renderRequestStatsRef.current.lastReason = 'offscreen-scene-dirty-skip'
        params.renderRequestStatsRef.current.offscreenSceneDirtySkipCount += 1
        // Track peak skip streak so long-run starvation pressure is visible
        // even after intermittent forced flushes reset the live streak.
        params.renderRequestStatsRef.current.offscreenSceneDirtySkipConsecutiveMaxCount = Math.max(
          params.renderRequestStatsRef.current.offscreenSceneDirtySkipConsecutiveMaxCount,
          nextOffscreenSceneDirtySkipConsecutiveCount,
        )
      } else if (!params.appliedViewportRef.current) {
        // Queue scene-driven render until viewport alignment is committed to
        // avoid one startup frame using stale/default viewport transforms.
        params.pendingSceneRenderRef.current = true
        if (shouldForceOffscreenSceneDirtyRender) {
          params.renderRequestStatsRef.current.forcedSceneDirtyRenderCount += 1
        }
      } else {
        params.requestEngineRender(sceneDirtyRenderMode, 'scene-dirty')
        if (shouldForceOffscreenSceneDirtyRender) {
          params.renderRequestStatsRef.current.forcedSceneDirtyRenderCount += 1
        }
      }

      const interactionActiveNodeIds = resolveInteractionActiveNodeIds({
        interactionPhase: params.effectiveInteractionPhase,
        allShapeIds,
        protectedNodeIds: normalizedProtectedNodeIds,
        changedNodeIds: incrementalChangedNodeIds,
      })
      const interactionActiveNodeSignature = interactionActiveNodeIds.join('|')
      if (params.interactionActiveNodeSignatureRef.current !== interactionActiveNodeSignature) {
        // Include incremental dirty ids during editing so property edits and
        // transform patches stay routed through active layer in the same frame.
        engineWithLayerRouting.setInteractionActiveNodeIds?.(interactionActiveNodeIds)
        params.interactionActiveNodeSignatureRef.current = interactionActiveNodeSignature
      }

      params.latestRenderPrepStatsRef.current = {
        dirtyCandidateCount: preparedFrame.dirtyState.dirtyCandidateCount,
        dirtyOffscreenCount: preparedFrame.dirtyState.dirtyOffscreenCount,
        offscreenSceneDirtySkipConsecutiveCount:
          shouldRenderSceneDirtyNow || shouldForceOffscreenSceneDirtyRender
            ? 0
            : nextOffscreenSceneDirtySkipConsecutiveCount,
        dirtyBoundsMarkCount,
        dirtyBoundsMarkArea,
      }
      sceneApplyMs = performance.now() - sceneApplyStart
    } else {
      params.latestRenderPrepStatsRef.current = {
        dirtyCandidateCount: preparedFrame.dirtyState.dirtyCandidateCount,
        dirtyOffscreenCount: preparedFrame.dirtyState.dirtyOffscreenCount,
        offscreenSceneDirtySkipConsecutiveCount: 0,
        dirtyBoundsMarkCount: 0,
        dirtyBoundsMarkArea: 0,
      }
      sceneApplyMs = 0
    }

    params.previousRenderPrepRef.current = {
      revision: params.statsVersion,
      document: params.document,
      shapes: params.shapes,
      viewport: params.viewport,
    }
    // Record scene-stage timing after effect work so onStats can publish it.
    params.runtimeStageTimingMsRef.current.scenePrepareMs = scenePrepareMs
    params.runtimeStageTimingMsRef.current.sceneApplyMs = sceneApplyMs
  }, [
    params.document,
    params.effectiveInteractionPhase,
    params.protectedNodeIds,
    params.replayScenePayload,
    params.requestEngineRender,
    params.interactionPhase,
    params.shapes,
    params.statsVersion,
    params.viewport,
    params.engineRef,
    params.previousRenderPrepRef,
    params.hasLoadedSceneInEngineRef,
    params.previewSceneRevisionRef,
    params.protectedNodeSignatureRef,
    params.interactionActiveNodeSignatureRef,
    params.appliedViewportRef,
    params.pendingSceneRenderRef,
    params.latestRenderPrepStatsRef,
    params.sceneApplyDebugRef,
    params.runtimeStageTimingMsRef,
    params.renderRequestStatsRef,
    params.transformPreviewActive,
  ])
}
