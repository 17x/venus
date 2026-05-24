import type { EngineDrawCommand } from './types.ts'

/**
 * Composes final draw command list in strict layer order.
  * @param input Input payload for this operation.
*/
export function composeLayeredDrawCommands(input: {
  /** Stores base-layer command list. */
  base: readonly EngineDrawCommand[]
  /** Stores active-layer command list. */
  active: readonly EngineDrawCommand[]
  /** Stores overlay-layer command list. */
  overlay: readonly EngineDrawCommand[]
}) {
  // Layer order is strict: base -> active -> overlay.
  return [...input.base, ...input.active, ...input.overlay]
}
