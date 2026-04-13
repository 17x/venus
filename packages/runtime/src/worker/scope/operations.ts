import type {CollaborationOperation} from '../collaboration.ts'
import {createCollaborationManager} from '../collaboration.ts'
import type {EditorDocument} from '@venus/document-core'
import type {SceneMemory} from '@venus/runtime/shared-memory'
import {setSelectedShapes} from '@venus/runtime/shared-memory'
import {createHistoryManager} from '../history.ts'
import type {SceneUpdateMessage, EditorRuntimeCommand} from '../protocol.ts'
import type {WorkerSpatialIndex} from './types.ts'
import {applyPatchBatch} from './patchBatch.ts'
import {applyPatches} from './scenePatches.ts'
import {createLocalOperation} from './operationPayload.ts'
import {createLocalHistoryEntry} from './localHistoryEntry.ts'
import {createRemotePatches} from './remotePatches.ts'

export function handleLocalCommand(
  command: EditorRuntimeCommand,
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  history: ReturnType<typeof createHistoryManager>,
  collaboration: ReturnType<typeof createCollaborationManager>,
): SceneUpdateMessage['updateKind'] | null {
  if (command.type === 'selection.set') {
    const mode = command.mode ?? 'replace'
    const ids = Array.isArray(command.shapeIds) ? command.shapeIds : command.shapeId === undefined ? [] : [command.shapeId]
    const indices = ids.map((shapeId) => (shapeId ? document.shapes.findIndex((shape) => shape.id === shapeId) : -1)).filter((index) => index >= 0)
    if (mode === 'clear' || (ids.length === 1 && ids[0] === null)) {
      const changed = setSelectedShapes(scene, [], 'clear')
      return changed ? 'flags' : null
    }
    const changed = setSelectedShapes(scene, indices, mode)
    return changed ? 'flags' : null
  }

  if (command.type === 'history.undo') {
    const transition = history.undo()
    if (transition.appliedEntry) {
      return applyPatchBatch(transition.appliedEntry.backward, (patches) => applyPatches(scene, document, spatialIndex, patches))
    }
    return null
  }

  if (command.type === 'history.redo') {
    const transition = history.redo()
    if (transition.appliedEntry) {
      return applyPatchBatch(transition.appliedEntry.forward, (patches) => applyPatches(scene, document, spatialIndex, patches))
    }
    return null
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
