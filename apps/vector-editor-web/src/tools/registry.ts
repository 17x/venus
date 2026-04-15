// --- Connector Tool Handler ---
import type { ToolHandler, ToolMeta, ToolPointerEvent } from './registry.ts'
import { nid } from '@venus/document-core'

const connectorToolMeta: ToolMeta = {
  name: 'connector' as any, // Extend ToolName union as needed
  labelKey: 'tool.connector',
  shortcut: 'c',
  group: 'draw',
  cursor: 'crosshair',
}

// Internal state for connector tool
let connectorStart: { nodeId: string; anchor: { x: number; y: number } } | null = null

const connectorToolHandler: ToolHandler = {
  meta: connectorToolMeta,
  onActivate() {
    connectorStart = null
  },
  onDeactivate() {
    connectorStart = null
  },
  /**
   * Pointer down: first click sets source, second click sets target and dispatches command.
   * This logic assumes hit-testing and node picking is handled elsewhere and available here.
   */
  onPointerDown(event: ToolPointerEvent) {
    // TODO: Integrate with hit-test to get nodeId at event.worldX, event.worldY
    const pickedNodeId = getNodeIdAt(event.worldX, event.worldY) // Placeholder
    if (!pickedNodeId) return
    if (!connectorStart) {
      connectorStart = { nodeId: pickedNodeId, anchor: { x: event.worldX, y: event.worldY } }
    } else {
      // Second click: create connector
      const params = {
        sourceNodeId: connectorStart.nodeId,
        targetNodeId: pickedNodeId,
        sourceAnchor: connectorStart.anchor,
        targetAnchor: { x: event.worldX, y: event.worldY },
        connectorType: 'STRAIGHT',
      }
      dispatchCommand('connector.create', params)
      connectorStart = null
    }
  },
  onCancel() {
    connectorStart = null
  },
}

// Register connector tool in registry setup
// registry.register(connectorToolHandler)

// --- Placeholder functions for integration ---
function getNodeIdAt(x: number, y: number): string | null {
  // TODO: Integrate with hit-test system to return nodeId at (x, y)
  return null
}
function dispatchCommand(type: string, params: any) {
  // TODO: Integrate with runtime command dispatch system
}
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
