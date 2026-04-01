import {useCallback, useEffect, useReducer, useRef, useState} from 'react'
import {useNotification} from '@lite-u/ui'
import {ToolName} from '@venus/editor-core'
import {Editor} from '@lite-u/editor'
import type {ElementProps, VisionEventData, VisionEventType} from '@lite-u/editor/types'
import {PointRef} from '../components/statusBar/StatusBar.tsx'
import {initialWorkspaceState, WorkspaceReducer} from '../contexts/workspaceContext/reducer/reducer.ts'
import {MOCK_FILE} from '../contexts/appContext/mockFile.ts'
import useEditor from './useEditor.tsx'
import useFocus from './useFocus.tsx'
import useGesture from './useGesture.tsx'
import useShortcut from './useShortcut.tsx'
import saveFileHelper from '../contexts/fileContext/saveFileHelper.ts'
import readFileHelper from '../contexts/fileContext/readFileHelper.ts'
import {useTranslation} from 'react-i18next'
import ZOOM_LEVELS from '../constants/zoomLevels.ts'

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

export const useEditorRuntime = (options?: {
  onContextMenu?: (position: { x: number, y: number }) => void
}) => {
  const onContextMenu = options?.onContextMenu
  const [file, setFile] = useState<VisionFileType | null>(MOCK_FILE)
  const [creating, setCreating] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [workspaceState, dispatch] = useReducer(WorkspaceReducer, initialWorkspaceState)
  const contextRootRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const worldPointRef = useRef<PointRef | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const scaleRef = useRef(initialWorkspaceState.worldScale)
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
    saveFileHelper(file, editorRef.current?.export())
  }, [file])

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

    editorRef.current?.execute(type, data)
  }, [closeFile, saveFile, startCreateFile])

  const handleZoom = useCallback((zoomIn: boolean, point?: { x: number, y: number }) => {
    const filtered = ZOOM_LEVELS.filter(z => typeof z.value === 'number')
    const currentScale = scaleRef.current
    let nextScale = null

    if (zoomIn) {
      nextScale = filtered.reverse().find(z => z.value > currentScale)
    } else {
      nextScale = filtered.find(z => z.value < currentScale)
    }

    if (!nextScale) return

    dispatch({type: 'SET_WORLD_SCALE', payload: nextScale.value})
    executeAction('world-zoom', {
      zoomTo: true,
      zoomFactor: nextScale.value,
      physicalPoint: point,
    })
  }, [executeAction])

  const setCurrentTool = useCallback((toolName: ToolName) => {
    dispatch({type: 'SET_CURRENT_TOOL', payload: toolName})
    executeAction('switch-tool', toolName)
  }, [executeAction])

  const pickHistory = useCallback((historyNode: {id: number}) => {
    editorRef.current?.execute('history-pick', historyNode)
  }, [])

  const openDroppedFile = useCallback(async (droppedFile: File) => {
    try {
      const nextFile = await readFileHelper(droppedFile)
      openFile(nextFile)
    } catch {
      add(t('misc.fileResolveFailed'), 'info')
    }
  }, [add, openFile, t])

  useEffect(() => {
    scaleRef.current = workspaceState.worldScale
  }, [workspaceState.worldScale])

  useEditor(
    containerRef,
    worldPointRef,
    file,
    workspaceState,
    dispatch,
    (position) => {
      onContextMenu?.(position)
    },
    (editor) => {
      editorRef.current = editor
    },
  )

  useGesture(containerRef, executeAction, workspaceState.currentTool, handleZoom)
  useFocus(contextRootRef, workspaceState.focused, (focused) => {
    dispatch({type: 'SET_FOCUSED', payload: focused})
  })
  useShortcut(executeAction, handleZoom, {
    currentTool: workspaceState.currentTool,
    focused: workspaceState.focused,
    setCurrentTool,
  })

  return {
    file,
    hasFile,
    creating,
    showCreateFile,
    showPrint,
    setShowPrint,
    workspaceState,
    contextRootRef,
    containerRef,
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
  }
}

export default useEditorRuntime
