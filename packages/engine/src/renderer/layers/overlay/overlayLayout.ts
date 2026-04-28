import type { EngineDrawCommand, EngineLayeredRenderInput } from '../../../core/types.ts'

/**
 * Resolves overlay draw commands for hover and selection markers.
  * @param input Input payload for this operation.
*/
export function resolveOverlayLayout(input: EngineLayeredRenderInput): EngineDrawCommand[] {
  const commands: EngineDrawCommand[] = []
  const hoverId = input.interaction.hoverId
  const selectionIds = input.interaction.selectionIds

  if (hoverId) {
    commands.push(createOverlayMarkerCommand(hoverId, 'hover'))
  }

  if (selectionIds && selectionIds.size > 0) {
    for (const selectionId of selectionIds) {
      commands.push(createOverlayMarkerCommand(selectionId, 'selection'))
    }
  }

  return commands
}

/**
 * Creates one overlay marker command for hover/selection visual feedback.
  * @param nodeId nodeId parameter.
 * @param marker marker parameter.
*/
function createOverlayMarkerCommand(
  nodeId: string,
  marker: 'hover' | 'selection',
): EngineDrawCommand {
  // Overlay marker bounds are resolved later from preview-aware geometry payload.
  return {
    id: `overlay:${marker}:${nodeId}`,
    nodeId,
    layer: 'overlay',
    nodeType: 'shape',
    bounds: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    },
    marker,
  }
}
