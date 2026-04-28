/**
 * Defines interaction target resolved from hit-test and capture inputs.
 */
export type InteractionTarget =
  // Stores a concrete overlay control/handle target.
  | {type: 'overlay-handle'; id: string; handle: string}
  // Stores a non-handle overlay region target.
  | {type: 'overlay-bounds'; id: string}
  // Stores a scene-domain target identifier.
  | {type: 'scene-node'; id: string}
  // Stores viewport background target.
  | {type: 'viewport'}
  // Stores explicit empty target when no hit was found.
  | {type: 'empty'}

/**
 * Defines priority buckets used by target resolution ordering.
 */
export type InteractionTargetPriority =
  | 'capture'
  | 'active-operation'
  | 'overlay-handle'
  | 'overlay-bounds'
  | 'scene-node'
  | 'viewport'
  | 'empty'

/**
 * Defines a candidate target with explicit priority metadata.
 */
export interface InteractionTargetCandidate {
  /** Stores candidate priority bucket. */
  priority: InteractionTargetPriority
  /** Stores target payload for the priority bucket. */
  target: InteractionTarget
}

/**
 * Defines optional candidates for each priority bucket.
 */
export interface ResolveInteractionTargetInput {
  /** Stores capture-constrained target when pointer capture is active. */
  capturedTarget?: InteractionTarget
  /** Stores active-operation sticky target when operation is in progress. */
  activeOperationTarget?: InteractionTarget
  /** Stores overlay handle hit target when available. */
  overlayHandleTarget?: InteractionTarget
  /** Stores overlay bounds hit target when available. */
  overlayBoundsTarget?: InteractionTarget
  /** Stores scene node hit target when available. */
  sceneTarget?: InteractionTarget
  /** Stores viewport fallback target when background is hit. */
  viewportTarget?: InteractionTarget
}

/**
 * Resolves interaction target with stable priority ordering.
 */
export function resolveInteractionTarget(
  input: ResolveInteractionTargetInput,
): InteractionTargetCandidate {
  // Honor capture first so drag interactions stay routed to their original owner.
  if (input.capturedTarget) {
    return {priority: 'capture', target: input.capturedTarget}
  }

  // Keep active operation sticky before fresh hit-test targets to avoid target flicker.
  if (input.activeOperationTarget) {
    return {priority: 'active-operation', target: input.activeOperationTarget}
  }

  // Handles outrank overlay bounds to preserve resize/rotate affordance precision.
  if (input.overlayHandleTarget) {
    return {priority: 'overlay-handle', target: input.overlayHandleTarget}
  }

  if (input.overlayBoundsTarget) {
    return {priority: 'overlay-bounds', target: input.overlayBoundsTarget}
  }

  if (input.sceneTarget) {
    return {priority: 'scene-node', target: input.sceneTarget}
  }

  if (input.viewportTarget) {
    return {priority: 'viewport', target: input.viewportTarget}
  }

  return {
    priority: 'empty',
    target: {type: 'empty'},
  }
}

