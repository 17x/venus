export interface ShortcutOptions {
  shortcuts: { id: string, shortcut: string }[],
  upMode?: boolean
  callback?: (id: string, event: KeyboardEvent) => void
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

const isInteractiveEventTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  return !!target.closest(INTERACTIVE_EVENT_TARGET_SELECTOR)
}

class Shortcut {
  protected eventsController: AbortController = new AbortController()
  shortcuts: { id: string, shortcut: string }[]
  upMode: boolean
  callback?: (id: string, event: KeyboardEvent) => void
  shouldHandleEvent?: (event: KeyboardEvent) => boolean

  constructor({
                shortcuts = [],
                callback,
                shouldHandleEvent,
                upMode = false,
              }: ShortcutOptions) {
    this.upMode = upMode
    this.callback = callback
    this.shouldHandleEvent = shouldHandleEvent
    this.shortcuts = shortcuts

    window.addEventListener(upMode ? 'keyup' : 'keydown', this.handleKey.bind(this), {
      signal: this.eventsController.signal,
      // passive: false,
    })
  }

  handleKey(event: KeyboardEvent) {
    if (event.defaultPrevented) return
    if (event.isComposing || event.key === 'Process') return
    if (isInteractiveEventTarget(event.target)) return
    if (this.shouldHandleEvent && !this.shouldHandleEvent(event)) return

    const {key, code, altKey, ctrlKey, metaKey, shiftKey} = event
    const parts: string[] = []
    if (ctrlKey) parts.push('ctrl')
    if (metaKey) parts.push('meta')
    if (shiftKey) parts.push('shift')
    if (altKey) parts.push('alt')

    if (code.toLowerCase() === 'space') {
      parts.push('space')
    } else {
      parts.push(key.toLowerCase())
    }

    const inputShortcut = parts.join('+')

    for (const {id, shortcut} of this.shortcuts) {
      const keys = shortcut.split(',').map(s => s.trim().toLowerCase())
      if (keys.includes(inputShortcut)) {
        event.preventDefault()
        this.callback?.(id, event)
        break
      }
    }
  }

  destroy() {
    this.eventsController.abort()
    this.eventsController = null!
    this.upMode = null!
    this.callback = null!
    this.shouldHandleEvent = null!
    this.shortcuts = null!
  }
}

export default Shortcut