import type * as React from 'react'
import {applyMatrixToPoint} from '../../runtime/index.ts'
import type {ToolName} from '../../runtime/model/index.ts'
import type {ElementProps} from '../../runtime/types/index.ts'
import type {DocumentNode} from '../../runtime/model/index.ts'
import {resolveGroupableShapeIds, resolveSelectedGroups} from '../useEditorRuntime/selectionGroupHelpers.ts'
import {
  resolveConvertOrAlignShapeAction,
  resolveDistributeOrBooleanShapeAction,
} from './shapeActionResolvers.ts'
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
} from './actionResolvers.ts'
import {applyElementModifyAction} from '../useEditorRuntime/elementModify.ts'
import type {
  EditorExecutor,
} from '../useEditorRuntime/types.ts'
import type {EditorFileAsset} from '../../runtime/types/index.ts'

const IMAGE_INSERT_VIEWPORT_RATIO = 0.82

/**
 * Defines dependencies consumed by the pure editor action executor.
 */
export interface EditorRuntimeActionExecutorOptions {
  /** Shows one user-facing notification message. */
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  /** Registers one dropped/imported asset into file state. */
  addAsset: (asset: EditorFileAsset) => void
  /** Stores runtime snapshot and viewport command bridge. */
  canvasRuntime: ReturnType<typeof import('../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']
  /** Stores copied element payload list for paste/duplicate actions. */
  clipboard: ElementProps[]
  /** Clears image mask from current selection. */
  clearMask: VoidFunction
  /** Closes current file/document context. */
  closeFile: VoidFunction
  /** Dispatches one runtime command through command controller flow. */
  handleCommand: (command: import('../../runtime/worker/index.ts').EditorRuntimeCommand) => void
  /** Inserts one element through shape insert command flow. */
  insertElement: (element: ElementProps) => void
  /** Inserts multiple elements through batch command flow. */
  insertElementsBatch: (elements: ElementProps[]) => void
  /** Stores current paste serial used for deterministic offset paste behavior. */
  pasteSerial: number
  /** Reorders current selection in layer stack. */
  reorderSelectedShape: (direction: 'up' | 'down' | 'top' | 'bottom') => void
  /** Persists current runtime document to file storage. */
  saveFile: (document: ReturnType<typeof import('../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['document']) => void
  /** Stores current selected node for action branches that inspect selection detail. */
  selectedNode: import('../../runtime/model/index.ts').DocumentNode | null
  /** Stores selected shape id list used by group/align/move actions. */
  selectedShapeIds: string[]
  /** Updates clipboard state in product layer. */
  setClipboard: React.Dispatch<React.SetStateAction<ElementProps[]>>
  /** Switches active tool in product/runtime bridge. */
  setCurrentTool: (toolName: ToolName) => void
  /** Updates paste serial state after paste execution. */
  setPasteSerial: React.Dispatch<React.SetStateAction<number>>
  /** Toggles print modal visibility. */
  setShowPrint: React.Dispatch<React.SetStateAction<boolean>>
  /** Applies auto-mask on current selection. */
  applyAutoMask: VoidFunction
}

/**
 * Creates one pure action executor function for editor action events.
 */
export function createEditorRuntimeActionExecutor(
  options: EditorRuntimeActionExecutorOptions,
): EditorExecutor {
  /**
   * Executes one editor action event against runtime and product state dependencies.
   */
  return (type, data) => {
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
      const groupableIds = resolveGroupableShapeIds({
        selectedShapeIds: options.selectedShapeIds,
        shapes: options.canvasRuntime.document.shapes,
      })
      if (groupableIds.length < 2) {
        options.add('Select at least two elements to group.', 'info')
        return
      }
      options.handleCommand({type: 'shape.group', shapeIds: groupableIds})
      return
    }

    if (type === 'ungroup-nodes' || type === 'ungroupNodes') {
      const selectedGroups = resolveSelectedGroups({
        selectedShapeIds: options.selectedShapeIds,
        shapes: options.canvasRuntime.document.shapes,
      })
      if (selectedGroups.length === 0) {
        options.add('Select a group to ungroup.', 'info')
        return
      }
      selectedGroups.forEach((groupShape: DocumentNode) => {
        options.handleCommand({type: 'shape.ungroup', groupId: groupShape.id})
      })
      return
    }

    // Shape convert/align/distribute/boolean actions resolved through the action resolver chain.
    {
      const convertOrAlign = resolveConvertOrAlignShapeAction({
        actionType: type,
        selectedShapeIds: options.selectedShapeIds,
        shapes: options.canvasRuntime.document.shapes,
      })
      if (convertOrAlign.handled) {
        if (convertOrAlign.command) options.handleCommand(convertOrAlign.command)
        if (convertOrAlign.message) options.add(convertOrAlign.message, 'info')
        return
      }
      const distributeOrBoolean = resolveDistributeOrBooleanShapeAction({
        actionType: type,
        selectedShapeIds: options.selectedShapeIds,
        shapes: options.canvasRuntime.document.shapes,
      })
      if (distributeOrBoolean.handled) {
        if (distributeOrBoolean.command) options.handleCommand(distributeOrBoolean.command)
        if (distributeOrBoolean.message) options.add(distributeOrBoolean.message, 'info')
        return
      }
    }

    if (type === 'image-mask-with-shape') {
      options.handleCommand({type: 'mask.create'})
      return
    }

    if (type === 'image-clear-mask') {
      options.handleCommand({type: 'mask.release'})
      return
    }

    if (type === 'mask-select-host') {
      options.handleCommand({type: 'mask.select-host'})
      return
    }

    if (type === 'mask-select-source') {
      options.handleCommand({type: 'mask.select-source'})
      return
    }

    if (type === 'group-enter-isolation' || type === 'groupEnterIsolation') {
      options.handleCommand({type: 'group.enter-isolation'})
      return
    }

    if (type === 'group-exit-isolation' || type === 'groupExitIsolation') {
      options.handleCommand({type: 'group.exit-isolation'})
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
      const asset = Array.isArray((data as {assets?: EditorFileAsset[]}).assets)
        ? ((data as {assets?: EditorFileAsset[]}).assets?.[0] ?? null)
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
  }
}