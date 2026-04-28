import {
  compileShortcutBindings,
  createShortcutPressedKeys,
  resolveMatchingShortcutBinding,
  shouldHandleEditorShortcut,
  type CompiledShortcutBinding,
  type ShortcutBindingDefinition,
  type ShortcutPlatform,
} from '@venus/editor-primitive'

/**
 * Resolves runtime platform token for shortcut `mod` alias handling.
 */
function resolveShortcutPlatform(): ShortcutPlatform {
  if (typeof navigator === 'undefined') {
    return 'unknown'
  }

  const platform = navigator.platform.toLowerCase()
  if (platform.includes('mac')) {
    return 'mac'
  }
  if (platform.includes('win')) {
    return 'windows'
  }
  if (platform.includes('linux')) {
    return 'linux'
  }
  return 'unknown'
}

/**
 * Defines one declarative shortcut entry used by the vector shell hook.
 */
export interface ShortcutOptions {
  /** Stores shortcut definitions keyed by action id. */
  shortcuts: ShortcutBindingDefinition[]
  /** Enables keyup listener mode for temporary tool release bindings. */
  upMode?: boolean
  /** Receives one callback when a binding matches current keyboard state. */
  callback?: (id: string, event: KeyboardEvent) => void
  /** Allows caller-specific focus checks before shortcut resolution runs. */
  shouldHandleEvent?: (event: KeyboardEvent) => boolean
}

const INTERACTIVE_EVENT_TARGET_SELECTOR = [
  'input:not([type="hidden"])',
  'textarea',
  'select',
  'button',
  'a[href]',
  '[role="button"]',
  '[role="textbox"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[data-shortcut-stop="true"]',
].join(', ')

/**
 * Returns whether event target belongs to an interactive control scope.
 */
const isInteractiveEventTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  return !!target.closest(INTERACTIVE_EVENT_TARGET_SELECTOR)
}

/**
 * Runtime handle contract for one active shortcut listener registration.
 */
export interface ShortcutHandle {
  /** Releases the active keyboard listener registration. */
  destroy: () => void
}

/**
 * Handles one keyboard event and dispatches one matched shortcut id when available.
 * @param event Browser keyboard event.
 * @param shortcuts Compiled shortcut bindings.
 * @param platform Active platform for `mod` alias normalization.
 * @param callback Callback for matched shortcut ids.
 * @param shouldHandleEvent Optional host-level guard.
 */
function handleShortcutKeyEvent(
  event: KeyboardEvent,
  shortcuts: CompiledShortcutBinding[],
  platform: ShortcutPlatform,
  callback: ((id: string, event: KeyboardEvent) => void) | undefined,
  shouldHandleEvent: ((event: KeyboardEvent) => boolean) | undefined,
) {
  if (event.defaultPrevented) return
  if (isInteractiveEventTarget(event.target)) return
  if (shouldHandleEvent && !shouldHandleEvent(event)) return
  // Reuse primitive guard policy so IME/text-editing safety stays consistent.
  if (!shouldHandleEditorShortcut({
    isTextEditing: false,
    isComposing: event.isComposing || event.key === 'Process',
    targetTagName: event.target instanceof HTMLElement ? event.target.tagName : undefined,
    isContentEditable: event.target instanceof HTMLElement ? event.target.isContentEditable : false,
  })) return

  const pressedKeys = createShortcutPressedKeys(event)
  const matchedId = resolveMatchingShortcutBinding(shortcuts, {
    pressedKeys,
    platform,
  })
  if (!matchedId) return

  event.preventDefault()
  callback?.(matchedId, event)
}

/**
 * Creates one shortcut listener handle and compiles bindings once.
 * @param options Declarative shortcut listener options.
 */
function createShortcut(options: ShortcutOptions): ShortcutHandle {
  const eventsController = new AbortController()
  const shortcuts = compileShortcutBindings(options.shortcuts ?? [])
  const platform = resolveShortcutPlatform()
  const upMode = options.upMode ?? false

  const handleKey = (event: KeyboardEvent) => {
    handleShortcutKeyEvent(
      event,
      shortcuts,
      platform,
      options.callback,
      options.shouldHandleEvent,
    )
  }

  window.addEventListener(upMode ? 'keyup' : 'keydown', handleKey, {
    signal: eventsController.signal,
  })

  return {
    destroy() {
      eventsController.abort()
    },
  }
}

export default createShortcut