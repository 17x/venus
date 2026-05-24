import type { EngineLayeredRenderInput, EngineLayeredRenderOutput } from './types.ts'
import {
  createLayeredRenderGraph,
  executeEngineRenderGraph,
} from './renderGraph/renderGraph.ts'

/**
 * Executes layered render pipeline and returns per-layer plus composed output.
  * @param input Input payload for this operation.
*/
export function renderLayeredScene(
  input: EngineLayeredRenderInput,
): EngineLayeredRenderOutput {
  const graph = createLayeredRenderGraph()
  const execution = executeEngineRenderGraph(graph, input)
  const base = execution.passOutputs['base-pass']
  const active = execution.passOutputs['active-pass']
  const overlay = execution.passOutputs['overlay-pass']

  return {
    base,
    active,
    overlay,
    composed: execution.composed,
  }
}
