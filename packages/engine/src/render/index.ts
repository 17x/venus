/**
 * Render domain barrel aligned with the 2D->3D architecture blueprint.
 * Owns render-graph orchestration contracts and layered command composition surfaces.
 */
export type {
  EngineDrawCommand,
  EngineLayeredRenderInput,
  EngineLayeredRenderOutput,
  EngineRenderCamera,
  EngineRenderInteractionInput,
  EngineRenderOptions,
  EngineRenderPoint,
} from './contracts.ts'
export type {
  EngineRenderGraph,
  EngineRenderGraphExecutionContext,
  EngineRenderGraphExecutionResult,
  EngineRenderGraphPassNode,
  EngineRenderPassId,
} from './graph.ts'
export {
  composeLayeredDrawCommands,
  renderLayeredScene,
} from './runtime.ts'
export {
  createLayeredRenderGraph,
  executeEngineRenderGraph,
} from './graph.ts'
