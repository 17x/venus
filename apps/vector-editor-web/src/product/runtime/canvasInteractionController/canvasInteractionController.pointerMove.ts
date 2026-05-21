import {
  resolvePointerSelectorPointerMove,
} from '@venus/editor-primitive'
import {
  resolveEngineAdaptiveHitTolerance,
} from '../../../runtime/engine-bridge/engine.ts'
import {resolvePathSubSelectionAtPoint} from '../pathSubSelection.ts'
import {
  resolvePathHandleDragPointerMoveState,
  resolveDraftPrimitivePointerMoveState,
  resolvePointerMovePathSubSelectionHoverState,
  resolveSelectionDragMoveStartState,
  shouldGateHoverForEditingMode,
  shouldResolveHoverHit,
} from '../../useEditorRuntime/helpers.ts'
import {isPathSubSelectionEqual} from '../../useEditorRuntime/selectionAndCommands.ts'
import {
  resolveHoverSelectorQueryOptions,
} from '../commandResolvers.ts'
import {
  buildVectorOverlayModel,
  resolveVectorOverlayHit,
} from '../../../runtime/primitive/index.ts'
import {resolveShapeStyleControls, type ShapeStyleHandleDrag} from '../shapeStyleHandles.ts'
import {
  applyTransformPreviewFromManager,
  resolveMarqueeControlSizing,
  resolveMarqueeTransformHandleAtPoint,
} from '../transformInteractionPolicy.ts'
import {resolveShapeStyleDragFromBehavior} from './shapeStyleDragResolver.ts'
import {applyRuntimeEditingModeTransition} from '../runtimeEditingModeTransitionPolicy.ts'
import {
  resolveRuntimeHitPriorityPlan,
  resolveRuntimePointerSelectorPhase,
} from '../hitPriorityPolicy.ts'
import {filterRuntimeSelectionCandidateIds} from '../selectionFilterPolicy.ts'
import type {
  EditorRuntimeCanvasInteractionControllerOptions,
  EditorRuntimeCanvasInteractionControllerState,
} from './canvasInteractionController.types.ts'

const HOVER_HIT_MIN_INTERVAL_MS = 24
const HOVER_HIT_MIN_DISTANCE_PX = 2

/**
 * Resolves hovered marquee handle via shared overlay hit policy.
 * @param point Pointer world position.
 * @param options Canvas interaction controller options.
 */
function resolveHoveredMarqueeHandle(
  point: {x: number; y: number},
  options: EditorRuntimeCanvasInteractionControllerOptions,
) {
  return resolveMarqueeTransformHandleAtPoint({
    point,
    selectedShapeIds: options.selectedShapeIds,
    previewShapeById: options.previewShapeById,
    selectedBounds: options.selectionState.selectedBounds,
    viewportScale: options.canvasRuntime.viewport.scale,
    sceneVersion: options.canvasRuntime.stats.version,
  })
}

/**
 * Resolves element-specific style-handle hover hit through overlay control model.
 * @param point Pointer world position.
 * @param options Canvas interaction controller options.
 */
function resolveHoveredShapeStyleHandle(
  point: {x: number; y: number},
  options: EditorRuntimeCanvasInteractionControllerOptions,
): ShapeStyleHandleDrag | null {
  if (!options.selectionState.selectedBounds || options.selectedShapeIds.length === 0) {
    return null
  }

  const selectedNodes = options.selectedShapeIds
    .map((id) => options.previewShapeById.get(id))
    .filter((shape): shape is import('../../../runtime/model/index.ts').DocumentNode => Boolean(shape))
  const singleSelectionRotation = selectedNodes.length === 1
    ? (selectedNodes[0].rotation ?? 0)
    : 0
  const sizing = resolveMarqueeControlSizing(options.canvasRuntime.viewport.scale)
  const styleControls = resolveShapeStyleControls({
    selectedShapeIds: options.selectedShapeIds,
    previewShapeById: options.previewShapeById,
    handleToleranceWorld: sizing.cornerToleranceWorld,
    minRectHandleInsetWorld: sizing.cornerToleranceWorld,
    activeDrag: null,
  })
  if (styleControls.length === 0) {
    return null
  }

  const overlayModel = buildVectorOverlayModel({
    selectedBounds: options.selectionState.selectedBounds,
    selectionRotationDegrees: singleSelectionRotation,
    selectedShapeIds: options.selectedShapeIds,
    marqueeBounds: null,
    hoveredShapeBounds: null,
    hoveredShapePolygon: null,
    hoveredShapeId: null,
    edgeToleranceWorld: sizing.edgeToleranceWorld,
    cornerToleranceWorld: sizing.cornerToleranceWorld,
    rotateSectorInnerRadiusWorld: sizing.rotateSectorInnerRadiusWorld,
    rotateSectorOuterRadiusWorld: sizing.rotateSectorOuterRadiusWorld,
    rotateCornerOffsetWorld: sizing.rotateCornerOffsetWorld,
    extraControls: styleControls,
    version: options.canvasRuntime.stats.version,
  })
  const hit = resolveVectorOverlayHit({
    pointer: point,
    model: overlayModel,
  })
  return resolveShapeStyleDragFromBehavior(hit?.control.dragBehavior, point)
}

