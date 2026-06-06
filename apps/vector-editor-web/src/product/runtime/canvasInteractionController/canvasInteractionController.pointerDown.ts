import {
  resolvePointerSelectorPointerDown,
} from '@venus/editor-primitive'
import {resolveEngineAdaptiveHitTolerance} from '../../../runtime/engine-bridge/engine.ts'
import {resolvePathSubSelectionAtPoint} from '../pathSubSelection.ts'
import {
  resolveDraftPrimitivePointerDownState,
  resolveInsertShapePointerDownState,
  resolvePenPointerDownState,
  resolvePointerDownPathSubSelectionState,
  resolveSelectionPointerDownHitOptions,
  shouldClearSelectionOnSelectorPointerDown,
  shouldPreserveGroupDragSelectionOnPointerDown,
} from '../../useEditorRuntime/helpers.ts'
import {
  buildVectorOverlayModel,
  resolveVectorOverlayHit,
} from '../../../runtime/primitive/index.ts'
import {resolveShapeStyleControls, type ShapeStyleHandleDrag} from '../shapeStyleHandles.ts'
import {
  resolveMarqueeControlSizing,
  resolveMarqueeTransformHandleAtPoint,
  startTransformSessionFromSelection,
} from '../transformInteractionPolicy.ts'
import {resolveShapeStyleDragFromBehavior} from './shapeStyleDragResolver.ts'
import {resolvePointerLifecycleTransition} from './pointerLifecycleState.ts'
import {applyRuntimeEditingModeTransition} from '../runtimeEditingModeTransitionPolicy.ts'
import {resolveRuntimeHitPriorityPlan} from '../hitPriorityPolicy.ts'
import {filterRuntimeSelectionCandidateIds} from '../selectionFilterPolicy.ts'
import type {
  EditorRuntimeCanvasInteractionControllerOptions,
  EditorRuntimeCanvasInteractionControllerState,
} from './canvasInteractionController.types.ts'

/**
 * Resolves marquee control pointer-down hit and transform handle kind.
 * @param point Pointer world position.
 * @param options Canvas interaction controller options.
 */
function resolvePointerDownMarqueeHandle(
  point: {x: number; y: number},
  options: EditorRuntimeCanvasInteractionControllerOptions,
) {
  return resolveMarqueeTransformHandleAtPoint({
    point,
    selectedShapeIds: options.selectionState.selectedIds,
    previewShapeById: options.previewShapeById,
    selectedBounds: options.selectionState.selectedBounds,
    viewportScale: options.canvasRuntime.viewport.scale,
    sceneVersion: options.canvasRuntime.stats.version,
  })
}

/**
 * Resolves element-specific style-handle pointer-down hit and drag payload.
 * @param point Pointer world position.
 * @param options Canvas interaction controller options.
 */
