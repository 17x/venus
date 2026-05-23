/// <reference lib="webworker" />

import {createCollaborationManager} from '../collaboration.ts'
import type {EditorDocument, ToolName} from '../../model/index.ts'
import {createHistoryManager} from '../history.ts'
import type {HistoryPatch, HistoryRecoveryReplayEntry, HistoryRecoveryReplaySnapshot} from '../history.ts'
import type {
  EditorFileHistoryRecoveryReplayMode,
  EditorFileHistoryRecoveryReplayEntry,
  EditorFileHistoryRecoveryReplaySnapshot,
} from '../../types/editorFile.ts'
import {createWorkerSpatialIndex} from './types.ts'
import {
  attachSceneMemory,
  readSceneStats,
  setSelectedShapes,
  updatePointer,
  writeDocumentToScene,
  type SceneMemory,
} from '../../shared-memory/index.ts'
import type {
  EditorWorkerMessage,
  SceneUpdateMessage,
} from '../protocol.ts'
import {resolvePointerSelectionMode} from './pointerSelection.ts'
import {hitTestDocumentCandidates} from './hitTest.ts'
import {cloneDocument} from './model.ts'
import {rebuildSpatialIndex, syncClippedImageRuntimeGeometry} from './scenePatches/scenePatches.ts'
import {
  getRuntimeV2DualWriteDiagnostics,
  getRuntimeV2DualWriteStrictModeEnabled,
  handleLocalCommand,
  handleRemoteOperation,
  runRuntimeV2FrameBoundaryInvariantCheck,
} from './operations/operations.ts'

function debugWorker(message: string, details?: unknown) {
  console.debug('EDITOR-WORKER', message, details)
}

/**
 * Hydrates worker history stacks from persisted crash-recovery replay snapshot.
 * @param replay Snapshot payload persisted in file config during last safe save.
 * @param history Runtime history manager receiving replay entries.
 * @returns Whether any replay entry was consumed by startup hydration.
 */
function hydrateHistoryFromCrashRecoveryReplay(
  replay: HistoryRecoveryReplaySnapshot | undefined,
  replayMode: EditorFileHistoryRecoveryReplayMode,
  history: ReturnType<typeof createHistoryManager>,
) {
  if (!replay) {
    return false
  }

  const replayEntries = replayMode === 'local-only'
    ? replay.localOnly.entries
    : replay.merged.entries
  let replayIssuedAt = 0
  let hasConsumedReplayEntries = false

  for (const entry of replayEntries) {
    if (entry.source === 'remote') {
      // Remote replay entries stay in visibility log and never mutate local undo/redo cursor semantics.
      history.pushRemoteEntry({
        id: entry.id,
        label: entry.label,
        forward: entry.forward,
        backward: entry.backward,
      })
      hasConsumedReplayEntries = true
      continue
    }

    history.pushLocalEntry({
      id: entry.id,
      label: entry.label,
      forward: entry.forward,
      backward: entry.backward,
    }, {
      merge: {enabled: false},
      commandMeta: {
        commandId: entry.id,
        commandType: 'history.recovery-replay',
        commandSource: 'system',
        transactionId: entry.transactionId ?? `recovery:${entry.id}`,
        issuedAt: entry.issuedAt ?? replayIssuedAt,
      },
    })
    replayIssuedAt += 1
    hasConsumedReplayEntries = true
  }

  return hasConsumedReplayEntries
}

/**
 * Clones replay entries so startup hydration never mutates persisted init payload.
 * @param replayEntry Persisted replay entry read from file config.
 */
function cloneRecoveryReplayEntry(replayEntry: EditorFileHistoryRecoveryReplayEntry): HistoryRecoveryReplayEntry {
  const forward = replayEntry.forward.filter((patch): patch is HistoryPatch => (
    typeof patch === 'object' && patch !== null
  ))
  const backward = replayEntry.backward.filter((patch): patch is HistoryPatch => (
    typeof patch === 'object' && patch !== null
  ))

  return {
    id: replayEntry.id,
    label: replayEntry.label,
    source: replayEntry.source,
    forward,
    backward,
    ...(replayEntry.transactionId ? {transactionId: replayEntry.transactionId} : {}),
    ...(typeof replayEntry.issuedAt === 'number' ? {issuedAt: replayEntry.issuedAt} : {}),
  }
}

/**
 * Normalizes crash-recovery replay payload so worker startup can trust entry arrays.
 * @param replay Persisted replay snapshot carried by init message.
 */
function normalizeCrashRecoveryReplay(
  replay: EditorFileHistoryRecoveryReplaySnapshot | undefined,
): HistoryRecoveryReplaySnapshot | undefined {
  if (!replay) {
    return undefined
  }

  return {
    maxEntries: replay.maxEntries,
    localOnly: {
      mode: replay.localOnly.mode,
      entries: replay.localOnly.entries.map(cloneRecoveryReplayEntry),
    },
    merged: {
      mode: replay.merged.mode,
      entries: replay.merged.entries.map(cloneRecoveryReplayEntry),
    },
  }
}

/**
 * Binds runtime worker event loop and scene update emission.
 * @param scope Dedicated worker global scope receiving runtime messages.
 */
