import {
  buildSelectedMarquee,
  buildSelectionBox,
  createEmptyOverlayModel,
  type HoverOutline,
  type OverlayControl,
  type OverlayModel,
  type SelectedMarqueeGeometry,
} from '@venus/editor-primitive'

/**
 * Defines axis-aligned bounds shape consumed across runtime overlay surfaces.
 */
interface RectBounds {
  /** Stores axis-aligned min x. */
  minX: number
  /** Stores axis-aligned min y. */
  minY: number
  /** Stores axis-aligned max x. */
  maxX: number
  /** Stores axis-aligned max y. */
  maxY: number
}

/**
 * Defines vector-side input shape used to build a primitive overlay model.
 *
 * The adapter accepts the same data already produced by selection/hover/snap
 * derivation pipelines so it can be dropped in alongside the existing
 * RuntimeOverlayInstruction builder without forcing a wider refactor at the
 * call site (see apps/vector-editor-web/src/runtime/overlay/index.ts).
 */
export interface BuildVectorOverlayModelInput {
  /** Stores selection bounds in world coordinates. */
  selectedBounds: RectBounds | null
  /** Stores selection rotation in degrees (single rotated element only). */
  selectionRotationDegrees: number
  /** Stores selected element ids for the marquee. */
  selectedShapeIds: string[]
  /** Stores active marquee-select drag rectangle. */
  marqueeBounds: RectBounds | null
  /** Stores hovered scene node bounds when no rotated polygon is supplied. */
  hoveredShapeBounds: RectBounds | null
  /** Stores hovered shape rotated polygon when known. */
  hoveredShapePolygon: ReadonlyArray<{x: number; y: number}> | null
  /** Stores hovered shape id (for hover-outline target binding). */
  hoveredShapeId: string | null
  /** Stores adaptive resize edge tolerance in world units. */
  edgeToleranceWorld: number
  /** Stores adaptive resize corner tolerance in world units. */
  cornerToleranceWorld: number
  /** Stores rotate sector inner radius in world units. */
  rotateSectorInnerRadiusWorld: number
  /** Stores rotate sector outer radius in world units. */
  rotateSectorOuterRadiusWorld: number
  /** Stores rotate sector corner offset in world units. */
  rotateCornerOffsetWorld: number
  /** Stores extra controls (path-anchor/path-tangent/element-specific). */
  extraControls?: readonly OverlayControl[]
  /** Stores monotonically increasing version for change detection. */
  version: number
}

/**
 * Builds a primitive OverlayModel from vector-side runtime inputs.
 *
 * Edge/corner tolerances and rotate sector radii are passed in world units so
 * the caller controls adaptive sizing per zoom level — primitive does not
 * know about screen DPR/zoom and treats every coordinate uniformly.
 */
export function buildVectorOverlayModel(input: BuildVectorOverlayModelInput): OverlayModel {
  const model = createEmptyOverlayModel()
  // Track version up-front so the engine bridge can short-circuit redraws.
  model.version = input.version

  if (input.selectedBounds) {
    const geometry = resolveSelectionGeometry(input.selectedBounds, input.selectionRotationDegrees)
    model.selectedMarquee = buildSelectedMarquee({
      selectedIds: [...input.selectedShapeIds],
      geometry,
      edgeToleranceWorld: input.edgeToleranceWorld,
      cornerToleranceWorld: input.cornerToleranceWorld,
      rotateSectorInnerRadiusWorld: input.rotateSectorInnerRadiusWorld,
      rotateSectorOuterRadiusWorld: input.rotateSectorOuterRadiusWorld,
      rotateCornerOffsetWorld: input.rotateCornerOffsetWorld,
      emitMoveBody: true,
    })
  }

  if (input.marqueeBounds) {
    model.selectionBox = buildSelectionBox(
      {x: input.marqueeBounds.minX, y: input.marqueeBounds.minY},
      {x: input.marqueeBounds.maxX, y: input.marqueeBounds.maxY},
    )
  }

  // Hover outline only emitted when no marquee or controls fully cover hovered element semantics.
  if (input.hoveredShapeId) {
    model.hoverOutline = resolveHoverOutline(input)
  }

  if (input.extraControls && input.extraControls.length > 0) {
    model.controls = [...input.extraControls]
  }

  return model
}

// Picks rotated geometry only when we have a non-trivial single-element rotation.
function resolveSelectionGeometry(bounds: RectBounds, rotationDegrees: number): SelectedMarqueeGeometry {
  const epsilon = 1e-3
  if (Math.abs(rotationDegrees) <= epsilon) {
    // Use cheaper axis-aligned form when there is no rotation to apply.
    return {kind: 'axis-aligned', ...bounds}
  }
  const corners = rotateRectCorners(bounds, rotationDegrees)
  return {
    kind: 'rotated',
    corners,
    rotationDegrees,
    sourceBounds: {minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY},
  }
}

// Computes rotated rect corners around the rect center for the supplied degrees.
function rotateRectCorners(
  bounds: RectBounds,
  rotationDegrees: number,
): [{x: number; y: number}, {x: number; y: number}, {x: number; y: number}, {x: number; y: number}] {
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const radians = (rotationDegrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const project = (px: number, py: number) => {
    const dx = px - cx
    const dy = py - cy
    return {x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos}
  }
  return [
    project(bounds.minX, bounds.minY),
    project(bounds.maxX, bounds.minY),
    project(bounds.maxX, bounds.maxY),
    project(bounds.minX, bounds.maxY),
  ]
}

// Resolves the hover outline geometry preferring rotated polygon when available.
function resolveHoverOutline(input: BuildVectorOverlayModelInput): HoverOutline | undefined {
  if (!input.hoveredShapeId) {
    return undefined
  }
  if (input.hoveredShapePolygon && input.hoveredShapePolygon.length >= 3) {
    return {
      targetId: input.hoveredShapeId,
      geometry: {
        kind: 'polyline',
        points: input.hoveredShapePolygon.map((point) => ({x: point.x, y: point.y})),
        closed: true,
      },
    }
  }
  if (input.hoveredShapeBounds) {
    return {
      targetId: input.hoveredShapeId,
      geometry: {kind: 'rect', ...input.hoveredShapeBounds},
    }
  }
  // No usable geometry to express hover with — caller should suppress hover overlay.
  return undefined
}
