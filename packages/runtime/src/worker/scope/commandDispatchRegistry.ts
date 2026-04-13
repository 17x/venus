import {
  createCommandRegistry,
  type CommandDescriptor,
} from '../../commands/index.ts'
import type {EditorRuntimeCommand, SceneUpdateMessage} from '../protocol.ts'

type WorkerLocalCommandHandlerContext = {
  scene: import('@venus/runtime/shared-memory').SceneMemory
  document: import('@venus/document-core').EditorDocument
  spatialIndex: import('./types.ts').WorkerSpatialIndex
  history: ReturnType<typeof import('../history.ts').createHistoryManager>
  collaboration: ReturnType<typeof import('../collaboration.ts').createCollaborationManager>
}

type WorkerLocalCommandHandler<TCommand extends EditorRuntimeCommand = EditorRuntimeCommand> = {
  descriptor: CommandDescriptor<TCommand>
  handle: (
    command: TCommand,
    context: WorkerLocalCommandHandlerContext,
  ) => SceneUpdateMessage['updateKind'] | null
}

export interface WorkerLocalCommandDispatcher {
  register<TCommand extends EditorRuntimeCommand>(handler: WorkerLocalCommandHandler<TCommand>): void
  dispatch(
    command: EditorRuntimeCommand,
    context: WorkerLocalCommandHandlerContext,
  ): {
    handled: boolean
    updateKind: SceneUpdateMessage['updateKind'] | null
  }
  listDescriptors(): CommandDescriptor[]
}

export function createWorkerLocalCommandDispatcher(): WorkerLocalCommandDispatcher {
  const descriptors = createCommandRegistry()
  const handlers = new Map<EditorRuntimeCommand['type'], WorkerLocalCommandHandler['handle']>()

  return {
    register(handler) {
      // Reuse runtime command registry as the single descriptor catalog.
      descriptors.register({
        descriptor: {
          ...handler.descriptor,
          validate: (params) => handler.descriptor.validate?.(params as never) ?? null,
        },
        execute() {
          return null
        },
        undo() {
          // Worker history undo/redo is patch-driven, so descriptor-only entries use no-op undo.
        },
      })

      handlers.set(
        handler.descriptor.type as EditorRuntimeCommand['type'],
        handler.handle as WorkerLocalCommandHandler['handle'],
      )
    },
    dispatch(command, context) {
      const handler = handlers.get(command.type)
      if (!handler) {
        return {
          handled: false,
          updateKind: null,
        }
      }
      return {
        handled: true,
        updateKind: handler(command, context),
      }
    },
    listDescriptors() {
      return descriptors.list()
    },
  }
}
