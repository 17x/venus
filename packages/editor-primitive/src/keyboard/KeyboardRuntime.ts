import type {ModifierKeys} from './ModifierKeys.ts'
import {createEmptyModifierKeys} from './ModifierKeys.ts'

/**
 * Stores keyboard runtime state used by editor interaction reducers.
 */
export interface KeyboardRuntime {
  /** Stores currently pressed keys in normalized lowercase form. */
  pressedKeys: Set<string>
  /** Stores active modifier snapshot derived from pressed keys and events. */
  modifierKeys: ModifierKeys
  /** Stores most recent keydown value for diagnostics and replay hooks. */
  lastKeyDown?: string
  /** Stores most recent keyup value for diagnostics and replay hooks. */
  lastKeyUp?: string
}

/**
 * Creates initial keyboard runtime with no pressed keys.
 */
export function createKeyboardRuntime(): KeyboardRuntime {
  return {
    pressedKeys: new Set(),
    modifierKeys: createEmptyModifierKeys(),
  }
}

