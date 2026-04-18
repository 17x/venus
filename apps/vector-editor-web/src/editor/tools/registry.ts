import type { ToolName } from '@venus/document-core'

// --- Tool handler types ---

/** Per-tool metadata for UI display and shortcut binding */
export interface ToolMeta {
  readonly name: ToolName
  /** Human-readable label key (i18n) */
  readonly labelKey: string
  /** Keyboard shortcut character (e.g. 'v', 'm', 'p') */
  readonly shortcut?: string
  /** Tool group for toolbar organization */
  readonly group: 'selection' | 'shape' | 'draw' | 'text' | 'navigation'
  /** Cursor CSS value when this tool is active */
  readonly cursor?: string
}

/**
 * Pointer event context forwarded to tool handlers.
 * Product layer converts DOM events into this structure before dispatching.
 */
export interface ToolPointerEvent {
  /** World-space coordinates */
  readonly worldX: number
  readonly worldY: number
  /** Viewport-relative pixel coordinates */
  readonly viewportX: number
  readonly viewportY: number
  /** Modifier keys held at event time */
  readonly shiftKey: boolean
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  /** Pointer button (0 = primary, 2 = secondary) */
  readonly button: number
}

/**
 * Tool handler lifecycle callbacks.
 * Each tool implements only the callbacks it needs.
 */
export interface ToolHandler {
  readonly meta: ToolMeta

  /** Called when the tool becomes active */
  onActivate?(): void
  /** Called when the tool is deactivated (another tool selected) */
  onDeactivate?(): void

  /** Canvas pointer events routed to the active tool */
  onPointerDown?(event: ToolPointerEvent): void
  onPointerMove?(event: ToolPointerEvent): void
  onPointerUp?(event: ToolPointerEvent): void

  /** Called on Escape while this tool is active */
  onCancel?(): void

  /** Return a CSS cursor value based on current state, or undefined for default */
  getCursor?(): string | undefined
}

// --- Tool registry ---

export interface ToolRegistry {
  register(handler: ToolHandler): void
  get(name: ToolName): ToolHandler | undefined
  has(name: ToolName): boolean
  list(): ToolMeta[]
  /** Get handlers sorted by group for toolbar rendering */
  listByGroup(): Map<ToolMeta['group'], ToolMeta[]>
}

export function createToolRegistry(): ToolRegistry {
  const handlers = new Map<ToolName, ToolHandler>()

  return {
    register(handler) {
      handlers.set(handler.meta.name, handler)
    },
    get(name) {
      return handlers.get(name)
    },
    has(name) {
      return handlers.has(name)
    },
    list() {
      return Array.from(handlers.values()).map((h) => h.meta)
    },
    listByGroup() {
      const groups = new Map<ToolMeta['group'], ToolMeta[]>()
      for (const handler of handlers.values()) {
        const group = handler.meta.group
        if (!groups.has(group)) groups.set(group, [])
        groups.get(group)!.push(handler.meta)
      }
      return groups
    },
  }
}
