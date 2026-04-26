import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useNotification} from '@vector/ui'
import {type ToolName} from '@vector/model'
import {
  createRuntimeEditingModeController,
  createRuntimeInputRouter,
  resolveRuntimeCursor,
  createRuntimeToolRegistry,
  type RuntimeEditingMode,
} from '@vector/runtime'
import {
  createMarqueeSelectionApplyController,
  createSelectionDragController,
  resolveHitShapeIdsAtPoint,
  resolveMarqueeBounds,
  resolveMarqueeSelection,
  type MarqueeState,
  type SnapGuide,
} from '../../runtime/interaction/index.ts'
import type {ElementProps} from '@lite-u/editor/types'
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
import {
  resolveAutoMaskAction,
  resolveClearMaskAction,
  resolveGroupIsolationTarget,
  resolveHoverHitTestOptions,
  resolveMaskSelectionCommand,
  resolveRuntimeCommandSideEffects,
  resolveSelectedProps,
} from './useEditorRuntime.helpers.ts'
import {expandMaskLinkedShapeIds, resolveMaskLinkedShapeIds} from '../interaction/maskGroup.ts'
import {useEditorRuntimeDerivedState} from './useEditorRuntimeDerivedState.ts'
import {
  useEditorRuntimeExecuteAction,
} from './useEditorRuntimeExecuteAction.ts'
import {useEditorRuntimeCoreCallbacks} from './useEditorRuntimeCoreCallbacks.ts'
import {useEditorRuntimeCanvasInteractions} from './useEditorRuntimeCanvasInteractions.ts'
import {publishRuntimeShellSnapshot, resetRuntimeEventSnapshots} from '../../runtime/events/index.ts'

