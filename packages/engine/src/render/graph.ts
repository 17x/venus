/**
 * Render-graph entrypoint for orchestration contracts and graph execution APIs.
 * Centralizes graph-facing surfaces under the render domain boundary.
 */
export type {
  EngineRenderGraph,
  EngineRenderGraphExecutionContext,
  EngineRenderGraphExecutionResult,
  EngineRenderGraphPassNode,
  EngineRenderPassId,
} from './graphContracts.ts'
export {
  createLayeredRenderGraph,
  executeEngineRenderGraph,
} from './graphRuntime.ts'
