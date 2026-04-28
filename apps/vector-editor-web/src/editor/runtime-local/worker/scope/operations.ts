import type {CollaborationOperation} from '../collaboration.ts'
import {createCollaborationManager} from '../collaboration.ts'
import type {EditorDocument} from '@vector/model'
import type {SceneMemory} from '@vector/runtime/shared-memory'
import {setSelectedShapes} from '@vector/runtime/shared-memory'
import {createHistoryManager} from '../history.ts'
import type {SceneUpdateMessage, EditorRuntimeCommand} from '../protocol.ts'
import type {WorkerSpatialIndex} from './types.ts'
import {applyPatchBatch} from './patchBatch.ts'
import {applyPatches} from './scenePatches.ts'
import {createLocalOperation} from './operationPayload.ts'
import {createLocalHistoryEntry} from './localHistoryEntry.ts'
import {expandMaskLinkedShapeIds} from './maskGroupSemantics.ts'
import {createRemotePatches} from './remotePatches.ts'
import {createWorkerLocalCommandDispatcher} from './commandDispatchRegistry.ts'
import {
  reconcileNormalizedStructuralStorage,
  validateNormalizedDualWriteConsistency,
} from '../../document-runtime/index.ts'

/**
 * Tracks runtime-v2 dual-write diagnostics for migration-sensitive command handling.
 */
export interface RuntimeV2DualWriteDiagnostics {
  /** Stores total number of consistency checks executed. */
  checks: number
  /** Stores total number of mismatch events observed. */
  mismatches: number
  /** Stores latest mismatch command type when one exists. */
  lastCommandType: string | null
  /** Stores latest mismatch issue list for debugging. */
  lastIssues: string[]
  /** Stores total shape-tree invariant checks executed at worker frame boundaries. */
  frameBoundaryChecks: number
  /** Stores total shape-tree invariant mismatches observed at worker frame boundaries. */
  frameBoundaryMismatches: number
  /** Stores latest shape-tree invariant issues captured at worker frame boundaries. */
  lastFrameBoundaryIssues: string[]
}

const runtimeV2DualWriteDiagnostics: RuntimeV2DualWriteDiagnostics = {
  checks: 0,
  mismatches: 0,
  lastCommandType: null,
  lastIssues: [],
  frameBoundaryChecks: 0,
  frameBoundaryMismatches: 0,
  lastFrameBoundaryIssues: [],
}

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
    const rawIds = Array.isArray(command.shapeIds) ? command.shapeIds : command.shapeId === undefined ? [] : [command.shapeId]
    const ids = command.preserveExactShapeIds
      ? rawIds
      : expandMaskLinkedShapeIds(
          context.document,
          rawIds.filter((shapeId: string | null | undefined): shapeId is string => typeof shapeId === 'string'),
        )
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

/**
 * Handles one local runtime command and applies resulting patches to scene/document state.
 */
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
  reportNormalizedDualWriteIssues(command.type, document)
  return updateKind ?? 'flags'
}

/**
 * Handles one remote collaboration operation and applies generated patches locally.
 */
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

  if (isRuntimeV2StructuralCommandType(operation.type)) {
    // Reconcile legacy storage after remote structural apply so normalized ownership stays canonical.
    reconcileNormalizedStructuralStorage({document})
  }

  history.pushRemoteEntry({id: operation.id, label: `Remote ${operation.type}`, forward: patches, backward: []})
  reportNormalizedDualWriteIssues(operation.type, document)
  return updateKind ?? 'flags'
}

/**
 * Returns a snapshot of current runtime-v2 dual-write diagnostics counters.
 */
export function getRuntimeV2DualWriteDiagnostics(): RuntimeV2DualWriteDiagnostics {
  return {
    checks: runtimeV2DualWriteDiagnostics.checks,
    mismatches: runtimeV2DualWriteDiagnostics.mismatches,
    lastCommandType: runtimeV2DualWriteDiagnostics.lastCommandType,
    lastIssues: runtimeV2DualWriteDiagnostics.lastIssues.slice(),
    frameBoundaryChecks: runtimeV2DualWriteDiagnostics.frameBoundaryChecks,
    frameBoundaryMismatches: runtimeV2DualWriteDiagnostics.frameBoundaryMismatches,
    lastFrameBoundaryIssues: runtimeV2DualWriteDiagnostics.lastFrameBoundaryIssues.slice(),
  }
}

/**
 * Resets runtime-v2 dual-write diagnostics counters and latest mismatch snapshot.
 */
