import {type RuntimeRenderPhase} from '../../engineTypes.ts'

/**
 * Declares one routing plane used by vector runtime composition policy.
 */
export type RuntimeCompositionPlane = 'base' | 'active' | 'overlay'

/**
 * Declares active/overlay routing inputs used by runtime composition policy.
 */
export interface ResolveActiveOverlayRoutingInput {
  /** Stores current effective interaction phase used by routing policy. */
  interactionPhase: RuntimeRenderPhase
  /** Stores all current shape ids from runtime scene snapshots. */
  allShapeIds: readonly string[]
  /** Stores protected shape ids that should avoid aggressive quality collapse. */
  protectedNodeIds: readonly string[]
  /** Stores incremental changed ids used by patch-driven active routing. */
  changedNodeIds?: readonly string[]
  /** Stores overlay node count scheduled for this frame. */
  overlayNodeCount?: number
}

/**
 * Declares one resolved active/overlay routing decision.
 */
export interface ActiveOverlayRoutingDecision {
  /** Stores whether active plane is required for this frame. */
  shouldUseActivePlane: boolean
  /** Stores route-target plane for scene bodies. */
  scenePlane: RuntimeCompositionPlane
  /** Stores route-target plane for overlay nodes. */
  overlayPlane: RuntimeCompositionPlane
  /** Stores deterministic protected-node ids routed into engine guardrail APIs. */
  protectedNodeIds: string[]
  /** Stores deterministic active-node ids routed into engine active-layer APIs. */
  interactionActiveNodeIds: string[]
}

/**
 * Resolves one deterministic routing decision for active layer and overlay planes.
 * @param input Active/overlay routing input snapshot.
 */
export function resolveActiveOverlayRoutingDecision(
  input: ResolveActiveOverlayRoutingInput,
): ActiveOverlayRoutingDecision {
  const normalizedProtectedNodeIds = [...input.protectedNodeIds].sort()
  const shouldUseActivePlane = (
    input.interactionPhase === 'drag' ||
    input.interactionPhase === 'precision'
  )

  const interactionActiveNodeIds = resolveInteractionActiveNodeIdsForRouting({
    shouldUseActivePlane,
    allShapeIds: input.allShapeIds,
    protectedNodeIds: normalizedProtectedNodeIds,
    changedNodeIds: input.changedNodeIds,
  })

  const overlayPlane: RuntimeCompositionPlane =
    (input.overlayNodeCount ?? 0) > 0
      ? 'overlay'
      : 'base'

  return {
    shouldUseActivePlane,
    scenePlane: shouldUseActivePlane ? 'active' : 'base',
    overlayPlane,
    protectedNodeIds: normalizedProtectedNodeIds,
    interactionActiveNodeIds,
  }
}

/**
 * Resolves deterministic interaction-active ids for active-plane routing.
 * @param input Normalized routing input used by active-id resolver.
 */
function resolveInteractionActiveNodeIdsForRouting(input: {
  shouldUseActivePlane: boolean
  allShapeIds: readonly string[]
  protectedNodeIds: readonly string[]
  changedNodeIds?: readonly string[]
}): string[] {
  if (!input.shouldUseActivePlane) {
    return []
  }

  // Route drag/precision frames entirely through active layer so transform
  // feedback stays immediate without waiting on incremental scene diff quality.
  if (input.allShapeIds.length > 0) {
    return [...input.allShapeIds]
  }

  const ids = new Set<string>(input.protectedNodeIds)
  if (input.changedNodeIds && input.changedNodeIds.length > 0) {
    for (const changedNodeId of input.changedNodeIds) {
      ids.add(changedNodeId)
    }
  }

  return [...ids].sort()
}