const SNAP_AUTO_DISABLE_SHAPE_COUNT = 25_000

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
  const [isolationGroupId, setIsolationGroupId] = useState<string | null>(null)
  const contextRootRef = useRef<HTMLDivElement>(null)
  const worldPointRef = useRef<PointRef | null>(null)
  const lastCanvasPointRef = useRef<{x: number; y: number} | null>(null)
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
    overlayInstructions,
    previewInstructions,
    overlayDiagnostics,
    protectedNodeIds,
    selectionChrome,
    OverlayRenderer,
  } = useEditorRuntimeDerivedState({
    document,
    editingMode,
    isolationGroupId,
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

  const handleCommand = useCallback(function handleRuntimeCommand(
    command: import('@vector/runtime/worker').EditorRuntimeCommand,
  ) {
    if (command.type === 'mask.create') {
      const resolved = resolveAutoMaskAction({
        canvasShapes: canvasRuntime.document.shapes,
        selectedNode,
      })
      if (resolved.command) {
        handleRuntimeCommand(resolved.command)
      }
      add(resolved.message, 'info')
      return
    }

    if (command.type === 'mask.release') {
      const resolved = resolveClearMaskAction(selectedNode)
      if (resolved.command) {
        handleRuntimeCommand(resolved.command)
      }
      add(resolved.message, 'info')
      return
    }

    if (command.type === 'mask.select-host' || command.type === 'mask.select-source') {
      const resolved = resolveMaskSelectionCommand({
        selectedNode,
        canvasShapes: canvasRuntime.document.shapes,
        target: command.type === 'mask.select-host' ? 'host' : 'source',
      })
      if (resolved.command) {
        handleRuntimeCommand(resolved.command)
      }
      add(resolved.message, 'info')
      return
    }

    if (command.type === 'selection.cycle-hit-target') {
      const pointer = lastCanvasPointRef.current
      if (!pointer) {
        add('Move the pointer over overlapping shapes to cycle selection.', 'info')
        return
      }

      const hitShapeIds = resolveHitShapeIdsAtPoint(
        interactionDocument,
        previewShapes,
        pointer,
        {
          ...resolveHoverHitTestOptions(),
          maxExactCandidateCount: 12,
          preferGroupSelection: currentTool === 'selector',
        },
      )

      if (hitShapeIds.length === 0) {
        add('No selectable shape found under the pointer.', 'info')
        return
      }

      const currentIndex = hitShapeIds.findIndex((shapeId) => resolveMaskLinkedShapeIds(interactionDocument, shapeId).some((linkedShapeId) => selectedShapeIds.includes(linkedShapeId)))
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
        selectedShapeIds,
        shapes: canvasRuntime.document.shapes,
      })
      if (!nextGroupId) {
        add('Select a group to enter isolation.', 'info')
        return
      }

      setIsolationGroupId(nextGroupId)
      runtimeEditingModeControllerRef.current?.transition({
        to: 'isolatedGroupEditing',
        reason: 'group-isolation:enter',
        metadata: {groupId: nextGroupId},
      })
      return
    }

    if (command.type === 'group.exit-isolation') {
      setIsolationGroupId(null)
      runtimeEditingModeControllerRef.current?.transition({
        to: currentTool === 'dselector' ? 'directSelecting' : 'selecting',
        reason: 'group-isolation:exit',
      })
      return
    }

    const sideEffects = resolveRuntimeCommandSideEffects(command)

    if (sideEffects.nextSnappingEnabled !== null) {
      setSnappingEnabled(sideEffects.nextSnappingEnabled)
    }

    if (sideEffects.clearSnapGuides) {
      setSnapGuides([])
    }

    if (sideEffects.resetTransientInteractionState) {
      clearTransformPreview()
      transformManagerRef.current.cancel()
      selectionDragControllerRef.current.clear()
      setActiveTransformHandle(null)
      setDraftPrimitive(null)
      setPathHandleDrag(null)
      setMarquee(null)
    }

    if (!sideEffects.shouldDispatch) {
      return
    }

    canvasRuntime.dispatchCommand(command)
  }, [
    add,
    canvasRuntime,
    clearTransformPreview,
    currentTool,
    interactionDocument,
    previewShapes,
    selectedNode,
    selectedShapeIds,
  ])

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

  const applyAutoMask = useCallback(() => {
    handleCommand({type: 'mask.create'})
  }, [handleCommand])

  const clearMask = useCallback(() => {
    handleCommand({type: 'mask.release'})
  }, [handleCommand])

  const activeToolCursor = runtimeToolRegistryRef.current.get(currentTool)?.getCursor?.()
  const activeRotation = selectedNode?.rotation ?? 0
  const cursorState = useMemo(() => resolveRuntimeCursor({
    toolCursor: activeToolCursor,
    editingMode,
    activeHandle: activeTransformHandle,
    rotationDegrees: activeRotation,
    pathHitType: (pathSubSelectionHover ?? pathSubSelection)?.hitType ?? null,
  }), [activeRotation, activeToolCursor, activeTransformHandle, editingMode, pathSubSelection, pathSubSelectionHover])

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

  useEffect(() => {
    resetRuntimeEventSnapshots()
  }, [file?.id])

  useEffect(() => {
    publishRuntimeShellSnapshot({
      selectedCount: selectedShapeIds.length,
      layerCount: uiState.layerItems.length,
    })
  }, [selectedShapeIds.length, uiState.layerItems.length])

  const resolveMarqueeSelectionIds = useCallback((nextMarquee: MarqueeState) => expandMaskLinkedShapeIds(
    interactionDocument,
    resolveMarqueeSelection(
      interactionDocument.shapes,
      resolveMarqueeBounds(nextMarquee),
      {
        matchMode: 'contain',
        // Keep marquee exclusion compatible with engine-level selectable shape
        // contracts, which are narrower than full document node types.
        excludeShape: (shape) => (
          shape.type === 'frame' ||
          (shape.type === 'image' && Boolean((shape as {clipPathId?: string}).clipPathId))
        ),
      },
    ),
  ), [interactionDocument])

  const effectiveSnappingEnabled = snappingEnabled && interactionDocument.shapes.length < SNAP_AUTO_DISABLE_SHAPE_COUNT

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
    snappingEnabled: effectiveSnappingEnabled,
    transformManagerRef,
    transformPreview,
  })

  const runtimeInputRouter = useMemo(() => createRuntimeInputRouter({
    onInput: () => {
      // Runtime input stream is currently used for event normalization.
    },
  }), [])

  const onPointerMove = useCallback((point: {x: number; y: number}) => {
    runtimeInputRouter.dispatch({
      type: 'pointermove',
      point,
    })
    lastCanvasPointRef.current = point
    worldPointRef.current?.set(point)
    canvasInteractions.onPointerMove(point)
  }, [canvasInteractions, runtimeInputRouter])

  const onPointerDown = useCallback((
    point: {x: number; y: number},
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
  ) => {
    runtimeInputRouter.dispatch({
      type: 'pointerdown',
      point,
      modifiers,
    })
    lastCanvasPointRef.current = point
    worldPointRef.current?.set(point)
    canvasInteractions.onPointerDown(point, modifiers)
  }, [canvasInteractions, runtimeInputRouter])

  const onPointerUp = useCallback(() => {
    runtimeInputRouter.dispatch({
      type: 'pointerup',
      point: {x: 0, y: 0},
    })
    canvasInteractions.onPointerUp()
  }, [canvasInteractions, runtimeInputRouter])

  const onPointerLeave = useCallback(() => {
    runtimeInputRouter.dispatch({
      type: 'pointerleave',
      point: {x: 0, y: 0},
    })
    canvasInteractions.onPointerLeave()
  }, [canvasInteractions, runtimeInputRouter])

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
      editingMode,
      cursor: cursorState.cursor,
      cursorState,
      selectionChrome,
      isolationGroupId,
      ready: canvasRuntime.ready,
      protectedNodeIds,
      overlayInstructions,
      previewInstructions,
      overlayDiagnostics,
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
