import {useCallback} from 'react'
import {nid, type ToolName} from '@venus/document-core'
import {applyMatrixToPoint} from '@vector/runtime'
import {createTransformBatchCommand} from '../../runtime/interaction/index.ts'
import type {ElementProps} from '@lite-u/editor/types'
import {
  cloneElementProps,
  mapToolNameToToolId,
  offsetElementPosition,
} from './editorRuntimeHelpers.ts'
import {
  handleGroupNodesAction,
  handleUngroupNodesAction,
} from './runtime/groupActions.ts'
import {handleShapeActions} from './runtime/shapeActions.ts'
import {resolveEditingModeForTool} from './runtime/tooling.ts'
import {toElementPropsFromNode} from './useEditorRuntime.helpers.ts'
import {applyElementModifyAction} from './useEditorRuntimeElementModify.ts'
import type {
  EditorExecutor,
  VisionFileAsset,
} from './useEditorRuntime.types.ts'

const IMAGE_INSERT_VIEWPORT_RATIO = 0.82

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
  setCurrentToolState: React.Dispatch<React.SetStateAction<ToolName>>
  setPasteSerial: React.Dispatch<React.SetStateAction<number>>
  setPathSubSelection: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').PathSubSelection | null>>
  setPathSubSelectionHover: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').PathSubSelection | null>>
  setShowPrint: React.Dispatch<React.SetStateAction<boolean>>
  runtimeToolRegistryRef: React.RefObject<ReturnType<typeof import('@vector/runtime').createRuntimeToolRegistry>>
  runtimeEditingModeControllerRef: React.RefObject<ReturnType<typeof import('@vector/runtime').createRuntimeEditingModeController>>
  applyAutoMask: VoidFunction
}

