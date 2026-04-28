import type { EngineDrawCommand, EngineLayeredRenderInput } from '../../../core/types.ts'
import { resolveOverlayLayout } from './overlayLayout.ts'

/**
 * Resolves overlay layer draw commands from interaction state.
  * @param input Input payload for this operation.
*/
export function renderOverlayLayer(input: EngineLayeredRenderInput): EngineDrawCommand[] {
  return resolveOverlayLayout(input)
}
