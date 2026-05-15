import {
  renderActiveLayer,
  renderBaseLayer,
  renderOverlayLayer,
} from '../../renderer/layers/index.ts'
import { composeLayeredDrawCommands } from '../compose.ts'
import type { EngineLayeredRenderInput } from '../types.ts'
import type {
  EngineRenderGraph,
  EngineRenderGraphExecutionContext,
  EngineRenderGraphExecutionResult,
  EngineRenderGraphPassNode,
  EngineRenderPassId,
} from './contracts.ts'

const RENDER_GRAPH_PASS_ORDER: readonly EngineRenderPassId[] = [
  'base-pass',
  'active-pass',
  'overlay-pass',
  'composite-pass',
]

/**
 * Creates the default layered render graph used by runtime pass orchestration.
 */
export function createLayeredRenderGraph(): EngineRenderGraph {
  const passNodes: Record<EngineRenderPassId, EngineRenderGraphPassNode> = {
    'base-pass': {
      id: 'base-pass',
      dependsOn: [],
      execute: (context) => {
        return renderBaseLayer(context.input)
      },
    },
    'active-pass': {
      id: 'active-pass',
      dependsOn: [],
      execute: (context) => {
        return renderActiveLayer(context.input)
      },
    },
    'overlay-pass': {
      id: 'overlay-pass',
      dependsOn: [],
      execute: (context) => {
        return renderOverlayLayer(context.input)
      },
    },
    'composite-pass': {
      id: 'composite-pass',
      dependsOn: ['base-pass', 'active-pass', 'overlay-pass'],
      execute: (context) => {
        const base = context.passOutputs['base-pass'] ?? []
        const active = context.passOutputs['active-pass'] ?? []
        const overlay = context.passOutputs['overlay-pass'] ?? []
        return composeLayeredDrawCommands({
          base,
          active,
          overlay,
        })
      },
    },
  }

  return {
    passOrder: RENDER_GRAPH_PASS_ORDER,
    passNodes,
  }
}

/**
 * Executes a render graph in deterministic pass order with dependency checks.
 * @param graph Render graph instance to execute.
 * @param input Layered render input payload.
 */
export function executeEngineRenderGraph(
  graph: EngineRenderGraph,
  input: EngineLayeredRenderInput,
): EngineRenderGraphExecutionResult {
  const context: EngineRenderGraphExecutionContext = {
    input,
    passOutputs: {},
  }

  for (const passId of graph.passOrder) {
    const passNode = graph.passNodes[passId]
    assertPassDependencies(passNode, context)
    context.passOutputs[passId] = passNode.execute(context)
  }

  const passOutputs = freezePassOutputs(context.passOutputs)
  const composed = passOutputs['composite-pass'] ?? []
  return {
    passOutputs,
    composed,
  }
}

/**
 * Asserts pass dependencies are resolved before executing the pass.
 * @param passNode Pass node that is about to execute.
 * @param context Graph execution context.
 */
function assertPassDependencies(
  passNode: EngineRenderGraphPassNode,
  context: EngineRenderGraphExecutionContext,
): void {
  for (const dependencyPassId of passNode.dependsOn) {
    if (!context.passOutputs[dependencyPassId]) {
      throw new Error(`Render graph dependency not satisfied: ${passNode.id} -> ${dependencyPassId}`)
    }
  }
}

/**
 * Freezes pass outputs into a strict full pass-output record.
 * @param passOutputs Mutable pass outputs gathered during execution.
 */
function freezePassOutputs(
  passOutputs: Partial<Record<EngineRenderPassId, ReturnType<EngineRenderGraphPassNode['execute']>>>,
): Readonly<Record<EngineRenderPassId, ReturnType<EngineRenderGraphPassNode['execute']>>> {
  return {
    'base-pass': passOutputs['base-pass'] ?? [],
    'active-pass': passOutputs['active-pass'] ?? [],
    'overlay-pass': passOutputs['overlay-pass'] ?? [],
    'composite-pass': passOutputs['composite-pass'] ?? [],
  }
}
