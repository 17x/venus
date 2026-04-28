import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useNotification} from '../../ui/index.ts'
import {type ToolName} from '../../runtime/model/index.ts'
import {
  createRuntimeEditingModeController,
  createRuntimeInputRouter,
  createRuntimeToolRegistry,
  type RuntimeEditingMode,
} from '../../runtime/index.ts'
import {createSelectionDragController} from '../../runtime/interaction/index.ts'
import type {ElementProps} from '../../runtime/types/index.ts'
import {useTranslation} from 'react-i18next'
import {PointRef} from '../../views/statusBar/StatusBar.tsx'
import useFocus from '../useFocus.tsx'
import useShortcut from '../useShortcut.tsx'
import {createTransformSessionManager} from '../../runtime/interaction/index.ts'
import {useEditorDocument} from '../useEditorDocument.ts'
import {usePenTool} from '../usePenTool.ts'
import {registerDefaultRuntimeToolHandlers} from '../runtime/tooling.ts'
import {useEditorRuntimeInteractionBridge} from '../runtime/useEditorRuntimeInteractionBridge.ts'
import {useEditorRuntimeDerivedState} from './derivedState/derivedState.ts'
import {useEditorRuntimeExecuteAction} from './executeAction.ts'
import {useEditorRuntimeCoreCallbacks} from './coreCallbacks.ts'
import {useEditorRuntimeCanvasInteractions} from './canvasInteractions.ts'
import {createEditorRuntimeCommandController} from '../runtime/createEditorRuntimeCommandController.ts'
import {buildUseEditorRuntimeOutputs, buildUseEditorRuntimeUiState} from './outputs.ts'
import {useEditorRuntimeCommandActions, useEditorRuntimePointerHandlers} from './interactions.ts'
import {useEditorRuntimeCursorState, useEditorRuntimeUiStateAndSync} from './presentation.ts'

const SNAP_AUTO_DISABLE_SHAPE_COUNT = 25_000

export type {
  EditorDocumentState,
  EditorFileAsset,
  EditorFileDocument,
  EditorFilePageSpec,
  EditorExecutor,
  EditorRuntimeCommands,
  EditorRuntimeRefs,
  EditorRuntimeState,
  EditorUIState,
  HistoryNodeLike,
} from './types.ts'

