import type {ModifierState} from '../input/ModifierState.ts'

/**
 * Defines normalized keyboard event consumed by interaction dispatch.
 */
export interface NormalizedKeyboardEvent {
  /** Stores normalized key token. */
  key: string
  /** Stores physical key code for layout-specific behavior. */
  code: string
  /** Stores normalized modifier snapshot at event time. */
  modifiers: ModifierState
  /** Indicates whether keydown is auto-repeat. */
  repeat: boolean
  /** Stores event timestamp in milliseconds. */
  timestamp: number
  /** Indicates whether IME composition is active. */
  isComposing: boolean
  /** Stores source element tag name when available. */
  targetTagName?: string
  /** Indicates whether source element is contenteditable. */
  isContentEditable?: boolean
}

