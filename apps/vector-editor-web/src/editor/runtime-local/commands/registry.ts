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
