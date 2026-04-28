/**
 * Defines normalized modifier key state with explicit boolean fields.
 */
export interface ModifierState {
  /** Indicates whether Alt is pressed. */
  alt: boolean
  /** Indicates whether Ctrl is pressed. */
  ctrl: boolean
  /** Indicates whether Meta is pressed. */
  meta: boolean
  /** Indicates whether Shift is pressed. */
  shift: boolean
  /** Indicates whether Space is pressed. */
  space: boolean
}

/**
 * Creates an empty normalized modifier state.
 */
export function createEmptyModifierState(): ModifierState {
  return {
    alt: false,
    ctrl: false,
    meta: false,
    shift: false,
    space: false,
  }
}

