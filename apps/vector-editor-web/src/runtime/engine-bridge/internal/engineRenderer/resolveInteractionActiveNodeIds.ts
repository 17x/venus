import {type RuntimeRenderPhase} from '../engineTypes.ts'
import {resolveActiveOverlayRoutingDecision} from './activeOverlayRoutingContract/activeOverlayRoutingContract.ts'

/**
 * Resolves editing-scope active ids so active layer can isolate live edits.
 * @param input Editing state payload used to resolve active ids.
 */
export function resolveInteractionActiveNodeIds(input: {
  interactionPhase: RuntimeRenderPhase
  allShapeIds: readonly string[]
  protectedNodeIds: readonly string[]
  changedNodeIds?: readonly string[]
}): string[] {
  const routing = resolveActiveOverlayRoutingDecision({
    interactionPhase: input.interactionPhase,
    allShapeIds: input.allShapeIds,
    protectedNodeIds: input.protectedNodeIds,
    changedNodeIds: input.changedNodeIds,
    overlayNodeCount: 0,
  })

  return routing.interactionActiveNodeIds
}
