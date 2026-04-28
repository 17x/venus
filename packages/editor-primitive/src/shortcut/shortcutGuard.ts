/**
 * Defines shortcut guard context used to block editor shortcuts in unsafe states.
 */
export interface ShortcutGuardContext {
  /** Indicates whether editor is currently in text editing mode. */
  isTextEditing: boolean
  /** Indicates whether the platform IME composition session is active. */
  isComposing: boolean
  /** Stores target tag name when keyboard event originates from one DOM node. */
  targetTagName?: string
  /** Indicates whether event target is contenteditable. */
  isContentEditable?: boolean
}

/**
 * Returns whether editor-level shortcut matching should run for current context.
 */
export function shouldHandleEditorShortcut(context: ShortcutGuardContext): boolean {
  // Ignore editor shortcuts during IME composition to prevent destructive key handling.
  if (context.isComposing) {
    return false
  }

  // Keep text editing key routing inside text tool handlers by default.
  if (context.isTextEditing) {
    return false
  }

  if (context.isContentEditable) {
    return false
  }

  const tag = context.targetTagName?.toLowerCase()

  // Treat common input controls as shortcut-safe zones for native text behavior.
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return false
  }

  return true
}

