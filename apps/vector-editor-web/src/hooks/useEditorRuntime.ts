import {createElement, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useNotification} from '@lite-u/ui'
import {nid, type ToolName} from '@venus/document-core'
import {
  createMarqueeState,
  createSelectionDragController,
  resolveMarqueeBounds,
  resolveMarqueeSelection,
  updateMarqueeState,
  useTransformPreviewCommitState,
  useCanvasRuntime,
  type MarqueeSelectionMode,
} from '@venus/canvas-base'
import {Canvas2DRenderer} from '@venus/renderer-canvas'
import type {ElementProps} from '@lite-u/editor/types'
import {useTranslation} from 'react-i18next'
import {PointRef} from '../components/statusBar/StatusBar.tsx'
import useFocus from './useFocus.tsx'
import useShortcut from './useShortcut.tsx'
import ZOOM_LEVELS from '../constants/zoomLevels.ts'
import {createDocumentNodeFromElement} from '../adapters/fileDocument.ts'
import readFileHelper from '../contexts/fileContext/readFileHelper.ts'
import {
  applyMatrixToPoint,
  cloneElementProps,
  createShapeElementFromTool,
  mapToolNameToToolId,
  offsetElementPosition,
} from './editorRuntimeHelpers.ts'
import {
  buildSelectionHandles,
  buildSelectionState,
  createTransformSessionManager,
  InteractionOverlay,
} from '../interaction/index.ts'
import type {HandleKind} from '../interaction/index.ts'
import type {InteractionBounds, TransformPreview} from '../interaction/index.ts'
import {deriveEditorUIState} from './deriveEditorUIState.ts'
import {useEditorDocument} from './useEditorDocument.ts'
import {usePenTool} from './usePenTool.ts'
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
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  )
}

function remapPoint(
  point: {x: number; y: number},
  source: {x: number; y: number; width: number; height: number},
  target: {x: number; y: number; width: number; height: number},
) {
  const scaleX = source.width === 0 ? 1 : target.width / source.width
  const scaleY = source.height === 0 ? 1 : target.height / source.height
  return {
    x: target.x + (point.x - source.x) * scaleX,
    y: target.y + (point.y - source.y) * scaleY,
  }
}

function applyPreviewGeometryToShape(
  shape: import('@venus/document-core').DocumentNode,
  preview: {x: number; y: number; width: number; height: number; rotation?: number},
) {
  const source = {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  }
  const target = {
    x: preview.x,
    y: preview.y,
    width: preview.width,
    height: preview.height,
  }

  return {
    ...shape,
    x: preview.x,
    y: preview.y,
    width: preview.width,
    height: preview.height,
    rotation: typeof preview.rotation === 'number' ? preview.rotation : shape.rotation,
    points:
      (shape.type === 'path' || shape.type === 'polygon' || shape.type === 'star') && shape.points
        ? shape.points.map((point) => remapPoint(point, source, target))
        : shape.points,
    bezierPoints:
      shape.type === 'path' && shape.bezierPoints
        ? shape.bezierPoints.map((point) => ({
            anchor: remapPoint(point.anchor, source, target),
            cp1: point.cp1 ? remapPoint(point.cp1, source, target) : point.cp1,
            cp2: point.cp2 ? remapPoint(point.cp2, source, target) : point.cp2,
          }))
        : shape.bezierPoints,
  }
}

