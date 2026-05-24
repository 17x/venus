import {
  createLayeredRenderGraph as createLayeredRenderGraphFromCore,
  executeEngineRenderGraph as executeEngineRenderGraphFromCore,
} from '../core/renderGraph/renderGraph.ts'
import type { EngineLayeredRenderInput } from './contracts.ts'
import type {
  EngineRenderGraph,
  EngineRenderGraphExecutionResult,
} from './graphContracts.ts'

/**
 * Exposes render-graph construction through a render-domain owned runtime entrypoint.
 */
export function createLayeredRenderGraph(): EngineRenderGraph {
  return createLayeredRenderGraphFromCore()
}

/**
 * Exposes deterministic render-graph execution through the render-domain runtime entrypoint.
 * @param graph Render graph instance to execute.
 * @param input Layered render input payload.
 */
export function executeEngineRenderGraph(
  graph: EngineRenderGraph,
  input: EngineLayeredRenderInput,
): EngineRenderGraphExecutionResult {
  return executeEngineRenderGraphFromCore(graph, input)
}