function resolvePointerDownShapeStyleHandle(
  point: {x: number; y: number},
  options: EditorRuntimeCanvasInteractionControllerOptions,
): ShapeStyleHandleDrag | null {
  if (!options.selectionState.selectedBounds || options.selectionState.selectedIds.length === 0) {
    return null
  }

  const selectedNodes = options.selectionState.selectedIds
    .map((id) => options.previewShapeById.get(id))
    .filter((shape): shape is import('../../../runtime/model/index.ts').DocumentNode => Boolean(shape))
  const singleSelectionRotation = selectedNodes.length === 1
    ? (selectedNodes[0].rotation ?? 0)
    : 0
  const sizing = resolveMarqueeControlSizing(options.canvasRuntime.viewport.scale)
  const styleControls = resolveShapeStyleControls({
    selectedShapeIds: options.selectionState.selectedIds,
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
    selectedShapeIds: options.selectionState.selectedIds,
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
 * Creates pointer-down handler for canvas runtime interactions.
 * @param options Canvas interaction controller options.
 * @param controllerState Mutable controller state shared across pointer events.
 */
export function createPointerDownHandler(
  options: EditorRuntimeCanvasInteractionControllerOptions,
  controllerState: EditorRuntimeCanvasInteractionControllerState,
) {
  return (
    point: {x: number; y: number},
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
  ) => {
    const lifecycle = resolvePointerLifecycleTransition(
      controllerState.pointerLifecyclePhase,
      'input.pointer.down',
    )
    controllerState.pointerLifecyclePhase = lifecycle.next
    if (!lifecycle.accepted) {
      return
    }

    // Emit runtime pointer lifecycle events so non-React subscribers can observe input flow.
    options.interactionBridge.dispatch({
      type: 'input.pointer.down',
    })
    // Pointer-down starts explicit interactions, so hover handle state resets.
    options.setHoveredTransformHandle(null)
    options.setHoveredShapeId(null)
    if (options.currentTool === 'zoomIn' || options.currentTool === 'zoomOut') {
      applyRuntimeEditingModeTransition(options.runtimeEditingModeControllerRef.current, {
        to: 'zooming',
        reason: `pointer-down:${options.currentTool}`,
      })
      options.handleZoom(options.currentTool === 'zoomIn', point)
      return
    }

    if (options.currentTool === 'selector' || options.currentTool === 'dselector') {
      const pointerDownHitPriority = resolveRuntimeHitPriorityPlan({
        tool: options.currentTool,
        stage: 'pointer-down',
      })

      if (pointerDownHitPriority.lanes.includes('control-point')) {
        const shapeStyleHandle = resolvePointerDownShapeStyleHandle(point, options)
        if (shapeStyleHandle) {
          // Element-specific style drags are independent from transform handles.
          options.setShapeStyleHandleDrag(shapeStyleHandle)
          options.setActiveTransformHandle(null)
          options.setSnapGuides([])
          applyRuntimeEditingModeTransition(options.runtimeEditingModeControllerRef.current, {
            to: 'dragging',
            reason: `pointer-down:${shapeStyleHandle.kind}`,
          })
          return
        }

        const marqueeHandle = resolvePointerDownMarqueeHandle(point, options)
        if (marqueeHandle) {
          const startedTransformSession = startTransformSessionFromSelection({
            point,
            handle: marqueeHandle,
            selectedShapeIds: options.selectionState.selectedIds,
            previewShapeById: options.previewShapeById,
            selectedBounds: options.selectionState.selectedBounds,
            transformManagerRef: options.transformManagerRef,
            setActiveTransformHandle: options.setActiveTransformHandle,
            runtimeEditingModeControllerRef: options.runtimeEditingModeControllerRef,
            setSnapGuides: options.setSnapGuides,
          })
          if (startedTransformSession) {
            return
          }
        }
      }

      if (!pointerDownHitPriority.lanes.includes('object')) {
        return
      }

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

      applyRuntimeEditingModeTransition(options.runtimeEditingModeControllerRef.current, {
        to: options.currentTool === 'dselector' ? 'directSelecting' : 'selecting',
        reason: `pointer-down:${options.currentTool}`,
      })
      const adaptiveHitTolerance = resolveEngineAdaptiveHitTolerance({
        viewportScale: options.canvasRuntime.viewport.scale,
        viewportWidth: options.canvasRuntime.viewport.viewportWidth,
        viewportHeight: options.canvasRuntime.viewport.viewportHeight,
      })
      // Sample pointer-down hit candidates through the same geometry source used by click/hover
      // so diagnostics can be compared across key paths without tolerance drift.
      const pointerDownGeometryPayload = options.canvasRuntime.requestEngineGeometry({
        nodes: options.interactionDocument.shapes,
        pointer: point,
        preferGroupSelection: options.currentTool === 'selector',
        tolerance: adaptiveHitTolerance.worldPx,
        clipTolerance: Math.max(0.5, adaptiveHitTolerance.worldPx * 0.25),
        allowFrameSelection: false,
        excludeClipBoundImage: false,
        strictStrokeHitTest: false,
        resolveHoveredFromPointer: true,
        outlineLevel: 'low',
      })
      const pointerDownHitCandidateIds = filterRuntimeSelectionCandidateIds({
        candidateIds: pointerDownGeometryPayload.pointHitNodeIds,
        interactionDocument: options.interactionDocument,
      })
      options.recordInteractionDiagnostic?.({
        kind: 'hit-candidate',
        stage: 'pointer-down',
        candidateCount: pointerDownHitCandidateIds.length,
      })
      const selectedBounds = options.selectionState.selectedBounds
      const selectedNodes = options.selectedShapeIds
        .map((id) => options.previewShapeById.get(id))
        .filter((shape): shape is import('../../../runtime/model/index.ts').DocumentNode => Boolean(shape))
      const singleSelectedRotation = selectedNodes.length === 1
        ? (selectedNodes[0].rotation ?? 0)
        : 0

      const clearSelectionTolerance = adaptiveHitTolerance.worldPx
      if (shouldClearSelectionOnSelectorPointerDown({
        point,
        selectedBounds,
        selectedNodes,
        singleSelectedRotation,
        shapeById: options.previewShapeById,
        tolerance: clearSelectionTolerance,
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
      }, modifiers, {
        ...selectionHitOptions,
        // Keep pointer-down drag arming tolerance aligned with hover/click adaptive policy.
        hitTolerance: adaptiveHitTolerance.worldPx,
      })

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
      // Seed pointer-selector pending state for click/marquee resolution on pointer-up.
      const pointerSelectorDown = resolvePointerSelectorPointerDown(point)
      controllerState.pointerSelectorState = pointerSelectorDown.state
      controllerState.pointerSelectorStartScreen = point
      controllerState.pointerSelectorModifiers = modifiers
      options.setSelectorOverlayItems(pointerSelectorDown.overlays)
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
      applyRuntimeEditingModeTransition(options.runtimeEditingModeControllerRef.current, {
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
      applyRuntimeEditingModeTransition(options.runtimeEditingModeControllerRef.current, {
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
      applyRuntimeEditingModeTransition(options.runtimeEditingModeControllerRef.current, {
        to: penPointerDownState.nextEditingMode,
        reason: penPointerDownState.transitionReason,
      })
      return
    }

    options.selectionDragControllerRef.current?.clear()
    options.setSnapGuides([])
    options.defaultCanvasInteractions.onPointerDown(point, modifiers)
  }
}
