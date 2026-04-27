import { resolveEngineViewportState, type EngineCanvasViewportState } from '../../interaction/viewport.ts'
import { prepareEngineFramePlan } from '../../scene/framePlan.ts'
import { prepareEngineHitPlan } from '../../scene/hitPlan.ts'
import type { EngineHitTestResult } from '../../scene/hitTest.ts'
import type { EngineNodeId, EngineSceneSnapshot } from '../../scene/types.ts'

// Keep frame and hit plan helper logic outside the main facade so
// createEngine.ts stays focused on runtime orchestration.
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