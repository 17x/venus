import {useCallback} from 'react'
import {type ToolName} from '@venus/document-core'
import {applyMatrixToPoint} from '@vector/runtime'
import type {ElementProps} from '@lite-u/editor/types'
import {
  handleGroupNodesAction,
  handleUngroupNodesAction,
} from './runtime/groupActions.ts'
import {handleShapeActions} from './runtime/shapeActions.ts'
import {
  resolveDirectExecuteActionCommand,
  resolveDuplicatedElements,
  resolveDroppedImageElement,
  resolveElementMoveDelta,
  resolvePastedElements,
  resolveReorderDirectionFromExecuteAction,
  resolveSelectedNonFrameElementProps,
  resolveSelectionModifyCommand,
  resolveSelectionMoveCommand,
  resolveViewportShiftFromExecuteAction,
  resolveViewportZoomFromExecuteAction,
} from './useEditorRuntime.helpers.ts'
import {applyElementModifyAction} from './useEditorRuntimeElementModify.ts'
import type {
  EditorExecutor,
  VisionFileAsset,
} from './useEditorRuntime.types.ts'

interface UseEditorRuntimeExecuteActionOptions {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  addAsset: (asset: VisionFileAsset) => void
  canvasRuntime: ReturnType<typeof import('./useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']
  clipboard: ElementProps[]
  clearMask: VoidFunction
  closeFile: VoidFunction
  handleCommand: (command: import('@vector/runtime/worker').EditorRuntimeCommand) => void
  insertElement: (element: ElementProps) => void
  insertElementsBatch: (elements: ElementProps[]) => void
  pasteSerial: number
  reorderSelectedShape: (direction: 'up' | 'down' | 'top' | 'bottom') => void
  saveFile: (document: ReturnType<typeof import('./useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['document']) => void
  selectedNode: import('@venus/document-core').DocumentNode | null
  selectedShapeIds: string[]
  setClipboard: React.Dispatch<React.SetStateAction<ElementProps[]>>
  setCurrentTool: (toolName: ToolName) => void
  setPasteSerial: React.Dispatch<React.SetStateAction<number>>
  setShowPrint: React.Dispatch<React.SetStateAction<boolean>>
  applyAutoMask: VoidFunction
}

const IMAGE_INSERT_VIEWPORT_RATIO = 0.82

export function useEditorRuntimeExecuteAction(options: UseEditorRuntimeExecuteActionOptions) {
  return useCallback<EditorExecutor>((type, data) => {
    const directCommand = resolveDirectExecuteActionCommand({
      type,
      shapes: options.canvasRuntime.document.shapes,
    })
    if (directCommand) {
      options.handleCommand(directCommand)
      return
    }

    const reorderDirection = resolveReorderDirectionFromExecuteAction({type, data})
    if (reorderDirection) {
      options.reorderSelectedShape(reorderDirection)
      return
    }

    if (type === 'print') {
      options.setShowPrint(true)
      return
    }

    if (type === 'closeFile') {
      options.closeFile()
      return
    }

    if (type === 'saveFile') {
      options.saveFile(options.canvasRuntime.document)
      return
    }

    if (type === 'element-copy') {
      const copied = resolveSelectedNonFrameElementProps({
        shapes: options.canvasRuntime.document.shapes,
        selectedShapeIds: options.selectedShapeIds,
        clone: true,
      })
      if (copied.length > 0) {
        options.setClipboard(copied)
        options.setPasteSerial(0)
      }
      return
    }

    if (type === 'element-cut') {
      const copied = resolveSelectedNonFrameElementProps({
        shapes: options.canvasRuntime.document.shapes,
        selectedShapeIds: options.selectedShapeIds,
        clone: true,
      })
      if (copied.length > 0) {
        options.setClipboard(copied)
        options.setPasteSerial(0)
        options.handleCommand({type: 'selection.delete'})
      }
      return
    }

    if (type === 'element-duplicate') {
      const copied = resolveSelectedNonFrameElementProps({
        shapes: options.canvasRuntime.document.shapes,
        selectedShapeIds: options.selectedShapeIds,
      })
      if (copied.length === 0) {
        return
      }
      const existingIds = new Set(options.canvasRuntime.document.shapes.map((shape) => shape.id))
      options.insertElementsBatch(resolveDuplicatedElements({
        elements: copied,
        existingShapeIds: existingIds,
      }))
      return
    }

    if (type === 'group-nodes' || type === 'groupNodes') {
      handleGroupNodesAction({
        selectedShapeIds: options.selectedShapeIds,
        shapes: options.canvasRuntime.document.shapes,
        dispatchCommand: options.handleCommand,
        notify: (message) => options.add(message, 'info'),
      })
      return
    }

    if (type === 'ungroup-nodes' || type === 'ungroupNodes') {
      handleUngroupNodesAction({
        selectedShapeIds: options.selectedShapeIds,
        shapes: options.canvasRuntime.document.shapes,
        dispatchCommand: options.handleCommand,
        notify: (message) => options.add(message, 'info'),
      })
      return
    }

    if (handleShapeActions(type, {
      selectedShapeIds: options.selectedShapeIds,
      dispatchCommand: options.handleCommand,
      notify: (message) => options.add(message, 'info'),
    })) {
      return
    }

    if (type === 'image-mask-with-shape') {
      options.applyAutoMask()
      return
    }

    if (type === 'image-clear-mask') {
      options.clearMask()
      return
    }

    if (type === 'element-paste') {
      if (options.clipboard.length === 0) {
        return
      }

      const position = data && typeof data === 'object' && 'x' in data && 'y' in data
        ? data as {x: number; y: number}
        : null
      const existingIds = new Set(options.canvasRuntime.document.shapes.map((shape) => shape.id))
      options.insertElementsBatch(resolvePastedElements({
        clipboard: options.clipboard,
        pasteSerial: options.pasteSerial,
        existingShapeIds: existingIds,
        position,
      }))
      options.setPasteSerial((value) => value + 1)
      return
    }

    const moveDelta = resolveElementMoveDelta(type)
    if (moveDelta) {
      const command = resolveSelectionMoveCommand({
        shapes: options.canvasRuntime.document.shapes,
        selectedShapeIds: options.selectedShapeIds,
        delta: moveDelta,
      })
      if (!command) {
        return
      }
      options.handleCommand(command)
      return
    }

    if (type === 'drop-image' && data && typeof data === 'object' && 'position' in data) {
      const viewportPosition = data.position as {x: number; y: number}
      const position = applyMatrixToPoint(options.canvasRuntime.viewport.inverseMatrix, viewportPosition)
      const asset = Array.isArray((data as {assets?: VisionFileAsset[]}).assets)
        ? ((data as {assets?: VisionFileAsset[]}).assets?.[0] ?? null)
        : null
      const viewportWidth = options.canvasRuntime.viewport.viewportWidth || 960
      const viewportHeight = options.canvasRuntime.viewport.viewportHeight || 640

      if (asset) {
        options.addAsset(asset)
        options.add(`Image dropped: ${asset.name}`, 'info')
      }

      options.insertElement(resolveDroppedImageElement({
        asset,
        position,
        viewportWidth,
        viewportHeight,
        imageInsertViewportRatio: IMAGE_INSERT_VIEWPORT_RATIO,
        existingShapeIds: new Set(options.canvasRuntime.document.shapes.map((shape) => shape.id)),
      }))
      return
    }

    const viewportShift = resolveViewportShiftFromExecuteAction(data)
    if (type === 'world-shift' && viewportShift) {
      options.canvasRuntime.panViewport(viewportShift.x, viewportShift.y)
      return
    }

    const viewportZoom = resolveViewportZoomFromExecuteAction(data)
    if (type === 'world-zoom' && viewportZoom) {
      if (viewportZoom.mode === 'fit') {
        options.canvasRuntime.fitViewport()
        return
      }

      options.canvasRuntime.zoomViewport(viewportZoom.zoomFactor, viewportZoom.point)
      return
    }

    if (type === 'switch-tool') {
      const toolName = String(data ?? 'selector') as ToolName
      options.setCurrentTool(toolName)
      return
    }

    const selectionModifyCommand = resolveSelectionModifyCommand(data)
    if (type === 'selection-modify' && selectionModifyCommand) {
      options.handleCommand(selectionModifyCommand)
      return
    }

    if (type === 'element-modify' && Array.isArray(data) && data[0]) {
      applyElementModifyAction({
        canvasShapes: options.canvasRuntime.document.shapes,
        data,
        handleCommand: options.handleCommand,
      })
    }
  }, [options])
}