function buildTransformPreviewMap(
  document: import('@venus/document-core').EditorDocument,
  preview: TransformPreview,
  runtimeShapes?: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    rotation?: number
  }>,
) {
  const previewById = new Map(
    preview.shapes.map((shape) => [shape.shapeId, shape] as const),
  )
  const childrenByParent = new Map<string, string[]>()
  const imagesByClipId = new Map<string, string[]>()
  const runtimeShapeById = new Map((runtimeShapes ?? []).map((shape) => [shape.id, shape]))

  document.shapes.forEach((shape) => {
    if (!shape.parentId) {
      if (shape.type === 'image' && shape.clipPathId) {
        const boundImages = imagesByClipId.get(shape.clipPathId) ?? []
        boundImages.push(shape.id)
        imagesByClipId.set(shape.clipPathId, boundImages)
      }
      return
    }
    const siblings = childrenByParent.get(shape.parentId) ?? []
    siblings.push(shape.id)
    childrenByParent.set(shape.parentId, siblings)
    if (shape.type === 'image' && shape.clipPathId) {
      const boundImages = imagesByClipId.get(shape.clipPathId) ?? []
      boundImages.push(shape.id)
      imagesByClipId.set(shape.clipPathId, boundImages)
    }
  })

  for (const previewShape of preview.shapes) {
    const source = document.shapes.find((shape) => shape.id === previewShape.shapeId)
    if (!source || source.type !== 'group') {
      continue
    }

    const deltaX = previewShape.x - source.x
    const deltaY = previewShape.y - source.y
    if (Math.abs(deltaX) <= 0.0001 && Math.abs(deltaY) <= 0.0001) {
      continue
    }

    const queue = [...(childrenByParent.get(source.id) ?? [])]
    while (queue.length > 0) {
      const childId = queue.shift()!
      const child = document.shapes.find((shape) => shape.id === childId)
      if (!child) {
        continue
      }
      if (!previewById.has(child.id)) {
        previewById.set(child.id, {
          shapeId: child.id,
          x: child.x + deltaX,
          y: child.y + deltaY,
          width: child.width,
          height: child.height,
          rotation: child.rotation,
        })
      }
      const nested = childrenByParent.get(child.id)
      if (nested && nested.length > 0) {
        queue.push(...nested)
      }
    }
  }

  // Mask-drag preview should move clipped images in real time.
  // Commit-time linkage is handled in worker; this keeps UI preview consistent.
  for (const previewShape of preview.shapes) {
    const source = document.shapes.find((shape) => shape.id === previewShape.shapeId)
    if (!source) {
      continue
    }
    const deltaX = previewShape.x - source.x
    const deltaY = previewShape.y - source.y
    if (Math.abs(deltaX) <= 0.0001 && Math.abs(deltaY) <= 0.0001) {
      continue
    }

    const imageIds = imagesByClipId.get(source.id) ?? []
    imageIds.forEach((imageId) => {
      if (previewById.has(imageId)) {
        return
      }
      const image = document.shapes.find((shape) => shape.id === imageId)
      if (!image) {
        return
      }
      const runtimeShape = runtimeShapeById.get(image.id)
      previewById.set(image.id, {
        shapeId: image.id,
        x: (runtimeShape?.x ?? image.x) + deltaX,
        y: (runtimeShape?.y ?? image.y) + deltaY,
        width: runtimeShape?.width ?? image.width,
        height: runtimeShape?.height ?? image.height,
        rotation: runtimeShape?.rotation ?? image.rotation,
      })
    })
  }

  return previewById
}

function isPointInBounds(
  point: {x: number; y: number},
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
) {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  )
}

