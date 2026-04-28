import {
  renderActiveLayer,
  renderBaseLayer,
  renderOverlayLayer,
} from '../renderer/layers/index.ts'
import { composeLayeredDrawCommands } from './compose.ts'
import type { EngineLayeredRenderInput, EngineLayeredRenderOutput } from './types.ts'

/**
 * Executes layered render pipeline and returns per-layer plus composed output.
  * @param input Input payload for this operation.
*/
export function renderLayeredScene(
  input: EngineLayeredRenderInput,
): EngineLayeredRenderOutput {
  const base = renderBaseLayer(input)
  const active = renderActiveLayer(input)
  const overlay = renderOverlayLayer(input)

  return {
    base,
    active,
    overlay,
    composed: composeLayeredDrawCommands({
      base,
      active,
      overlay,
    }),
  }
}