export function resetRuntimeV2DualWriteDiagnostics() {
  runtimeV2DualWriteDiagnostics.checks = 0
  runtimeV2DualWriteDiagnostics.mismatches = 0
  runtimeV2DualWriteDiagnostics.lastCommandType = null
  runtimeV2DualWriteDiagnostics.lastIssues = []
  runtimeV2DualWriteDiagnostics.frameBoundaryChecks = 0
  runtimeV2DualWriteDiagnostics.frameBoundaryMismatches = 0
  runtimeV2DualWriteDiagnostics.lastFrameBoundaryIssues = []
}

/**
 * Executes one frame-boundary shape-tree invariant check and updates migration diagnostics counters.
 */
export function runRuntimeV2FrameBoundaryInvariantCheck(document: EditorDocument): RuntimeV2DualWriteDiagnostics {
  runtimeV2DualWriteDiagnostics.frameBoundaryChecks += 1
  const validation = validateNormalizedDualWriteConsistency(document)
  if (validation.valid) {
    runtimeV2DualWriteDiagnostics.lastFrameBoundaryIssues = []
    return getRuntimeV2DualWriteDiagnostics()
  }

  runtimeV2DualWriteDiagnostics.frameBoundaryMismatches += 1
  runtimeV2DualWriteDiagnostics.lastFrameBoundaryIssues = validation.issues.slice()

  if (isRuntimeV2DualWriteStrictModeEnabled()) {
    throw new Error(`runtime-v2 frame-boundary invariant mismatch: ${validation.issues.join('; ')}`)
  }

  // AI-TEMP: keep frame-boundary invariant diagnostics non-blocking while runtime-v2 adoption is incremental; remove when normalized model becomes the single source of truth; ref apps/vector-editor-web/docs/runtime/runtime-v2-migration.md
  console.warn('[runtime-v2 frame-boundary invariant mismatch]', {
    issues: validation.issues,
  })
  return getRuntimeV2DualWriteDiagnostics()
}

/**
 * Executes one runtime-v2 dual-write consistency check for a command type and returns diagnostics snapshot.
 */
export function runRuntimeV2DualWriteCheck(
  commandType: EditorRuntimeCommand['type'] | CollaborationOperation['type'],
  document: EditorDocument,
): RuntimeV2DualWriteDiagnostics {
  reportNormalizedDualWriteIssues(commandType, document)
  return getRuntimeV2DualWriteDiagnostics()
}

/**
 * Returns whether one command type should trigger structural dual-write diagnostics.
 */
function isRuntimeV2StructuralCommandType(
  commandType: EditorRuntimeCommand['type'] | CollaborationOperation['type'],
): boolean {
  return commandType === 'shape.group'
    || commandType === 'shape.ungroup'
    || commandType === 'shape.reorder'
    || commandType === 'shape.insert'
    || commandType === 'shape.insert.batch'
    || commandType === 'shape.remove'
}

/**
 * Reports normalized dual-write consistency issues for migration-sensitive commands.
 */
function reportNormalizedDualWriteIssues(
  commandType: EditorRuntimeCommand['type'] | CollaborationOperation['type'],
  document: EditorDocument,
) {
  if (!isRuntimeV2StructuralCommandType(commandType)) {
    return
  }

  runtimeV2DualWriteDiagnostics.checks += 1
  const validation = validateNormalizedDualWriteConsistency(document)
  if (validation.valid) {
    return
  }

  runtimeV2DualWriteDiagnostics.mismatches += 1
  runtimeV2DualWriteDiagnostics.lastCommandType = commandType
  runtimeV2DualWriteDiagnostics.lastIssues = validation.issues.slice()

  if (isRuntimeV2DualWriteStrictModeEnabled()) {
    throw new Error(`runtime-v2 dual-write mismatch on ${commandType}: ${validation.issues.join('; ')}`)
  }

  // AI-TEMP: keep migration diagnostics non-blocking while runtime-v2 adoption is incremental; remove when normalized model becomes the single source of truth; ref apps/vector-editor-web/docs/runtime/runtime-v2-migration.md
  console.warn('[runtime-v2 dual-write mismatch]', {
    commandType,
    issues: validation.issues,
  })
}

/**
 * Returns whether runtime-v2 dual-write mismatch checks run in strict fail-fast mode.
 */
export function getRuntimeV2DualWriteStrictModeEnabled(): boolean {
  const strictFlag = typeof process !== 'undefined' ? process.env?.VENUS_RUNTIME_V2_DUAL_WRITE_STRICT : undefined
  return strictFlag === '1'
}

/**
 * Returns whether runtime-v2 dual-write diagnostics should throw on mismatch.
 */
function isRuntimeV2DualWriteStrictModeEnabled(): boolean {
  return getRuntimeV2DualWriteStrictModeEnabled()
}
