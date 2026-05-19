/**
 * Visibility domain barrel aligned with the 2D->3D architecture blueprint.
 */
export type {
  EngineVisibleSet,
  EngineVisibility3DExecutionMode,
  EngineVisibility3DPolicyDecision,
  EngineVisibilityBounds2DQuery,
  EngineVisibilityBounds2DResolver,
  EngineVisibilityFrustum3DQuery,
  EngineVisibilityFrustum3DOcclusionResolver,
  EngineVisibilityFrustum3DResolver,
  EngineVisibilityQuery,
  EngineVisibilityQueryMode,
  EngineVisibilityViewport2D,
} from '../scene/visibility/contracts.ts'
export type {
  CreateEngineVisibilityResolverOptions,
  EngineVisibilityResolver,
} from '../scene/visibility/visibility.ts'
export {
  createEngineVisibilityResolver,
  resolveEngineBounds2DVisibilityQuery,
  resolveEngineFrustumFallbackNodeIds,
  resolveEngineVisibility3DPolicyDecision,
} from '../scene/visibility/visibility.ts'
export type {
  EngineVisibilityLodCandidate,
  EngineVisibilityLodEntry,
  EngineVisibilityLodLevel,
  EngineVisibilityLodPlan,
  EngineVisibilityLodPlanInput,
  EngineVisibilityLodPressure,
  EngineVisibilityLodThresholds,
} from '../scene/visibility/visibilityLodPlan/visibilityLodPlan.ts'
export {
  resolveEngineVisibilityLodPlan,
} from '../scene/visibility/visibilityLodPlan/visibilityLodPlan.ts'
export type {
  EngineVisibilityOcclusionCandidate,
  EngineVisibilityOcclusionEntry,
  EngineVisibilityOcclusionPlan,
  EngineVisibilityOcclusionPlanInput,
  EngineVisibilityOcclusionThresholds,
} from '../scene/visibility/visibilityOcclusionPlan/visibilityOcclusionPlan.ts'
export {
  resolveEngineVisibilityOcclusionPlan,
} from '../scene/visibility/visibilityOcclusionPlan/visibilityOcclusionPlan.ts'