function pickHandleAtPoint(
  point: {x: number; y: number},
  handles: Array<{kind: HandleKind; x: number; y: number}>,
  tolerance: number,
) {
  for (const handle of handles) {
    if (Math.hypot(handle.x - point.x, handle.y - point.y) <= tolerance) {
      return handle
    }
  }

  return null
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
  const [clipboard, setClipboard] = useState<ElementProps[]>([])
  const [pasteSerial, setPasteSerial] = useState(0)
  const [activeTransformHandle, setActiveTransformHandle] = useState<HandleKind | null>(null)
  const [marquee, setMarquee] = useState<{
    start: {x: number; y: number}
    current: {x: number; y: number}
    mode: MarqueeSelectionMode
  } | null>(null)
  const contextRootRef = useRef<HTMLDivElement>(null)
  const worldPointRef = useRef<PointRef | null>(null)
  const editorRef = useRef<{ printOut?: (ctx: CanvasRenderingContext2D) => void } | null>(null)
  const transformManagerRef = useRef(createTransformSessionManager())
  const selectionDragControllerRef = useRef(createSelectionDragController({
    allowFrameSelection: false,
  }))
  const createWorker = useCallback(
    () => new Worker(new URL('../editor.worker.ts', import.meta.url), {type: 'module'}),
    [],
  )
  // Keep runtime boot options referentially stable so viewport updates do not
  // accidentally recreate the controller layer.
  const runtimeOptions = useMemo(() => ({
    capacity: Math.max(SCENE_CAPACITY, document.shapes.length + 8),
    createWorker,
    document,
    allowFrameSelection: false,
  }), [createWorker, document])
  const canvasRuntime = useCanvasRuntime(runtimeOptions)
  const {
    preview: transformPreview,
    setPreview: setTransformPreview,
    clearPreview: clearTransformPreview,
    markCommitPending: markTransformPreviewCommitPending,
  } = useTransformPreviewCommitState<TransformPreview['shapes'][number]>({
    documentShapes: canvasRuntime.document.shapes,
  })
  const {add} = useNotification()
  const {t} = useTranslation()
  const selectedShape = canvasRuntime.stats.selectedIndex >= 0
    ? canvasRuntime.shapes[canvasRuntime.stats.selectedIndex] ?? null
    : null
  const selectedShapeIds = useMemo(
    () => canvasRuntime.shapes.filter((shape) => shape.isSelected).map((shape) => shape.id),
    [canvasRuntime.shapes],
  )
  const selectedNode = selectedShape
    ? canvasRuntime.document.shapes.find((shape) => shape.id === selectedShape.id) ?? null
    : null
  const selectedShapeId = selectedShape?.id ?? null
  const previewDocument = useMemo(() => {
    if (!transformPreview) {
      return canvasRuntime.document
    }
    const previewById = buildTransformPreviewMap(canvasRuntime.document, transformPreview, canvasRuntime.shapes)

    return {
      ...canvasRuntime.document,
      shapes: canvasRuntime.document.shapes.map((shape) =>
        previewById.has(shape.id)
          ? applyPreviewGeometryToShape(shape, {
              x: previewById.get(shape.id)?.x ?? shape.x,
              y: previewById.get(shape.id)?.y ?? shape.y,
              width: previewById.get(shape.id)?.width ?? shape.width,
              height: previewById.get(shape.id)?.height ?? shape.height,
              rotation: previewById.get(shape.id)?.rotation,
            })
          : shape,
      ),
    }
  }, [canvasRuntime.document, transformPreview])
  const previewShapes = useMemo(() => {
    if (!transformPreview) {
      return canvasRuntime.shapes
    }

    const previewById = buildTransformPreviewMap(canvasRuntime.document, transformPreview, canvasRuntime.shapes)

    return canvasRuntime.shapes.map((shape) => (
      previewById.has(shape.id)
        ? {
            ...shape,
            x: previewById.get(shape.id)?.x ?? shape.x,
            y: previewById.get(shape.id)?.y ?? shape.y,
            width: previewById.get(shape.id)?.width ?? shape.width,
            height: previewById.get(shape.id)?.height ?? shape.height,
            rotation: previewById.get(shape.id)?.rotation ?? shape.rotation,
          }
        : shape
    ))
  }, [canvasRuntime.shapes, transformPreview])

  const selectionState = useMemo(
    () => buildSelectionState(previewDocument, previewShapes),
    [previewDocument, previewShapes],
  )
  const marqueeBounds = useMemo<InteractionBounds | null>(() => {
    if (!marquee) {
      return null
    }
    return resolveMarqueeBounds(marquee)
  }, [marquee])
  const OverlayRenderer = useMemo(() => {
    const overlayMarquee = marqueeBounds
    const hideSelectionChrome = activeTransformHandle === 'move' || activeTransformHandle === 'rotate'
    return function Overlay(
      props: Parameters<typeof InteractionOverlay>[0],
    ) {
      return createElement(InteractionOverlay, {
        ...props,
        marqueeBounds: overlayMarquee,
        hideSelectionChrome,
      })
    }
  }, [activeTransformHandle, marqueeBounds])

  const handleCommand = useCallback((command: import('@venus/editor-worker').EditorRuntimeCommand) => {
    if (command.type === 'history.undo' || command.type === 'history.redo') {
      clearTransformPreview()
      transformManagerRef.current.cancel()
      selectionDragControllerRef.current.clear()
      setActiveTransformHandle(null)
      setMarquee(null)
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
    const filtered = ZOOM_LEVELS.filter((zoomLevel) => typeof zoomLevel.value === 'number')
    const currentScale = canvasRuntime.viewport.scale
    const nextScale = zoomIn
      ? [...filtered].reverse().find((zoomLevel) => zoomLevel.value > currentScale)
      : filtered.find((zoomLevel) => zoomLevel.value < currentScale)

    if (!nextScale) {
      return
    }

    canvasRuntime.zoomViewport(nextScale.value, point)
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
        .map((shape) => ({
          id: shape.id,
          from: {
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            rotation: shape.rotation ?? 0,
          },
          to: {
            x: shape.x + delta.x,
            y: shape.y + delta.y,
            width: shape.width,
            height: shape.height,
            rotation: shape.rotation ?? 0,
          },
        }))

      if (moveTargets.length === 0) {
        return
      }

      handleCommand({
        type: 'shape.transform.batch',
        transforms: moveTargets,
      })
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
      setCurrentToolState(toolName)
      handleCommand({
        type: 'tool.select',
        tool: mapToolNameToToolId(toolName),
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
      const patch = data[0] as {id: string; props?: Partial<ElementProps>}
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
    }
  }, [
    add,
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
    selectedNode,
    selectedShapeIds,
    selectedShape,
    startCreateFile,
  ])

  const setCurrentTool = useCallback((toolName: ToolName) => {
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
      Renderer: Canvas2DRenderer,
      OverlayRenderer: OverlayRenderer,
      document: previewDocument,
      shapes: previewShapes,
      stats: canvasRuntime.stats,
      viewport: canvasRuntime.viewport,
      ready: canvasRuntime.ready,
      onPointerMove: (point) => {
        worldPointRef.current?.set(point)
        const transformSession = transformManagerRef.current.getSession()
        if (transformSession) {
          canvasRuntime.clearHover()
          const preview = transformManagerRef.current.update(point)
          if (preview) {
            setTransformPreview(preview)
          }
          return
        }
        if (marquee) {
          canvasRuntime.clearHover()
          setMarquee((current) => (current ? updateMarqueeState(current, point) : current))
          return
        }
        if (currentTool === 'selector' || currentTool === 'dselector') {
          const dragMove = selectionDragControllerRef.current.pointerMove(point, {
            document: previewDocument,
            shapes: canvasRuntime.shapes,
          })
          if (dragMove.phase === 'pending') {
            canvasRuntime.clearHover()
            return
          }
          if ((dragMove.phase === 'started' || dragMove.phase === 'dragging') && dragMove.session) {
            canvasRuntime.clearHover()
            if (dragMove.phase === 'started') {
              const dragShapeIds = dragMove.session.shapes.map((shape) => shape.shapeId)
              const dragShapes = dragShapeIds
                .map((id) => previewDocument.shapes.find((shape) => shape.id === id))
                .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape))

              if (dragShapes.length > 0) {
                transformManagerRef.current.start({
                  shapeIds: dragShapes.map((shape) => shape.id),
                  shapes: dragShapes.map((shape) => ({
                    shapeId: shape.id,
                    x: shape.x,
                    y: shape.y,
                    width: Math.max(1, shape.width),
                    height: Math.max(1, shape.height),
                    rotation: shape.rotation ?? 0,
                    centerX: shape.x + shape.width / 2,
                    centerY: shape.y + shape.height / 2,
                  })),
                  handle: 'move',
                  pointer: dragMove.session.start,
                  startBounds: dragMove.session.bounds,
                })
                setActiveTransformHandle('move')
                setTransformPreview({
                  shapes: dragShapes.map((shape) => ({
                    shapeId: shape.id,
                    x: shape.x,
                    y: shape.y,
                    width: Math.max(1, shape.width),
                    height: Math.max(1, shape.height),
                    rotation: shape.rotation ?? 0,
                  })),
                })
              }
            }

            const preview = transformManagerRef.current.update(point)
            if (preview) {
              setTransformPreview(preview)
            }
            return
          }
        }
        if (penTool.handlePointerMove(point)) {
          return
        }
        canvasRuntime.postPointer('pointermove', point)
      },
      onPointerDown: (point, modifiers) => {
        if (currentTool === 'zoomIn' || currentTool === 'zoomOut') {
          handleZoom(currentTool === 'zoomIn', point)
          return
        }

        if (currentTool === 'selector' || currentTool === 'dselector') {
          const selectedNodes = selectedShapeIds
            .map((id) => previewDocument.shapes.find((shape) => shape.id === id))
            .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape))
          const selectedBounds = selectionState.selectedBounds
          const singleSelectedRotation = selectedNodes.length === 1
            ? (selectedNodes[0].rotation ?? 0)
            : 0
          const handles = buildSelectionHandles({
            selectedIds: selectionState.selectedIds,
            hoverId: null,
            selectedBounds,
          }, {
            rotateOffset: 28,
            rotateDegrees: singleSelectedRotation,
          })
          const handleTolerance = 6
          const handle = pickHandleAtPoint(point, handles, handleTolerance)

          if (handle && selectedBounds && selectedNodes.length > 0) {
            selectionDragControllerRef.current.clear()
            transformManagerRef.current.start({
              shapeIds: selectedNodes.map((shape) => shape.id),
              shapes: selectedNodes.map((shape) => ({
                shapeId: shape.id,
                x: shape.x,
                y: shape.y,
                width: Math.max(1, shape.width),
                height: Math.max(1, shape.height),
                rotation: shape.rotation ?? 0,
                centerX: shape.x + shape.width / 2,
                centerY: shape.y + shape.height / 2,
              })),
              handle: handle.kind,
              pointer: point,
              startBounds: selectedBounds,
            })
            setActiveTransformHandle(handle.kind)
            setTransformPreview({
              shapes: selectedNodes.map((shape) => ({
                shapeId: shape.id,
                x: shape.x,
                y: shape.y,
                width: Math.max(1, shape.width),
                height: Math.max(1, shape.height),
                rotation: shape.rotation ?? 0,
              })),
            })
            return
          }

          if (selectedBounds && selectedNodes.length > 0 && isPointInBounds(point, selectedBounds)) {
            selectionDragControllerRef.current.clear()
            transformManagerRef.current.start({
              shapeIds: selectedNodes.map((shape) => shape.id),
              shapes: selectedNodes.map((shape) => ({
                shapeId: shape.id,
                x: shape.x,
                y: shape.y,
                width: Math.max(1, shape.width),
                height: Math.max(1, shape.height),
                rotation: shape.rotation ?? 0,
                centerX: shape.x + shape.width / 2,
                centerY: shape.y + shape.height / 2,
              })),
              handle: 'move',
              pointer: point,
              startBounds: selectedBounds,
            })
            setActiveTransformHandle('move')
            setTransformPreview({
              shapes: selectedNodes.map((shape) => ({
                shapeId: shape.id,
                x: shape.x,
                y: shape.y,
                width: Math.max(1, shape.width),
                height: Math.max(1, shape.height),
                rotation: shape.rotation ?? 0,
              })),
            })
            return
          }

          const hoveredShape = canvasRuntime.stats.hoveredIndex >= 0
            ? canvasRuntime.shapes[canvasRuntime.stats.hoveredIndex] ?? null
            : null
          const hasHit = selectionDragControllerRef.current.pointerDown(point, {
            document: previewDocument,
            shapes: canvasRuntime.shapes,
          }, modifiers, {
            hitShapeId: hoveredShape?.id ?? null,
          })

          if (hasHit) {
            canvasRuntime.postPointer('pointerdown', point, modifiers)
            return
          }

          selectionDragControllerRef.current.clear()
          const marqueeMode: MarqueeSelectionMode = modifiers?.shiftKey
            ? 'add'
            : (modifiers?.metaKey || modifiers?.ctrlKey)
              ? 'toggle'
              : 'replace'
          canvasRuntime.clearHover()
          setMarquee(createMarqueeState(point, marqueeMode))
          return
        }

        const shapeFromTool = createShapeElementFromTool(currentTool, point)
        if (shapeFromTool) {
          insertElement(shapeFromTool)
          return
        }

        if (penTool.handlePointerDown(point)) {
          selectionDragControllerRef.current.clear()
          return
        }

        selectionDragControllerRef.current.clear()
        canvasRuntime.postPointer('pointerdown', point, modifiers)
      },
      onPointerUp: () => {
        selectionDragControllerRef.current.pointerUp()
        setActiveTransformHandle(null)
        const transformSession = transformManagerRef.current.commit()
        if (transformSession) {
          if (transformSession.shapeIds.length > 0) {
            handleCommand({
              type: 'selection.set',
              shapeIds: transformSession.shapeIds,
              mode: 'replace',
            })
          }
          const preview = transformPreview

          if (preview) {
            const transformBatch: Array<{
              id: string
              from: {
                x: number
                y: number
                width: number
                height: number
                rotation: number
              }
              to: {
                x: number
                y: number
                width: number
                height: number
                rotation: number
              }
            }> = []
            preview.shapes.forEach((item) => {
              const shape = canvasRuntime.document.shapes.find((candidate) => candidate.id === item.shapeId)
              if (!shape) {
                return
              }
              const nextRotation = typeof item.rotation === 'number' ? item.rotation : (shape.rotation ?? 0)
              const changed =
                shape.x !== item.x ||
                shape.y !== item.y ||
                shape.width !== item.width ||
                shape.height !== item.height ||
                (shape.rotation ?? 0) !== nextRotation
              if (!changed) {
                return
              }

              transformBatch.push({
                id: shape.id,
                from: {
                  x: shape.x,
                  y: shape.y,
                  width: shape.width,
                  height: shape.height,
                  rotation: shape.rotation ?? 0,
                },
                to: {
                  x: item.x,
                  y: item.y,
                  width: item.width,
                  height: item.height,
                  rotation: nextRotation,
                },
              })
            })

            if (transformBatch.length > 0) {
              // Commit all drag/resize/rotate transforms as one command so
              // undo/redo stays atomic for both single and multi selection.
              handleCommand({
                type: 'shape.transform.batch',
                transforms: transformBatch,
              })
              markTransformPreviewCommitPending()
            } else {
              clearTransformPreview()
            }
          } else {
            clearTransformPreview()
          }
          return
        }

        if (marquee) {
          const bounds = resolveMarqueeBounds(marquee)
          const selectedIds = resolveMarqueeSelection(previewDocument.shapes, bounds, {
            excludeShape: (shape) => shape.type === 'frame',
          })

          handleCommand({
            type: 'selection.set',
            shapeIds: selectedIds,
            mode: marquee.mode,
          })
          setMarquee(null)
          return
        }

        penTool.handlePointerUp()
      },
      onPointerLeave: () => {
        transformManagerRef.current.cancel()
        clearTransformPreview()
        setActiveTransformHandle(null)
        selectionDragControllerRef.current.clear()
        setMarquee(null)
        penTool.clearDraft()
        canvasRuntime.clearHover()
      },
      onViewportChange: canvasRuntime.setViewport,
      onViewportPan: canvasRuntime.panViewport,
      onViewportResize: canvasRuntime.resizeViewport,
      onViewportZoom: (nextScale, anchor) => {
        canvasRuntime.zoomViewport(nextScale, anchor)
      },
      onContextMenu: (position) => {
        onContextMenu?.(applyMatrixToPoint(canvasRuntime.viewport.inverseMatrix, position))
      },
    },
    currentTool,
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
