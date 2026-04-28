/**
 * Defines interaction policy values that tune gesture and routing behavior.
 */
export interface InteractionPolicy {
  /** Stores drag start threshold in screen-space pixels. */
  dragThreshold: number
  /** Stores click tolerance in screen-space pixels. */
  clickTolerance: number
  /** Stores max interval between clicks for double-click recognition. */
  doubleClickIntervalMs: number
  /** Controls whether hover updates continue while an operation is active. */
  hoverDuringOperation: boolean
  /** Controls whether overlay targets outrank scene targets when both exist. */
  overlayHitPriority: boolean
  /** Stores normalized key token used for temporary pan mode. */
  temporaryPanKey: string
  /** Controls whether losing pointer capture cancels active operation. */
  cancelOnPointerCaptureLost: boolean
  /** Controls whether changing tool cancels active operation. */
  cancelOnToolChange: boolean
}

/**
 * Stores a conservative default policy that mirrors current vector behavior.
 */
export const DEFAULT_INTERACTION_POLICY: InteractionPolicy = {
  dragThreshold: 4,
  clickTolerance: 3,
  doubleClickIntervalMs: 300,
  hoverDuringOperation: false,
  overlayHitPriority: true,
  temporaryPanKey: 'space',
  cancelOnPointerCaptureLost: true,
  cancelOnToolChange: true,
}

/**
 * Resolves policy by applying caller overrides over the package defaults.
 */
export function resolveInteractionPolicy(
  overrides?: Partial<InteractionPolicy>,
): InteractionPolicy {
  return {
    ...DEFAULT_INTERACTION_POLICY,
    ...overrides,
  }
}

