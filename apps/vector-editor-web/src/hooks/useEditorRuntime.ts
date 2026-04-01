import {useCallback, useMemo, useRef, useState} from 'react'
import {useNotification} from '@lite-u/ui'
import type {ToolId, ToolName} from '@venus/editor-core'
import {useCanvasRuntime} from '@venus/canvas-base'
import {SkiaRenderer} from '@venus/renderer-skia'
import type {ElementProps, VisionEventData, VisionEventType} from '@lite-u/editor/types'
import {PointRef} from '../components/statusBar/StatusBar.tsx'
import {WorkSpaceStateType} from '../contexts/workspaceContext/reducer/reducer.ts'
import {MOCK_FILE} from '../contexts/appContext/mockFile.ts'
import useFocus from './useFocus.tsx'
import useShortcut from './useShortcut.tsx'
import saveFileHelper from '../contexts/fileContext/saveFileHelper.ts'
import readFileHelper from '../contexts/fileContext/readFileHelper.ts'
import {useTranslation} from 'react-i18next'
import ZOOM_LEVELS from '../constants/zoomLevels.ts'
import {createEditorDocumentFromFile, createFileElementsFromDocument} from '../adapters/fileDocument.ts'
import type {SceneShapeSnapshot} from '@venus/shared-memory'
import type {EditorRuntimeCommand, HistorySummary} from '@venus/editor-worker'

export interface VisionFileAsset {
  id: string
  name: string
  type: string
  mimeType: string
  file?: File
  imageRef?: unknown
}

export interface VisionFilePageSet {
  unit: string
  width: number
  height: number
  dpi: number
}

export interface VisionFileType {
  id: string
  name: string
  version: string
  createdAt: number
  updatedAt: number
  config: {
    page: VisionFilePageSet
    editor?: {}
  }
  elements: ElementProps[]
  assets?: VisionFileAsset[]
}

export type EditorExecutor = (type: VisionEventType, data?: VisionEventData) => void

const SCENE_CAPACITY = 256

function mapToolNameToToolId(toolName: ToolName): ToolId {
  switch (toolName) {
    case 'rectangle':
      return 'rectangle'
    case 'ellipse':
      return 'ellipse'
    case 'text':
      return 'text'
    case 'pencil':
    case 'path':
      return 'pen'
    default:
      return 'select'
  }
}

function buildSelectedProps(shape: SceneShapeSnapshot | null): ElementProps | null {
  if (!shape) {
    return null
  }

  return {
    id: shape.id,
    type: shape.type,
    name: shape.name,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    rotation: 0,
    opacity: 1,
    fill: {
      enabled: shape.type !== 'text',
      color: '#ffffff',
    },
    stroke: {
      enabled: true,
      color: '#000000',
      weight: 1,
    },
  }
}

function buildHistoryArray(history: HistorySummary): WorkSpaceStateType['historyArray'] {
  return history.entries.map((entry, index, array) => ({
    id: index,
    prev: index > 0 ? {
      id: index - 1,
      prev: null,
      next: null,
      data: {type: array[index - 1].label},
      label: array[index - 1].label,
    } : null,
    next: index < array.length - 1 ? {
      id: index + 1,
      prev: null,
      next: null,
      data: {type: array[index + 1].label},
      label: array[index + 1].label,
    } : null,
    data: {type: entry.label},
    label: entry.label,
  }))
}

