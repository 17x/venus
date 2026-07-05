import {createShapeElementFromDrag, createShapeElementFromTool} from '../editorRuntimeHelpers/editorRuntimeHelpers.ts'
import type {ElementProps} from '../types/index.ts'
import type {ShapeStyleHandleDrag} from '../product/shapeStyleHandles.ts'
import {resolvePointerUpTransformResult} from '../product/transformInteractionPolicy.ts'

/**
 * Handles pointer release commits for draw/transform pipelines in one deterministic flow.
 * @param options Pointer-release integration dependencies.
 */
export function handleCanvasPointerUp(options: {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  canvasRuntime: ReturnType<typeof import('../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']
  clearTransformPreview: VoidFunction
  commitPathHandleUpdate: (params: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
    point: {x: number; y: number}
  }) => void
  commitShapeStyleHandleUpdate: (params: ShapeStyleHandleDrag) => void
  currentTool: import('../../runtime/model/index.ts').ToolName
  draftPrimitive: import('../../runtime/interaction/index.ts').DraftPrimitive | null
  handleCommand: (command: import('../../runtime/worker/index.ts').EditorRuntimeCommand) => void
  insertElement: (element: ElementProps) => void
  interactionDocument: ReturnType<typeof import('../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['document']
  markTransformPreviewCommitPending: VoidFunction
  pathHandleDrag: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null
  shapeStyleHandleDrag: ShapeStyleHandleDrag | null
  pathSubSelection: import('../../runtime/interaction/index.ts').PathSubSelection | null
  pathSubSelectionHover: import('../../runtime/interaction/index.ts').PathSubSelection | null
  penTool: ReturnType<typeof import('../usePenTool.ts').usePenTool>
  runtimeEditingModeControllerRef: React.RefObject<ReturnType<typeof import('../../runtime/index.ts').createRuntimeEditingModeController>>
  setActiveTransformHandle: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').HandleKind | null>>
  setHoveredTransformHandle: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').HandleKind | null>>
  setDraftPrimitive: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').DraftPrimitive | null>>
  setHoveredShapeId: React.Dispatch<React.SetStateAction<string | null>>
  setPathHandleDrag: React.Dispatch<React.SetStateAction<{
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null>>
  setShapeStyleHandleDrag: React.Dispatch<React.SetStateAction<ShapeStyleHandleDrag | null>>
  setPathSubSelectionHover: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').PathSubSelection | null>>
  setSnapGuides: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').SnapGuide[]>>
  selectionDragControllerRef: React.RefObject<import('../../runtime/interaction/index.ts').SelectionDragController>
  transformManagerRef: React.RefObject<ReturnType<typeof import('../../runtime/interaction/index.ts').createTransformSessionManager>>
  transformPreview: import('../../runtime/interaction/index.ts').TransformPreview | null
}) {
  // Resolve pointer-up side effects in priority order so one interaction mode commits exactly once.
  options.setHoveredShapeId(null)
  options.runtimeEditingModeControllerRef.current?.transition({
    to: 'idle',
    reason: 'pointer-up',
  })
  if (options.draftPrimitive) {
    const start = options.draftPrimitive.points[0]
    const end = options.draftPrimitive.points[options.draftPrimitive.points.length - 1] ?? start
    const dragDistance = start ? Math.hypot(end.x - start.x, end.y - start.y) : 0
    const nextShape = start
      ? dragDistance < 4
        ? createShapeElementFromTool(options.currentTool, start)
        : createShapeElementFromDrag(options.currentTool, start, end)
      : null

    options.setDraftPrimitive(null)
    options.setSnapGuides([])

    if (nextShape) {
      options.insertElement(nextShape)
    }
    return
  }
  if (options.pathHandleDrag) {
    const activePoint = options.pathSubSelectionHover?.handlePoint ?? options.pathSubSelection?.handlePoint
    if (activePoint) {
      options.commitPathHandleUpdate({
        shapeId: options.pathHandleDrag.shapeId,
        anchorIndex: options.pathHandleDrag.anchorIndex,
        handleType: options.pathHandleDrag.handleType,
        point: {x: activePoint.x, y: activePoint.y},
      })
    }
    options.setPathHandleDrag(null)
    options.setPathSubSelectionHover(null)
    return
  }
  if (options.shapeStyleHandleDrag) {
    options.commitShapeStyleHandleUpdate(options.shapeStyleHandleDrag)
    options.setShapeStyleHandleDrag(null)
    return
  }
  options.selectionDragControllerRef.current?.pointerUp()
  options.setSnapGuides([])
  options.setActiveTransformHandle(null)
  options.setHoveredTransformHandle(null)
  const pointerUpTransform = resolvePointerUpTransformResult({
    transformManagerRef: options.transformManagerRef,
    transformPreview: options.transformPreview,
    documentShapes: options.canvasRuntime.document.shapes,
  })
  if (pointerUpTransform) {
    if (pointerUpTransform.selectionShapeIds.length > 0) {
      options.handleCommand({
        type: 'selection.set',
        shapeIds: pointerUpTransform.selectionShapeIds,
        mode: 'replace',
      })
    }

    if (pointerUpTransform.transformCommand) {
      options.handleCommand(pointerUpTransform.transformCommand)
      options.markTransformPreviewCommitPending()
    } else {
      options.clearTransformPreview()
    }
    return
  }

  options.penTool.handlePointerUp()
}

/**
 * Resets transient pointer interaction state when pointer leaves the canvas viewport.
 * @param options Pointer-leave integration dependencies.
 */
export function handleCanvasPointerLeave(options: {
  clearTransformPreview: VoidFunction
  penTool: ReturnType<typeof import('../usePenTool.ts').usePenTool>
  runtimeEditingModeControllerRef: React.RefObject<ReturnType<typeof import('../../runtime/index.ts').createRuntimeEditingModeController>>
  selectionDragControllerRef: React.RefObject<import('../../runtime/interaction/index.ts').SelectionDragController>
  setActiveTransformHandle: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').HandleKind | null>>
  setHoveredTransformHandle: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').HandleKind | null>>
  setDraftPrimitive: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').DraftPrimitive | null>>
  setHoveredShapeId: React.Dispatch<React.SetStateAction<string | null>>
  setPathHandleDrag: React.Dispatch<React.SetStateAction<{
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null>>
  setShapeStyleHandleDrag: React.Dispatch<React.SetStateAction<ShapeStyleHandleDrag | null>>
  setPathSubSelectionHover: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').PathSubSelection | null>>
  setPenDraftPoints: React.Dispatch<React.SetStateAction<Array<{x: number; y: number}> | null>>
  setSnapGuides: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').SnapGuide[]>>
  transformManagerRef: React.RefObject<ReturnType<typeof import('../../runtime/interaction/index.ts').createTransformSessionManager>>
}) {
  // Clear transient interaction state when pointer leaves so next entry starts from clean runtime state.
  options.runtimeEditingModeControllerRef.current?.transition({
    to: 'idle',
    reason: 'pointer-leave',
  })
  options.transformManagerRef.current?.cancel()
  options.clearTransformPreview()
  options.setSnapGuides([])
  options.setActiveTransformHandle(null)
  options.setHoveredTransformHandle(null)
  options.selectionDragControllerRef.current?.clear()
  options.penTool.clearDraft()
  options.setPenDraftPoints(null)
  options.setPathHandleDrag(null)
  options.setShapeStyleHandleDrag(null)
  options.setDraftPrimitive(null)
  options.setHoveredShapeId(null)
  options.setPathSubSelectionHover(null)
}