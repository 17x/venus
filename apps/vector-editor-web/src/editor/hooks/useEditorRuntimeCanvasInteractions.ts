import {useMemo, useRef} from 'react'
import {nid, type ToolName} from '@venus/document-core'
import {
  collectResizeTransformTargets,
  createMarqueeState,
  createTransformPreviewShape,
  createTransformSessionShape,
  resolveDragStartTransformPayload,
  resolveSelectionHandleHitAtPoint,
  resolveSnappedTransformPreview,
  resolveTopHitShapeId,
  shouldClearSelectionOnPointerDown,
  shouldPreserveGroupDragSelection,
  updateMarqueeState,
  type MarqueeApplyMode,
  type MarqueeSelectionMode,
} from '../../runtime/interaction/index.ts'
import {createShapeElementFromTool} from './editorRuntimeHelpers.ts'
import {resolvePathSubSelectionAtPoint} from './runtime/pathSubSelection.ts'
import type {
  DraftPrimitive,
  DraftPrimitiveType,
  HandleKind,
  PathSubSelection,
  TransformPreview,
} from '../interaction/index.ts'
import type {SelectionDragController} from '../../runtime/interaction/index.ts'
import {
  handleCanvasPointerLeave,
  handleCanvasPointerUp,
} from './useEditorRuntimePointerRelease.ts'

const DEFAULT_MARQUEE_APPLY_MODE: MarqueeApplyMode = 'while-pointer-move'
const HOVER_HIT_MIN_INTERVAL_MS = 24
const HOVER_HIT_MIN_DISTANCE_PX = 2
const HOVER_GATED_EDITING_MODES: ReadonlySet<string> = new Set([
  'dragging',
  'resizing',
  'rotating',
  'panning',
  'zooming',
  'marqueeSelecting',
])

function isPathSubSelectionEqual(left: PathSubSelection | null, right: PathSubSelection | null) {
  if (left === right) {
    return true
  }
  if (!left || !right) {
    return false
  }
  if (left.shapeId !== right.shapeId || left.hitType !== right.hitType) {
    return false
  }

  const leftAnchor = left.anchorPoint
  const rightAnchor = right.anchorPoint
  if (leftAnchor || rightAnchor) {
    if (!leftAnchor || !rightAnchor) {
      return false
    }
    if (
      leftAnchor.index !== rightAnchor.index ||
      leftAnchor.x !== rightAnchor.x ||
      leftAnchor.y !== rightAnchor.y ||
      leftAnchor.segmentType !== rightAnchor.segmentType
    ) {
      return false
    }
  }

  const leftSegment = left.segment
  const rightSegment = right.segment
  if (leftSegment || rightSegment) {
    if (!leftSegment || !rightSegment) {
      return false
    }
    if (
      leftSegment.index !== rightSegment.index ||
      leftSegment.x !== rightSegment.x ||
      leftSegment.y !== rightSegment.y ||
      leftSegment.segmentType !== rightSegment.segmentType
    ) {
      return false
    }
  }

  const leftHandle = left.handlePoint
  const rightHandle = right.handlePoint
  if (leftHandle || rightHandle) {
    if (!leftHandle || !rightHandle) {
      return false
    }
    if (
      leftHandle.anchorIndex !== rightHandle.anchorIndex ||
      leftHandle.handleType !== rightHandle.handleType ||
      leftHandle.x !== rightHandle.x ||
      leftHandle.y !== rightHandle.y
    ) {
      return false
    }
  }

  return true
}

