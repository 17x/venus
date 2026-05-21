// Module responsibility: define backend-agnostic render pipeline contract v2.
// Non-responsibility: backend-specific rendering implementation.

import type { EngineBackend } from '../types/index.ts'

/**
 * Describes one backend capability declaration used by pipeline dispatch.
 */
export interface EnginePipelineBackendCapabilities {
  /** Backend identifier. */
  backend: EngineBackend
  /** Whether backend supports packet-mode draw submission. */
  packetDraw: boolean
  /** Whether backend supports progressive preview/resolve split. */
  progressivePass: boolean
  /** Whether backend supports partial redraw with dirty regions. */
  partialRedraw: boolean
}

/**
 * Describes one backend-agnostic pipeline stage contract.
 */
export interface EnginePipelineStageContract<TInput, TOutput> {
  /** Stable stage id for diagnostics and trace joins. */
  id: string
  /** Stage execution callback. */
  execute: (input: TInput) => TOutput
}

/**
 * Intent: validate a backend capability declaration against v2 required fields.
 * @param capability Raw capability declaration.
 * @returns True when capability declaration can join pipeline v2 flow.
 */
export function isEnginePipelineBackendCapabilityV2(
  capability: EnginePipelineBackendCapabilities,
): boolean {
  return Boolean(
    capability.backend &&
    typeof capability.packetDraw === 'boolean' &&
    typeof capability.progressivePass === 'boolean' &&
    typeof capability.partialRedraw === 'boolean',
  )
}
