import type * as React from 'react'
import {
  createCommandEnvelope,
  createCommandIdFactory,
  createCommandTransactionIdFactory,
  type CommandEnvelopeSource,
} from '@venus/editor-primitive'
import {resolveEngineAdaptiveHitTolerance} from '../../runtime/engine-bridge/engine.ts'
import {resolveMaskLinkedShapeIds} from '../../runtime/interaction/maskGroup.ts'
import type {ToolName} from '../../runtime/model/index.ts'
import type {EditorRuntimeCommand} from '../../runtime/worker/index.ts'
import {
  resolveAutoMaskAction,
  resolveClearMaskAction,
  resolveGroupIsolationTarget,
  resolveMaskSelectionCommand,
  resolveRuntimeCommandSideEffects,
} from './commandResolvers.ts'
import type {ShapeStyleHandleDrag} from './shapeStyleHandles.ts'
import {applyRuntimeEditingModeTransition} from './runtimeEditingModeTransitionPolicy.ts'
import {filterRuntimeSelectionCandidateIds} from './selectionFilterPolicy.ts'
import type {RuntimeInteractionDiagnosticEvent} from './interactionDiagnosticPolicy.ts'
import type {EditorRuntimeLastCommandMeta} from './useEditorRuntimeInteractionBridge.ts'

/**
 * Declares dependencies required by the pure runtime command controller.
 */