export const useEditorRuntime = (options?: {
  onContextMenu?: (position: { x: number, y: number }) => void
}) => {
  const onContextMenu = options?.onContextMenu
  const [file, setFile] = useState<VisionFileType | null>(MOCK_FILE)
  const [creating, setCreating] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [focused, setFocused] = useState(false)
  const [currentTool, setCurrentToolState] = useState<ToolName>('selector')
  const contextRootRef = useRef<HTMLDivElement>(null)
  const worldPointRef = useRef<PointRef | null>(null)
  const editorRef = useRef<{ printOut?: (ctx: CanvasRenderingContext2D) => void } | null>(null)
  const activeFile = file ?? MOCK_FILE
  const document = useMemo(() => createEditorDocumentFromFile(activeFile), [activeFile])
  const runtimeOptions = useMemo(() => ({
    capacity: Math.max(SCENE_CAPACITY, document.shapes.length + 8),
    createWorker: () => new Worker(new URL('../editor.worker.ts', import.meta.url), {type: 'module'}),
    document,
  }), [document])
  const canvasRuntime = useCanvasRuntime(runtimeOptions)
  const {add} = useNotification()
  const {t} = useTranslation()
  const hasFile = !!file
  const showCreateFile = !hasFile || creating

  const openFile = useCallback((nextFile: VisionFileType) => {
    setFile(nextFile)
    setCreating(false)
  }, [])

  const closeFile = useCallback(() => {
    setFile(null)
    setCreating(false)
  }, [])

  const createFile = useCallback((nextFile: VisionFileType) => {
    setFile(nextFile)
    setCreating(false)
  }, [])

  const startCreateFile = useCallback(() => {
    setCreating(true)
  }, [])

  const handleCreating = useCallback((value: boolean) => {
    setCreating(value)
  }, [])

  const saveFile = useCallback(() => {
    if (!file) return
    saveFileHelper(file, {
      elements: createFileElementsFromDocument(canvasRuntime.document),
    })
  }, [canvasRuntime.document, file])

  const handleCommand = useCallback((command: EditorRuntimeCommand) => {
    canvasRuntime.dispatchCommand(command)
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
      saveFile()
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
        const zoomFactor = Number(data.zoomFactor)
        const point = data && typeof data === 'object' && 'physicalPoint' in data ? data.physicalPoint as {x: number; y: number} | undefined : undefined
        canvasRuntime.zoomViewport(zoomFactor, point)
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
      const patch = data[0] as {
        id: string
        props?: Partial<ElementProps>
      }
      const shape = canvasRuntime.document.shapes.find((item) => item.id === patch.id)

      if (!shape || !patch.props) {
        return
      }

      const nextX = typeof patch.props.x === 'number' ? patch.props.x : shape.x
      const nextY = typeof patch.props.y === 'number' ? patch.props.y : shape.y
      const nextWidth = typeof patch.props.width === 'number' ? patch.props.width : shape.width
      const nextHeight = typeof patch.props.height === 'number' ? patch.props.height : shape.height

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
      return
    }
  }, [canvasRuntime, closeFile, handleCommand, saveFile, startCreateFile])

  const handleZoom = useCallback((zoomIn: boolean, point?: { x: number, y: number }) => {
    const filtered = ZOOM_LEVELS.filter(z => typeof z.value === 'number')
    const currentScale = canvasRuntime.viewport.scale
    let nextScale = null

    if (zoomIn) {
      nextScale = filtered.reverse().find(z => z.value > currentScale)
    } else {
      nextScale = filtered.find(z => z.value < currentScale)
    }

    if (!nextScale) return

    canvasRuntime.zoomViewport(nextScale.value, point)
  }, [canvasRuntime])

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
      const nextFile = await readFileHelper(droppedFile)
      openFile(nextFile)
    } catch {
      add(t('misc.fileResolveFailed'), 'info')
    }
  }, [add, openFile, t])

  useFocus(contextRootRef, focused, (focused) => {
    setFocused(focused)
  })
  useShortcut(executeAction, handleZoom, {
    currentTool,
    focused,
    setCurrentTool,
  })

  const selectedShape = canvasRuntime.stats.selectedIndex >= 0
    ? canvasRuntime.shapes[canvasRuntime.stats.selectedIndex] ?? null
    : null
  const workspaceState: WorkSpaceStateType = {
    id: activeFile.id,
    focused,
    historyArray: buildHistoryArray(canvasRuntime.history),
    historyStatus: {
      id: canvasRuntime.history.cursor,
      hasPrev: canvasRuntime.history.canUndo,
      hasNext: canvasRuntime.history.canRedo,
    },
    worldPoint: {x: 0, y: 0},
    worldScale: canvasRuntime.viewport.scale,
    needSave: canvasRuntime.history.entries.length > 0,
    selectedElements: selectedShape ? [selectedShape.id] : [],
    selectedProps: buildSelectedProps(selectedShape),
    currentTool,
    lastSavedHistoryId: -1,
    copiedItems: [],
    elements: canvasRuntime.shapes.map((shape) => ({
      id: shape.id,
      name: shape.name,
      show: true,
    })),
  }

  return {
    file,
    hasFile,
    creating,
    showCreateFile,
    showPrint,
    setShowPrint,
    workspaceState,
    contextRootRef,
    worldPointRef,
    editorRef,
    executeAction,
    saveFile,
    createFile,
    handleCreating,
    startCreateFile,
    setCurrentTool,
    pickHistory,
    openDroppedFile,
    canvas: {
      Renderer: SkiaRenderer,
      document: canvasRuntime.document,
      shapes: canvasRuntime.shapes,
      viewport: canvasRuntime.viewport,
      ready: canvasRuntime.ready,
      onPointerMove: (point: {x: number; y: number}) => {
        worldPointRef.current?.set(point)
        canvasRuntime.postPointer('pointermove', point)
      },
      onPointerDown: (point: {x: number; y: number}) => {
        if (currentTool === 'zoomIn' || currentTool === 'zoomOut') {
          handleZoom(currentTool === 'zoomIn', point)
          return
        }

        canvasRuntime.postPointer('pointerdown', point)
      },
      onPointerLeave: () => {
        canvasRuntime.clearHover()
      },
      onViewportPan: canvasRuntime.panViewport,
      onViewportResize: canvasRuntime.resizeViewport,
      onViewportZoom: (nextScale: number, anchor?: {x: number; y: number}) => {
        canvasRuntime.zoomViewport(nextScale, anchor)
      },
      onContextMenu: (position: {x: number; y: number}) => {
        onContextMenu?.(position)
      },
    },
  }
}

export default useEditorRuntime
