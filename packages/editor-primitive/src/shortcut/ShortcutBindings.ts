import {normalizeKeyboardKey} from '../keyboard/keyUtils.ts'
import {
  matchesShortcut,
  parseShortcutChord,
  type ShortcutChord,
  type ShortcutMatchInput,
} from './ShortcutMatcher.ts'

/**
 * Defines one declarative shortcut binding entry.
 */
export interface ShortcutBindingDefinition<TId extends string = string> {
  /** Stores stable shortcut action identifier. */
  id: TId
  /** Stores comma-separated shortcut expression, for example `mod+s,ctrl+s`. */
  shortcut: string
}

/**
 * Defines compiled shortcut binding data for runtime matching.
 */
export interface CompiledShortcutBinding<TId extends string = string> {
  /** Stores stable shortcut action identifier. */
  id: TId
  /** Stores parsed shortcut chord variants associated with one action. */
  chords: ShortcutChord[]
}

/**
 * Defines keyboard-event-like contract used to build a pressed-key set snapshot.
 */
export interface ShortcutKeyboardEventLike {
  /** Stores key identifier reported by the platform event. */
  key: string
  /** Stores physical key code when one environment provides it. */
  code?: string
  /** Indicates whether Alt is active on this event. */
  altKey?: boolean
  /** Indicates whether Ctrl is active on this event. */
  ctrlKey?: boolean
  /** Indicates whether Meta is active on this event. */
  metaKey?: boolean
  /** Indicates whether Shift is active on this event. */
  shiftKey?: boolean
}

/**
 * Splits one comma-separated shortcut expression into normalized chord strings.
 */
function splitShortcutExpression(shortcut: string): string[] {
  return shortcut
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

/**
 * Compiles declarative shortcut definitions into parsed chord matchers.
 */
export function compileShortcutBindings<TId extends string = string>(
  definitions: readonly ShortcutBindingDefinition<TId>[],
): CompiledShortcutBinding<TId>[] {
  return definitions
    .map((definition) => {
      const chords = splitShortcutExpression(definition.shortcut).map((chord) => parseShortcutChord(chord))
      return {
        id: definition.id,
        chords,
      }
    })
    .filter((binding) => binding.chords.length > 0)
}

/**
 * Resolves normalized pressed keys for one keyboard event snapshot.
 */
export function createShortcutPressedKeys(event: ShortcutKeyboardEventLike): Set<string> {
  const pressedKeys = new Set<string>()

  // Keep modifier aliases available so matching remains resilient across browser spellings.
  if (event.ctrlKey) {
    pressedKeys.add('ctrl')
    pressedKeys.add('control')
  }
  if (event.metaKey) {
    pressedKeys.add('meta')
    pressedKeys.add('cmd')
  }
  if (event.shiftKey) {
    pressedKeys.add('shift')
  }
  if (event.altKey) {
    pressedKeys.add('alt')
  }

  // Normalize `Space` code explicitly because some browsers emit empty/space-like key strings.
  const normalizedKey = event.code?.toLowerCase() === 'space'
    ? 'space'
    : normalizeKeyboardKey(event.key)
  pressedKeys.add(normalizedKey)

  return pressedKeys
}

/**
 * Resolves first matching binding id for one pressed-key snapshot.
 */
export function resolveMatchingShortcutBinding<TId extends string = string>(
  bindings: readonly CompiledShortcutBinding<TId>[],
  input: ShortcutMatchInput,
): TId | null {
  for (const binding of bindings) {
    const matched = binding.chords.some((chord) => matchesShortcut(input, chord))
    if (matched) {
      return binding.id
    }
  }

  return null
}
