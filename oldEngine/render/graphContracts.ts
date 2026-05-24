import type { EngineDrawCommand, EngineLayeredRenderInput } from './contracts.ts'

/**
 * Declares stable render-pass identifiers used by render-graph orchestration.
 */
export type EngineRenderPassId =
  | 'base-pass'
  | 'active-pass'
  | 'overlay-pass'
  | 'composite-pass'

/**
 * Declares mutable graph execution context shared across pass execution.
 */
export interface EngineRenderGraphExecutionContext {
  /** Layered render input shared by all pass nodes. */
  input: EngineLayeredRenderInput
  /** Accumulated pass outputs keyed by pass id. */
  passOutputs: Partial<Record<EngineRenderPassId, EngineDrawCommand[]>>
}

/**
 * Declares one executable pass node inside the render graph.
 */
export interface EngineRenderGraphPassNode {
  /** Stable pass identifier. */
  id: EngineRenderPassId
  /** Pass dependencies that must execute first. */
  dependsOn: readonly EngineRenderPassId[]
  /**
   * Executes one pass and returns produced draw commands.
   * @param context Graph execution context.
   */
  execute(context: EngineRenderGraphExecutionContext): EngineDrawCommand[]
}

/**
 * Declares one render graph instance with pass topology and execution nodes.
 */
export interface EngineRenderGraph {
  /** Stable graph pass order used by deterministic execution. */
  passOrder: readonly EngineRenderPassId[]
  /** Pass-node map keyed by pass identifier. */
  passNodes: Readonly<Record<EngineRenderPassId, EngineRenderGraphPassNode>>
}

/**
 * Declares one render graph execution result snapshot.
 */
export interface EngineRenderGraphExecutionResult {
  /** Per-pass command outputs captured during execution. */
  passOutputs: Readonly<Record<EngineRenderPassId, EngineDrawCommand[]>>
  /** Final composed draw commands emitted by composite pass. */
  composed: EngineDrawCommand[]
}
