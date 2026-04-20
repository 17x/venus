import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useNotification} from '@vector/ui'
import {type ToolName} from '@venus/document-core'
import {
  createRuntimeEditingModeController,
  createRuntimeToolRegistry,
  type RuntimeEditingMode,
} from '@vector/runtime'
import {
  createMarqueeSelectionApplyController,
  createSelectionDragController,
  resolveMarqueeBounds,
  resolveMarqueeSelection,
  type MarqueeState,
  type SnapGuide,
} from '../interaction/runtime/index.ts'
// import type {ElementProps} from '@lite-u/editor/types'
import {useTranslation} from 'react-i18next'
import {PointRef} from '../../components/statusBar/StatusBar.tsx'
import useFocus from './useFocus.tsx'
import useShortcut from './useShortcut.tsx'
import {createDocumentNodeFromElement} from '../adapters/fileDocument.ts'
import {
  createTransformSessionManager,
  type DraftPrimitive,
  type HandleKind,
  type PathSubSelection,
} from '../interaction/index.ts'
import {deriveEditorUIState} from './deriveEditorUIState.ts'
import {useEditorDocument} from './useEditorDocument.ts'
import {usePenTool} from './usePenTool.ts'
import {registerDefaultRuntimeToolHandlers} from './runtime/tooling.ts'
import type {
  EditorDocumentState,
  EditorRuntimeCommands,
  EditorRuntimeRefs,
  EditorRuntimeState,
  SelectedElementProps,
} from './useEditorRuntime.types.ts'
import {resolveSelectedProps} from './useEditorRuntime.helpers.ts'
import {useEditorRuntimeDerivedState} from './useEditorRuntimeDerivedState.ts'
import {
  useEditorRuntimeExecuteAction,
} from './useEditorRuntimeExecuteAction.ts'
import {
  createAutoMaskHandler,
  createClearMaskHandler,
} from './useEditorRuntimeMaskActions.ts'
import {useEditorRuntimeCoreCallbacks} from './useEditorRuntimeCoreCallbacks.ts'
import {useEditorRuntimeCanvasInteractions} from './useEditorRuntimeCanvasInteractions.ts'

export type {
  EditorDocumentState,
  EditorExecutor,
  EditorRuntimeCommands,
  EditorRuntimeRefs,
  EditorRuntimeState,
  EditorUIState,
  HistoryNodeLike,
  VisionFileAsset,
  VisionFilePageSet,
  VisionFileType,
} from './useEditorRuntime.types.ts'

