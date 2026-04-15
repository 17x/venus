import { nid } from '@venus/document-core'
// import type { RuntimeConnectorFeatureV5, DocumentNode } from '@venus/document-core'
// --- Connector Create Command Handler ---

/**
 * Command: connector.create
 * Creates a connector node between two nodes with specified anchors and type.
 * Keeps all product policy out of engine; only document mutation here.
 */
interface ConnectorCreateParams {
  sourceNodeId: string
  targetNodeId: string
  sourceAnchor: { x: number; y: number }
  targetAnchor: { x: number; y: number }
  connectorType: 'STRAIGHT' | 'ORTHOGONAL' | 'CURVED'
  parentId?: string | null
}

const connectorCreateDescriptor: CommandDescriptor<ConnectorCreateParams> = {
  type: 'connector.create',
  label: 'Create Connector',
  undoable: true,
  validate: (params) => {
    if (!params.sourceNodeId || !params.targetNodeId) return 'Missing node IDs'
    if (!params.sourceAnchor || !params.targetAnchor) return 'Missing anchors'
    if (!params.connectorType) return 'Missing connector type'
    return null
  },
}

const connectorCreateHandler: CommandHandler<ConnectorCreateParams, { connectorId: string }> = {
  descriptor: connectorCreateDescriptor,
  execute(ctx, params) {
    // Generate unique connector node ID
    const connectorId = nid()
    // Build connector feature
    const feature: RuntimeConnectorFeatureV5 = {
      kind: 'CONNECTOR',
      sourceNodeId: params.sourceNodeId,
      targetNodeId: params.targetNodeId,
      sourceAnchor: params.sourceAnchor,
      targetAnchor: params.targetAnchor,
      connectorType: params.connectorType,
    }
    // Create DocumentNode for connector
    const node: DocumentNode = {
      id: connectorId,
      type: 'lineSegment', // Use lineSegment for now; can be specialized
      name: 'Connector',
      parentId: params.parentId ?? null,
      x: params.sourceAnchor.x,
      y: params.sourceAnchor.y,
      width: Math.abs(params.targetAnchor.x - params.sourceAnchor.x),
      height: Math.abs(params.targetAnchor.y - params.sourceAnchor.y),
      // Store connector feature in schema for now; can be migrated to features array
      schema: { sourceFeatureKinds: ['CONNECTOR'] },
    }
    ctx.mutator.insertNode(node)
    return { connectorId }
  },
  undo(ctx, payload) {
    ctx.mutator.removeNode(payload.connectorId)
  },
}

// Register connector.create handler in registry
// (This should be called in the registry setup/initialization)
// Add this line where other handlers are registered:
// registry.register(connectorCreateHandler)
import type { EditorDocument, DocumentNode } from '@venus/document-core'

// --- Command descriptor types ---

/** Metadata for a registered command, used for discoverability and validation */
export interface CommandDescriptor<TParams = unknown> {
  /** Unique command identifier (e.g. 'shape.move', 'selection.set') */
  readonly type: string
  /** Human-readable label for UI / audit surfaces */
  readonly label: string
  /** Whether the command supports undo/redo */
  readonly undoable: boolean
  /** Parameter validator; returns null if valid, or an error string */
  readonly validate?: (params: TParams) => string | null
}

// --- Command execution context ---

/** Read-only document view exposed to command handlers */
export interface CommandDocumentView {
  readonly document: EditorDocument
  findNode(id: string): DocumentNode | undefined
  getChildren(parentId: string): DocumentNode[]
  getParent(nodeId: string): DocumentNode | undefined
}

/** Mutation interface for command handlers to apply changes */
export interface CommandMutator {
  updateNode(id: string, patch: Partial<DocumentNode>): void
  insertNode(node: DocumentNode, index?: number): void
  removeNode(id: string): void
  reorderNode(id: string, toIndex: number): void
  setSelection(ids: string[], mode?: 'replace' | 'add' | 'remove' | 'toggle' | 'clear'): void
}

/** Full context provided to a command handler during execution */
export interface CommandExecutionContext {
  readonly view: CommandDocumentView
  readonly mutator: CommandMutator
}

// --- Command handler ---

/**
 * A command handler encapsulates the execute/undo logic for a single command type.
 * `execute` returns an opaque undo payload; `undo` replays it.
 */
export interface CommandHandler<TParams = unknown, TUndo = unknown> {
  readonly descriptor: CommandDescriptor<TParams>
  execute(ctx: CommandExecutionContext, params: TParams): TUndo
  undo(ctx: CommandExecutionContext, undoPayload: TUndo): void
}

// --- Registry ---

/**
 * Central command registry. Products register command handlers; execution
 * routes through the registry to ensure discoverability, validation, and
 * consistent undo behavior.
 */
export interface CommandRegistry {
  register<TParams, TUndo>(handler: CommandHandler<TParams, TUndo>): void
  has(type: string): boolean
  get(type: string): CommandHandler | undefined
  list(): CommandDescriptor[]
}

export function createCommandRegistry(): CommandRegistry {
  const handlers = new Map<string, CommandHandler<any, any>>()

  return {
    register(handler) {
      if (handlers.has(handler.descriptor.type)) {
        console.warn(
          `[CommandRegistry] overwriting existing handler for "${handler.descriptor.type}"`,
        )
      }
      handlers.set(handler.descriptor.type, handler)
    },
    has(type) {
      return handlers.has(type)
    },
    get(type) {
      return handlers.get(type)
    },
    list() {
      return Array.from(handlers.values()).map((h) => h.descriptor)
    },
  }
}
