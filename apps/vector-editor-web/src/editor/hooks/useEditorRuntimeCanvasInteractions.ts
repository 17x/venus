import {useMemo, useRef} from 'react'
import {type ToolName} from '@vector/model'
import {
  createMarqueeState,
  resolveSelectionHandleHitAtPoint,
  resolveTopHitShapeId,
  updateMarqueeState,
  type MarqueeApplyMode,
} from '../../runtime/interaction/index.ts'
import {resolvePathSubSelectionAtPoint} from './runtime/pathSubSelection.ts'
import {
  resolveDraftPrimitivePointerDownState,
  resolveHoverHitTestOptions,
  resolveInsertShapePointerDownState,
  isPathSubSelectionEqual,
  resolveMarqueePointerDownState,
  resolvePenPointerDownState,
  resolvePathHandleDragPointerMoveState,
  resolveDraftPrimitivePointerMoveState,
  resolvePointerMovePathSubSelectionHoverState,
  resolvePointerDownPathSubSelectionState,
  resolveSelectionDragMovePreviewState,
  resolveSelectionDragMoveStartState,
  resolveSelectionPointerDownHitOptions,
  resolveTransformHandlePointerDownState,
  shouldGateHoverForEditingMode,
  shouldClearSelectionOnSelectorPointerDown,
  shouldPreserveGroupDragSelectionOnPointerDown,
  shouldResolveHoverHit,
  type HoverHitBudgetState,
} from './useEditorRuntime.helpers.ts'
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
  previewShapeById: Map<string, import('@vector/model').DocumentNode>
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
  const hoverHitBudgetRef = useRef<HoverHitBudgetState>({
    lastAt: 0,
    lastPoint: null,
  })

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
          const transformPreviewState = resolveSelectionDragMovePreviewState({
            preview,
            handle: transformSession.handle,
            snappingEnabled: options.snappingEnabled,
            previewDocument: options.interactionDocument,
          })
          options.setSnapGuides(transformPreviewState.snapGuides)
          options.setTransformPreview(transformPreviewState.transformPreview)
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
        const nextPathSelectionHover = resolvePathHandleDragPointerMoveState({
          shapeId: options.pathHandleDrag.shapeId,
          anchorIndex: options.pathHandleDrag.anchorIndex,
          handleType: options.pathHandleDrag.handleType,
          point,
        })
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
          return resolveDraftPrimitivePointerMoveState({
            current,
            point,
          })
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
            const dragStartState = resolveSelectionDragMoveStartState({
              session: dragMove.session,
              shapeById: options.previewShapeById,
            })
            if (dragStartState) {
              options.transformManagerRef.current?.start({
                shapeIds: dragStartState.shapeIds,
                shapes: dragStartState.sessionShapes,
                handle: dragStartState.handle,
                pointer: dragStartState.pointer,
                startBounds: dragStartState.startBounds,
              })
              options.setActiveTransformHandle(dragStartState.activeTransformHandle)
              options.runtimeEditingModeControllerRef.current?.transition({
                to: dragStartState.nextEditingMode,
                reason: dragStartState.transitionReason,
              })
              options.setTransformPreview({
                shapes: dragStartState.previewShapes,
              })
            }
          }

          const preview = options.transformManagerRef.current?.update(point)
          if (preview) {
            const transformPreviewState = resolveSelectionDragMovePreviewState({
              preview,
              handle: options.transformManagerRef.current?.getSession()?.handle,
              snappingEnabled: options.snappingEnabled,
              previewDocument: options.interactionDocument,
            })
            options.setSnapGuides(transformPreviewState.snapGuides)
            options.setTransformPreview(transformPreviewState.transformPreview)
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
        options.setPathSubSelectionHover(
          resolvePointerMovePathSubSelectionHoverState(nextPathSubSelectionHover),
        )
        return
      }
      if (options.penTool.handlePointerMove(point)) {
        clearHoveredShape()
        clearSnapGuides()
        return
      }

      const currentEditingMode =
        options.runtimeEditingModeControllerRef.current?.getCurrentMode()
      if (shouldGateHoverForEditingMode(currentEditingMode)) {
        clearHoveredShape()
        return
      }

      const hoverResolution = shouldResolveHoverHit(
        point,
        hoverHitBudgetRef.current,
        {
          minIntervalMs: HOVER_HIT_MIN_INTERVAL_MS,
          minDistancePx: HOVER_HIT_MIN_DISTANCE_PX,
        },
      )
      hoverHitBudgetRef.current = hoverResolution.nextBudget

      if (!hoverResolution.shouldResolve) {
        return
      }

      clearSnapGuides()
      setHoveredShape(resolveTopHitShapeId(
        options.interactionDocument,
        options.canvasRuntime.shapes,
        point,
        resolveHoverHitTestOptions(),
      ))
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
          const pathSubSelectionState = resolvePointerDownPathSubSelectionState(nextPathSubSelection)
          if (pathSubSelectionState) {
            if (pathSubSelectionState.pathHandleDrag) {
              options.setPathHandleDrag(pathSubSelectionState.pathHandleDrag)
            }
            options.setPathSubSelection(pathSubSelectionState.pathSubSelection)
            options.setPathSubSelectionHover(pathSubSelectionState.pathSubSelectionHover)
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
          const transformHandleState = resolveTransformHandlePointerDownState({
            handleKind: handle.kind,
            selectedNodes,
            selectedBounds,
            interactionDocument: options.interactionDocument,
          })
          options.selectionDragControllerRef.current?.clear()
          options.transformManagerRef.current?.start({
            shapeIds: transformHandleState.shapeIds,
            shapes: transformHandleState.sessionShapes,
            handle: transformHandleState.handle,
            pointer: point,
            startBounds: transformHandleState.startBounds,
          })
          options.setActiveTransformHandle(transformHandleState.handle)
          options.runtimeEditingModeControllerRef.current?.transition({
            to: transformHandleState.nextEditingMode,
            reason: `transform-handle:${transformHandleState.handle}`,
          })
          options.setTransformPreview({
            shapes: transformHandleState.previewShapes,
          })
          options.setSnapGuides([])
          return
        }

        if (shouldClearSelectionOnSelectorPointerDown({
          point,
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

        const selectionHitOptions = resolveSelectionPointerDownHitOptions({
          currentTool: options.currentTool,
          hoveredShapeId: options.hoveredShapeId,
          modifiers,
        })
        const hasHit = options.selectionDragControllerRef.current?.pointerDown(point, {
          document: options.interactionDocument,
          shapes: options.canvasRuntime.shapes,
        }, modifiers, selectionHitOptions)

        if (hasHit) {
          options.setSnapGuides([])
          const preserveGroupDragSelection = shouldPreserveGroupDragSelectionOnPointerDown({
            modifiers,
            hoveredShapeId: selectionHitOptions.hitShapeId,
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
        const marqueeState = resolveMarqueePointerDownState({
          point,
          modifiers,
          applyMode: DEFAULT_MARQUEE_APPLY_MODE,
        })
        options.setHoveredShapeId(null)
        options.marqueeApplyControllerRef.current?.reset()
        options.setMarquee(marqueeState.marquee)
        options.runtimeEditingModeControllerRef.current?.transition({
          to: marqueeState.nextEditingMode,
          reason: marqueeState.transitionReason,
        })
        return
      }

      const draftPrimitiveType = options.resolveDraftPrimitiveType(options.currentTool)
      if (draftPrimitiveType) {
        const draftPrimitiveState = resolveDraftPrimitivePointerDownState({
          point,
          draftPrimitiveType,
          currentTool: options.currentTool,
        })
        options.setSnapGuides([])
        options.setPathSubSelectionHover(null)
        options.runtimeEditingModeControllerRef.current?.transition({
          to: draftPrimitiveState.nextEditingMode,
          reason: draftPrimitiveState.transitionReason,
        })
        options.setDraftPrimitive(draftPrimitiveState.draftPrimitive)
        return
      }

      const insertShapeState = resolveInsertShapePointerDownState({
        currentTool: options.currentTool,
        point,
      })
      if (insertShapeState) {
        options.setSnapGuides([])
        options.runtimeEditingModeControllerRef.current?.transition({
          to: insertShapeState.nextEditingMode,
          reason: insertShapeState.transitionReason,
        })
        options.insertElement(insertShapeState.shape)
        return
      }

      if (options.penTool.handlePointerDown(point)) {
        const penPointerDownState = resolvePenPointerDownState({
          currentTool: options.currentTool,
        })
        options.selectionDragControllerRef.current?.clear()
        options.setSnapGuides([])
        options.runtimeEditingModeControllerRef.current?.transition({
          to: penPointerDownState.nextEditingMode,
          reason: penPointerDownState.transitionReason,
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