import type {OverlayNode} from './OverlayNode.ts'

/**
 * Stores overlay runtime state consumed by builders and hit-test adapters.
 */
export interface OverlayRuntime<TOverlayNode = unknown, TOverlayHit = unknown> {
  /** Stores monotonically increasing overlay version. */
  version: number
  /** Stores current overlay node collection. */
  nodes: TOverlayNode[]
  /** Stores last overlay hit result for hover/cursor continuity. */
  lastHit?: TOverlayHit | null
  /** Indicates whether overlay requires rebuild. */
  dirty: boolean
  /** Stores last overlay build time in milliseconds. */
  buildTimeMs?: number
  /** Stores last overlay hit-test time in milliseconds. */
  hitTestTimeMs?: number
}

/**
 * Creates initial overlay runtime state.
 */
export function createOverlayRuntime<TAction = unknown>(): OverlayRuntime<OverlayNode<TAction>, string> {
  return {
    version: 0,
    nodes: [],
    lastHit: null,
    dirty: true,
  }
}

/**
 * Replaces overlay nodes and bumps version to signal downstream consumers.
 */
export function replaceOverlayNodes<TNode, THit>(
  runtime: OverlayRuntime<TNode, THit>,
  nodes: TNode[],
): OverlayRuntime<TNode, THit> {
  return {
    ...runtime,
    version: runtime.version + 1,
    nodes,
    dirty: false,
  }
}

