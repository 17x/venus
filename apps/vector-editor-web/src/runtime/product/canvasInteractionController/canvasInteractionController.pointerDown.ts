import {
  resolvePointerSelectorPointerDown,
} from '@venus/editor-primitive'
import {createEngineViewportPanOrigin} from '@venus/engine'
import {resolveEngineAdaptiveHitTolerance} from '../../engine-bridge/engine.ts'
import {resolvePathSubSelectionAtPoint} from '../pathSubSelection.ts'
import {
  resolveDraftPrimitivePointerDownState,
  resolveInsertShapePointerDownState,
  resolvePenPointerDownState,
  resolvePointerDownPathSubSelectionState,
  resolveSelectionPointerDownHitOptions,
  shouldClearSelectionOnSelectorPointerDown,
  shouldPreserveGroupDragSelectionOnPointerDown,
} from '../../useEditorRuntime/selectionGroupHelpers.ts'
import {
  buildVectorOverlayModel,
  resolveVectorOverlayHit,
} from '../../primitive/index.ts'
import {resolveShapeStyleControls, type ShapeStyleHandleDrag} from '../shapeStyleHandles.ts'
import {
  resolveMarqueeControlSizing,
  resolveMarqueeTransformHandleAtPoint,
  startTransformSessionFromSelection,
} from '../transformInteractionPolicy.ts'
import type {
  EditorRuntimeCanvasInteractionControllerOptions,
  EditorRuntimeCanvasInteractionControllerState,
  PointerScreenMetadata,
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
    selectedShapeIds: options.selectedShapeIds,
    previewShapeById: options.previewShapeById,
    selectedBounds: options.selectionState.selectedBounds,
    viewportScale: options.canvasRuntime.viewport.scale,
    sceneVersion: options.canvasRuntime.stats.version,
  })
}

// Resolve element-specific style-handle pointer-down hit and drag payload.
function resolvePointerDownShapeStyleHandle(
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
  const dragBehavior = hit?.control.dragBehavior
  const payload = dragBehavior?.payload as Record<string, unknown> | undefined

  if (dragBehavior?.kind === 'rect-radius' && payload && typeof payload.shapeId === 'string' && typeof payload.corner === 'string') {
    if (payload.corner !== 'topLeft' && payload.corner !== 'topRight' && payload.corner !== 'bottomRight' && payload.corner !== 'bottomLeft') {
      return null
    }
    return {
      kind: 'rect-radius',
      payload: {
        shapeId: payload.shapeId,
        corner: payload.corner,
        point,
      },
    }
  }

  if (dragBehavior?.kind === 'arc-angle' && payload && typeof payload.shapeId === 'string' && typeof payload.boundary === 'string') {
    if (payload.boundary !== 'start' && payload.boundary !== 'end') {
      return null
    }
    return {
      kind: 'ellipse-arc',
      payload: {
        shapeId: payload.shapeId,
        boundary: payload.boundary,
        point,
      },
    }
  }

  return null
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
    metadata?: PointerScreenMetadata,
  ) => {
    // Emit runtime pointer lifecycle events so non-React subscribers can observe input flow.
    options.interactionBridge.dispatch({
      type: 'input.pointer.down',
    })
    // Pointer-down starts explicit interactions, so hover handle state resets.
    options.setHoveredTransformHandle(null)
    options.setHoveredShapeId(null)
    if (options.currentTool === 'panning') {
      const screen = metadata?.screen ?? point
      controllerState.panDragOrigin = createEngineViewportPanOrigin({
        x: screen.x,
        y: screen.y,
        pointerId: metadata?.pointerId ?? 0,
      })
      controllerState.panDragOffset = {x: 0, y: 0}
      options.selectionDragControllerRef.current?.clear()
      options.setSelectorOverlayItems([])
      options.setSnapGuides([])
      options.runtimeEditingModeControllerRef.current?.transition({
        to: 'panning',
        reason: 'pointer-down:panning',
      })
      return
    }
    if (options.currentTool === 'zoomIn' || options.currentTool === 'zoomOut') {
      options.runtimeEditingModeControllerRef.current?.transition({
        to: 'zooming',
        reason: `pointer-down:${options.currentTool}`,
      })
      options.handleZoom(options.currentTool === 'zoomIn', point)
      return
    }

    if (options.currentTool === 'selector' || options.currentTool === 'dselector') {
      const shapeStyleHandle = resolvePointerDownShapeStyleHandle(point, options)
      if (shapeStyleHandle) {
        // Element-specific style drags are independent from transform handles.
        options.setShapeStyleHandleDrag(shapeStyleHandle)
        options.setActiveTransformHandle(null)
        options.setSnapGuides([])
        options.runtimeEditingModeControllerRef.current?.transition({
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
          selectedShapeIds: options.selectedShapeIds,
          previewShapeById: options.previewShapeById,
          interactionDocument: options.interactionDocument,
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
      const adaptiveHitTolerance = resolveEngineAdaptiveHitTolerance({
        viewportScale: options.canvasRuntime.viewport.scale,
        viewportWidth: options.canvasRuntime.viewport.viewportWidth,
        viewportHeight: options.canvasRuntime.viewport.viewportHeight,
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
  }
}
