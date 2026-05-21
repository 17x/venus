// Module responsibility: standardize render request reason taxonomy and aggregation.
// Non-responsibility: request scheduling.

/**
 * Canonical render request reason names.
 */
export const ENGINE_RENDER_REQUEST_REASON = {
  USER_INTERACTION: 'user-interaction',
  SCENE_MUTATION: 'scene-mutation',
  CAMERA_ANIMATION: 'camera-animation',
  RESOURCE_READY: 'resource-ready',
  RESIZE: 'resize',
  DIAGNOSTIC_REPLAY: 'diagnostic-replay',
} as const

/**
 * Union type for render request reason names.
 */
export type EngineRenderRequestReason =
  (typeof ENGINE_RENDER_REQUEST_REASON)[keyof typeof ENGINE_RENDER_REQUEST_REASON]

/**
 * Describes one render request reason counter map.
 */
export type EngineRenderRequestReasonCounters = Record<EngineRenderRequestReason, number>

/**
 * Intent: create empty request reason counters with all taxonomy fields initialized.
 * @returns Initialized reason counter map.
 */
export function createEngineRenderRequestReasonCounters(): EngineRenderRequestReasonCounters {
  return {
    [ENGINE_RENDER_REQUEST_REASON.USER_INTERACTION]: 0,
    [ENGINE_RENDER_REQUEST_REASON.SCENE_MUTATION]: 0,
    [ENGINE_RENDER_REQUEST_REASON.CAMERA_ANIMATION]: 0,
    [ENGINE_RENDER_REQUEST_REASON.RESOURCE_READY]: 0,
    [ENGINE_RENDER_REQUEST_REASON.RESIZE]: 0,
    [ENGINE_RENDER_REQUEST_REASON.DIAGNOSTIC_REPLAY]: 0,
  }
}

/**
 * Intent: increment one reason counter in an immutable way.
 * @param counters Existing reason counters.
 * @param reason Reason to increment.
 * @returns Next reason counters.
 */
export function incrementEngineRenderRequestReason(
  counters: EngineRenderRequestReasonCounters,
  reason: EngineRenderRequestReason,
): EngineRenderRequestReasonCounters {
  return {
    ...counters,
    [reason]: counters[reason] + 1,
  }
}