export function useEditorRuntimeCanvasInteractions(options: {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  applyMarqueeSelectionWhileMoving: (nextMarquee: import('../../runtime/interaction/index.ts').MarqueeState) => void
  canvasRuntime: ReturnType<typeof import('./useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']
  clearTransformPreview: VoidFunction
  commitPathHandleUpdate: (params: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
    point: {x: number; y: number}
  }) => void
  currentTool: ToolName
  defaultCanvasInteractions: ReturnType<typeof import('./useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['interactions']
  draftPrimitive: DraftPrimitive | null
  handleCommand: (command: import('@vector/runtime/worker').EditorRuntimeCommand) => void
  handleZoom: (zoomIn: boolean, point?: {x: number; y: number}) => void
  hoveredShapeId: string | null
  insertElement: (element: import('@lite-u/editor/types').ElementProps) => void
  interactionDocument: ReturnType<typeof import('./useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['document']
  marquee: import('../../runtime/interaction/index.ts').MarqueeState | null
  markTransformPreviewCommitPending: VoidFunction
  pathHandleDrag: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null
  pathSubSelection: PathSubSelection | null
  pathSubSelectionHover: PathSubSelection | null
  penTool: ReturnType<typeof import('./usePenTool.ts').usePenTool>
  previewShapeById: Map<string, import('@venus/document-core').DocumentNode>
  previewShapes: ReturnType<typeof import('./useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['shapes']
  resolveDraftPrimitiveType: (toolName: ToolName) => DraftPrimitiveType | null
  runtimeEditingModeControllerRef: React.RefObject<ReturnType<typeof import('@vector/runtime').createRuntimeEditingModeController>>
  runtimeShapeById: Map<string, ReturnType<typeof import('./useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['shapes'][number]>
  selectedShapeIds: string[]
  selectionDragControllerRef: React.RefObject<SelectionDragController>
  selectionState: ReturnType<typeof import('../interaction/index.ts').buildSelectionState>
  setActiveTransformHandle: React.Dispatch<React.SetStateAction<HandleKind | null>>
  setDraftPrimitive: React.Dispatch<React.SetStateAction<DraftPrimitive | null>>
  setHoveredShapeId: React.Dispatch<React.SetStateAction<string | null>>
  setMarquee: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').MarqueeState | null>>
  setPathHandleDrag: React.Dispatch<React.SetStateAction<{
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null>>
  setPathSubSelection: React.Dispatch<React.SetStateAction<PathSubSelection | null>>
  setPathSubSelectionHover: React.Dispatch<React.SetStateAction<PathSubSelection | null>>
  setPenDraftPoints: React.Dispatch<React.SetStateAction<Array<{x: number; y: number}> | null>>
  setSnapGuides: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').SnapGuide[]>>
  setTransformPreview: (next: TransformPreview | null) => void
  snappingEnabled: boolean
  transformManagerRef: React.RefObject<ReturnType<typeof import('../interaction/index.ts').createTransformSessionManager>>
  transformPreview: TransformPreview | null
  marqueeApplyControllerRef: React.RefObject<ReturnType<typeof import('../../runtime/interaction/index.ts').createMarqueeSelectionApplyController>>
}) {
  const hoverHitBudgetRef = useRef<{
    lastAt: number
    lastPoint: {x: number; y: number} | null
  }>({
    lastAt: 0,
    lastPoint: null,
  })

  const shouldResolveHoverHit = (point: {x: number; y: number}) => {
    const now = performance.now()
    const elapsedMs = now - hoverHitBudgetRef.current.lastAt
    const previousPoint = hoverHitBudgetRef.current.lastPoint
    const movedDistance = previousPoint
      ? Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y)
      : Number.POSITIVE_INFINITY
    if (
      elapsedMs < HOVER_HIT_MIN_INTERVAL_MS &&
      movedDistance < HOVER_HIT_MIN_DISTANCE_PX
    ) {
      return false
    }

    hoverHitBudgetRef.current = {
      lastAt: now,
      lastPoint: point,
    }
    return true
  }

  return useMemo(() => ({
    onPointerMove: (point: {x: number; y: number}) => {
      const clearSnapGuides = () => {
        options.setSnapGuides((current) => (current.length === 0 ? current : []))
      }
      const clearHoveredShape = () => {
        options.setHoveredShapeId((current) => (current === null ? current : null))
      }
      const setHoveredShape = (nextHoveredShapeId: string | null) => {
        options.setHoveredShapeId((current) => (current === nextHoveredShapeId ? current : nextHoveredShapeId))
      }

      const transformSession = options.transformManagerRef.current?.getSession()
      if (transformSession) {
        clearHoveredShape()
        const preview = options.transformManagerRef.current?.update(point)
        if (preview) {
          const maybeSnapped = resolveSnappedTransformPreview(preview, {
            handle: transformSession.handle,
            snappingEnabled: options.snappingEnabled,
            previewDocument: options.interactionDocument,
          })
          options.setSnapGuides(maybeSnapped.guides)
          options.setTransformPreview(maybeSnapped.preview)
        }
        return
      }
      if (options.marquee) {
        clearSnapGuides()
        clearHoveredShape()
        options.setMarquee((current: ReturnType<typeof createMarqueeState> | null) => {
          if (!current) {
            return current
          }
          const nextMarquee = updateMarqueeState(current, point)
          options.applyMarqueeSelectionWhileMoving(nextMarquee)
          return nextMarquee
        })
        return
      }
      if (options.pathHandleDrag && options.currentTool === 'dselector') {
        const nextPathSelectionHover: PathSubSelection = {
          shapeId: options.pathHandleDrag.shapeId,
          hitType: options.pathHandleDrag.handleType,
          handlePoint: {
            anchorIndex: options.pathHandleDrag.anchorIndex,
            handleType: options.pathHandleDrag.handleType,
            x: point.x,
            y: point.y,
          },
        }
        options.setPathSubSelectionHover((current) => {
          return isPathSubSelectionEqual(current, nextPathSelectionHover)
            ? current
            : nextPathSelectionHover
        })
        clearSnapGuides()
        clearHoveredShape()
        return
      }
      if (options.draftPrimitive) {
        clearSnapGuides()
        clearHoveredShape()
        options.setDraftPrimitive((current) => {
          if (!current) {
            return current
          }
          const start = current.points[0] ?? point
          return {
            ...current,
            points: [start, point],
            bounds: {
              minX: Math.min(start.x, point.x),
              minY: Math.min(start.y, point.y),
              maxX: Math.max(start.x, point.x),
              maxY: Math.max(start.y, point.y),
            },
          }
        })
        return
      }
      if (options.currentTool === 'selector' || options.currentTool === 'dselector') {
        const dragMove = options.selectionDragControllerRef.current?.pointerMove(point, {
          document: options.interactionDocument,
          shapes: options.canvasRuntime.shapes,
        })
        if (dragMove?.phase === 'pending') {
          clearSnapGuides()
          clearHoveredShape()
          return
        }
        if ((dragMove?.phase === 'started' || dragMove?.phase === 'dragging') && dragMove.session) {
          clearHoveredShape()
          if (dragMove.phase === 'started') {
            const dragStart = resolveDragStartTransformPayload(dragMove.session, options.previewShapeById)
            if (dragStart) {
              options.transformManagerRef.current?.start({
                shapeIds: dragStart.shapeIds,
                shapes: dragStart.sessionShapes,
                handle: 'move',
                pointer: dragStart.pointer,
                startBounds: dragStart.startBounds,
              })
              options.setActiveTransformHandle('move')
              options.runtimeEditingModeControllerRef.current?.transition({
                to: 'dragging',
                reason: 'selection-drag-start',
              })
              options.setTransformPreview({
                shapes: dragStart.previewShapes,
              })
            }
          }

          const preview = options.transformManagerRef.current?.update(point)
          if (preview) {
            const transformSession = options.transformManagerRef.current?.getSession()
            const maybeSnapped = resolveSnappedTransformPreview(preview, {
              handle: transformSession?.handle,
              snappingEnabled: options.snappingEnabled,
              previewDocument: options.interactionDocument,
            })
            options.setSnapGuides(maybeSnapped.guides)
            options.setTransformPreview(maybeSnapped.preview)
          }
          return
        }
        clearSnapGuides()
      }
      if (options.currentTool === 'dselector') {
        const nextPathSubSelectionHover = resolvePathSubSelectionAtPoint(
          options.interactionDocument,
          options.previewShapes,
          point,
          {tolerance: 8},
        )
        options.setPathSubSelectionHover((current) => {
          return isPathSubSelectionEqual(current, nextPathSubSelectionHover)
            ? current
            : nextPathSubSelectionHover
        })
        return
      }
      if (options.penTool.handlePointerMove(point)) {
        clearHoveredShape()
        clearSnapGuides()
        return
      }

      const currentEditingMode =
        options.runtimeEditingModeControllerRef.current?.getCurrentMode()
      if (
        currentEditingMode &&
        HOVER_GATED_EDITING_MODES.has(currentEditingMode)
      ) {
        clearHoveredShape()
        return
      }

      if (!shouldResolveHoverHit(point)) {
        return
      }

      clearSnapGuides()
      setHoveredShape(resolveTopHitShapeId(options.interactionDocument, options.canvasRuntime.shapes, point, {
        hitMode: 'bbox_then_exact',
        maxExactCandidateCount: 3,
        allowFrameSelection: false,
        tolerance: 6,
        excludeClipBoundImage: true,
        clipTolerance: 1.5,
      }))
    },
    onPointerDown: (point: {x: number; y: number}, modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean}) => {
      options.setHoveredShapeId(null)
      if (options.currentTool === 'zoomIn' || options.currentTool === 'zoomOut') {
        options.runtimeEditingModeControllerRef.current?.transition({
          to: 'zooming',
          reason: `pointer-down:${options.currentTool}`,
        })
        options.handleZoom(options.currentTool === 'zoomIn', point)
        return
      }

      if (options.currentTool === 'selector' || options.currentTool === 'dselector') {
        if (options.currentTool === 'dselector') {
          const nextPathSubSelection = resolvePathSubSelectionAtPoint(
            options.interactionDocument,
            options.previewShapes,
            point,
            {tolerance: 8},
          )
          if (nextPathSubSelection) {
            if ((nextPathSubSelection.hitType === 'inHandle' || nextPathSubSelection.hitType === 'outHandle') && nextPathSubSelection.handlePoint) {
              options.setPathHandleDrag({
                shapeId: nextPathSubSelection.shapeId,
                anchorIndex: nextPathSubSelection.handlePoint.anchorIndex,
                handleType: nextPathSubSelection.handlePoint.handleType,
              })
            }
            options.setPathSubSelection(nextPathSubSelection)
            options.setPathSubSelectionHover(nextPathSubSelection)
            options.setSnapGuides([])
            return
          }
        }

        options.runtimeEditingModeControllerRef.current?.transition({
          to: options.currentTool === 'dselector' ? 'directSelecting' : 'selecting',
          reason: `pointer-down:${options.currentTool}`,
        })
        const handleTolerance = 6
        const {
          selectedNodes,
          selectedBounds,
          singleSelectedRotation,
          handle,
        } = resolveSelectionHandleHitAtPoint({
          point,
          selectedShapeIds: options.selectedShapeIds,
          shapeById: options.previewShapeById,
          selectedBounds: options.selectionState.selectedBounds,
          handleTolerance,
        })

        if (handle && selectedBounds && selectedNodes.length > 0) {
          const resizeTargets = handle.kind === 'rotate'
            ? selectedNodes
            : collectResizeTransformTargets(selectedNodes, options.interactionDocument)
          options.selectionDragControllerRef.current?.clear()
          options.transformManagerRef.current?.start({
            shapeIds: selectedNodes.map((shape) => shape.id),
            shapes: resizeTargets.map((shape) => createTransformSessionShape(shape)),
            handle: handle.kind,
            pointer: point,
            startBounds: selectedBounds,
          })
          options.setActiveTransformHandle(handle.kind)
          options.runtimeEditingModeControllerRef.current?.transition({
            to: handle.kind === 'rotate' ? 'rotating' : 'resizing',
            reason: `transform-handle:${handle.kind}`,
          })
          options.setTransformPreview({
            shapes: resizeTargets.map((shape) => createTransformPreviewShape(shape)),
          })
          options.setSnapGuides([])
          return
        }

        if (shouldClearSelectionOnPointerDown(point, {
          selectedBounds,
          selectedNodes,
          singleSelectedRotation,
          shapeById: options.previewShapeById,
          tolerance: handleTolerance,
        })) {
          options.selectionDragControllerRef.current?.clear()
          options.handleCommand({
            type: 'selection.set',
            shapeIds: [],
            mode: 'replace',
          })
          return
        }

        const hoveredShape = options.hoveredShapeId
          ? options.runtimeShapeById.get(options.hoveredShapeId) ?? null
          : null
        const hasHit = options.selectionDragControllerRef.current?.pointerDown(point, {
          document: options.interactionDocument,
          shapes: options.canvasRuntime.shapes,
        }, modifiers, {
          hitShapeId: hoveredShape?.id ?? null,
          preferGroupSelection: options.currentTool === 'selector' && !(modifiers?.metaKey || modifiers?.ctrlKey),
        })

        if (hasHit) {
          options.setSnapGuides([])
          const preserveGroupDragSelection = shouldPreserveGroupDragSelection({
            modifiers,
            hoveredShapeId: hoveredShape?.id ?? null,
            selectedNodes,
            shapeById: options.previewShapeById,
          })

          if (!preserveGroupDragSelection) {
            options.defaultCanvasInteractions.onPointerDown(point, modifiers)
          }
          return
        }

        options.selectionDragControllerRef.current?.clear()
        options.setSnapGuides([])
        const marqueeMode: MarqueeSelectionMode = modifiers?.shiftKey
          ? 'add'
          : modifiers?.altKey
            ? 'remove'
            : (modifiers?.metaKey || modifiers?.ctrlKey)
              ? 'toggle'
              : 'replace'
        options.setHoveredShapeId(null)
        options.marqueeApplyControllerRef.current?.reset()
        options.setMarquee(createMarqueeState(point, marqueeMode, {
          applyMode: DEFAULT_MARQUEE_APPLY_MODE,
        }))
        options.runtimeEditingModeControllerRef.current?.transition({
          to: 'marqueeSelecting',
          reason: 'marquee-start',
        })
        return
      }

      const draftPrimitiveType = options.resolveDraftPrimitiveType(options.currentTool)
      if (draftPrimitiveType) {
        options.setSnapGuides([])
        options.setPathSubSelectionHover(null)
        options.runtimeEditingModeControllerRef.current?.transition({
          to: 'insertingShape',
          reason: `draft-shape:${options.currentTool}`,
        })
        options.setDraftPrimitive({
          id: nid(),
          type: draftPrimitiveType,
          points: [point, point],
          bounds: {
            minX: point.x,
            minY: point.y,
            maxX: point.x,
            maxY: point.y,
          },
        })
        return
      }

      const shapeFromTool = createShapeElementFromTool(options.currentTool, point)
      if (shapeFromTool) {
        options.setSnapGuides([])
        options.runtimeEditingModeControllerRef.current?.transition({
          to: 'insertingShape',
          reason: `insert-shape:${options.currentTool}`,
        })
        options.insertElement(shapeFromTool)
        return
      }

      if (options.penTool.handlePointerDown(point)) {
        options.selectionDragControllerRef.current?.clear()
        options.setSnapGuides([])
        options.runtimeEditingModeControllerRef.current?.transition({
          to: options.currentTool === 'path' ? 'drawingPath' : 'drawingPencil',
          reason: `draw-start:${options.currentTool}`,
        })
        return
      }

      options.selectionDragControllerRef.current?.clear()
      options.setSnapGuides([])
      options.defaultCanvasInteractions.onPointerDown(point, modifiers)
    },
    onPointerUp: () => {
      handleCanvasPointerUp(options)
    },
    onPointerLeave: () => {
      handleCanvasPointerLeave(options)
    },
    onViewportChange: options.defaultCanvasInteractions.onViewportChange,
    onViewportPan: options.defaultCanvasInteractions.onViewportPan,
    onViewportResize: options.defaultCanvasInteractions.onViewportResize,
    onViewportZoom: options.defaultCanvasInteractions.onViewportZoom,
    onContextMenu: options.defaultCanvasInteractions.onContextMenu,
  }), [options])
}