/**
 * Creates pointer-move handler for canvas runtime interactions.
 * @param options Canvas interaction controller options.
 * @param controllerState Mutable controller state shared across pointer events.
 */
export function createPointerMoveHandler(
  options: EditorRuntimeCanvasInteractionControllerOptions,
  controllerState: EditorRuntimeCanvasInteractionControllerState,
) {
  return (point: {x: number; y: number}) => {
    // Emit runtime pointer lifecycle events so non-React subscribers can observe input flow.
    options.interactionBridge.dispatch({
      type: 'input.pointer.move',
    })
    const adaptiveHitTolerance = resolveEngineAdaptiveHitTolerance({
      viewportScale: options.canvasRuntime.viewport.scale,
      viewportWidth: options.canvasRuntime.viewport.viewportWidth,
      viewportHeight: options.canvasRuntime.viewport.viewportHeight,
    })
    const clearSnapGuides = () => {
      options.setSnapGuides((current) => (current.length === 0 ? current : []))
    }
    const clearHoveredTransformHandle = () => {
      options.setHoveredTransformHandle((current) => (current === null ? current : null))
    }
    const clearHoveredShape = () => {
      options.setHoveredShapeId((current) => (current === null ? current : null))
    }
    const clearSelectorOverlays = () => {
      options.setSelectorOverlayItems((current) => (current.length === 0 ? current : []))
    }
    const setHoveredShape = (nextHoveredShapeId: string | null) => {
      options.setHoveredShapeId((current) => (current === nextHoveredShapeId ? current : nextHoveredShapeId))
    }

    const transformSession = options.transformManagerRef.current?.getSession()
    if (transformSession) {
      // Active transform owns the pointer channel; hover handles must clear.
      // Drop pointer-selector overlays as soon as transform session is active
      // so prior marquee box cannot remain as one-frame residue.
      clearSelectorOverlays()
      clearHoveredTransformHandle()
      clearHoveredShape()
      applyTransformPreviewFromManager({
        point,
        transformManagerRef: options.transformManagerRef,
        snappingEnabled: options.snappingEnabled,
        previewDocument: options.interactionDocument,
        viewportScale: options.canvasRuntime.viewport.scale,
        setSnapGuides: options.setSnapGuides,
        setTransformPreview: options.setTransformPreview,
      })
      return
    }
    if (options.pathHandleDrag && options.currentTool === 'dselector') {
      // Path handle drag suppresses transform-handle hover feedback.
      clearHoveredTransformHandle()
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
    if (options.shapeStyleHandleDrag && (options.currentTool === 'selector' || options.currentTool === 'dselector')) {
      // Style-handle drags own pointer updates until pointer-up commit.
      clearHoveredTransformHandle()
      clearSnapGuides()
      clearHoveredShape()
      options.setShapeStyleHandleDrag((current) => {
        if (!current) {
          return current
        }
        if (current.kind === 'rect-radius') {
          return {
            kind: 'rect-radius',
            payload: {
              ...current.payload,
              point,
            },
          }
        }
        return {
          kind: 'ellipse-arc',
          payload: {
            ...current.payload,
            point,
          },
        }
      })
      return
    }
    if (options.draftPrimitive) {
      // Draft insertion suppresses transform-handle hover feedback.
      clearHoveredTransformHandle()
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
      // Prioritize drag-session updates before hover-control hit tests so
      // pointer movement over the selected body cannot delay drag start.
      const dragMove = options.selectionDragControllerRef.current?.pointerMove(point, {
        document: options.interactionDocument,
        shapes: options.canvasRuntime.shapes,
      })
      if (dragMove?.phase === 'pending') {
        clearHoveredTransformHandle()
        clearSnapGuides()
        clearHoveredShape()
        return
      }
      if ((dragMove?.phase === 'started' || dragMove?.phase === 'dragging') && dragMove.session) {
        // Selection drag handoff to transform preview must clear selector
        // overlays immediately to prevent stale marquee outlines from persisting.
        clearSelectorOverlays()
        clearHoveredTransformHandle()
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
            applyRuntimeEditingModeTransition(options.runtimeEditingModeControllerRef.current, {
              to: dragStartState.nextEditingMode,
              reason: dragStartState.transitionReason,
            })
            options.setTransformPreview({
              shapes: dragStartState.previewShapes,
            })
          }
        }

        applyTransformPreviewFromManager({
          point,
          transformManagerRef: options.transformManagerRef,
          snappingEnabled: options.snappingEnabled,
          previewDocument: options.interactionDocument,
          viewportScale: options.canvasRuntime.viewport.scale,
          setSnapGuides: options.setSnapGuides,
          setTransformPreview: options.setTransformPreview,
        })
        return
      }
    }
    if (options.currentTool === 'selector' || options.currentTool === 'dselector') {
      // Drive pointer-selector marquee transitions from world/screen pointer updates.
      const pointerSelectorMove = resolvePointerSelectorPointerMove(
        controllerState.pointerSelectorState,
        {
          pointWorld: point,
          pointScreen: point,
          startScreen: controllerState.pointerSelectorStartScreen,
        },
      )
      controllerState.pointerSelectorState = pointerSelectorMove.state
      options.setSelectorOverlayItems(pointerSelectorMove.overlays)
      const pointerMoveHitPriority = resolveRuntimeHitPriorityPlan({
        tool: options.currentTool,
        stage: 'pointer-move',
        pointerSelectorPhase: resolveRuntimePointerSelectorPhase(pointerSelectorMove.state.phase),
      })

      if (pointerMoveHitPriority.lanes.includes('overlay') && pointerSelectorMove.state.phase === 'marquee') {
        clearHoveredTransformHandle()
        clearHoveredShape()
        clearSnapGuides()
        return
      }

      if (pointerMoveHitPriority.lanes.includes('control-point')) {
        const hoveredMarqueeHandle = resolveHoveredMarqueeHandle(point, options)
        if (hoveredMarqueeHandle) {
          options.setHoveredTransformHandle((current) => (current === hoveredMarqueeHandle ? current : hoveredMarqueeHandle))
          // Keep selected hover outline alive while marquee handles are active
          // so marquee and element outline can render together (group handled in renderer).
          const hoveredSelectionPayload = options.canvasRuntime.requestEngineGeometry({
            pointer: point,
            tolerance: adaptiveHitTolerance.worldPx,
            clipTolerance: Math.max(0.5, adaptiveHitTolerance.worldPx * 0.25),
            allowFrameSelection: false,
            excludeClipBoundImage: true,
            strictStrokeHitTest: false,
            resolveHoveredFromPointer: true,
            outlineLevel: 'low',
          })
          const selectedIdSet = new Set(options.selectedShapeIds)
          const hoveredSelectedId = filterRuntimeSelectionCandidateIds({
            candidateIds: hoveredSelectionPayload.pointHitNodeIds,
            interactionDocument: options.interactionDocument,
          }).find((id: string) => selectedIdSet.has(id)) ?? null
          setHoveredShape(hoveredSelectedId)
          return
        }

        const hoveredShapeStyleHandle = resolveHoveredShapeStyleHandle(point, options)
        if (hoveredShapeStyleHandle) {
          // Style handles should suppress regular hover hits while pointer is over control dots.
          clearHoveredTransformHandle()
          clearHoveredShape()
          return
        }
      }

      if (!pointerMoveHitPriority.lanes.includes('object')) {
        clearHoveredShape()
        return
      }
    }
    if (options.currentTool === 'selector' || options.currentTool === 'dselector') {
      // Legacy transform-handle hover hit flow has been removed from product pointer move.
      clearHoveredTransformHandle()
      clearSnapGuides()
    } else {
      clearHoveredTransformHandle()
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
      controllerState.hoverHitBudget,
      {
        minIntervalMs: HOVER_HIT_MIN_INTERVAL_MS,
        minDistancePx: HOVER_HIT_MIN_DISTANCE_PX,
      },
    )
    controllerState.hoverHitBudget = hoverResolution.nextBudget

    if (!hoverResolution.shouldResolve) {
      return
    }

    clearSnapGuides()
    const hoverSelectorQueryOptions = resolveHoverSelectorQueryOptions({
      tolerancePx: adaptiveHitTolerance.worldPx,
    })
    // Resolve hovered id in engine so pointer-move hover data stays on the unified geometry source.
    const hoverGeometryPayload = options.canvasRuntime.requestEngineGeometry({
      pointer: point,
      tolerance: hoverSelectorQueryOptions.tolerancePx,
      clipTolerance: Math.max(0.5, adaptiveHitTolerance.worldPx * 0.25),
      allowFrameSelection: false,
      // Keep masked image hosts out of direct hover hits so hover/click share one policy.
      excludeClipBoundImage: true,
      strictStrokeHitTest: false,
      resolveHoveredFromPointer: true,
      outlineLevel: 'low',
    })
    const filteredHoverIds = filterRuntimeSelectionCandidateIds({
      candidateIds: hoverGeometryPayload.pointHitNodeIds,
      interactionDocument: options.interactionDocument,
    })
    options.recordInteractionDiagnostic?.({
      kind: 'hit-candidate',
      stage: 'pointer-move',
      candidateCount: filteredHoverIds.length,
    })
    setHoveredShape(filteredHoverIds[0] ?? null)
  }
}