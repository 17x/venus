import {createElement, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useNotification} from '@vector/ui'
import {
  getBoundingRectFromBezierPoints,
  nid,
  type BezierPoint,
  type ToolName,
} from '@venus/document-core'
import {
  applyMatrixToPoint,
  createRuntimeEditingModeController,
  createRuntimeToolRegistry,
  type RuntimeEditingMode,
} from '@vector/runtime'
import {
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  type EngineBackend,
} from '@vector/runtime/engine'
import {
  createTransformBatchCommand,
  createTransformPreviewShape,
  createTransformSessionShape,
  createMarqueeSelectionApplyController,
  createMarqueeState,
  collectResizeTransformTargets,
  createSelectionDragController,
  resolveTopHitShapeId,
  resolveDragStartTransformPayload,
  resolvePointerUpMarqueeSelection,
  resolvePointerUpTransformCommit,
  resolveSelectionHandleHitAtPoint,
  resolveSnappedTransformPreview,
  shouldPreserveGroupDragSelection,
  shouldClearSelectionOnPointerDown,
  resolveTransformPreviewRuntimeState,
  resolveMarqueeBounds,
  resolveMarqueeSelection,
  updateMarqueeState,
  resolveRuntimeZoomPresetScale,
  type MarqueeApplyMode,
  type MarqueeState,
  type MarqueeSelectionMode,
  type SnapGuide,
} from '../interaction/runtime/index.ts'
import {Canvas2DRenderer} from '../runtime/canvasAdapter.tsx'
import type {ElementProps} from '@lite-u/editor/types'
import {useTranslation} from 'react-i18next'
import {PointRef} from '../../components/statusBar/StatusBar.tsx'
import useFocus from './useFocus.tsx'
import useShortcut from './useShortcut.tsx'
import {createDocumentNodeFromElement} from '../adapters/fileDocument.ts'
import readFileHelper from '../../contexts/fileContext/readFileHelper.ts'
import {
  cloneElementProps,
  createShapeElementFromDrag,
  createShapeElementFromTool,
  isDragCreateTool,
  mapToolNameToToolId,
  offsetElementPosition,
} from './editorRuntimeHelpers.ts'
import {
  buildSelectionState,
  createTransformSessionManager,
  InteractionOverlay,
} from '../interaction/index.ts'
import type {HandleKind} from '../interaction/index.ts'
import type {
  DraftPrimitive,
  DraftPrimitiveType,
  InteractionBounds,
  PathSubSelection,
  TransformPreview,
} from '../interaction/index.ts'
import {deriveEditorUIState} from './deriveEditorUIState.ts'
import {useEditorDocument} from './useEditorDocument.ts'
import {usePenTool} from './usePenTool.ts'
import {useCanvasRuntimeBridge} from './useCanvasRuntimeBridge.ts'
import {useTransformPreviewCommitBridge} from './useTransformPreviewCommitBridge.ts'
import {
  registerDefaultRuntimeToolHandlers,
  resolveEditingModeForTool,
} from './runtime/tooling.ts'
import {
  handleGroupNodesAction,
  handleUngroupNodesAction,
} from './runtime/groupActions.ts'
import {handleShapeActions} from './runtime/shapeActions.ts'
import {resolvePathSubSelectionAtPoint} from './runtime/pathSubSelection.ts'
import type {
  EditorDocumentState,
  EditorExecutor,
  EditorRuntimeCommands,
  EditorRuntimeRefs,
  EditorRuntimeState,
  SelectedElementProps,
  VisionFileAsset,
} from './useEditorRuntime.types.ts'

function isClosedMaskShape(shape: import('@venus/document-core').DocumentNode | null | undefined) {
  return !!shape && (
    shape.type === 'rectangle' ||
    shape.type === 'ellipse' ||
    shape.type === 'polygon' ||
    shape.type === 'star' ||
    shape.type === 'path'
  )
}

function boundsOverlap(
  left: import('@venus/document-core').DocumentNode,
  right: import('@venus/document-core').DocumentNode,
) {
  const leftBounds = getNormalizedBoundsFromBox(left.x, left.y, left.width, left.height)
  const rightBounds = getNormalizedBoundsFromBox(right.x, right.y, right.width, right.height)

  return doNormalizedBoundsOverlap(leftBounds, rightBounds)
}

function toElementPropsFromNode(selectedNode: import('@venus/document-core').DocumentNode): ElementProps {
  return {
    id: selectedNode.id,
    type: selectedNode.type,
    name: selectedNode.text ?? selectedNode.name,
    asset: selectedNode.assetId,
    assetUrl: selectedNode.assetUrl,
    clipPathId: selectedNode.clipPathId,
    clipRule: selectedNode.clipRule,
    x: selectedNode.x,
    y: selectedNode.y,
    width: selectedNode.width,
    height: selectedNode.height,
    rotation: selectedNode.rotation ?? 0,
    flipX: selectedNode.flipX ?? false,
    flipY: selectedNode.flipY ?? false,
    points: selectedNode.points?.map((point) => ({...point})),
    bezierPoints: selectedNode.bezierPoints?.map((point) => ({
      anchor: {...point.anchor},
      cp1: point.cp1 ? {...point.cp1} : point.cp1,
      cp2: point.cp2 ? {...point.cp2} : point.cp2,
    })),
    strokeStartArrowhead: selectedNode.strokeStartArrowhead,
    strokeEndArrowhead: selectedNode.strokeEndArrowhead,
    fill: selectedNode.fill ? {...selectedNode.fill} : undefined,
    stroke: selectedNode.stroke ? {...selectedNode.stroke} : undefined,
    shadow: selectedNode.shadow ? {...selectedNode.shadow} : undefined,
    cornerRadius: selectedNode.cornerRadius,
    cornerRadii: selectedNode.cornerRadii ? {...selectedNode.cornerRadii} : undefined,
    ellipseStartAngle: selectedNode.ellipseStartAngle,
    ellipseEndAngle: selectedNode.ellipseEndAngle,
  }
}

