import type {KeyboardRuntime} from './KeyboardRuntime.ts'
import type {ModifierKeys} from './ModifierKeys.ts'

/**
 * Defines minimal keyboard event contract used by runtime helpers.
 */
export interface KeyboardEventLike {
  /** Stores key value emitted by the platform event. */
  key: string
  /** Indicates whether Shift is pressed at event time. */
  shiftKey?: boolean
  /** Indicates whether Alt is pressed at event time. */
  altKey?: boolean
  /** Indicates whether Ctrl is pressed at event time. */
  ctrlKey?: boolean
  /** Indicates whether Meta is pressed at event time. */
  metaKey?: boolean
}

/**
 * Normalizes key identifiers into a predictable lowercase form.
 */
export function normalizeKeyboardKey(key: string): string {
  // Normalize whitespace-like Space token across browser/runtime differences.
  if (key === ' ') {
    return 'space'
  }
  return key.toLowerCase()
}

/**
 * Builds modifier snapshot from keyboard event flags.
 */
export function resolveModifierKeysFromEvent(event: KeyboardEventLike): ModifierKeys {
  return {
    space: normalizeKeyboardKey(event.key) === 'space',
    alt: !!event.altKey,
    shift: !!event.shiftKey,
    ctrl: !!event.ctrlKey,
    meta: !!event.metaKey,
  }
}

/**
 * Applies keydown transition and updates pressed/modifier state.
 */
export function applyKeyboardKeyDown(
  runtime: KeyboardRuntime,
  event: KeyboardEventLike,
): KeyboardRuntime {
  const key = normalizeKeyboardKey(event.key)
  const pressedKeys = new Set(runtime.pressedKeys)
  pressedKeys.add(key)

  return {
    ...runtime,
    pressedKeys,
    modifierKeys: {
      space: pressedKeys.has('space'),
      alt: pressedKeys.has('alt') || !!event.altKey,
      shift: pressedKeys.has('shift') || !!event.shiftKey,
      ctrl: pressedKeys.has('control') || pressedKeys.has('ctrl') || !!event.ctrlKey,
      meta: pressedKeys.has('meta') || pressedKeys.has('cmd') || !!event.metaKey,
    },
    lastKeyDown: key,
  }
}

/**
 * Applies keyup transition and updates pressed/modifier state.
 */
export function applyKeyboardKeyUp(
  runtime: KeyboardRuntime,
  event: KeyboardEventLike,
): KeyboardRuntime {
  const key = normalizeKeyboardKey(event.key)
  const pressedKeys = new Set(runtime.pressedKeys)
  pressedKeys.delete(key)

  return {
    ...runtime,
    pressedKeys,
    modifierKeys: {
      // Recompute from set so stale event flags cannot keep modifiers stuck.
      space: pressedKeys.has('space'),
      alt: pressedKeys.has('alt'),
      shift: pressedKeys.has('shift'),
      ctrl: pressedKeys.has('control') || pressedKeys.has('ctrl'),
      meta: pressedKeys.has('meta') || pressedKeys.has('cmd'),
    },
    lastKeyUp: key,
  }
}