// Owns vector editor runtime orchestration and composes runtime/interaction adapters for UI consumers.
const useEditorRuntime = (options: {
  onContextMenu?: (position: {x: number; y: number}) => void
  createWorker: () => Worker
}) => {
  const onContextMenu = options.onContextMenu
  const {
    file,
    document,
    hasFile,
    openFile,
    closeFile,
    createFile,
    addAsset,
    saveFile,
  } = useEditorDocument()
  const [showPrint, setShowPrint] = useState(false)
  const [focused, setFocused] = useState(false)
  const [currentTool, setCurrentToolState] = useState<ToolName>('selector')
  const [editingMode, setEditingMode] = useState<RuntimeEditingMode>('idle')
  const [clipboard, setClipboard] = useState<ElementProps[]>([])
  const [pasteSerial, setPasteSerial] = useState(0)
  // Keep high-frequency interaction state in a runtime bridge so UI adapters consume slice updates.
  const interactionBridge = useEditorRuntimeInteractionBridge()
  const {
    activeTransformHandle,
    hoveredTransformHandle,
    hoveredShapeId,
    selectorOverlayItems,
    pathSubSelection,
    pathSubSelectionHover,
    pathHandleDrag,
    shapeStyleHandleDrag,
    penDraftPoints,
    draftPrimitive,
    snapGuides,
  } = interactionBridge.state
  const {
    setActiveTransformHandle,
    setHoveredTransformHandle,
    setHoveredShapeId,
    setSelectorOverlayItems,
    setPathSubSelection,
    setPathSubSelectionHover,
    setPathHandleDrag,
    setShapeStyleHandleDrag,
    setPenDraftPoints,
    setDraftPrimitive,
    setSnapGuides,
    setLastCommandType,
    setSelectedShapeIds,
    setShellSelectedCount,
    setShellLayerCount,
  } = interactionBridge.actions
  const [snappingEnabled, setSnappingEnabled] = useState(true)
  const [isolationGroupId, setIsolationGroupId] = useState<string | null>(null)
  const contextRootRef = useRef<HTMLDivElement>(null)
  const worldPointRef = useRef<PointRef | null>(null)
  const lastCanvasPointRef = useRef<{x: number; y: number} | null>(null)
  const editorRef = useRef<{ printOut?: (ctx: CanvasRenderingContext2D) => void } | null>(null)
  const transformManagerRef = useRef(createTransformSessionManager())
  const runtimeToolRegistryRef = useRef(createRuntimeToolRegistry())
  const runtimeEditingModeControllerRef = useRef(createRuntimeEditingModeController('idle'))
  const selectionDragControllerRef = useRef(createSelectionDragController({allowFrameSelection: false}))
  const createWorker = useCallback(
    () => options.createWorker(),
    [options],
  )

  const {
    canvasRuntime,
    defaultCanvasInteractions,
    RuntimeRenderer,
    transformPreview,
    setTransformPreview,
    clearTransformPreview,
    markTransformPreviewCommitPending,
    selectedShape,
    selectedShapeId,
    selectedNode,
    runtimeShapeById,
    selectedShapeIds,
    previewDocument,
    previewShapes,
    interactionDocument,
    previewShapeById,
    selectionState,
    transformPreviewActive,
    overlayInstructions,
    previewInstructions,
    engineOverlayNodes,
    overlayDiagnostics,
    protectedNodeIds,
    guideHintLabels,
    selectionChrome,
    OverlayRenderer,
  } = useEditorRuntimeDerivedState({
    document,
    editingMode,
    isolationGroupId,
    onContextMenu,
    hoveredShapeId,
    activeTransformHandle,
    snapGuides,
    pathSubSelection,
    pathSubSelectionHover,
    draftPrimitive,
    penDraftPoints,
    pathHandleDrag,
    shapeStyleHandleDrag,
    selectorOverlayItems,
    createWorker,
  })

  useEffect(() => {
    registerDefaultRuntimeToolHandlers(
      runtimeToolRegistryRef.current,
      runtimeEditingModeControllerRef.current,
    )

    const dispose = runtimeEditingModeControllerRef.current.onTransition({
      onTransition(payload) {
        setEditingMode(payload.to)
      },
    })

    return () => {
      dispose()
    }
  }, [])

  useEffect(() => {
    runtimeToolRegistryRef.current.activate(currentTool, {
      editingMode: runtimeEditingModeControllerRef.current.getCurrentMode(),
    })
  }, [currentTool])

  const {add: notify} = useNotification()
  const add = useCallback((message: string, tone: 'info' | 'success' | 'warning' | 'error') => {
    notify(
      message,
      tone === 'success'
        ? 'suc'
        : tone === 'warning'
          ? 'warn'
          : tone,
    )
  }, [notify])
  const {t} = useTranslation()

  // Compose pure runtime command controller so hook only wires dependencies and consumes one dispatch function.
  const commandController = useMemo(() => {
    return createEditorRuntimeCommandController({
      add,
      canvasRuntime,
      selectedNode,
      interactionDocument,
      previewShapes,
      currentTool,
      selectedShapeIds,
      getLastCanvasPoint: () => lastCanvasPointRef.current,
      clearTransformPreview,
      transformManagerRef,
      selectionDragControllerRef,
      setActiveTransformHandle,
      setHoveredTransformHandle,
      setDraftPrimitive,
      setPathHandleDrag,
      setShapeStyleHandleDrag,
      setSelectorOverlayItems,
      setSnappingEnabled,
      setSnapGuides,
      setIsolationGroupId,
      runtimeEditingModeControllerRef,
      setLastCommandType,
      dispatchRuntimeEvent: (event) => {
        interactionBridge.bridge.dispatch(event)
      },
    })
  }, [
    add,
    canvasRuntime,
    clearTransformPreview,
    currentTool,
    interactionDocument,
    interactionBridge.bridge,
    previewShapes,
    selectedNode,
    selectedShapeIds,
    setActiveTransformHandle,
    setDraftPrimitive,
    setHoveredTransformHandle,
    setLastCommandType,
    setPathHandleDrag,
    setShapeStyleHandleDrag,
    setSelectorOverlayItems,
    setSnapGuides,
  ])

  const {handleCommand, insertElement, insertElementsBatch} = useEditorRuntimeCommandActions({
    commandController,
  })

  const penTool = usePenTool({
    currentTool,
    insertElement,
    onDraftPointsChange: (points) => {
      setPenDraftPoints(points)
    },
  })

  const {
    reorderSelectedShape,
    handleZoom,
    resolveDraftPrimitiveType,
    commitPathHandleUpdate,
    commitShapeStyleHandleUpdate,
    setCurrentTool: setCurrentToolInternal,
    pickHistory,
    openDroppedFile,
  } = useEditorRuntimeCoreCallbacks({
    add,
    canvasRuntime,
    handleCommand,
    openFile,
    previewDocument,
    runtimeEditingModeControllerRef,
    runtimeToolRegistryRef,
    selectedShapeId,
    setCurrentToolState,
    setDraftPrimitive,
    setPathHandleDrag,
    setShapeStyleHandleDrag,
    setPathSubSelection,
    setPathSubSelectionHover,
    setPenDraftPoints,
    t,
  })

  // Mirror runtime tool selection through the interaction bridge event stream.
  const setCurrentTool = useCallback((toolName: ToolName) => {
    setCurrentToolInternal(toolName)
    interactionBridge.bridge.dispatch({
      type: 'runtime.tool.selected',
      tool: toolName,
    })
  }, [interactionBridge.bridge, setCurrentToolInternal])

  const applyAutoMask = useCallback(() => {
    handleCommand({type: 'mask.create'})
  }, [handleCommand])

  const clearMask = useCallback(() => {
    handleCommand({type: 'mask.release'})
  }, [handleCommand])

  const cursorState = useEditorRuntimeCursorState({
    runtimeToolRegistryRef,
    currentTool,
    selectedNode,
    transformPreview,
    pathSubSelection,
    pathSubSelectionHover,
    overlayInstructions,
    editingMode,
    activeTransformHandle,
    hoveredTransformHandle,
  })

  const executeAction = useEditorRuntimeExecuteAction({
    add,
    addAsset,
    applyAutoMask,
    canvasRuntime,
    clipboard,
    clearMask,
    closeFile,
    handleCommand,
    insertElement,
    insertElementsBatch,
    pasteSerial,
    reorderSelectedShape,
    saveFile,
    selectedNode,
    selectedShapeIds,
    setClipboard,
    setCurrentTool,
    setPasteSerial,
    setShowPrint,
  })

  useFocus(contextRootRef, focused, (nextFocused) => {
    setFocused(nextFocused)
  })
  useShortcut(executeAction, handleZoom, {
    currentTool,
    focused,
    setCurrentTool,
  })

  const {uiState, selectedProps} = useEditorRuntimeUiStateAndSync({
    canvasRuntime,
    clipboard,
    selectedNode,
    selectedShapeIds,
    showPrint,
    file,
    setLastCommandType,
    setSelectedShapeIds,
    setShellSelectedCount,
    setShellLayerCount,
    dispatchRuntimeEvent: (event) => {
      interactionBridge.bridge.dispatch(event)
    },
  })

  const effectiveSnappingEnabled = snappingEnabled && interactionDocument.shapes.length < SNAP_AUTO_DISABLE_SHAPE_COUNT

  const canvasInteractions = useEditorRuntimeCanvasInteractions({
    interactionBridge: interactionBridge.bridge,
    add,
    canvasRuntime,
    clearTransformPreview,
    commitPathHandleUpdate,
    commitShapeStyleHandleUpdate,
    currentTool,
    defaultCanvasInteractions,
    draftPrimitive,
    handleCommand,
    handleZoom,
    hoveredShapeId,
    insertElement,
    interactionDocument,
    markTransformPreviewCommitPending,
    pathHandleDrag,
    shapeStyleHandleDrag,
    pathSubSelection,
    pathSubSelectionHover,
    penTool,
    previewShapeById,
    previewShapes,
    resolveDraftPrimitiveType,
    runtimeEditingModeControllerRef,
    runtimeShapeById,
    selectedShapeIds,
    selectionDragControllerRef,
    selectionState,
    setActiveTransformHandle,
    setHoveredTransformHandle,
    setDraftPrimitive,
    setHoveredShapeId,
    setSelectorOverlayItems,
    setPathHandleDrag,
    setShapeStyleHandleDrag,
    setPathSubSelection,
    setPathSubSelectionHover,
    setPenDraftPoints,
    setSnapGuides,
    setTransformPreview,
    snappingEnabled: effectiveSnappingEnabled,
    transformManagerRef,
    transformPreview,
  })

  const runtimeInputRouter = useMemo(() => createRuntimeInputRouter({
    onInput: () => {
      // Runtime input stream is currently used for event normalization.
    },
  }), [])

  const {onPointerMove, onPointerDown, onPointerUp, onPointerLeave} = useEditorRuntimePointerHandlers({
    runtimeInputRouter,
    canvasInteractions,
    lastCanvasPointRef,
    worldPointRef,
  })

  const {documentState, runtimeState, commands, refs} = buildUseEditorRuntimeOutputs({
    canvasRuntime,
    file,
    hasFile,
    RuntimeRenderer,
    OverlayRenderer,
    interactionDocument,
    previewShapes,
    editingMode,
    transformPreviewActive,
    cursorState,
    selectionChrome,
    isolationGroupId,
    protectedNodeIds,
    overlayInstructions,
    previewInstructions,
    engineOverlayNodes,
    overlayDiagnostics,
    guideHintLabels,
    canvasInteractions: {
      onPointerMove,
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onViewportChange: canvasInteractions.onViewportChange,
      onViewportPan: canvasInteractions.onViewportPan,
      onViewportResize: canvasInteractions.onViewportResize,
      onViewportZoom: canvasInteractions.onViewportZoom,
      onContextMenu: canvasInteractions.onContextMenu,
    },
    currentTool,
    focused,
    selectedShape,
    executeAction,
    saveFile: () => saveFile(canvasRuntime.document),
    createFile,
    addAsset,
    setCurrentTool,
    setSnappingEnabled,
    pickHistory,
    openDroppedFile,
    setShowPrint,
    contextRootRef,
    worldPointRef,
    editorRef,
  })

  return {
    documentState,
    runtimeState,
    uiState: buildUseEditorRuntimeUiState({
      uiState,
      selectedProps,
      snappingEnabled,
    }),
    commands,
    refs,
    file,
    hasFile,
    showPrint,
    setShowPrint,
    contextRootRef,
    worldPointRef,
    editorRef,
    executeAction,
    saveFile: commands.saveFile,
    createFile,
    setCurrentTool,
    pickHistory,
    openDroppedFile,
    canvas: runtimeState.canvas,
  }
}

export default useEditorRuntime
