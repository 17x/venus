import {normalizeKeyboardKey} from '../keyboard/keyUtils.ts'

/**
 * Defines supported platform names for command/control normalization.
 */
export type ShortcutPlatform = 'mac' | 'windows' | 'linux' | 'unknown'

/**
 * Defines normalized shortcut matching input.
 */
export interface ShortcutMatchInput {
  /** Stores normalized pressed keys from keyboard runtime. */
  pressedKeys: Set<string>
  /** Stores active platform so command/control aliases are resolved correctly. */
  platform: ShortcutPlatform
}

/**
 * Defines parsed shortcut representation for matching.
 */
export interface ShortcutChord {
  /** Stores normalized key tokens expected by the chord. */
  keys: string[]
}

/**
 * Resolves command/control alias token according to active platform.
 */
function resolveAliasToken(token: string, platform: ShortcutPlatform): string {
  if (token !== 'mod') {
    return token
  }

  // Map portable Mod token to Meta on macOS and Ctrl elsewhere.
  return platform === 'mac' ? 'meta' : 'ctrl'
}

/**
 * Parses `mod+shift+z` style chord syntax into normalized key tokens.
 */
export function parseShortcutChord(chord: string): ShortcutChord {
  const keys = chord
    .split('+')
    .map((part) => normalizeKeyboardKey(part.trim()))
    .filter((part) => part.length > 0)

  return {keys}
}

/**
 * Checks whether current pressed key set satisfies a parsed shortcut chord.
 */
export function matchesShortcut(
  input: ShortcutMatchInput,
  chord: ShortcutChord,
): boolean {
  return chord.keys.every((key) => {
    const resolvedKey = resolveAliasToken(key, input.platform)

    // Accept both control spellings to smooth browser/environment differences.
    if (resolvedKey === 'ctrl') {
      return input.pressedKeys.has('ctrl') || input.pressedKeys.has('control')
    }

    return input.pressedKeys.has(resolvedKey)
  })
}