export function bindEditorWorkerScope(scope: DedicatedWorkerGlobalScope) {
  let scene: SceneMemory | null = null
  let documentState: EditorDocument | null = null
  let allowFrameSelection = true
  let strictStrokeHitTest = false
  let currentToolName: ToolName = 'selector'

  const spatialIndex = createWorkerSpatialIndex<{
    shapeId: string
    type: import('../../model/index.ts').DocumentNode['type']
    order: number
  }>()

  const history = createHistoryManager([
    {
      id: 'init',
      label: 'Init',
      forward: [],
      backward: [],
    },
  ])
  const collaboration = createCollaborationManager()

  collaboration.connect('local-user')

  scope.addEventListener('message', (event: MessageEvent<EditorWorkerMessage>) => {
    const message = event.data

    if (message.type === 'init') {
      scene = attachSceneMemory(message.buffer, message.capacity)
      documentState = cloneDocument(message.document)
      allowFrameSelection = message.interaction?.allowFrameSelection ?? true
      strictStrokeHitTest = message.interaction?.strictStrokeHitTest ?? false
      const crashRecoveryReplayMode = message.crashRecoveryReplayMode ?? 'merged'
      const crashRecoveryReplay = normalizeCrashRecoveryReplay(message.crashRecoveryReplay)
      const crashRecoveryReplayEntryCount = crashRecoveryReplayMode === 'local-only'
        ? (crashRecoveryReplay?.localOnly.entries.length ?? 0)
        : (crashRecoveryReplay?.merged.entries.length ?? 0)

      debugWorker('init scene', {
        capacity: message.capacity,
        shapeCount: documentState.shapes.length,
        allowFrameSelection,
        strictStrokeHitTest,
        crashRecoveryReplayMode,
        crashRecoveryReplayEntryCount,
      })

      writeDocumentToScene(scene, documentState)
      rebuildSpatialIndex(spatialIndex, documentState)
      syncClippedImageRuntimeGeometry(scene, documentState, spatialIndex)

      const replayHydrated = hydrateHistoryFromCrashRecoveryReplay(
        crashRecoveryReplay,
        crashRecoveryReplayMode,
        history,
      )
      if (!replayHydrated) {
        history.pushLocalEntry({
          id: 'scene-ready',
          label: 'Load Scene',
          forward: [],
          backward: [],
        })
      }

      postScene(scope, 'scene-ready', 'flags', scene, documentState, history, collaboration)
      return
    }

    if (!scene || !documentState) {
      return
    }

    if (message.type === 'pointerleave') {
      // Hover state is overlay-owned; pointerleave should not mutate scene flags.
      return
    }

    if (message.type === 'collaboration.receive') {
      const updateKind = handleRemoteOperation(
        message.operation,
        scene,
        documentState,
        spatialIndex,
        history,
        collaboration,
      )
      if (updateKind) {
        postScene(scope, 'scene-update', updateKind, scene, documentState, history, collaboration)
      }
      return
    }

    if (message.type === 'command') {
      if (message.command.type === 'tool.select') {
        currentToolName = message.command.toolName ?? (message.command.tool === 'select' ? 'selector' : currentToolName)
      }
      const updateKind = handleLocalCommand(
        message.command,
        scene,
        documentState,
        spatialIndex,
        history,
        collaboration,
        message.commandMeta,
      )
      if (updateKind) {
        postScene(scope, 'scene-update', updateKind, scene, documentState, history, collaboration)
      }
      return
    }

    updatePointer(scene, message.pointer)

    if (message.type === 'pointermove') {
      // Hover feedback is app-layer only and should not trigger scene updates.
      return
    }

    const hitCandidates = hitTestDocumentCandidates(documentState, spatialIndex, message.pointer, {
      // Keep direct-selection precision while default selection uses bbox-first
      // with capped exact refinement to reduce click-time spikes on dense scenes.
      hitMode: currentToolName === 'dselector' ? 'exact' : 'bbox_then_exact',
      maxExactCandidateCount: currentToolName === 'dselector' ? 12 : 4,
      // Tool-aware boosts bias visibility budget toward active precision workflows.
      visibilityInteractionBoost: currentToolName === 'dselector' ? 0.25 : 0.1,
      visibilitySemanticBoost: currentToolName === 'dselector' ? 0.2 : 0,
      allowFrameSelection,
      strictStrokeHitTest,
      preferGroupSelection: currentToolName === 'selector' && !(message.modifiers?.metaKey || message.modifiers?.ctrlKey),
    })
    const targetIndex = hitCandidates[0]?.index ?? -1
    const selectionMode = resolvePointerSelectionMode(message.modifiers)
    const selectionChanged =
      targetIndex < 0
        ? setSelectedShapes(scene, [], selectionMode === 'replace' ? 'clear' : selectionMode)
        : setSelectedShapes(scene, [targetIndex], selectionMode)

    if (selectionChanged) {
      postScene(scope, 'scene-update', 'flags', scene, documentState, history, collaboration)
    }
  })
}

function postScene(
  scope: DedicatedWorkerGlobalScope,
  type: SceneUpdateMessage['type'],
  updateKind: SceneUpdateMessage['updateKind'],
  scene: SceneMemory,
  document: EditorDocument,
  history: ReturnType<typeof createHistoryManager>,
  collaboration: ReturnType<typeof createCollaborationManager>,
) {
  // Run one invariant guard at each worker frame boundary so migration drift is observable beyond command-triggered checks.
  runRuntimeV2FrameBoundaryInvariantCheck(document)

  scope.postMessage({
    type,
    updateKind,
    document: updateKind === 'full' ? document : undefined,
    stats: readSceneStats(scene),
    history: history.getSummary(),
    collaboration: collaboration.getState(),
    runtimeV2: {
      ...getRuntimeV2DualWriteDiagnostics(),
      strictModeEnabled: getRuntimeV2DualWriteStrictModeEnabled(),
    },
  } satisfies SceneUpdateMessage)
}
