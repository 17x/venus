import type { EngineDrawCommand } from '../../core/types.ts'
import { hitTestActiveLayer } from './hitTestActive.ts'
import { hitTestBaseLayer } from './hitTestBase.ts'

/**
 * Resolves hit test with active-first priority and base-layer fallback.
  * @param input Input payload for this operation.
*/
export function hitTestLayeredCommands(input: {
  /** Stores composed command list containing base/active/overlay commands. */
  commands: readonly EngineDrawCommand[]
  /** Stores world-space pointer point for hit test. */
  point: { x: number; y: number }
}) {
  const activeHit = hitTestActiveLayer(input.commands, input.point)
  if (activeHit) {
    return activeHit
  }

  return hitTestBaseLayer(input.commands, input.point)
}
