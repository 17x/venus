/**
 * Renderer plan canonical barrel.
 * Re-exports render-plan contracts and planner entrypoints.
 */
export type {
  EnginePreparedNode,
  EngineRenderBatch,
  EngineRenderPlan,
  EngineRenderPlanCacheDiagnostics,
  EngineWorldMatrix,
} from './plan.ts'

export {
  getEngineRenderPlanCacheDiagnostics,
  prepareEngineRenderPlan,
} from './plan.ts'