const useEditorRuntime = (options?: {
  onContextMenu?: (position: {x: number; y: number}) => void
}) => {
  const onContextMenu = options?.onContextMenu
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
  const [activeTransformHandle, setActiveTransformHandle] = useState<HandleKind | null>(null)
  const [marquee, setMarquee] = useState<MarqueeState | null>(null)
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null)
  const [pathSubSelection, setPathSubSelection] = useState<PathSubSelection | null>(null)
  const [pathSubSelectionHover, setPathSubSelectionHover] = useState<PathSubSelection | null>(null)
  const [pathHandleDrag, setPathHandleDrag] = useState<{
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null>(null)
  const [penDraftPoints, setPenDraftPoints] = useState<Array<{x: number; y: number}> | null>(null)
  const [draftPrimitive, setDraftPrimitive] = useState<DraftPrimitive | null>(null)
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([])
  const [snappingEnabled, setSnappingEnabled] = useState(true)
  const contextRootRef = useRef<HTMLDivElement>(null)
  const worldPointRef = useRef<PointRef | null>(null)
  const editorRef = useRef<{ printOut?: (ctx: CanvasRenderingContext2D) => void } | null>(null)
  const transformManagerRef = useRef(createTransformSessionManager())
  const runtimeToolRegistryRef = useRef(createRuntimeToolRegistry())
  const runtimeEditingModeControllerRef = useRef(createRuntimeEditingModeController('idle'))
  const selectionDragControllerRef = useRef(createSelectionDragController({allowFrameSelection: false}))
  const marqueeApplyControllerRef = useRef(createMarqueeSelectionApplyController())
  const createWorker = useCallback(
    () => new Worker(new URL('../../editor.worker.ts', import.meta.url), {type: 'module'}),
    [],
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
    OverlayRenderer,
  } = useEditorRuntimeDerivedState({
    document,
    onContextMenu,
    hoveredShapeId,
    marquee,
    activeTransformHandle,
    snapGuides,
    pathSubSelection,
    pathSubSelectionHover,
    draftPrimitive,
    penDraftPoints,
    pathHandleDrag,
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

    runtimeToolRegistryRef.current.activate(currentTool, {
      editingMode: runtimeEditingModeControllerRef.current.getCurrentMode(),
    })

    return () => {
      dispose()
    }
  }, [])

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

  const handleCommand = useCallback((command: import('@vector/runtime/worker').EditorRuntimeCommand) => {
    if (command.type === 'snapping.pause') {
      setSnappingEnabled(false)
      setSnapGuides([])
      return
    }

    if (command.type === 'snapping.resume') {
      setSnappingEnabled(true)
      return
    }

    if (command.type === 'history.undo' || command.type === 'history.redo') {
      clearTransformPreview()
      transformManagerRef.current.cancel()
      selectionDragControllerRef.current.clear()
      setActiveTransformHandle(null)
      setDraftPrimitive(null)
      setPathHandleDrag(null)
      setMarquee(null)
      setSnapGuides([])
    }
    canvasRuntime.dispatchCommand(command)
  }, [canvasRuntime, clearTransformPreview])

  const insertElement = useCallback((element: ElementProps) => {
    handleCommand({
      type: 'shape.insert',
      shape: createDocumentNodeFromElement(element),
    })
  }, [handleCommand])

  const insertElementsBatch = useCallback((elements: ElementProps[]) => {
    if (elements.length === 0) {
      return
    }
    handleCommand({
      type: 'shape.insert.batch',
      shapes: elements.map((element) => createDocumentNodeFromElement(element)),
    })
  }, [handleCommand])

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
    setCurrentTool,
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
    setPathSubSelection,
    setPathSubSelectionHover,
    setPenDraftPoints,
    t,
  })

  const applyAutoMask = useMemo(() => createAutoMaskHandler({
    add,
    canvasShapes: canvasRuntime.document.shapes,
    handleCommand,
    selectedNode,
  }), [add, canvasRuntime.document.shapes, handleCommand, selectedNode])

  const clearMask = useMemo(() => createClearMaskHandler({
    add,
    handleCommand,
    selectedNode,
  }), [add, handleCommand, selectedNode])

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
    setCurrentToolState,
    setPasteSerial,
    setPathSubSelection,
    setPathSubSelectionHover,
    setShowPrint,
    runtimeToolRegistryRef,
    runtimeEditingModeControllerRef,
  })

  useFocus(contextRootRef, focused, (nextFocused) => {
    setFocused(nextFocused)
  })
  useShortcut(executeAction, handleZoom, {
    currentTool,
    focused,
    setCurrentTool,
  })

  const uiState = deriveEditorUIState({
    canvasRuntime,
    clipboard,
    selectedNode,
    selectedIds: selectedShapeIds,
    showPrint,
  })
  const selectedProps: SelectedElementProps | null = useMemo(() => resolveSelectedProps(
    uiState.selectedProps,
    selectedNode,
    file,
  ), [file, selectedNode, uiState.selectedProps])

  const resolveMarqueeSelectionIds = useCallback((nextMarquee: MarqueeState) => resolveMarqueeSelection(
    interactionDocument.shapes,
    resolveMarqueeBounds(nextMarquee),
    {
      matchMode: 'contain',
      excludeShape: (shape) => shape.type === 'frame',
    },
  ), [interactionDocument.shapes])

  const applyMarqueeSelectionWhileMoving = useCallback((nextMarquee: MarqueeState) => {
    const selectedIds = resolveMarqueeSelectionIds(nextMarquee)
    marqueeApplyControllerRef.current.applyWhileMoving({
      marquee: nextMarquee,
      selectedIds,
      dispatchSelection: (shapeIds, mode) => canvasRuntime.dispatchCommand({
        type: 'selection.set',
        shapeIds,
        mode,
      }),
    })
  }, [canvasRuntime, resolveMarqueeSelectionIds])

  const canvasInteractions = useEditorRuntimeCanvasInteractions({
    add,
    applyMarqueeSelectionWhileMoving,
    canvasRuntime,
    clearTransformPreview,
    commitPathHandleUpdate,
    currentTool,
    defaultCanvasInteractions,
    draftPrimitive,
    handleCommand,
    handleZoom,
    hoveredShapeId,
    insertElement,
    interactionDocument,
    marquee,
    marqueeApplyControllerRef,
    markTransformPreviewCommitPending,
    pathHandleDrag,
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
    setDraftPrimitive,
    setHoveredShapeId,
    setMarquee,
    setPathHandleDrag,
    setPathSubSelection,
    setPathSubSelectionHover,
    setPenDraftPoints,
    setSnapGuides,
    setTransformPreview,
    snappingEnabled,
    transformManagerRef,
    transformPreview,
  })

  const documentState: EditorDocumentState = {
    document: canvasRuntime.document,
    file,
    hasFile,
  }

  const runtimeState: EditorRuntimeState = {
    canvas: {
      Renderer: RuntimeRenderer,
      OverlayRenderer,
      document: interactionDocument,
      shapes: previewShapes,
      stats: canvasRuntime.stats,
      viewport: canvasRuntime.viewport,
      ready: canvasRuntime.ready,
      onPointerMove: (point) => {
        worldPointRef.current?.set(point)
        canvasInteractions.onPointerMove(point)
      },
      onPointerDown: canvasInteractions.onPointerDown,
      onPointerUp: canvasInteractions.onPointerUp,
      onPointerLeave: canvasInteractions.onPointerLeave,
      onViewportChange: canvasInteractions.onViewportChange,
      onViewportPan: canvasInteractions.onViewportPan,
      onViewportResize: canvasInteractions.onViewportResize,
      onViewportZoom: canvasInteractions.onViewportZoom,
      onContextMenu: canvasInteractions.onContextMenu,
    },
    currentTool,
    editingMode,
    focused,
    history: canvasRuntime.history,
    selectedShape,
    viewportScale: canvasRuntime.viewport.scale,
  }

  const commands: EditorRuntimeCommands = {
    executeAction,
    saveFile: () => saveFile(canvasRuntime.document),
    createFile,
    addAsset,
    setCurrentTool,
    setSnappingEnabled,
    pickHistory,
    openDroppedFile,
    setShowPrint,
  }

  const refs: EditorRuntimeRefs = {
    contextRootRef,
    worldPointRef,
    editorRef,
  }

  return {
    documentState,
    runtimeState,
    uiState: {
      ...uiState,
      selectedProps,
      snappingEnabled,
    },
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
