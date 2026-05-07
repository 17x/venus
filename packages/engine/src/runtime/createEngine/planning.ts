import { resolveEngineViewportState, type EngineCanvasViewportState } from '../../interaction/viewport/viewport.ts'
import { prepareEngineFramePlan } from '../../scene/framePlan.ts'
import { prepareEngineHitPlan } from '../../scene/hitPlan.ts'
import type { EngineHitTestResult } from '../../scene/hitTest/hitTest.ts'
import type { EngineNodeId, EngineSceneSnapshot } from '../../scene/types/types.ts'

// Keep frame and hit plan helper logic outside the main facade so
// createEngine.ts stays focused on runtime orchestration.
/**
 * Handles buildEngineFramePlan.
 * @param scene Scene snapshot.
 * @param viewport Viewport state.
 * @param queryCandidates queryCandidates parameter.
 * @param padding padding parameter.
 */
export function buildEngineFramePlan(
  scene: EngineSceneSnapshot,
  viewport: EngineCanvasViewportState,
  queryCandidates: (bounds: {x: number; y: number; width: number; height: number}) => EngineNodeId[],
  padding = 0,
) {
  return prepareEngineFramePlan({
    scene,
    viewport,
    padding,
    queryCandidates,
  })
}

/**
 * Handles resolveEngineFramePlanSignature.
 * @param scene Scene snapshot.
 * @param viewport Viewport state.
 * @param padding padding parameter.
 */
export function resolveEngineFramePlanSignature(
  scene: EngineSceneSnapshot,
  viewport: EngineCanvasViewportState,
  padding = 0,
) {
  return [
    scene.revision,
    scene.metadata?.planVersion ?? 0,
    padding,
    viewport.viewportWidth,
    viewport.viewportHeight,
    viewport.offsetX,
    viewport.offsetY,
    viewport.scale,
  ].join(':')
}

// Reuse the same coarse candidate contract for diagnostics and explicit hit
// planning so engine runtime callers do not fork point-query logic.
/**
 * Handles buildEngineHitPlan.
 * @param scene Scene snapshot.
 * @param point point parameter.
 * @param tolerance tolerance parameter.
 * @param queryPointCandidates queryPointCandidates parameter.
 * @param hitTestAll hitTestAll parameter.
 */
export function buildEngineHitPlan(
  scene: EngineSceneSnapshot,
  point: {x: number; y: number},
  tolerance: number,
  queryPointCandidates: (queryPoint: {x: number; y: number}, queryTolerance?: number) => EngineNodeId[],
  hitTestAll: (queryPoint: {x: number; y: number}, queryTolerance?: number) => EngineHitTestResult[],
) {
  return prepareEngineHitPlan({
    scene,
    point,
    tolerance,
    queryPointCandidates,
    hitTestAll,
  })
}

/**
 * Handles resolveViewportAnimationTarget.
 * @param viewport Viewport state.
 * @param target target parameter.
 */
export function resolveViewportAnimationTarget(
  viewport: EngineCanvasViewportState,
  target: {
    viewportWidth?: number
    viewportHeight?: number
    offsetX?: number
    offsetY?: number
    scale?: number
  },
) {
  return resolveEngineViewportState({
    viewportWidth: target.viewportWidth ?? viewport.viewportWidth,
    viewportHeight: target.viewportHeight ?? viewport.viewportHeight,
    offsetX: target.offsetX ?? viewport.offsetX,
    offsetY: target.offsetY ?? viewport.offsetY,
    scale: target.scale ?? viewport.scale,
  })
}