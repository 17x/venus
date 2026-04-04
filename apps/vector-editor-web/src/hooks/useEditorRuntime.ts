import {useCallback, useMemo, useRef, useState} from 'react'
import {useNotification} from '@lite-u/ui'
import {nid, type ToolName} from '@venus/document-core'
import {useCanvasRuntime} from '@venus/canvas-base'
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
  mapToolNameToToolId,
  offsetElementPosition,
} from './editorRuntimeHelpers.ts'
import {deriveEditorUIState} from './deriveEditorUIState.ts'
import {useEditorDocument} from './useEditorDocument.ts'
import {usePenTool} from './usePenTool.ts'
import type {
  EditorDocumentState,
  EditorExecutor,
  EditorRuntimeCommands,
  EditorRuntimeRefs,
  EditorRuntimeState,
  VisionFileAsset,
} from './useEditorRuntime.types.ts'

function toElementPropsFromNode(selectedNode: import('@venus/document-core').DocumentNode): ElementProps {
  return {
    id: selectedNode.id,
    type: selectedNode.type,
    name: selectedNode.text ?? selectedNode.name,
    asset: selectedNode.assetId,
    assetUrl: selectedNode.assetUrl,
    x: selectedNode.x,
    y: selectedNode.y,
    width: selectedNode.width,
    height: selectedNode.height,
    points: selectedNode.points?.map((point) => ({...point})),
    bezierPoints: selectedNode.bezierPoints?.map((point) => ({
      anchor: {...point.anchor},
      cp1: point.cp1 ? {...point.cp1} : point.cp1,
      cp2: point.cp2 ? {...point.cp2} : point.cp2,
    })),
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
  const contextRootRef = useRef<HTMLDivElement>(null)
  const worldPointRef = useRef<PointRef | null>(null)
  const editorRef = useRef<{ printOut?: (ctx: CanvasRenderingContext2D) => void } | null>(null)
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
  }), [createWorker, document])
  const canvasRuntime = useCanvasRuntime(runtimeOptions)
  const {add} = useNotification()
  const {t} = useTranslation()
  const selectedShape = canvasRuntime.stats.selectedIndex >= 0
    ? canvasRuntime.shapes[canvasRuntime.stats.selectedIndex] ?? null
    : null
  const selectedNode = selectedShape
    ? canvasRuntime.document.shapes.find((shape) => shape.id === selectedShape.id) ?? null
    : null
  const selectedShapeId = selectedShape?.id ?? null

  const handleCommand = useCallback((command: import('@venus/editor-worker').EditorRuntimeCommand) => {
    canvasRuntime.dispatchCommand(command)
  }, [canvasRuntime])

  const insertElement = useCallback((element: ElementProps) => {
    handleCommand({
      type: 'shape.insert',
      shape: createDocumentNodeFromElement(element),
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
      if (selectedNode && selectedNode.type !== 'frame') {
        setClipboard([cloneElementProps(toElementPropsFromNode(selectedNode))])
        setPasteSerial(0)
      }
      return
    }

    if (type === 'element-cut') {
      if (selectedNode && selectedNode.type !== 'frame') {
        setClipboard([cloneElementProps(toElementPropsFromNode(selectedNode))])
        setPasteSerial(0)
        handleCommand({type: 'selection.delete'})
      }
      return
    }

    if (type === 'element-duplicate') {
      if (!selectedNode || selectedNode.type === 'frame') {
        return
      }

      insertElement({
        ...offsetElementPosition(
          toElementPropsFromNode(selectedNode),
          selectedNode.x + 24,
          selectedNode.y + 24,
        ),
        id: nid(),
        name: `${selectedNode.text ?? selectedNode.name ?? selectedNode.type} Copy`,
      })
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

      clipboard.forEach((item, index) => {
        const offset = baseOffset + 24 * index
        insertElement({
          ...offsetElementPosition(
            item,
            position ? position.x + offset : (item.x ?? 0) + offset,
            position ? position.y + offset : (item.y ?? 0) + offset,
          ),
          id: nid(),
          name: `${item.name ?? item.type} Copy`,
        })
      })
      setPasteSerial((value) => value + 1)
      return
    }

    if (type === 'selection-all') {
      const target = [...canvasRuntime.document.shapes].reverse().find((shape) => shape.type !== 'frame')
      handleCommand({
        type: 'selection.set',
        shapeId: target?.id ?? null,
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
      if (!selectedShape || selectedShape.type === 'frame') {
        return
      }

      const delta = {
        x: type === 'element-move-right' ? 1 : type === 'element-move-left' ? -1 : 0,
        y: type === 'element-move-down' ? 1 : type === 'element-move-up' ? -1 : 0,
      }

      handleCommand({
        type: 'shape.move',
        shapeId: selectedShape.id,
        x: selectedShape.x + delta.x,
        y: selectedShape.y + delta.y,
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
      const firstId = Array.from(data.idSet as Set<string>)[0] ?? null
      handleCommand({
        type: 'selection.set',
        shapeId: firstId,
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
    }
  }, [
    canvasRuntime,
    clipboard,
    closeFile,
    handleCommand,
    insertElement,
    reorderSelectedShape,
    saveFile,
    selectedNode,
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
    selectedShapeId,
    showCreateFile,
    showPrint,
  })

  const documentState: EditorDocumentState = {
    document: canvasRuntime.document,
    file,
    hasFile,
  }

  const runtimeState: EditorRuntimeState = {
    canvas: {
      Renderer: Canvas2DRenderer,
      document: canvasRuntime.document,
      shapes: canvasRuntime.shapes,
      stats: canvasRuntime.stats,
      viewport: canvasRuntime.viewport,
      ready: canvasRuntime.ready,
      onPointerMove: (point) => {
        worldPointRef.current?.set(point)
        if (penTool.handlePointerMove(point)) {
          return
        }
        canvasRuntime.postPointer('pointermove', point)
      },
      onPointerDown: (point) => {
        if (currentTool === 'zoomIn' || currentTool === 'zoomOut') {
          handleZoom(currentTool === 'zoomIn', point)
          return
        }

        if (penTool.handlePointerDown(point)) {
          return
        }

        canvasRuntime.postPointer('pointerdown', point)
      },
      onPointerUp: penTool.handlePointerUp,
      onPointerLeave: () => {
        penTool.clearDraft()
        canvasRuntime.clearHover()
      },
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
    uiState,
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