export function useEditorRuntimeExecuteAction(options: UseEditorRuntimeExecuteActionOptions) {
  return useCallback<EditorExecutor>((type, data) => {
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

    if (type === 'history-undo') {
      options.handleCommand({type: 'history.undo'})
      return
    }

    if (type === 'history-redo') {
      options.handleCommand({type: 'history.redo'})
      return
    }

    if (type === 'element-delete') {
      options.handleCommand({type: 'selection.delete'})
      return
    }

    if (type === 'element-copy') {
      const selectedSet = new Set(options.selectedShapeIds)
      const copied = options.canvasRuntime.document.shapes
        .filter((shape) => selectedSet.has(shape.id) && shape.type !== 'frame')
        .map((shape) => cloneElementProps(toElementPropsFromNode(shape)))
      if (copied.length > 0) {
        options.setClipboard(copied)
        options.setPasteSerial(0)
      }
      return
    }

    if (type === 'element-cut') {
      const selectedSet = new Set(options.selectedShapeIds)
      const copied = options.canvasRuntime.document.shapes
        .filter((shape) => selectedSet.has(shape.id) && shape.type !== 'frame')
        .map((shape) => cloneElementProps(toElementPropsFromNode(shape)))
      if (copied.length > 0) {
        options.setClipboard(copied)
        options.setPasteSerial(0)
        options.handleCommand({type: 'selection.delete'})
      }
      return
    }

    if (type === 'element-duplicate') {
      const selectedSet = new Set(options.selectedShapeIds)
      const copied = options.canvasRuntime.document.shapes
        .filter((shape) => selectedSet.has(shape.id) && shape.type !== 'frame')
        .map((shape) => toElementPropsFromNode(shape))
      if (copied.length === 0) {
        return
      }
      options.insertElementsBatch(copied.map((item) => ({
        ...offsetElementPosition(item, (item.x ?? 0) + 24, (item.y ?? 0) + 24),
        id: nid(),
        name: `${item.name ?? item.type} Copy`,
      })))
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
      const baseOffset = 24 * (options.pasteSerial + 1)
      const anchor = options.clipboard[0]
      const anchorX = anchor?.x ?? 0
      const anchorY = anchor?.y ?? 0
      const pasteTargetX = position ? position.x + baseOffset : anchorX + baseOffset
      const pasteTargetY = position ? position.y + baseOffset : anchorY + baseOffset
      const deltaX = pasteTargetX - anchorX
      const deltaY = pasteTargetY - anchorY

      options.insertElementsBatch(options.clipboard.map((item) => ({
        ...offsetElementPosition(
          item,
          (item.x ?? 0) + deltaX,
          (item.y ?? 0) + deltaY,
        ),
        id: nid(),
        name: `${item.name ?? item.type} Copy`,
      })))
      options.setPasteSerial((value) => value + 1)
      return
    }

    if (type === 'selection-all') {
      options.handleCommand({
        type: 'selection.set',
        shapeIds: options.canvasRuntime.document.shapes
          .filter((shape) => shape.type !== 'frame')
          .map((shape) => shape.id),
        mode: 'replace',
      })
      return
    }

    if (type === 'element-layer') {
      options.reorderSelectedShape(String(data ?? 'up') as 'up' | 'down' | 'top' | 'bottom')
      return
    }

    if (type === 'bringForward') {
      options.reorderSelectedShape('up')
      return
    }

    if (type === 'sendBackward') {
      options.reorderSelectedShape('down')
      return
    }

    if (type === 'bringToFront') {
      options.reorderSelectedShape('top')
      return
    }

    if (type === 'sendToBack') {
      options.reorderSelectedShape('bottom')
      return
    }

    if (type === 'element-move-up' || type === 'element-move-right' || type === 'element-move-down' || type === 'element-move-left') {
      const delta = {
        x: type === 'element-move-right' ? 1 : type === 'element-move-left' ? -1 : 0,
        y: type === 'element-move-down' ? 1 : type === 'element-move-up' ? -1 : 0,
      }

      const selectedSet = new Set(options.selectedShapeIds)
      const moveTargets = options.canvasRuntime.document.shapes
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
      options.handleCommand(command)
      return
    }

    if (type === 'drop-image' && data && typeof data === 'object' && 'position' in data) {
      const viewportPosition = data.position as {x: number; y: number}
      const position = applyMatrixToPoint(options.canvasRuntime.viewport.inverseMatrix, viewportPosition)
      const asset = Array.isArray((data as {assets?: VisionFileAsset[]}).assets)
        ? (data as {assets?: VisionFileAsset[]}).assets?.[0]
        : null
      const imageRef = asset?.imageRef as {naturalWidth?: number; naturalHeight?: number} | undefined
      const naturalWidth = imageRef?.naturalWidth ?? 160
      const naturalHeight = imageRef?.naturalHeight ?? 120
      const viewportWidth = options.canvasRuntime.viewport.viewportWidth || 960
      const viewportHeight = options.canvasRuntime.viewport.viewportHeight || 640
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
        options.addAsset(asset)
        options.add(`Image dropped: ${asset.name}`, 'info')
      }

      options.insertElement({
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
      options.canvasRuntime.panViewport(Number(data.x), Number(data.y))
      return
    }

    if (type === 'world-zoom') {
      if (data === 'fit') {
        options.canvasRuntime.fitViewport()
        return
      }

      if (data && typeof data === 'object' && 'zoomFactor' in data) {
        const point = 'physicalPoint' in data ? data.physicalPoint as {x: number; y: number} | undefined : undefined
        options.canvasRuntime.zoomViewport(Number(data.zoomFactor), point)
      }
      return
    }

    if (type === 'switch-tool') {
      const toolName = String(data ?? 'selector') as ToolName
      options.runtimeToolRegistryRef.current?.activate(toolName, {
        editingMode: options.runtimeEditingModeControllerRef.current?.getCurrentMode() ?? 'idle',
      })
      options.runtimeEditingModeControllerRef.current?.transition({
        to: resolveEditingModeForTool(toolName),
        reason: `switch-tool:${toolName}`,
      })
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
      return
    }

    if (type === 'selection-modify' && data && typeof data === 'object' && 'idSet' in data) {
      const nextIds = Array.from(data.idSet as Set<string>)
      const mode =
        'mode' in data && typeof data.mode === 'string'
          ? data.mode as 'replace' | 'add' | 'remove' | 'toggle' | 'clear'
          : 'replace'
      options.handleCommand({
        type: 'selection.set',
        shapeIds: nextIds,
        mode,
      })
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