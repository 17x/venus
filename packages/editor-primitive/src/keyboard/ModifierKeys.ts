/**
 * Describes active keyboard modifiers for interaction resolution.
 */
export interface ModifierKeys {
  /** Indicates whether Space is currently pressed. */
  space?: boolean
  /** Indicates whether Alt is currently pressed. */
  alt?: boolean
  /** Indicates whether Shift is currently pressed. */
  shift?: boolean
  /** Indicates whether Ctrl is currently pressed. */
  ctrl?: boolean
  /** Indicates whether Meta is currently pressed. */
  meta?: boolean
}

/**
 * Creates an empty modifier snapshot.
 */
export function createEmptyModifierKeys(): ModifierKeys {
  return {
    space: false,
    alt: false,
    shift: false,
    ctrl: false,
    meta: false,
  }
}

