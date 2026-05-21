import type * as React from 'react'
import {type ControlDragBehavior} from '@venus/editor-primitive'
import type {DocumentNode} from '../../runtime/model/index.ts'
import {
  createTransformSessionShape,
  type TransformPreview,
} from '../../runtime/interaction/transformSessionManager.ts'
import {resolvePointerUpTransformCommit} from '../../runtime/interaction/pointerUpResolve.ts'
import {
  resolveSelectionDragMovePreviewState,
} from '../useEditorRuntime/helpers.ts'
import {
  buildVectorOverlayModel,
  resolveVectorOverlayHit,
} from '../../runtime/primitive/index.ts'
import {applyRuntimeEditingModeTransition} from './runtimeEditingModeTransitionPolicy.ts'
import {resolveRuntimeMoveSnapToleranceWorld} from './snappingPolicy.ts'

/** Declares opaque drag payload type forwarded by overlay controls. */
type DragBehaviorPayload = Record<string, unknown>

/**
 * Resolves marquee control sizing in world units so hit areas remain screen-size stable.
 * @param scale Current viewport scale.
 */
export function resolveMarqueeControlSizing(scale: number) {
  const safeScale = Math.max(0.01, scale)
  const worldPerPx = 1 / safeScale
  return {
    edgeToleranceWorld: worldPerPx * 6,
    cornerToleranceWorld: worldPerPx * 10,
    rotateSectorInnerRadiusWorld: worldPerPx * 12,
    rotateSectorOuterRadiusWorld: worldPerPx * 22,
    rotateCornerOffsetWorld: worldPerPx * 10,
  }
}

/**
 * Resolves a transform handle from control id fallback parsing.
 * @param controlId Overlay control id.
 */
function resolveHandleKindFromControlId(controlId: string) {
  if (controlId.startsWith('marquee:resize-corner:')) {
    const corner = controlId.slice('marquee:resize-corner:'.length)
    if (corner === 'nw' || corner === 'n' || corner === 'ne' || corner === 'e' || corner === 'se' || corner === 's' || corner === 'sw' || corner === 'w') {
      return corner
    }
  }
  if (controlId.startsWith('marquee:resize-edge:')) {
    const edge = controlId.slice('marquee:resize-edge:'.length)
    if (edge === 'n' || edge === 'e' || edge === 's' || edge === 'w') {
      return edge
    }
  }
  if (controlId.startsWith('marquee:rotate:')) {
    return 'rotate'
  }
  if (controlId === 'marquee:move-body') {
    return 'move'
  }
  return null
}

/**
 * Type-guards one transform handle token emitted by overlay drag payloads.
 * @param value Unknown payload direction value.
 */
function isHandleKindValue(value: unknown): value is 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate' {
  return value === 'move' ||
    value === 'nw' ||
    value === 'n' ||
    value === 'ne' ||
    value === 'e' ||
    value === 'se' ||
    value === 's' ||
    value === 'sw' ||
    value === 'w' ||
    value === 'rotate'
}

/**
 * Resolves transform handle from editor-primitive drag behavior with id fallback.
 * @param controlId Overlay control id.
 * @param dragBehavior Optional drag behavior descriptor.
 */
function resolveHandleKindFromDragBehavior(
  controlId: string,
  dragBehavior: ControlDragBehavior<DragBehaviorPayload> | undefined,
) {
  if (!dragBehavior) {
    return resolveHandleKindFromControlId(controlId)
  }

  if (dragBehavior.kind === 'move') {
    return 'move'
  }
  if (dragBehavior.kind === 'rotate') {
    return 'rotate'
  }
  if (dragBehavior.kind === 'resize') {
    const direction = dragBehavior.payload?.direction
    if (isHandleKindValue(direction) && direction !== 'move' && direction !== 'rotate') {
      return direction
    }
  }

  return resolveHandleKindFromControlId(controlId)
}

/**
 * Resolves marquee transform handle hit through one shared overlay policy.
 * @param point Pointer world position.
 * @param selectedShapeIds Selected shape ids.
 * @param previewShapeById Selected-shape lookup map.
 * @param selectedBounds Current selected bounds.
 * @param viewportScale Current viewport scale.
 * @param sceneVersion Scene version used by overlay model.
 */
export function resolveMarqueeTransformHandleAtPoint(input: {
  point: {x: number; y: number}
  selectedShapeIds: string[]
  previewShapeById: Map<string, DocumentNode>
  selectedBounds: {minX: number; minY: number; maxX: number; maxY: number} | null
  viewportScale: number
  sceneVersion: number
}) {
  if (!input.selectedBounds || input.selectedShapeIds.length === 0) {
    return null
  }

  const selectedNodes = input.selectedShapeIds
    .map((id) => input.previewShapeById.get(id))
    .filter((shape): shape is DocumentNode => Boolean(shape))
  if (selectedNodes.length === 0) {
    return null
  }

  const singleSelectionRotation = selectedNodes.length === 1
    ? (selectedNodes[0].rotation ?? 0)
    : 0
  const sizing = resolveMarqueeControlSizing(input.viewportScale)
  const overlayModel = buildVectorOverlayModel({
    selectedBounds: input.selectedBounds,
    selectionRotationDegrees: singleSelectionRotation,
    selectedShapeIds: input.selectedShapeIds,
    marqueeBounds: null,
    hoveredShapeBounds: null,
    hoveredShapePolygon: null,
    hoveredShapeId: null,
    edgeToleranceWorld: sizing.edgeToleranceWorld,
    cornerToleranceWorld: sizing.cornerToleranceWorld,
    rotateSectorInnerRadiusWorld: sizing.rotateSectorInnerRadiusWorld,
    rotateSectorOuterRadiusWorld: sizing.rotateSectorOuterRadiusWorld,
    rotateCornerOffsetWorld: sizing.rotateCornerOffsetWorld,
    version: input.sceneVersion,
  })
  const hit = resolveVectorOverlayHit({
    pointer: input.point,
    model: overlayModel,
  })
  if (!hit) {
    return null
  }

  return resolveHandleKindFromDragBehavior(
    hit.control.id,
    hit.control.dragBehavior as ControlDragBehavior<DragBehaviorPayload> | undefined,
  )
}