function resolvePathHandlePreviewDocument(
  document: import('@venus/document-core').EditorDocument,
  pathHandleDrag: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null,
  pathSubSelectionHover: PathSubSelection | null,
) {
  if (!pathHandleDrag || pathSubSelectionHover?.hitType !== pathHandleDrag.handleType || !pathSubSelectionHover.handlePoint) {
    return document
  }
  const hoveredHandlePoint = pathSubSelectionHover.handlePoint

  const shape = document.shapes.find((item) => item.id === pathHandleDrag.shapeId)
  if (!shape || shape.type !== 'path' || !Array.isArray(shape.bezierPoints) || shape.bezierPoints.length === 0) {
    return document
  }

  const nextBezierPoints: BezierPoint[] = shape.bezierPoints.map((item, index) => {
    if (index !== pathHandleDrag.anchorIndex) {
      return {
        anchor: {...item.anchor},
        cp1: item.cp1 ? {...item.cp1} : item.cp1,
        cp2: item.cp2 ? {...item.cp2} : item.cp2,
      }
    }

    return {
      anchor: {...item.anchor},
      cp1: pathHandleDrag.handleType === 'inHandle'
        ? {x: hoveredHandlePoint.x, y: hoveredHandlePoint.y}
        : (item.cp1 ? {...item.cp1} : item.cp1),
      cp2: pathHandleDrag.handleType === 'outHandle'
        ? {x: hoveredHandlePoint.x, y: hoveredHandlePoint.y}
        : (item.cp2 ? {...item.cp2} : item.cp2),
    }
  })
  const bounds = getBoundingRectFromBezierPoints(nextBezierPoints)

  return {
    ...document,
    shapes: document.shapes.map((item) => item.id === shape.id
      ? {
          ...item,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          bezierPoints: nextBezierPoints,
        }
      : item),
  }
}

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

const SCENE_CAPACITY = 256
const IMAGE_INSERT_VIEWPORT_RATIO = 0.82
const DEFAULT_MARQUEE_APPLY_MODE: MarqueeApplyMode = 'while-pointer-move'

