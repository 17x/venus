import {
  resolvePointerUpMarqueeSelection,
  resolvePointerUpTransformCommit,
} from '../interaction/runtime/index.ts'
import {createShapeElementFromDrag, createShapeElementFromTool} from './editorRuntimeHelpers.ts'
import {formatSelectionNames} from './useEditorRuntime.helpers.ts'

export function handleCanvasPointerUp(options: {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  canvasRuntime: ReturnType<typeof import('./useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']
  clearTransformPreview: VoidFunction
  commitPathHandleUpdate: (params: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
    point: {x: number; y: number}
  }) => void
  currentTool: import('@venus/document-core').ToolName
  draftPrimitive: import('../interaction/index.ts').DraftPrimitive | null
  handleCommand: (command: import('@vector/runtime/worker').EditorRuntimeCommand) => void
  insertElement: (element: import('@lite-u/editor/types').ElementProps) => void
  interactionDocument: ReturnType<typeof import('./useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['document']
  marquee: import('../interaction/runtime/index.ts').MarqueeState | null
  markTransformPreviewCommitPending: VoidFunction
  marqueeApplyControllerRef: React.RefObject<ReturnType<typeof import('../interaction/runtime/index.ts').createMarqueeSelectionApplyController>>
  pathHandleDrag: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null
  pathSubSelection: import('../interaction/index.ts').PathSubSelection | null
  pathSubSelectionHover: import('../interaction/index.ts').PathSubSelection | null
  penTool: ReturnType<typeof import('./usePenTool.ts').usePenTool>
  runtimeEditingModeControllerRef: React.RefObject<ReturnType<typeof import('@vector/runtime').createRuntimeEditingModeController>>
  setActiveTransformHandle: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').HandleKind | null>>
  setDraftPrimitive: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').DraftPrimitive | null>>
  setHoveredShapeId: React.Dispatch<React.SetStateAction<string | null>>
  setMarquee: React.Dispatch<React.SetStateAction<import('../interaction/runtime/index.ts').MarqueeState | null>>
  setPathHandleDrag: React.Dispatch<React.SetStateAction<{
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null>>
  setPathSubSelectionHover: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').PathSubSelection | null>>
  setSnapGuides: React.Dispatch<React.SetStateAction<import('../interaction/runtime/index.ts').SnapGuide[]>>
  selectionDragControllerRef: React.RefObject<import('../interaction/runtime/index.ts').SelectionDragController>
  transformManagerRef: React.RefObject<ReturnType<typeof import('../interaction/index.ts').createTransformSessionManager>>
  transformPreview: import('../interaction/index.ts').TransformPreview | null
}) {
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
  options.selectionDragControllerRef.current?.pointerUp()
  options.setSnapGuides([])
  options.setActiveTransformHandle(null)
  const pointerUpTransform = resolvePointerUpTransformCommit(
    options.transformManagerRef.current?.commit(),
    options.transformPreview,
    options.canvasRuntime.document.shapes,
  )
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

  const pointerUpMarquee = resolvePointerUpMarqueeSelection(options.marquee, options.interactionDocument.shapes, {
    matchMode: 'contain',
    excludeShape: (shape) => shape.type === 'frame',
  })
  if (pointerUpMarquee) {
    options.handleCommand({
      type: 'selection.set',
      shapeIds: pointerUpMarquee.shapeIds,
      mode: pointerUpMarquee.mode,
    })
    options.marqueeApplyControllerRef.current?.reset()
    options.add(`Selection: ${formatSelectionNames(options.interactionDocument, pointerUpMarquee.shapeIds)}`, 'info')
    options.setMarquee(null)
    return
  }

  options.penTool.handlePointerUp()
}

export function handleCanvasPointerLeave(options: {
  clearTransformPreview: VoidFunction
  marqueeApplyControllerRef: React.RefObject<ReturnType<typeof import('../interaction/runtime/index.ts').createMarqueeSelectionApplyController>>
  penTool: ReturnType<typeof import('./usePenTool.ts').usePenTool>
  runtimeEditingModeControllerRef: React.RefObject<ReturnType<typeof import('@vector/runtime').createRuntimeEditingModeController>>
  selectionDragControllerRef: React.RefObject<import('../interaction/runtime/index.ts').SelectionDragController>
  setActiveTransformHandle: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').HandleKind | null>>
  setDraftPrimitive: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').DraftPrimitive | null>>
  setHoveredShapeId: React.Dispatch<React.SetStateAction<string | null>>
  setMarquee: React.Dispatch<React.SetStateAction<import('../interaction/runtime/index.ts').MarqueeState | null>>
  setPathHandleDrag: React.Dispatch<React.SetStateAction<{
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null>>
  setPathSubSelectionHover: React.Dispatch<React.SetStateAction<import('../interaction/index.ts').PathSubSelection | null>>
  setPenDraftPoints: React.Dispatch<React.SetStateAction<Array<{x: number; y: number}> | null>>
  setSnapGuides: React.Dispatch<React.SetStateAction<import('../interaction/runtime/index.ts').SnapGuide[]>>
  transformManagerRef: React.RefObject<ReturnType<typeof import('../interaction/index.ts').createTransformSessionManager>>
}) {
  options.runtimeEditingModeControllerRef.current?.transition({
    to: 'idle',
    reason: 'pointer-leave',
  })
  options.transformManagerRef.current?.cancel()
  options.clearTransformPreview()
  options.setSnapGuides([])
  options.setActiveTransformHandle(null)
  options.selectionDragControllerRef.current?.clear()
  options.setMarquee(null)
  options.marqueeApplyControllerRef.current?.reset()
  options.penTool.clearDraft()
  options.setPenDraftPoints(null)
  options.setPathHandleDrag(null)
  options.setDraftPrimitive(null)
  options.setHoveredShapeId(null)
  options.setPathSubSelectionHover(null)
}