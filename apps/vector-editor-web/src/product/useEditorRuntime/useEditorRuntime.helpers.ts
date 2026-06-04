import {useCallback} from 'react'

import type {ToolName} from '../../runtime/model/index.ts'
import type {EditorFileHistoryRecoveryReplayMode} from '../../runtime/types/index.ts'
import type {HistorySummary} from '../../runtime/worker/index.ts'
import type {EditorDocumentLifecycleContext} from '../useEditorDocument.ts'
import {
  createRuntimeInteractionDiagnosticLogger,
  type RuntimeInteractionDiagnosticEvent,
} from '../runtime/interactionDiagnosticPolicy.ts'
import type {
  EditorRuntimeInteractionEvent,
  EditorRuntimeLastCommandMeta,
} from '../runtime/useEditorRuntimeInteractionBridge.ts'

/**
 * Declares one bridge dispatch contract for runtime interaction event publication.
 */
interface RuntimeBridgeDispatch {
  /** Dispatches one runtime interaction event payload. */
  dispatch: (event: EditorRuntimeInteractionEvent) => void
}

/**
 * Declares dependencies for save-lifecycle callback wiring.
 */
interface SaveLifecycleCallbackInput<TDocument> {
  /** Stores current runtime history used to resolve latest local transaction group. */
  history: HistorySummary
  /** Stores replay mode persisted with save lifecycle metadata. */
  replayMode: EditorFileHistoryRecoveryReplayMode
  /** Stores latest command metadata for provenance-friendly save context. */
  lastCommandMeta: EditorRuntimeLastCommandMeta | null
  /** Persists document payload with lifecycle context metadata. */
  saveFile: (document: TDocument, context: EditorDocumentLifecycleContext) => void
}

/**
 * Resolves one save-lifecycle context from latest command metadata and current runtime history.
 * @param input Save-context resolution inputs.
 */
export function resolveSaveLifecycleContext(input: {
  history: {
    transactionGroups: Array<{transactionId: string; source: 'local' | 'remote'}>
    recoveryReplay?: import('../../runtime/worker/index.ts').HistoryRecoveryReplaySnapshot
  }
  replayMode: EditorFileHistoryRecoveryReplayMode
  lastCommandMeta: EditorRuntimeLastCommandMeta | null
}): EditorDocumentLifecycleContext {
  const latestLocalGroup = [...input.history.transactionGroups]
    .reverse()
    .find((group) => group.source === 'local')

  if (!input.lastCommandMeta || !latestLocalGroup) {
    return {
      transitionSource: {
        kind: 'user',
        event: 'file.save',
        issuedAt: Date.now(),
      },
      crashRecoveryReplay: input.history.recoveryReplay,
      crashRecoveryReplayMode: input.replayMode,
    }
  }

  return {
    transitionSource: {
      kind: 'command',
      event: 'file.save',
      commandId: input.lastCommandMeta.commandId,
      transactionId: input.lastCommandMeta.transactionId,
      commandType: input.lastCommandMeta.commandType,
      issuedAt: Date.now(),
    },
    dirtySource: {
      commandType: input.lastCommandMeta.commandType,
      commandId: input.lastCommandMeta.commandId,
      transactionId: latestLocalGroup.transactionId,
      issuedAt: input.lastCommandMeta.issuedAt,
    },
    crashRecoveryReplay: input.history.recoveryReplay,
    crashRecoveryReplayMode: input.replayMode,
  }
}

/**
 * Creates one memoized save callback that attaches lifecycle provenance metadata.
 * @param input Dependencies used to resolve and persist save lifecycle context.
 */
export function useSaveFileWithLifecycleContext<TDocument>(
  input: SaveLifecycleCallbackInput<TDocument>,
) {
  return useCallback((nextDocument: TDocument) => {
    input.saveFile(
      nextDocument,
      resolveSaveLifecycleContext({
        history: input.history,
        replayMode: input.replayMode,
        lastCommandMeta: input.lastCommandMeta,
      }),
    )
  }, [
    input.history,
    input.lastCommandMeta,
    input.replayMode,
    input.saveFile,
  ])
}

/**
 * Creates one memoized runtime interaction diagnostic recorder callback.
 * @param loggerRef Mutable logger ref storing runtime interaction diagnostics history.
 * @param runtimeBridge Runtime bridge dispatch surface used for diagnostic events.
 */
export function useRuntimeInteractionDiagnosticRecorder(
  loggerRef: {current: ReturnType<typeof createRuntimeInteractionDiagnosticLogger>},
  runtimeBridge: RuntimeBridgeDispatch,
) {
  return useCallback((event: RuntimeInteractionDiagnosticEvent) => {
    const snapshot = loggerRef.current.record(event)
    if (!snapshot.latestEntry) {
      return
    }

    runtimeBridge.dispatch({
      type: 'runtime.interaction.diagnostic',
      entry: snapshot.latestEntry,
      coverage: snapshot.coverage,
    })
  }, [runtimeBridge])
}

/**
 * Creates one memoized tool-selection action that mirrors selected tools into runtime bridge events.
 * @param setCurrentToolInternal Product/runtime setter used to update active tool state.
 * @param runtimeBridge Runtime bridge dispatch surface used for tool selected events.
 */
export function useRuntimeToolSelectionAction(
  setCurrentToolInternal: (toolName: ToolName) => void,
  runtimeBridge: RuntimeBridgeDispatch,
  beforeSelect?: (toolName: ToolName) => void,
) {
  return useCallback((toolName: ToolName) => {
    beforeSelect?.(toolName)
    setCurrentToolInternal(toolName)
    runtimeBridge.dispatch({
      type: 'runtime.tool.selected',
      tool: toolName,
    })
  }, [beforeSelect, runtimeBridge, setCurrentToolInternal])
}

/**
 * Creates auto-mask and clear-mask runtime command callbacks.
 * @param handleCommand Runtime command dispatcher.
 */
export function useRuntimeMaskActions(
  handleCommand: (command: import('../../runtime/worker/index.ts').EditorRuntimeCommand) => void,
) {
  const applyAutoMask = useCallback(() => {
    handleCommand({type: 'mask.create'})
  }, [handleCommand])

  const clearMask = useCallback(() => {
    handleCommand({type: 'mask.release'})
  }, [handleCommand])

  return {
    applyAutoMask,
    clearMask,
  }
}