/**
 * Starts one transform session from current selection and handle.
 * @param point Pointer world position at session start.
 * @param handle Resolved transform handle kind.
 * @param selectedShapeIds Current selected ids.
 * @param previewShapeById Preview document lookup map.
 * @param selectedBounds Current selected bounds.
 * @param transformManagerRef Transform manager ref.
 * @param setActiveTransformHandle Active-handle state setter.
 * @param runtimeEditingModeControllerRef Editing mode controller ref.
 * @param setSnapGuides Snap-guide state setter.
 */
export function startTransformSessionFromSelection(input: {
  point: {x: number; y: number}
  handle: 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate'
  selectedShapeIds: string[]
  previewShapeById: Map<string, DocumentNode>
  selectedBounds: {minX: number; minY: number; maxX: number; maxY: number} | null
  transformManagerRef: React.RefObject<ReturnType<typeof import('../../runtime/interaction/index.ts').createTransformSessionManager>>
  setActiveTransformHandle: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').HandleKind | null>>
  runtimeEditingModeControllerRef: React.RefObject<ReturnType<typeof import('../../runtime/index.ts').createRuntimeEditingModeController>>
  setSnapGuides: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').SnapGuide[]>>
}) {
  const selectedShapes = input.selectedShapeIds
    .map((id) => input.previewShapeById.get(id))
    .filter((shape): shape is DocumentNode => Boolean(shape))

  if (selectedShapes.length === 0 || !input.selectedBounds) {
    return false
  }

  input.transformManagerRef.current?.start({
    shapeIds: selectedShapes.map((shape) => shape.id),
    shapes: selectedShapes.map((shape) => createTransformSessionShape(shape)),
    handle: input.handle,
    pointer: input.point,
    startBounds: input.selectedBounds,
  })
  input.setActiveTransformHandle(input.handle)
  applyRuntimeEditingModeTransition(input.runtimeEditingModeControllerRef.current, {
    to: 'dragging',
    reason: `pointer-down:marquee-${input.handle}`,
  })
  input.setSnapGuides([])
  return true
}

/**
 * Applies preview + snap-guide updates from the active transform session.
 * @param point Current pointer world position.
 * @param transformManagerRef Transform manager ref.
 * @param snappingEnabled Whether snapping is enabled for current interaction.
 * @param previewDocument Document used for snapping checks.
 * @param viewportScale Current viewport scale for policy-driven snap tolerance.
 * @param setSnapGuides Snap-guide setter.
 * @param setTransformPreview Transform-preview setter.
 */
export function applyTransformPreviewFromManager(input: {
  point: {x: number; y: number}
  transformManagerRef: React.RefObject<ReturnType<typeof import('../../runtime/interaction/index.ts').createTransformSessionManager>>
  snappingEnabled: boolean
  previewDocument: import('../../runtime/model/index.ts').EditorDocument
  viewportScale: number
  setSnapGuides: React.Dispatch<React.SetStateAction<import('../../runtime/interaction/index.ts').SnapGuide[]>>
  setTransformPreview: (next: TransformPreview | null) => void
}) {
  const transformSession = input.transformManagerRef.current?.getSession()
  if (!transformSession) {
    return false
  }

  const preview = input.transformManagerRef.current?.update(input.point)
  if (!preview) {
    return true
  }

  const transformPreviewState = resolveSelectionDragMovePreviewState({
    preview,
    handle: transformSession.handle,
    snappingEnabled: input.snappingEnabled,
    previewDocument: input.previewDocument,
    snapToleranceWorld: resolveRuntimeMoveSnapToleranceWorld({
      viewportScale: input.viewportScale,
    }),
  })
  input.setSnapGuides(transformPreviewState.snapGuides)
  input.setTransformPreview(transformPreviewState.transformPreview)
  return true
}

/**
 * Resolves pointer-up transform commit payload using latest manager/session state.
 * @param transformManagerRef Transform manager ref.
 * @param transformPreview Latest React transform preview state.
 * @param documentShapes Current document shape list.
 */
export function resolvePointerUpTransformResult(input: {
  transformManagerRef: React.RefObject<ReturnType<typeof import('../../runtime/interaction/index.ts').createTransformSessionManager>>
  transformPreview: TransformPreview | null
  documentShapes: import('../../runtime/interaction/transformSessionManager.ts').TransformShapeSource[]
}) {
  const transformManager = input.transformManagerRef.current
  const activeTransformSession = transformManager?.getSession() ?? null
  const resolvedTransformPreview = input.transformPreview ?? (
    activeTransformSession
      ? transformManager?.update(activeTransformSession.current) ?? null
      : null
  )

  return resolvePointerUpTransformCommit(
    transformManager?.commit() ?? null,
    resolvedTransformPreview,
    input.documentShapes,
  )
}
