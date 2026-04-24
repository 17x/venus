import {useCallback} from 'react'
import {type ToolName} from '@venus/document-core'
import {resolveRuntimeZoomPresetScale} from '../../runtime/interaction/index.ts'
import readFileHelper from '../../contexts/fileContext/readFileHelper.ts'
import {isDragCreateTool, mapToolNameToToolId} from './editorRuntimeHelpers.ts'
import {resolveCommittedPathBezierPoints, resolveReorderedShapeIndex} from './useEditorRuntime.helpers.ts'
import {resolveEditingModeForTool} from './runtime/tooling.ts'

export function useEditorRuntimeCoreCallbacks(options: {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  canvasRuntime: ReturnType<typeof import('./useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']
  handleCommand: (command: import('@vector/runtime/worker').EditorRuntimeCommand) => void
  openFile: (file: import('./useEditorRuntime.types.ts').VisionFileType) => void
  previewDocument: import('@venus/document-core').EditorDocument
  runtimeEditingModeControllerRef: React.RefObject<ReturnType<typeof import('@vector/runtime').createRuntimeEditingModeController>>
  runtimeToolRegistryRef: React.RefObject<ReturnType<typeof import('@vector/runtime').createRuntimeToolRegistry>>
  selectedShapeId: string | null
  setCurrentToolState: React.Dispatch<React.SetStateAction<ToolName>>
  setDraftPrimitive: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').DraftPrimitive | null>>
  setPathHandleDrag: React.Dispatch<React.SetStateAction<{
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null>>
  setPathSubSelection: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').PathSubSelection | null>>
  setPathSubSelectionHover: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').PathSubSelection | null>>
  setPenDraftPoints: React.Dispatch<React.SetStateAction<Array<{x: number; y: number}> | null>>
  t: (key: string) => string
}) {
  const reorderSelectedShape = useCallback((direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (!options.selectedShapeId) {
      return
    }

    const index = options.canvasRuntime.document.shapes.findIndex((shape) => shape.id === options.selectedShapeId)
    const nextIndex = resolveReorderedShapeIndex({
      direction,
      index,
      shapeCount: options.canvasRuntime.document.shapes.length,
    })
    if (nextIndex === null) {
      return
    }

    options.handleCommand({
      type: 'shape.reorder',
      shapeId: options.selectedShapeId,
      toIndex: nextIndex,
    })
  }, [options])

  const handleZoom = useCallback((zoomIn: boolean, point?: {x: number; y: number}) => {
    const currentScale = options.canvasRuntime.viewport.scale
    const nextScaleValue = resolveRuntimeZoomPresetScale(currentScale, zoomIn ? 'in' : 'out')

    if (nextScaleValue === null) {
      return
    }

    options.canvasRuntime.zoomViewport(nextScaleValue, point)
  }, [options])

  const resolveDraftPrimitiveType = useCallback((toolName: ToolName) => {
    if (!isDragCreateTool(toolName)) {
      return null
    }
    if (toolName === 'connector') {
      return 'lineSegment'
    }
    return toolName
  }, [])

  const commitPathHandleUpdate = useCallback((params: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
    point: {x: number; y: number}
  }) => {
    const shape = options.previewDocument.shapes.find((item) => item.id === params.shapeId)
    if (!shape) {
      return
    }
    const shapeIndex = options.previewDocument.shapes.findIndex((item) => item.id === shape.id)
    if (shapeIndex < 0) {
      return
    }

    const nextBezierPoints = resolveCommittedPathBezierPoints({
      shape,
      anchorIndex: params.anchorIndex,
      handleType: params.handleType,
      point: params.point,
    })
    if (!nextBezierPoints) {
      return
    }

    options.handleCommand({type: 'shape.remove', shapeId: shape.id})
    options.handleCommand({
      type: 'shape.insert',
      index: shapeIndex,
      shape: {
        ...shape,
        bezierPoints: nextBezierPoints,
      },
    })
    options.handleCommand({
      type: 'selection.set',
      shapeIds: [shape.id],
      mode: 'replace',
    })
  }, [options])

  const setCurrentTool = useCallback((toolName: ToolName) => {
    options.runtimeToolRegistryRef.current?.activate(toolName, {
      editingMode: options.runtimeEditingModeControllerRef.current?.getCurrentMode() ?? 'idle',
    })
    options.runtimeEditingModeControllerRef.current?.transition({
      to: resolveEditingModeForTool(toolName),
      reason: `set-current-tool:${toolName}`,
    })
    options.setDraftPrimitive(null)
    options.setPathHandleDrag(null)
    options.setPenDraftPoints(null)
    if (toolName !== 'dselector') {
      options.setPathSubSelection(null)
      options.setPathSubSelectionHover(null)
    }
    options.setCurrentToolState(toolName)
    options.handleCommand({
      type: 'tool.select',
      tool: mapToolNameToToolId(toolName),
      toolName,
    })
  }, [options])

  const pickHistory = useCallback((historyNode: {id: number}) => {
    const currentCursor = options.canvasRuntime.history.cursor
    const diff = historyNode.id - currentCursor

    if (diff > 0) {
      for (let index = 0; index < diff; index += 1) {
        options.handleCommand({type: 'history.redo'})
      }
      return
    }

    if (diff < 0) {
      for (let index = 0; index < Math.abs(diff); index += 1) {
        options.handleCommand({type: 'history.undo'})
      }
    }
  }, [options])

  const openDroppedFile = useCallback(async (droppedFile: File) => {
    try {
      options.openFile(await readFileHelper(droppedFile))
    } catch {
      options.add(options.t('misc.fileResolveFailed'), 'info')
    }
  }, [options])

  return {
    reorderSelectedShape,
    handleZoom,
    resolveDraftPrimitiveType,
    commitPathHandleUpdate,
    setCurrentTool,
    pickHistory,
    openDroppedFile,
  }
}