function formatSelectionNames(
  document: import('@venus/document-core').EditorDocument,
  selectedIds: string[],
) {
  if (selectedIds.length === 0) {
    return 'None'
  }

  const names = selectedIds
    .map((id) => document.shapes.find((shape) => shape.id === id)?.name)
    .filter((name): name is string => Boolean(name))

  if (names.length === 0) {
    return `${selectedIds.length} selected`
  }
  if (names.length <= 3) {
    return names.join(', ')
  }

  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`
}

const useEditorRuntime = (options?: {
  onContextMenu?: (position: {x: number; y: number}) => void
}) => {
  const onContextMenu = options?.onContextMenu
  const {
    file,
    document,
    hasFile,
    creating,
    showCreateFile,
    openFile,
    closeFile,
    createFile,
    addAsset,
    startCreateFile,
    handleCreating,
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
  const selectionDragControllerRef = useRef(createSelectionDragController({
    allowFrameSelection: false,
  }))
  const marqueeApplyControllerRef = useRef(createMarqueeSelectionApplyController())
  const createWorker = useCallback(
    () => new Worker(new URL('../../editor.worker.ts', import.meta.url), {type: 'module'}),
    [],
  )
  const {
    runtime: canvasRuntime,
    interactions: defaultCanvasInteractions,
    presentation: runtimePresentation,
  } = useCanvasRuntimeBridge({
    capacity: Math.max(SCENE_CAPACITY, document.shapes.length + 8),
    createWorker,
    document,
    allowFrameSelection: false,
    selection: {
      allowFrameSelection: false,
      input: {
        singleClick: 'replace',
        shiftClick: 'add',
        metaOrCtrlClick: 'toggle',
        altClick: 'subtract',
      },
      marquee: {
        enabled: true,
        defaultMatchMode: 'contain',
        shiftMatchMode: 'contain',
      },
    },
    presentation: {
      marquee: {
        fill: 'rgba(37, 99, 235, 0.12)',
        stroke: 'rgba(37, 99, 235, 0.95)',
      },
      overlay: {
        selectionStroke: '#2563eb',
        hoverStroke: 'rgba(14, 165, 233, 0.9)',
      },
    },
    onContextMenu,
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
  const preferredEngineBackend = useMemo<EngineBackend>(() => {
    if (typeof window === 'undefined') {
      return 'webgl'
    }

    const requested = new URLSearchParams(window.location.search).get('engineBackend')
    return requested === 'canvas2d' ? 'canvas2d' : 'webgl'
  }, [])
  const RuntimeRenderer = useMemo(() => {
    return function RuntimeCanvasRenderer(props: Parameters<typeof Canvas2DRenderer>[0]) {
      return createElement(Canvas2DRenderer, {
        ...props,
        backend: preferredEngineBackend,
      })
    }
  }, [preferredEngineBackend])
  const {
    preview: transformPreview,
    setPreview: setTransformPreview,
    clearPreview: clearTransformPreview,
    markCommitPending: markTransformPreviewCommitPending,
  } = useTransformPreviewCommitBridge<TransformPreview['shapes'][number]>({
    documentShapes: canvasRuntime.document.shapes,
  })
  const {add} = useNotification()
  const {t} = useTranslation()
  const selectedShape = canvasRuntime.stats.selectedIndex >= 0
    ? canvasRuntime.shapes[canvasRuntime.stats.selectedIndex] ?? null
    : null
  const runtimeShapeById = useMemo(
    () => new Map(canvasRuntime.shapes.map((shape) => [shape.id, shape])),
    [canvasRuntime.shapes],
  )
  const selectedShapeIds = useMemo(
    () => canvasRuntime.shapes.filter((shape) => shape.isSelected).map((shape) => shape.id),
    [canvasRuntime.shapes],
  )
  const selectedNode = selectedShape
    ? canvasRuntime.document.shapes.find((shape) => shape.id === selectedShape.id) ?? null
    : null
  const selectedShapeId = selectedShape?.id ?? null
  const previewState = useMemo(() => resolveTransformPreviewRuntimeState(
    canvasRuntime.document,
    canvasRuntime.shapes,
    transformPreview?.shapes ?? null,
    {includeClipBoundImagePreview: true},
  ), [canvasRuntime.document, canvasRuntime.shapes, transformPreview])
  const previewDocument = previewState.previewDocument
  const previewShapes = previewState.previewShapes
  const interactionDocument = useMemo(() => resolvePathHandlePreviewDocument(
    previewDocument,
    pathHandleDrag,
    pathSubSelectionHover,
  ), [pathHandleDrag, pathSubSelectionHover, previewDocument])
  const previewShapeById = useMemo(
    () => new Map(interactionDocument.shapes.map((shape) => [shape.id, shape])),
    [interactionDocument.shapes],
  )

  const selectionState = useMemo(
    () => buildSelectionState(interactionDocument, previewShapes),
    [interactionDocument, previewShapes],
  )
  const marqueeBounds = useMemo<InteractionBounds | null>(() => {
    if (!marquee) {
      return null
    }
    return resolveMarqueeBounds(marquee)
  }, [marquee])
  const OverlayRenderer = useMemo(() => {
    const overlayMarquee = marqueeBounds
    const overlayHoveredShapeId = hoveredShapeId
    const hideSelectionChrome = activeTransformHandle !== null
    const overlaySnapGuides = snapGuides
    const overlayPathSubSelection = pathSubSelection
    const overlayPathSubSelectionHover = pathSubSelectionHover
    const overlayDraftPrimitive = draftPrimitive
    const overlayPenDraftPoints = penDraftPoints
    return function Overlay(
      props: Parameters<typeof InteractionOverlay>[0],
    ) {
      return createElement(InteractionOverlay, {
        ...props,
        hoveredShapeId: overlayHoveredShapeId,
        marqueeBounds: overlayMarquee,
        hideSelectionChrome,
        snapGuides: overlaySnapGuides,
        pathSubSelection: overlayPathSubSelection,
        pathSubSelectionHover: overlayPathSubSelectionHover,
        draftPrimitive: overlayDraftPrimitive,
        penDraftPoints: overlayPenDraftPoints,
        presentation: runtimePresentation,
      })
    }
  }, [
    activeTransformHandle,
    draftPrimitive,
    hoveredShapeId,
    marqueeBounds,
    penDraftPoints,
    pathSubSelection,
    pathSubSelectionHover,
    runtimePresentation,
    snapGuides,
  ])

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

  const reorderSelectedShape = useCallback((direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (!selectedShapeId) {
      return
    }

    const index = canvasRuntime.document.shapes.findIndex((shape) => shape.id === selectedShapeId)
    if (index <= 0) {
      return
    }

    const maxIndex = Math.max(1, canvasRuntime.document.shapes.length - 1)
    let nextIndex = index

    if (direction === 'up') {
      nextIndex = Math.min(maxIndex, index + 1)
    } else if (direction === 'down') {
      nextIndex = Math.max(1, index - 1)
    } else if (direction === 'top') {
      nextIndex = maxIndex
    } else if (direction === 'bottom') {
      nextIndex = 1
    }

    if (nextIndex === index) {
      return
    }

    handleCommand({
      type: 'shape.reorder',
      shapeId: selectedShapeId,
      toIndex: nextIndex,
    })
  }, [canvasRuntime.document.shapes, handleCommand, selectedShapeId])

  const handleZoom = useCallback((zoomIn: boolean, point?: {x: number; y: number}) => {
    const currentScale = canvasRuntime.viewport.scale
    const nextScaleValue = resolveRuntimeZoomPresetScale(currentScale, zoomIn ? 'in' : 'out')

    if (nextScaleValue === null) {
      return
    }

    canvasRuntime.zoomViewport(nextScaleValue, point)
  }, [canvasRuntime])

  const applyAutoMask = useCallback(() => {
    if (!selectedNode || selectedNode.type === 'frame' || selectedNode.type === 'group') {
      add('Select an image or a closed shape to create a mask.', 'info')
      return
    }

    const otherShapes = canvasRuntime.document.shapes.filter((shape) =>
      shape.id !== selectedNode.id &&
      shape.type !== 'frame' &&
      shape.type !== 'group',
    )

    if (selectedNode.type === 'image') {
      const candidates = otherShapes.filter((shape) =>
        isClosedMaskShape(shape) && boundsOverlap(selectedNode, shape),
      )

      if (candidates.length !== 1) {
        add(
          candidates.length === 0
            ? 'No single closed shape overlaps this image.'
            : 'Multiple closed shapes overlap this image. Narrow the target first.',
          'info',
        )
        return
      }

      handleCommand({
        type: 'shape.set-clip',
        shapeId: selectedNode.id,
        clipPathId: candidates[0].id,
        clipRule: 'nonzero',
      })
      add(`Masked with ${candidates[0].name}.`, 'info')
      return
    }

    if (isClosedMaskShape(selectedNode)) {
      const candidates = otherShapes.filter((shape) =>
        shape.type === 'image' && boundsOverlap(selectedNode, shape),
      )

      if (candidates.length !== 1) {
        add(
          candidates.length === 0
            ? 'No single image overlaps this shape.'
            : 'Multiple images overlap this shape. Narrow the target first.',
          'info',
        )
        return
      }

      handleCommand({
        type: 'shape.set-clip',
        shapeId: candidates[0].id,
        clipPathId: selectedNode.id,
        clipRule: 'nonzero',
      })
      add(`Masked ${candidates[0].name} with ${selectedNode.name}.`, 'info')
      return
    }

    add('Only images and closed shapes can participate in masking.', 'info')
  }, [add, canvasRuntime.document.shapes, handleCommand, selectedNode])

  const clearMask = useCallback(() => {
    if (!selectedNode || selectedNode.type !== 'image') {
      add('Select an image to clear its mask.', 'info')
      return
    }

    if (!selectedNode.clipPathId) {
      add('This image does not have an active mask.', 'info')
      return
    }

    handleCommand({
      type: 'shape.set-clip',
      shapeId: selectedNode.id,
      clipPathId: undefined,
      clipRule: undefined,
    })
    add('Image mask cleared.', 'info')
  }, [add, handleCommand, selectedNode])

  const executeAction = useCallback<EditorExecutor>((type, data) => {
    if (type === 'print') {
      setShowPrint(true)
      return
    }

    if (type === 'newFile') {
      startCreateFile()
      return
    }

    if (type === 'closeFile') {
      closeFile()
      return
    }

    if (type === 'saveFile') {
      saveFile(canvasRuntime.document)
      return
    }

    if (type === 'history-undo') {
      handleCommand({type: 'history.undo'})
      return
    }

    if (type === 'history-redo') {
      handleCommand({type: 'history.redo'})
      return
    }

    if (type === 'element-delete') {
      handleCommand({type: 'selection.delete'})
      return
    }

    if (type === 'element-copy') {
      const selectedSet = new Set(selectedShapeIds)
      const copied = canvasRuntime.document.shapes
        .filter((shape) => selectedSet.has(shape.id) && shape.type !== 'frame')
        .map((shape) => cloneElementProps(toElementPropsFromNode(shape)))
      if (copied.length > 0) {
        setClipboard(copied)
        setPasteSerial(0)
      }
      return
    }

    if (type === 'element-cut') {
      const selectedSet = new Set(selectedShapeIds)
      const copied = canvasRuntime.document.shapes
        .filter((shape) => selectedSet.has(shape.id) && shape.type !== 'frame')
        .map((shape) => cloneElementProps(toElementPropsFromNode(shape)))
      if (copied.length > 0) {
        setClipboard(copied)
        setPasteSerial(0)
        handleCommand({type: 'selection.delete'})
      }
      return
    }

    if (type === 'element-duplicate') {
      const selectedSet = new Set(selectedShapeIds)
      const copied = canvasRuntime.document.shapes
        .filter((shape) => selectedSet.has(shape.id) && shape.type !== 'frame')
        .map((shape) => toElementPropsFromNode(shape))
      if (copied.length === 0) {
        return
      }
      insertElementsBatch(copied.map((item) => ({
        ...offsetElementPosition(item, (item.x ?? 0) + 24, (item.y ?? 0) + 24),
        id: nid(),
        name: `${item.name ?? item.type} Copy`,
      })))
      return
    }

    if (type === 'group-nodes' || type === 'groupNodes') {
      handleGroupNodesAction({
        selectedShapeIds,
        shapes: canvasRuntime.document.shapes,
        dispatchCommand: handleCommand,
        notify: (message) => add(message, 'info'),
      })
      return
    }

    if (type === 'ungroup-nodes' || type === 'ungroupNodes') {
      handleUngroupNodesAction({
        selectedShapeIds,
        shapes: canvasRuntime.document.shapes,
        dispatchCommand: handleCommand,
        notify: (message) => add(message, 'info'),
      })
      return
    }

    if (handleShapeActions(type, {
      selectedShapeIds,
      dispatchCommand: handleCommand,
    })) {
      return
    }

    if (type === 'image-mask-with-shape') {
      applyAutoMask()
      return
    }

    if (type === 'image-clear-mask') {
      clearMask()
      return
    }

    if (type === 'element-paste') {
      if (clipboard.length === 0) {
        return
      }

      const position = data && typeof data === 'object' && 'x' in data && 'y' in data
        ? data as {x: number; y: number}
        : null
      const baseOffset = 24 * (pasteSerial + 1)
      const anchor = clipboard[0]
      const anchorX = anchor?.x ?? 0
      const anchorY = anchor?.y ?? 0
      const pasteTargetX = position ? position.x + baseOffset : anchorX + baseOffset
      const pasteTargetY = position ? position.y + baseOffset : anchorY + baseOffset
      const deltaX = pasteTargetX - anchorX
      const deltaY = pasteTargetY - anchorY

      insertElementsBatch(clipboard.map((item) => ({
        ...offsetElementPosition(
          item,
          (item.x ?? 0) + deltaX,
          (item.y ?? 0) + deltaY,
        ),
        id: nid(),
        name: `${item.name ?? item.type} Copy`,
      })))
      setPasteSerial((value) => value + 1)
      return
    }

    if (type === 'selection-all') {
      handleCommand({
        type: 'selection.set',
        shapeIds: canvasRuntime.document.shapes
          .filter((shape) => shape.type !== 'frame')
          .map((shape) => shape.id),
        mode: 'replace',
      })
      return
    }

    if (type === 'element-layer') {
      reorderSelectedShape(String(data ?? 'up') as 'up' | 'down' | 'top' | 'bottom')
      return
    }

    if (type === 'bringForward') {
      reorderSelectedShape('up')
      return
    }

    if (type === 'sendBackward') {
      reorderSelectedShape('down')
      return
    }

    if (type === 'bringToFront') {
      reorderSelectedShape('top')
      return
    }

    if (type === 'sendToBack') {
      reorderSelectedShape('bottom')
      return
    }

    if (type === 'element-move-up' || type === 'element-move-right' || type === 'element-move-down' || type === 'element-move-left') {
      const delta = {
        x: type === 'element-move-right' ? 1 : type === 'element-move-left' ? -1 : 0,
        y: type === 'element-move-down' ? 1 : type === 'element-move-up' ? -1 : 0,
      }

      const selectedSet = new Set(selectedShapeIds)
      const moveTargets = canvasRuntime.document.shapes
        .filter((shape) => selectedSet.has(shape.id) && shape.type !== 'frame')

      const command = createTransformBatchCommand(moveTargets, {
        shapes: moveTargets.map((shape) => ({
          shapeId: shape.id,
          x: shape.x + delta.x,
          y: shape.y + delta.y,
          width: shape.width,
          height: shape.height,
          rotation: shape.rotation ?? 0,
          flipX: shape.flipX ?? false,
          flipY: shape.flipY ?? false,
        })),
      })
      if (!command) {
        return
      }
      handleCommand(command)
      return
    }

    if (type === 'drop-image' && data && typeof data === 'object' && 'position' in data) {
      const viewportPosition = data.position as {x: number; y: number}
      const position = applyMatrixToPoint(canvasRuntime.viewport.inverseMatrix, viewportPosition)
      const asset = Array.isArray((data as {assets?: VisionFileAsset[]}).assets)
        ? (data as {assets?: VisionFileAsset[]}).assets?.[0]
        : null
      const imageRef = asset?.imageRef as {naturalWidth?: number; naturalHeight?: number} | undefined
      const naturalWidth = imageRef?.naturalWidth ?? 160
      const naturalHeight = imageRef?.naturalHeight ?? 120
      const viewportWidth = canvasRuntime.viewport.viewportWidth || 960
      const viewportHeight = canvasRuntime.viewport.viewportHeight || 640
      const maxWidth = viewportWidth * IMAGE_INSERT_VIEWPORT_RATIO
      const maxHeight = viewportHeight * IMAGE_INSERT_VIEWPORT_RATIO
      const scale = Math.min(
        1,
        maxWidth / naturalWidth,
        maxHeight / naturalHeight,
      )
      const width = naturalWidth * scale
      const height = naturalHeight * scale

      if (asset) {
        addAsset(asset)
        add(`Image dropped: ${asset.name}`, 'info')
      }

      insertElement({
        id: nid(),
        type: 'image',
        name: asset?.name ?? 'Image',
        asset: asset?.id,
        assetUrl: asset?.objectUrl,
        x: position.x - width / 2,
        y: position.y - height / 2,
        width,
        height,
        rotation: 0,
        opacity: 1,
      })
      return
    }

    if (type === 'world-shift' && data && typeof data === 'object' && 'x' in data && 'y' in data) {
      canvasRuntime.panViewport(Number(data.x), Number(data.y))
      return
    }

    if (type === 'world-zoom') {
      if (data === 'fit') {
        canvasRuntime.fitViewport()
        return
      }

      if (data && typeof data === 'object' && 'zoomFactor' in data) {
        const point = 'physicalPoint' in data ? data.physicalPoint as {x: number; y: number} | undefined : undefined
        canvasRuntime.zoomViewport(Number(data.zoomFactor), point)
      }
      return
    }

    if (type === 'switch-tool') {
      const toolName = String(data ?? 'selector') as ToolName
      runtimeToolRegistryRef.current.activate(toolName, {
        editingMode: runtimeEditingModeControllerRef.current.getCurrentMode(),
      })
      runtimeEditingModeControllerRef.current.transition({
        to: resolveEditingModeForTool(toolName),
        reason: `switch-tool:${toolName}`,
      })
      if (toolName !== 'dselector') {
        setPathSubSelection(null)
        setPathSubSelectionHover(null)
      }
      setCurrentToolState(toolName)
      handleCommand({
        type: 'tool.select',
        tool: mapToolNameToToolId(toolName),
        toolName,
      })
      return
    }

    if (type === 'selection-modify' && data && typeof data === 'object' && 'idSet' in data) {
      const nextIds = Array.from(data.idSet as Set<string>)
      const mode =
        'mode' in data && typeof data.mode === 'string'
          ? data.mode as 'replace' | 'add' | 'remove' | 'toggle' | 'clear'
          : 'replace'
      handleCommand({
        type: 'selection.set',
        shapeIds: nextIds,
        mode,
      })
      return
    }

    if (type === 'element-modify' && Array.isArray(data) && data[0]) {
      data.forEach((rawPatch) => {
        const patch = rawPatch as {id: string; props?: Partial<ElementProps>}
        const shape = canvasRuntime.document.shapes.find((item) => item.id === patch.id)

        if (!shape || !patch.props) {
          return
        }

        const nextX = typeof patch.props.x === 'number' ? patch.props.x : shape.x
        const nextY = typeof patch.props.y === 'number' ? patch.props.y : shape.y
        const nextWidth = typeof patch.props.width === 'number' ? patch.props.width : shape.width
        const nextHeight = typeof patch.props.height === 'number' ? patch.props.height : shape.height
        const nextRotation = typeof patch.props.rotation === 'number' ? patch.props.rotation : (shape.rotation ?? 0)
        const nextName = typeof patch.props.name === 'string' ? patch.props.name : shape.text ?? shape.name

        if (nextName !== (shape.text ?? shape.name)) {
          handleCommand({
            type: 'shape.rename',
            shapeId: shape.id,
            name: nextName,
            text: shape.type === 'text' ? nextName : shape.text,
          })
        }

        if (nextX !== shape.x || nextY !== shape.y) {
          handleCommand({
            type: 'shape.move',
            shapeId: shape.id,
            x: nextX,
            y: nextY,
          })
        }

        if (nextWidth !== shape.width || nextHeight !== shape.height) {
          handleCommand({
            type: 'shape.resize',
            shapeId: shape.id,
            width: nextWidth,
            height: nextHeight,
          })
        }

        if (nextRotation !== (shape.rotation ?? 0)) {
          handleCommand({
            type: 'shape.rotate',
            shapeId: shape.id,
            rotation: nextRotation,
          })
        }

        const stylePatch: {
          fill?: import('@venus/document-core').DocumentNode['fill']
          stroke?: import('@venus/document-core').DocumentNode['stroke']
          shadow?: import('@venus/document-core').DocumentNode['shadow']
          cornerRadius?: number
          cornerRadii?: import('@venus/document-core').DocumentNode['cornerRadii']
          ellipseStartAngle?: number
          ellipseEndAngle?: number
        } = {}

        if (Object.prototype.hasOwnProperty.call(patch.props, 'fill')) {
          const incoming = patch.props.fill
          stylePatch.fill = incoming && typeof incoming === 'object'
            ? {
                ...(shape.fill ?? {}),
                ...(incoming as Record<string, unknown>),
              }
            : undefined
        }

        if (Object.prototype.hasOwnProperty.call(patch.props, 'stroke')) {
          const incoming = patch.props.stroke
          stylePatch.stroke = incoming && typeof incoming === 'object'
            ? {
                ...(shape.stroke ?? {}),
                ...(incoming as Record<string, unknown>),
              }
            : undefined
        }

        if (Object.prototype.hasOwnProperty.call(patch.props, 'shadow')) {
          const incoming = patch.props.shadow
          stylePatch.shadow = incoming && typeof incoming === 'object'
            ? {
                ...(shape.shadow ?? {}),
                ...(incoming as Record<string, unknown>),
              }
            : undefined
        }

        if (typeof patch.props.cornerRadius === 'number') {
          stylePatch.cornerRadius = patch.props.cornerRadius
        }

        if (Object.prototype.hasOwnProperty.call(patch.props, 'cornerRadii')) {
          const incoming = patch.props.cornerRadii
          stylePatch.cornerRadii = incoming && typeof incoming === 'object'
            ? {
                ...(shape.cornerRadii ?? {}),
                ...(incoming as Record<string, unknown>),
              }
            : undefined
        }

        if (typeof patch.props.ellipseStartAngle === 'number') {
          stylePatch.ellipseStartAngle = patch.props.ellipseStartAngle
        }

        if (typeof patch.props.ellipseEndAngle === 'number') {
          stylePatch.ellipseEndAngle = patch.props.ellipseEndAngle
        }

        if (Object.keys(stylePatch).length > 0) {
          handleCommand({
            type: 'shape.patch',
            shapeId: shape.id,
            patch: stylePatch,
          })
        }
      })
    }
  }, [
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
    reorderSelectedShape,
    saveFile,
    pasteSerial,
    selectedShapeIds,
    startCreateFile,
  ])

  const resolveDraftPrimitiveType = useCallback((toolName: ToolName): DraftPrimitiveType | null => {
    if (!isDragCreateTool(toolName)) {
      return null
    }
    return toolName
  }, [])

  const commitPathHandleUpdate = useCallback((params: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
    point: {x: number; y: number}
  }) => {
    const shape = previewDocument.shapes.find((item) => item.id === params.shapeId)
    if (!shape || shape.type !== 'path' || !Array.isArray(shape.bezierPoints) || shape.bezierPoints.length === 0) {
      return
    }
    const shapeIndex = previewDocument.shapes.findIndex((item) => item.id === shape.id)
    if (shapeIndex < 0) {
      return
    }

    const nextBezierPoints = shape.bezierPoints.map((item, index) => {
      if (index !== params.anchorIndex) {
        return {
          anchor: {...item.anchor},
          cp1: item.cp1 ? {...item.cp1} : item.cp1,
          cp2: item.cp2 ? {...item.cp2} : item.cp2,
        }
      }

      return {
        anchor: {...item.anchor},
        cp1: params.handleType === 'inHandle' ? {x: params.point.x, y: params.point.y} : (item.cp1 ? {...item.cp1} : item.cp1),
        cp2: params.handleType === 'outHandle' ? {x: params.point.x, y: params.point.y} : (item.cp2 ? {...item.cp2} : item.cp2),
      }
    })

    handleCommand({
      type: 'shape.remove',
      shapeId: shape.id,
    })
    handleCommand({
      type: 'shape.insert',
      index: shapeIndex,
      shape: {
        ...shape,
        bezierPoints: nextBezierPoints,
      },
    })
    handleCommand({
      type: 'selection.set',
      shapeIds: [shape.id],
      mode: 'replace',
    })
  }, [handleCommand, previewDocument.shapes])

  const setCurrentTool = useCallback((toolName: ToolName) => {
    runtimeToolRegistryRef.current.activate(toolName, {
      editingMode: runtimeEditingModeControllerRef.current.getCurrentMode(),
    })
    runtimeEditingModeControllerRef.current.transition({
      to: resolveEditingModeForTool(toolName),
      reason: `set-current-tool:${toolName}`,
    })
    setDraftPrimitive(null)
    setPathHandleDrag(null)
    setPenDraftPoints(null)
    executeAction('switch-tool', toolName)
  }, [executeAction])

  const pickHistory = useCallback((historyNode: {id: number}) => {
    const currentCursor = canvasRuntime.history.cursor
    const diff = historyNode.id - currentCursor

    if (diff > 0) {
      for (let index = 0; index < diff; index += 1) {
        handleCommand({type: 'history.redo'})
      }
      return
    }

    if (diff < 0) {
      for (let index = 0; index < Math.abs(diff); index += 1) {
        handleCommand({type: 'history.undo'})
      }
    }
  }, [canvasRuntime.history.cursor, handleCommand])

  const openDroppedFile = useCallback(async (droppedFile: File) => {
    try {
      openFile(await readFileHelper(droppedFile))
    } catch {
      add(t('misc.fileResolveFailed'), 'info')
    }
  }, [add, openFile, t])

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
    showCreateFile,
    showPrint,
  })
  const selectedProps: SelectedElementProps | null = useMemo(() => {
    if (!uiState.selectedProps) {
      return null
    }

    if (!selectedNode || selectedNode.type !== 'image') {
      return uiState.selectedProps
    }

    const asset = file?.assets.find((item) => item.id === selectedNode.assetId)
    const imageRef = asset?.imageRef as {naturalWidth?: number; naturalHeight?: number} | undefined

    return {
      ...uiState.selectedProps,
      schemaMeta: selectedNode.schema
        ? {
            sourceNodeType: selectedNode.schema.sourceNodeType,
            sourceNodeKind: selectedNode.schema.sourceNodeKind,
            sourceFeatureKinds: selectedNode.schema.sourceFeatureKinds?.slice(),
          }
        : uiState.selectedProps.schemaMeta,
      imageMeta: {
        assetId: selectedNode.assetId,
        assetName: asset?.name,
        mimeType: asset?.mimeType,
        naturalWidth: imageRef?.naturalWidth,
        naturalHeight: imageRef?.naturalHeight,
      },
    }
  }, [file?.assets, selectedNode, uiState.selectedProps])

  const documentState: EditorDocumentState = {
    document: canvasRuntime.document,
    file,
    hasFile,
  }

  const runtimeState: EditorRuntimeState = {
    canvas: {
      Renderer: RuntimeRenderer,
      OverlayRenderer: OverlayRenderer,
      document: interactionDocument,
      shapes: previewShapes,
      stats: canvasRuntime.stats,
      viewport: canvasRuntime.viewport,
      ready: canvasRuntime.ready,
      onPointerMove: (point) => {
        worldPointRef.current?.set(point)
        const transformSession = transformManagerRef.current.getSession()
        if (transformSession) {
          setHoveredShapeId(null)
          const preview = transformManagerRef.current.update(point)
          if (preview) {
            const maybeSnapped = resolveSnappedTransformPreview(preview, {
              handle: transformSession.handle,
              snappingEnabled,
              previewDocument: interactionDocument,
            })
            setSnapGuides(maybeSnapped.guides)
            setTransformPreview(maybeSnapped.preview)
          }
          return
        }
        if (marquee) {
          setSnapGuides([])
          setHoveredShapeId(null)
          setMarquee((current) => {
            if (!current) {
              return current
            }
            const nextMarquee = updateMarqueeState(current, point)
            applyMarqueeSelectionWhileMoving(nextMarquee)
            return nextMarquee
          })
          return
        }
        if (pathHandleDrag && currentTool === 'dselector') {
          setPathSubSelectionHover({
            shapeId: pathHandleDrag.shapeId,
            hitType: pathHandleDrag.handleType,
            handlePoint: {
              anchorIndex: pathHandleDrag.anchorIndex,
              handleType: pathHandleDrag.handleType,
              x: point.x,
              y: point.y,
            },
          })
          setSnapGuides([])
          setHoveredShapeId(null)
          return
        }
        if (draftPrimitive) {
          setSnapGuides([])
          setHoveredShapeId(null)
          setDraftPrimitive((current) => {
            if (!current) {
              return current
            }
            const start = current.points[0] ?? point
            return {
              ...current,
              points: [start, point],
              bounds: {
                minX: Math.min(start.x, point.x),
                minY: Math.min(start.y, point.y),
                maxX: Math.max(start.x, point.x),
                maxY: Math.max(start.y, point.y),
              },
            }
          })
          return
        }
        if (currentTool === 'selector' || currentTool === 'dselector') {
          const dragMove = selectionDragControllerRef.current.pointerMove(point, {
            document: interactionDocument,
            shapes: canvasRuntime.shapes,
          })
          if (dragMove.phase === 'pending') {
            setSnapGuides([])
            setHoveredShapeId(null)
            return
          }
          if ((dragMove.phase === 'started' || dragMove.phase === 'dragging') && dragMove.session) {
            setHoveredShapeId(null)
            if (dragMove.phase === 'started') {
              const dragStart = resolveDragStartTransformPayload(dragMove.session, previewShapeById)
              if (dragStart) {
                transformManagerRef.current.start({
                  shapeIds: dragStart.shapeIds,
                  shapes: dragStart.sessionShapes,
                  handle: 'move',
                  pointer: dragStart.pointer,
                  startBounds: dragStart.startBounds,
                })
                setActiveTransformHandle('move')
                runtimeEditingModeControllerRef.current.transition({
                  to: 'dragging',
                  reason: 'selection-drag-start',
                })
                setTransformPreview({
                  shapes: dragStart.previewShapes,
                })
              }
            }

            const preview = transformManagerRef.current.update(point)
            if (preview) {
              const transformSession = transformManagerRef.current.getSession()
              const maybeSnapped = resolveSnappedTransformPreview(preview, {
                handle: transformSession?.handle,
                snappingEnabled,
                previewDocument: interactionDocument,
              })
              setSnapGuides(maybeSnapped.guides)
              setTransformPreview(maybeSnapped.preview)
            }
            return
          }
          setSnapGuides([])
        }
        if (currentTool === 'dselector') {
          const nextPathSubSelectionHover = resolvePathSubSelectionAtPoint(
            interactionDocument,
            previewShapes,
            point,
            {tolerance: 8},
          )
          setPathSubSelectionHover(nextPathSubSelectionHover)
          return
        }
        if (penTool.handlePointerMove(point)) {
          setHoveredShapeId(null)
          setSnapGuides([])
          return
        }
        setSnapGuides([])
        // Keep hover purely in overlay state so pointermove does not mutate
        // runtime scene flags or trigger render invalidation.
        setHoveredShapeId(resolveTopHitShapeId(interactionDocument, canvasRuntime.shapes, point, {
          allowFrameSelection: false,
          tolerance: 6,
          excludeClipBoundImage: true,
          clipTolerance: 1.5,
        }))
      },
      onPointerDown: (point, modifiers) => {
        setHoveredShapeId(null)
        if (currentTool === 'zoomIn' || currentTool === 'zoomOut') {
          runtimeEditingModeControllerRef.current.transition({
            to: 'zooming',
            reason: `pointer-down:${currentTool}`,
          })
          handleZoom(currentTool === 'zoomIn', point)
          return
        }

        if (currentTool === 'selector' || currentTool === 'dselector') {
          if (currentTool === 'dselector') {
            const nextPathSubSelection = resolvePathSubSelectionAtPoint(
              interactionDocument,
              previewShapes,
              point,
              {tolerance: 8},
            )
            if (nextPathSubSelection) {
              if ((nextPathSubSelection.hitType === 'inHandle' || nextPathSubSelection.hitType === 'outHandle') && nextPathSubSelection.handlePoint) {
                setPathHandleDrag({
                  shapeId: nextPathSubSelection.shapeId,
                  anchorIndex: nextPathSubSelection.handlePoint.anchorIndex,
                  handleType: nextPathSubSelection.handlePoint.handleType,
                })
              }
              setPathSubSelection(nextPathSubSelection)
              setPathSubSelectionHover(nextPathSubSelection)
              setSnapGuides([])
              return
            }
          }

          runtimeEditingModeControllerRef.current.transition({
            to: currentTool === 'dselector' ? 'directSelecting' : 'selecting',
            reason: `pointer-down:${currentTool}`,
          })
          const handleTolerance = 6
          const {
            selectedNodes,
            selectedBounds,
            singleSelectedRotation,
            handle,
          } = resolveSelectionHandleHitAtPoint({
            point,
            selectedShapeIds,
            shapeById: previewShapeById,
            selectedBounds: selectionState.selectedBounds,
            handleTolerance,
          })

          if (handle && selectedBounds && selectedNodes.length > 0) {
            const resizeTargets = handle.kind === 'rotate'
              ? selectedNodes
              : collectResizeTransformTargets(selectedNodes, interactionDocument)
            selectionDragControllerRef.current.clear()
            transformManagerRef.current.start({
              shapeIds: selectedNodes.map((shape) => shape.id),
              shapes: resizeTargets.map((shape) => createTransformSessionShape(shape)),
              handle: handle.kind,
              pointer: point,
              startBounds: selectedBounds,
            })
            setActiveTransformHandle(handle.kind)
            runtimeEditingModeControllerRef.current.transition({
              to: handle.kind === 'rotate' ? 'rotating' : 'resizing',
              reason: `transform-handle:${handle.kind}`,
            })
            setTransformPreview({
              shapes: resizeTargets.map((shape) => createTransformPreviewShape(shape)),
            })
            setSnapGuides([])
            return
          }

          if (shouldClearSelectionOnPointerDown(point, {
            selectedBounds,
            selectedNodes,
            singleSelectedRotation,
            shapeById: previewShapeById,
            tolerance: handleTolerance,
          })) {
            selectionDragControllerRef.current.clear()
            handleCommand({
              type: 'selection.set',
              shapeIds: [],
              mode: 'replace',
            })
            return
          }

          const hoveredShape = hoveredShapeId
            ? runtimeShapeById.get(hoveredShapeId) ?? null
            : null
          const hasHit = selectionDragControllerRef.current.pointerDown(point, {
            document: interactionDocument,
            shapes: canvasRuntime.shapes,
          }, modifiers, {
            hitShapeId: hoveredShape?.id ?? null,
            preferGroupSelection: currentTool === 'selector' && !(modifiers?.metaKey || modifiers?.ctrlKey),
          })

          if (hasHit) {
            setSnapGuides([])
            const preserveGroupDragSelection = shouldPreserveGroupDragSelection({
              modifiers,
              hoveredShapeId: hoveredShape?.id ?? null,
              selectedNodes,
              shapeById: previewShapeById,
            })

            if (!preserveGroupDragSelection) {
              defaultCanvasInteractions.onPointerDown(point, modifiers)
            }
            return
          }

          selectionDragControllerRef.current.clear()
          setSnapGuides([])
          const marqueeMode: MarqueeSelectionMode = modifiers?.shiftKey
            ? 'add'
            : modifiers?.altKey
              ? 'remove'
            : (modifiers?.metaKey || modifiers?.ctrlKey)
              ? 'toggle'
              : 'replace'
          setHoveredShapeId(null)
          marqueeApplyControllerRef.current.reset()
          setMarquee(createMarqueeState(point, marqueeMode, {
            applyMode: DEFAULT_MARQUEE_APPLY_MODE,
          }))
          runtimeEditingModeControllerRef.current.transition({
            to: 'marqueeSelecting',
            reason: 'marquee-start',
          })
          return
        }

        const draftPrimitiveType = resolveDraftPrimitiveType(currentTool)
        if (draftPrimitiveType) {
          setSnapGuides([])
          setPathSubSelectionHover(null)
          runtimeEditingModeControllerRef.current.transition({
            to: 'insertingShape',
            reason: `draft-shape:${currentTool}`,
          })
          setDraftPrimitive({
            id: nid(),
            type: draftPrimitiveType,
            points: [point, point],
            bounds: {
              minX: point.x,
              minY: point.y,
              maxX: point.x,
              maxY: point.y,
            },
          })
          return
        }

        const shapeFromTool = createShapeElementFromTool(currentTool, point)
        if (shapeFromTool) {
          setSnapGuides([])
          runtimeEditingModeControllerRef.current.transition({
            to: 'insertingShape',
            reason: `insert-shape:${currentTool}`,
          })
          insertElement(shapeFromTool)
          return
        }

        if (penTool.handlePointerDown(point)) {
          selectionDragControllerRef.current.clear()
          setSnapGuides([])
          runtimeEditingModeControllerRef.current.transition({
            to: currentTool === 'path' ? 'drawingPath' : 'drawingPencil',
            reason: `draw-start:${currentTool}`,
          })
          return
        }

        selectionDragControllerRef.current.clear()
        setSnapGuides([])
        defaultCanvasInteractions.onPointerDown(point, modifiers)
      },
      onPointerUp: () => {
        setHoveredShapeId(null)
        runtimeEditingModeControllerRef.current.transition({
          to: 'idle',
          reason: 'pointer-up',
        })
        if (draftPrimitive) {
          const start = draftPrimitive.points[0]
          const end = draftPrimitive.points[draftPrimitive.points.length - 1] ?? start
          const dragDistance = start ? Math.hypot(end.x - start.x, end.y - start.y) : 0
          const nextShape = start
            ? dragDistance < 4
              ? createShapeElementFromTool(currentTool, start)
              : createShapeElementFromDrag(currentTool, start, end)
            : null

          setDraftPrimitive(null)
          setSnapGuides([])

          if (nextShape) {
            insertElement(nextShape)
          }
          return
        }
        if (pathHandleDrag) {
          const activePoint = pathSubSelectionHover?.handlePoint ?? pathSubSelection?.handlePoint
          if (activePoint) {
            commitPathHandleUpdate({
              shapeId: pathHandleDrag.shapeId,
              anchorIndex: pathHandleDrag.anchorIndex,
              handleType: pathHandleDrag.handleType,
              point: {x: activePoint.x, y: activePoint.y},
            })
          }
          setPathHandleDrag(null)
          setPathSubSelectionHover(null)
          return
        }
        selectionDragControllerRef.current.pointerUp()
        setSnapGuides([])
        setActiveTransformHandle(null)
        const pointerUpTransform = resolvePointerUpTransformCommit(
          transformManagerRef.current.commit(),
          transformPreview,
          canvasRuntime.document.shapes,
        )
        if (pointerUpTransform) {
          if (pointerUpTransform.selectionShapeIds.length > 0) {
            handleCommand({
              type: 'selection.set',
              shapeIds: pointerUpTransform.selectionShapeIds,
              mode: 'replace',
            })
          }

          if (pointerUpTransform.transformCommand) {
            // Commit all drag/resize/rotate transforms as one command so
            // undo/redo stays atomic for both single and multi selection.
            handleCommand(pointerUpTransform.transformCommand)
            markTransformPreviewCommitPending()
          } else {
            clearTransformPreview()
          }
          return
        }

        const pointerUpMarquee = resolvePointerUpMarqueeSelection(marquee, interactionDocument.shapes, {
          matchMode: 'contain',
          excludeShape: (shape) => shape.type === 'frame',
        })
        if (pointerUpMarquee) {
          handleCommand({
            type: 'selection.set',
            shapeIds: pointerUpMarquee.shapeIds,
            mode: pointerUpMarquee.mode,
          })
          marqueeApplyControllerRef.current.reset()
          add(`Selection: ${formatSelectionNames(interactionDocument, pointerUpMarquee.shapeIds)}`, 'info')
          setMarquee(null)
          return
        }

        penTool.handlePointerUp()
      },
      onPointerLeave: () => {
        runtimeEditingModeControllerRef.current.transition({
          to: 'idle',
          reason: 'pointer-leave',
        })
        transformManagerRef.current.cancel()
        clearTransformPreview()
        setSnapGuides([])
        setActiveTransformHandle(null)
        selectionDragControllerRef.current.clear()
        setMarquee(null)
        marqueeApplyControllerRef.current.reset()
        penTool.clearDraft()
        setPenDraftPoints(null)
        setPathHandleDrag(null)
        setDraftPrimitive(null)
        setHoveredShapeId(null)
        setPathSubSelectionHover(null)
      },
      onViewportChange: defaultCanvasInteractions.onViewportChange,
      onViewportPan: defaultCanvasInteractions.onViewportPan,
      onViewportResize: defaultCanvasInteractions.onViewportResize,
      onViewportZoom: defaultCanvasInteractions.onViewportZoom,
      onContextMenu: defaultCanvasInteractions.onContextMenu,
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
    handleCreating,
    startCreateFile,
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
    creating,
    showCreateFile,
    showPrint,
    setShowPrint,
    contextRootRef,
    worldPointRef,
    editorRef,
    executeAction,
    saveFile: commands.saveFile,
    createFile,
    handleCreating,
    startCreateFile,
    setCurrentTool,
    pickHistory,
    openDroppedFile,
    canvas: runtimeState.canvas,
  }
}

export default useEditorRuntime
