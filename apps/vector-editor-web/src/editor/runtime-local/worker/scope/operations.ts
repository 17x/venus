import type {CollaborationOperation} from '../collaboration.ts'
import {createCollaborationManager} from '../collaboration.ts'
import type {EditorDocument} from '@venus/document-core'
import type {SceneMemory} from '@vector/runtime/shared-memory'
import {setSelectedShapes} from '@vector/runtime/shared-memory'
import {createHistoryManager} from '../history.ts'
import type {SceneUpdateMessage, EditorRuntimeCommand} from '../protocol.ts'
import type {WorkerSpatialIndex} from './types.ts'
import {applyPatchBatch} from './patchBatch.ts'
import {applyPatches} from './scenePatches.ts'
import {createLocalOperation} from './operationPayload.ts'
import {createLocalHistoryEntry} from './localHistoryEntry.ts'
import {createRemotePatches} from './remotePatches.ts'
import {createWorkerLocalCommandDispatcher} from './commandDispatchRegistry.ts'

type LocalCommandDispatchContext = {
  scene: SceneMemory
  document: EditorDocument
  spatialIndex: WorkerSpatialIndex
  history: ReturnType<typeof createHistoryManager>
  collaboration: ReturnType<typeof createCollaborationManager>
}

type LocalCommandHandler = (
  command: EditorRuntimeCommand,
  context: LocalCommandDispatchContext,
) => SceneUpdateMessage['updateKind'] | null

const localCommandDispatcher = createWorkerLocalCommandDispatcher()

const localCommandHandlers: Array<{
  type: EditorRuntimeCommand['type']
  label: string
  undoable: boolean
  handle: LocalCommandHandler
}> = [
  {
    type: 'selection.set',
    label: 'Selection Set',
    undoable: false,
    handle: (command, context) => {
    if (command.type !== 'selection.set') {
      return null
    }

    const mode = command.mode ?? 'replace'
    const ids = Array.isArray(command.shapeIds) ? command.shapeIds : command.shapeId === undefined ? [] : [command.shapeId]
    const indices = ids.map((shapeId: string | null) => (shapeId ? context.document.shapes.findIndex((shape) => shape.id === shapeId) : -1)).filter((index: number) => index >= 0)
    if (mode === 'clear' || (ids.length === 1 && ids[0] === null)) {
      const changed = setSelectedShapes(context.scene, [], 'clear')
      return changed ? 'flags' : null
    }
    const changed = setSelectedShapes(context.scene, indices, mode)
    return changed ? 'flags' : null
    },
  },
  {
    type: 'history.undo',
    label: 'History Undo',
    undoable: false,
    handle: (_command, context) => {
    const transition = context.history.undo()
    if (transition.appliedEntry) {
      return applyPatchBatch(transition.appliedEntry.backward, (patches) => applyPatches(context.scene, context.document, context.spatialIndex, patches))
    }
    return null
    },
  },
  {
    type: 'history.redo',
    label: 'History Redo',
    undoable: false,
    handle: (_command, context) => {
    const transition = context.history.redo()
    if (transition.appliedEntry) {
      return applyPatchBatch(transition.appliedEntry.forward, (patches) => applyPatches(context.scene, context.document, context.spatialIndex, patches))
    }
    return null
    },
  },
]

localCommandHandlers.forEach((entry) => {
  localCommandDispatcher.register({
    descriptor: {
      type: entry.type,
      label: entry.label,
      undoable: entry.undoable,
      validate: (params) => {
        if ((params as EditorRuntimeCommand).type !== entry.type) {
          return `Expected command type "${entry.type}"`
        }
        return null
      },
    },
    handle: entry.handle,
  })
})

export function handleLocalCommand(
  command: EditorRuntimeCommand,
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  history: ReturnType<typeof createHistoryManager>,
  collaboration: ReturnType<typeof createCollaborationManager>,
): SceneUpdateMessage['updateKind'] | null {
  const dispatched = localCommandDispatcher.dispatch(command, {
    scene,
    document,
    spatialIndex,
    history,
    collaboration,
  })
  if (dispatched.handled) {
    return dispatched.updateKind
  }

  const entry = createLocalHistoryEntry(command, scene, document)
  history.pushLocalEntry(entry)
  const updateKind = applyPatchBatch(entry.forward, (patches) => applyPatches(scene, document, spatialIndex, patches))
  const operation = createLocalOperation(command, collaboration.getState().actorId)
  collaboration.recordLocalOperation(operation)
  return updateKind ?? 'flags'
}

export function handleRemoteOperation(
  operation: CollaborationOperation,
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  history: ReturnType<typeof createHistoryManager>,
  collaboration: ReturnType<typeof createCollaborationManager>,
): SceneUpdateMessage['updateKind'] | null {
  collaboration.receiveRemoteOperation(operation)
  const patches = createRemotePatches(operation, scene, document)
  const updateKind = applyPatchBatch(patches, (nextPatches) => applyPatches(scene, document, spatialIndex, nextPatches))
  history.pushRemoteEntry({id: operation.id, label: `Remote ${operation.type}`, forward: patches, backward: []})
  return updateKind ?? 'flags'
}
