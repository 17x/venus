// Core layered hit-test composes backend-neutral command hit-test phases;
// backend renderers should only emit commands and bounds.

import type { EngineDrawCommand } from '../types.ts'
import { hitTestActiveLayer } from './hitTestActive.ts'
import { hitTestBaseLayer } from './hitTestBase.ts'

/**
 * Resolves hit test with active-first priority and base-layer fallback.
 * @param input Layered command hit-test payload.
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
