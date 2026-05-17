import { prepareEngineHitPlan } from '../../scene/hitPlan.ts'
import { createEnginePointHitQuery } from '../../scene/hit/resolver.ts'
import type { EngineHitResolver } from '../../scene/hit/resolver.ts'
import { createEngineSceneStore } from '../../scene/store/store.ts'
import type { EngineVisibilityResolver } from '../../visibility/index.ts'
import type { EngineCanvasViewportState } from '../../interaction/viewport/viewport.ts'
import { buildEngineFramePlan, buildEngineHitPlan, resolveEngineFramePlanSignature } from './planning.ts'
import type { Engine } from './createEngineContracts.ts'
import type { EngineFramePlan } from '../../scene/framePlan.ts'
import type { EngineHitPlan } from '../../scene/hitPlan.ts'

/**
 * Builds scene/query/hit facade methods so createEngine keeps orchestration-only concerns.
 * @param options Scene/hit/query dependencies and mutable plan-state setters.
 * @returns Engine facade slice containing scene and hit-query APIs.
 */
export function createEngineSceneFacade(options: {
  store: ReturnType<typeof createEngineSceneStore>
  visibilityResolver: EngineVisibilityResolver
  hitResolver: EngineHitResolver
  getViewport: () => EngineCanvasViewportState
  getLatestFramePlan: () => EngineFramePlan | null
  setLatestFramePlan: (plan: EngineFramePlan | null) => void
  setLatestFramePlanSignature: (signature: string) => void
  setLatestHitPlan: (plan: EngineHitPlan | null) => void
}) {
  return {
    /**
     * Handles loadScene.
     * @param scene Scene snapshot.
     */
    loadScene(scene) {
      return options.store.loadScene(scene)
    },
    /**
     * Handles applyScenePatchBatch.
     * @param batch batch parameter.
     */
    applyScenePatchBatch(batch) {
      return options.store.applyScenePatchBatch(batch)
    },
    /**
     * Handles transaction.
     * @param run run parameter.
     * @param transactionOptions transactionOptions parameter.
     */
    transaction(run, transactionOptions) {
      return options.store.transaction(run, transactionOptions)
    },
    // Keep viewport candidate collection in the engine facade so callers do
    // not need to duplicate viewport-to-world bounds conversion logic.
    /**
     * Handles queryViewportCandidates.
     * @param padding padding parameter.
     */
    queryViewportCandidates(padding = 0) {
      return this.queryVisibleSet(padding).nodeIds.slice()
    },
    /**
     * Handles queryVisibleSet.
     * @param padding padding parameter.
     */
    queryVisibleSet(padding = 0) {
      return options.visibilityResolver.resolveViewportVisibleSet(
        options.store.getSnapshot(),
        options.getViewport(),
        padding,
      )
    },
    /**
     * Handles queryFrustumVisibleSet.
     * @param query query parameter.
     */
    queryFrustumVisibleSet(query) {
      return options.visibilityResolver.resolveVisibleSet(options.store.getSnapshot(), query)
    },
    /**
     * Handles queryPointCandidates.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     */
    queryPointCandidates(point, tolerance) {
      return options.store.queryPointCandidates(point, tolerance)
    },
    /**
     * Handles prepareFramePlan.
     * @param padding padding parameter.
     */
    prepareFramePlan(padding = 0) {
      const scene = options.store.getSnapshot()
      const viewport = options.getViewport()
      const nextFramePlan = buildEngineFramePlan(
        scene,
        viewport,
        (bounds) => options.store.queryCandidates(bounds),
        padding,
        {
          resolveVisibleSet: (bounds) => options.visibilityResolver.resolveVisibleSet(scene, {
            mode: 'bounds-2d',
            bounds,
          }),
        },
      )
      options.setLatestFramePlan(nextFramePlan)
      options.setLatestFramePlanSignature(resolveEngineFramePlanSignature(scene, viewport, padding))
      return nextFramePlan
    },
    /**
     * Handles prepareHitPlan.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     */
    prepareHitPlan(point, tolerance = 0) {
      const nextHitPlan = buildEngineHitPlan(
        options.store.getSnapshot(),
        point,
        tolerance,
        (queryPoint, queryTolerance) => options.store.queryPointCandidates(queryPoint, queryTolerance),
        (queryPoint, queryTolerance) => options.store.hitTestAll(queryPoint, queryTolerance),
      )
      options.setLatestHitPlan(nextHitPlan)
      return nextHitPlan
    },
    /**
     * Handles query.
     * @param bounds Bounds data.
     */
    query(bounds) {
      return options.store.queryCandidates(bounds)
    },
    /**
     * Handles hitTest2D.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     */
    hitTest2D(point, tolerance) {
      const resolvedTolerance = tolerance ?? 0
      const hitSet = options.hitResolver.resolve(createEnginePointHitQuery(point, resolvedTolerance))
      options.setLatestHitPlan(
        prepareEngineHitPlan({
          scene: options.store.getSnapshot(),
          point,
          tolerance: resolvedTolerance,
          hits: hitSet.hits,
          exactCheckCount: hitSet.exactCheckCount,
          exactCheckBudget: hitSet.exactCheckBudget,
          exactBudgetExceeded: hitSet.exactBudgetExceeded,
          queryPointCandidates: (queryPoint: {x: number; y: number}, queryTolerance?: number) => options.store.queryPointCandidates(queryPoint, queryTolerance),
        }),
      )
      return hitSet.primaryHit
    },
    /**
     * Handles hitTestRay.
     * @param ray ray parameter.
     * @param maxDistance maxDistance parameter.
     */
    hitTestRay(ray, maxDistance) {
      const hitSet = options.hitResolver.resolve({
        mode: 'ray-3d',
        ray,
        maxDistance,
      })
      // Keep hit-plan diagnostics contract populated even for ray queries by
      // projecting the ray origin through the existing point-based hit-plan view.
      options.setLatestHitPlan(
        prepareEngineHitPlan({
          scene: options.store.getSnapshot(),
          point: {
            x: ray.origin.x,
            y: ray.origin.y,
          },
          tolerance: 0,
          hits: hitSet.hits,
          exactCheckCount: hitSet.exactCheckCount,
          exactCheckBudget: hitSet.exactCheckBudget,
          exactBudgetExceeded: hitSet.exactBudgetExceeded,
          queryPointCandidates: (queryPoint: {x: number; y: number}, queryTolerance?: number) => options.store.queryPointCandidates(queryPoint, queryTolerance),
        }),
      )
      return hitSet.primaryHit
    },
    /**
     * Handles hitTest.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     */
    hitTest(point, tolerance) {
      return this.hitTest2D(point, tolerance)
    },
    /**
     * Handles getNode.
     * @param nodeId nodeId parameter.
     */
    getNode(nodeId) {
      return options.store.getNode(nodeId)
    },
    getSnapshot() {
      return options.store.getSnapshot()
    },
  } satisfies Pick<
    Engine,
    | 'loadScene'
    | 'applyScenePatchBatch'
    | 'transaction'
    | 'queryViewportCandidates'
    | 'queryVisibleSet'
    | 'queryFrustumVisibleSet'
    | 'queryPointCandidates'
    | 'prepareFramePlan'
    | 'prepareHitPlan'
    | 'query'
    | 'hitTest2D'
    | 'hitTestRay'
    | 'hitTest'
    | 'getNode'
    | 'getSnapshot'
  >
}