export interface EditorRuntimeCommandControllerOptions {
  /** Shows one user-facing notification message. */
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  /** Stores runtime snapshot and command dispatch bridge. */
  canvasRuntime: ReturnType<typeof import('../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']
  /** Stores current selected node used by mask-related command resolution. */
  selectedNode: import('../../runtime/model/index.ts').DocumentNode | null
  /** Stores current interaction document used by hit-test and selection lookup. */
  interactionDocument: ReturnType<typeof import('../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['document']
  /** Stores current preview shapes used by cycle-hit selection resolution. */
  previewShapes: ReturnType<typeof import('../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['shapes']
  /** Stores current active tool for group-selection preference branches. */
  currentTool: ToolName
  /** Stores current selected shape id list for mask-linked cycle traversal. */
  selectedShapeIds: string[]
  /** Returns latest canvas pointer point for cycle-hit command resolution. */
  getLastCanvasPoint: () => {x: number; y: number} | null
  /** Clears transform preview when side-effect policy requests transient reset. */
  clearTransformPreview: VoidFunction
  /** Stores transform session manager ref used for transient reset branches. */
  transformManagerRef: React.RefObject<ReturnType<typeof import('../../runtime/interaction/index.ts').createTransformSessionManager>>
  /** Stores selection drag controller ref used for transient reset branches. */
  selectionDragControllerRef: React.RefObject<import('../../runtime/interaction/index.ts').SelectionDragController>
  /** Updates active transform handle slice. */
  setActiveTransformHandle: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').HandleKind | null>>
  /** Updates hovered transform handle slice. */
  setHoveredTransformHandle: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').HandleKind | null>>
  /** Updates draft primitive slice. */
  setDraftPrimitive: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').DraftPrimitive | null>>
  /** Updates path handle drag slice. */
  setPathHandleDrag: React.Dispatch<React.SetStateAction<{
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null>>
  /** Updates shape-style handle drag slice. */
  setShapeStyleHandleDrag: React.Dispatch<React.SetStateAction<ShapeStyleHandleDrag | null>>
  /** Updates selector overlay slice. */
  setSelectorOverlayItems: React.Dispatch<React.SetStateAction<import('@venus/editor-primitive').SelectorOverlayItem[]>>
  /** Updates snapping-enabled toggle state. */
  setSnappingEnabled: React.Dispatch<React.SetStateAction<boolean>>
  /** Updates snap-guide slice. */
  setSnapGuides: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').SnapGuide[]>>
  /** Updates current isolation group id state. */
  setIsolationGroupId: React.Dispatch<React.SetStateAction<string | null>>
  /** Stores runtime editing-mode controller ref used for isolation transitions. */
  runtimeEditingModeControllerRef: React.RefObject<ReturnType<typeof import('../../runtime/index.ts').createRuntimeEditingModeController>>
  /** Updates last command type for runtime bridge query subscribers. */
  setLastCommandType: (next: string | null) => void
  /** Updates last command metadata for lifecycle and diagnostics subscribers. */
  setLastCommandMeta: (next: EditorRuntimeLastCommandMeta | null) => void
  /** Publishes command-channel events through runtime interaction bridge. */
  dispatchRuntimeEvent: (event: import('./useEditorRuntimeInteractionBridge.ts').EditorRuntimeInteractionEvent) => void
  /** Records runtime interaction diagnostics from command key paths. */
  recordInteractionDiagnostic?: (event: RuntimeInteractionDiagnosticEvent) => void
}

/**
 * Creates a pure runtime command controller that owns side-effects and command dispatch policy.
 */
export function createEditorRuntimeCommandController(options: EditorRuntimeCommandControllerOptions) {
  const resolveNextCommandId = createCommandIdFactory('runtime-cmd')
  const resolveNextTransactionId = createCommandTransactionIdFactory('runtime-txn')
  let commandDispatchDepth = 0
  let activeTransactionId: string | null = null

  /**
   * Dispatches one worker/runtime command and emits a traced command-envelope event.
   * @param command Runtime command payload to dispatch.
   * @param source Source class used for root-vs-derived command diagnostics.
   */
  function dispatchRuntimeCommand(
    command: EditorRuntimeCommand,
    source: CommandEnvelopeSource,
  ) {
    const commandEnvelope = createCommandEnvelope({
      id: resolveNextCommandId(),
      source,
      transactionId: activeTransactionId ?? resolveNextTransactionId(),
      issuedAt: Date.now(),
      command,
    })

    options.canvasRuntime.dispatchCommand(commandEnvelope.command, {
      commandId: commandEnvelope.id,
      transactionId: commandEnvelope.transactionId,
      commandSource: commandEnvelope.source,
      issuedAt: commandEnvelope.issuedAt,
    })
    // Mirror command channel to runtime bridge so subscribers can observe command stream.
    options.setLastCommandType(commandEnvelope.command.type)
    options.setLastCommandMeta({
      commandType: commandEnvelope.command.type,
      commandId: commandEnvelope.id,
      transactionId: commandEnvelope.transactionId,
      commandSource: commandEnvelope.source,
      issuedAt: commandEnvelope.issuedAt,
    })
    options.dispatchRuntimeEvent({
      type: 'runtime.command.dispatched',
      commandType: commandEnvelope.command.type,
      commandId: commandEnvelope.id,
      transactionId: commandEnvelope.transactionId,
      commandSource: commandEnvelope.source,
      issuedAt: commandEnvelope.issuedAt,
    })
  }

  /**
   * Handles one runtime command with recursive resolution for derived commands.
   */
  function handleRuntimeCommand(command: EditorRuntimeCommand): void {
    const isRootDispatch = commandDispatchDepth === 0
    if (isRootDispatch) {
      activeTransactionId = resolveNextTransactionId()
    }

    commandDispatchDepth += 1

    const commandSource: CommandEnvelopeSource = isRootDispatch ? 'user' : 'derived'

    try {
    if (command.type === 'mask.create') {
      const resolved = resolveAutoMaskAction({
        canvasShapes: options.canvasRuntime.document.shapes,
        selectedNode: options.selectedNode,
      })
      if (resolved.command) {
        handleRuntimeCommand(resolved.command)
      }
      options.add(resolved.message, 'info')
      return
    }

    if (command.type === 'mask.release') {
      const resolved = resolveClearMaskAction(options.selectedNode)
      if (resolved.command) {
        handleRuntimeCommand(resolved.command)
      }
      options.add(resolved.message, 'info')
      return
    }

    if (command.type === 'mask.select-host' || command.type === 'mask.select-source') {
      const resolved = resolveMaskSelectionCommand({
        selectedNode: options.selectedNode,
        canvasShapes: options.canvasRuntime.document.shapes,
        target: command.type === 'mask.select-host' ? 'host' : 'source',
      })
      if (resolved.command) {
        handleRuntimeCommand(resolved.command)
      }
      options.add(resolved.message, 'info')
      return
    }

    if (command.type === 'selection.cycle-hit-target') {
      const pointer = options.getLastCanvasPoint()
      if (!pointer) {
        options.add('Move the pointer over overlapping shapes to cycle selection.', 'info')
        return
      }

      const adaptiveHitTolerance = resolveEngineAdaptiveHitTolerance({
        viewportScale: options.canvasRuntime.viewport.scale,
        viewportWidth: options.canvasRuntime.viewport.viewportWidth,
        viewportHeight: options.canvasRuntime.viewport.viewportHeight,
      })
      const geometryPayload = options.canvasRuntime.requestEngineGeometry({
        pointer,
        tolerance: adaptiveHitTolerance.worldPx,
        clipTolerance: 1.5,
        allowFrameSelection: false,
        preferGroupSelection: options.currentTool === 'selector',
        // Keep cycle-hit aligned with hover/click by excluding clip-bound image hosts.
        excludeClipBoundImage: true,
        resolveHoveredFromPointer: true,
        outlineLevel: 'low',
      })
      const hitShapeIds = filterRuntimeSelectionCandidateIds({
        candidateIds: geometryPayload.pointHitNodeIds,
        interactionDocument: options.interactionDocument,
      })
      options.recordInteractionDiagnostic?.({
        kind: 'hit-candidate',
        stage: 'selection-cycle',
        candidateCount: hitShapeIds.length,
      })

      if (hitShapeIds.length === 0) {
        options.add('No selectable shape found under the pointer.', 'info')
        return
      }

      const currentIndex = hitShapeIds.findIndex((shapeId) => {
        return resolveMaskLinkedShapeIds(options.interactionDocument, shapeId)
          .some((linkedShapeId) => options.selectedShapeIds.includes(linkedShapeId))
      })
      const step = command.direction === 'backward' ? -1 : 1
      const nextIndex = currentIndex >= 0
        ? (currentIndex + step + hitShapeIds.length) % hitShapeIds.length
        : (step > 0 ? 0 : hitShapeIds.length - 1)

      handleRuntimeCommand({
        type: 'selection.set',
        shapeId: hitShapeIds[nextIndex],
        mode: 'replace',
      })
      return
    }

    if (command.type === 'group.enter-isolation') {
      const nextGroupId = resolveGroupIsolationTarget({
        groupId: command.groupId,
        selectedShapeIds: options.selectedShapeIds,
        shapes: options.canvasRuntime.document.shapes,
      })
      if (!nextGroupId) {
        options.add('Select a group to enter isolation.', 'info')
        return
      }

      options.setIsolationGroupId(nextGroupId)
      applyRuntimeEditingModeTransition(options.runtimeEditingModeControllerRef.current, {
        to: 'isolatedGroupEditing',
        reason: 'group-isolation:enter',
        metadata: {groupId: nextGroupId},
      })
      return
    }

    if (command.type === 'group.exit-isolation') {
      options.setIsolationGroupId(null)
      applyRuntimeEditingModeTransition(options.runtimeEditingModeControllerRef.current, {
        to: options.currentTool === 'dselector' ? 'directSelecting' : 'selecting',
        reason: 'group-isolation:exit',
      })
      return
    }

    const sideEffects = resolveRuntimeCommandSideEffects(command)

    if (sideEffects.nextSnappingEnabled !== null) {
      options.setSnappingEnabled(sideEffects.nextSnappingEnabled)
    }

    if (sideEffects.clearSnapGuides) {
      options.setSnapGuides([])
    }

    if (sideEffects.resetTransientInteractionState) {
      options.clearTransformPreview()
      options.transformManagerRef.current?.cancel()
      options.selectionDragControllerRef.current?.clear()
      options.setActiveTransformHandle(null)
      options.setHoveredTransformHandle(null)
      options.setDraftPrimitive(null)
      options.setPathHandleDrag(null)
      options.setShapeStyleHandleDrag(null)
      options.setSelectorOverlayItems([])
    }

    if (!sideEffects.shouldDispatch) {
      return
    }

    dispatchRuntimeCommand(command, commandSource)
    } finally {
      commandDispatchDepth -= 1
      if (commandDispatchDepth === 0) {
        activeTransactionId = null
      }
    }
  }

  return {
    handleRuntimeCommand,
  }
}