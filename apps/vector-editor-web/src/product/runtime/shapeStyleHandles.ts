import type {OverlayControl} from '@venus/editor-primitive'
import {CONTROL_PRIORITY} from '@venus/editor-primitive'
import {getNormalizedBoundsFromBox} from '@venus/engine'
import type {DocumentNode} from '../../runtime/model/index.ts'

/**
 * Declares supported rectangle-corner identifiers for per-corner radius editing.
 */
export type RectCornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'

/**
 * Declares supported ellipse arc-boundary identifiers.
 */
export type EllipseArcBoundary = 'start' | 'end'

/**
 * Declares one active rect corner-radius drag session.
 */
export interface RectRadiusHandleDrag {
  /** Stores shape id that owns the active drag handle. */
  shapeId: string
  /** Stores the dragged rectangle corner key. */
  corner: RectCornerKey
  /** Stores live world point tracked during drag. */
  point: {x: number; y: number}
}

/**
 * Declares one active ellipse arc-boundary drag session.
 */
export interface EllipseArcHandleDrag {
  /** Stores shape id that owns the active drag handle. */
  shapeId: string
  /** Stores whether start or end arc boundary is being edited. */
  boundary: EllipseArcBoundary
  /** Stores live world point tracked during drag. */
  point: {x: number; y: number}
}

/**
 * Declares the active style-handle drag payload shared across runtime modules.
 */
export type ShapeStyleHandleDrag =
  | {kind: 'rect-radius'; payload: RectRadiusHandleDrag}
  | {kind: 'ellipse-arc'; payload: EllipseArcHandleDrag}

/**
 * Declares options required to build element-specific style controls.
 */
export interface ResolveShapeStyleControlsOptions {
  /** Stores currently selected shape ids. */
  selectedShapeIds: string[]
  /** Stores selected-shape lookup map by id. */
  previewShapeById: Map<string, DocumentNode>
  /** Stores world-space point-hit tolerance for style handles. */
  handleToleranceWorld: number
  /** Stores minimum inward inset so zero-radius corners still expose controls. */
  minRectHandleInsetWorld: number
  /** Stores optional live drag payload used to render dragged control at pointer. */
  activeDrag: ShapeStyleHandleDrag | null
}

/**
 * Builds rectangle-corner and ellipse-arc controls for single-shape selection.
 */
export function resolveShapeStyleControls(options: ResolveShapeStyleControlsOptions): OverlayControl[] {
  if (options.selectedShapeIds.length !== 1) {
    return []
  }

  const selectedShape = options.previewShapeById.get(options.selectedShapeIds[0])
  if (!selectedShape) {
    return []
  }

  if (selectedShape.type === 'rectangle') {
    return resolveRectRadiusControls({
      shape: selectedShape,
      handleToleranceWorld: options.handleToleranceWorld,
      minRectHandleInsetWorld: options.minRectHandleInsetWorld,
      activeDrag: options.activeDrag,
    })
  }

  if (selectedShape.type === 'ellipse') {
    return resolveEllipseArcControls({
      shape: selectedShape,
      handleToleranceWorld: options.handleToleranceWorld,
      activeDrag: options.activeDrag,
    })
  }

  return []
}

/**
 * Resolves the committed rectangle corner radius from one dragged world point.
 */
export function resolveRectCornerRadiusFromPoint(input: {
  shape: DocumentNode
  corner: RectCornerKey
  point: {x: number; y: number}
}): number | null {
  if (input.shape.type !== 'rectangle') {
    return null
  }

  const bounds = getNormalizedBoundsFromBox(input.shape.x, input.shape.y, input.shape.width, input.shape.height)
  const width = Math.max(0, bounds.maxX - bounds.minX)
  const height = Math.max(0, bounds.maxY - bounds.minY)
  if (width <= Number.EPSILON || height <= Number.EPSILON) {
    return 0
  }

  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  const localPoint = rotateAround(input.point, center, -(input.shape.rotation ?? 0))

  const distanceFromLeft = localPoint.x - bounds.minX
  const distanceFromTop = localPoint.y - bounds.minY
  const distanceFromRight = bounds.maxX - localPoint.x
  const distanceFromBottom = bounds.maxY - localPoint.y

  const rawRadius = input.corner === 'topLeft'
    ? Math.min(distanceFromLeft, distanceFromTop)
    : input.corner === 'topRight'
      ? Math.min(distanceFromRight, distanceFromTop)
      : input.corner === 'bottomRight'
        ? Math.min(distanceFromRight, distanceFromBottom)
        : Math.min(distanceFromLeft, distanceFromBottom)

  const maxRadius = Math.min(width, height) / 2
  return clamp(rawRadius, 0, maxRadius)
}

/**
 * Resolves one ellipse arc-boundary angle from dragged world point.
 */
export function resolveEllipseArcAngleFromPoint(input: {
  shape: DocumentNode
  point: {x: number; y: number}
}): number | null {
  if (input.shape.type !== 'ellipse') {
    return null
  }

  const bounds = getNormalizedBoundsFromBox(input.shape.x, input.shape.y, input.shape.width, input.shape.height)
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  const rx = Math.max(Number.EPSILON, (bounds.maxX - bounds.minX) / 2)
  const ry = Math.max(Number.EPSILON, (bounds.maxY - bounds.minY) / 2)

  const localPoint = rotateAround(input.point, center, -(input.shape.rotation ?? 0))
  const normalizedDx = (localPoint.x - center.x) / rx
  // Keep +90deg mapped upward so style handles match engine arc hit/outline semantics.
  const normalizedDy = (center.y - localPoint.y) / ry
  const angle = (Math.atan2(normalizedDy, normalizedDx) * 180) / Math.PI
  return normalizeDegrees(angle)
}

/**
 * Builds four rectangle corner-radius controls.
 */
function resolveRectRadiusControls(input: {
  shape: DocumentNode
  handleToleranceWorld: number
  minRectHandleInsetWorld: number
  activeDrag: ShapeStyleHandleDrag | null
}): OverlayControl[] {
  if (input.shape.type !== 'rectangle') {
    return []
  }
  const bounds = getNormalizedBoundsFromBox(input.shape.x, input.shape.y, input.shape.width, input.shape.height)
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }

  const resolvedCornerRadii = {
    topLeft: input.shape.cornerRadii?.topLeft ?? input.shape.cornerRadius ?? 0,
    topRight: input.shape.cornerRadii?.topRight ?? input.shape.cornerRadius ?? 0,
    bottomRight: input.shape.cornerRadii?.bottomRight ?? input.shape.cornerRadius ?? 0,
    bottomLeft: input.shape.cornerRadii?.bottomLeft ?? input.shape.cornerRadius ?? 0,
  } satisfies Record<RectCornerKey, number>

  const corners = {
    topLeft: {x: bounds.minX, y: bounds.minY},
    topRight: {x: bounds.maxX, y: bounds.minY},
    bottomRight: {x: bounds.maxX, y: bounds.maxY},
    bottomLeft: {x: bounds.minX, y: bounds.maxY},
  } satisfies Record<RectCornerKey, {x: number; y: number}>

  const insetDirection = {
    topLeft: {x: 1, y: 1},
    topRight: {x: -1, y: 1},
    bottomRight: {x: -1, y: -1},
    bottomLeft: {x: 1, y: -1},
  } satisfies Record<RectCornerKey, {x: number; y: number}>

  return (Object.keys(corners) as RectCornerKey[]).map((corner) => {
    const activeCornerDrag = input.activeDrag?.kind === 'rect-radius' &&
      input.activeDrag.payload.shapeId === input.shape.id &&
      input.activeDrag.payload.corner === corner
      ? input.activeDrag
      : null

    const cornerPoint = rotateAround(corners[corner], center, input.shape.rotation ?? 0)
    const controlPoint = activeCornerDrag
      ? activeCornerDrag.payload.point
      : {
          x: cornerPoint.x + (insetDirection[corner].x / Math.SQRT2) * Math.max(input.minRectHandleInsetWorld, resolvedCornerRadii[corner]),
          y: cornerPoint.y + (insetDirection[corner].y / Math.SQRT2) * Math.max(input.minRectHandleInsetWorld, resolvedCornerRadii[corner]),
        }

    return {
      id: `shape-style:rect-radius:${input.shape.id}:${corner}`,
      kind: 'rect-radius',
      ownerId: input.shape.id,
      priority: CONTROL_PRIORITY.rectRadius,
      hitArea: {
        kind: 'point',
        center: controlPoint,
        tolerance: input.handleToleranceWorld,
      },
      cursor: {type: 'pointer'},
      dragBehavior: {
        kind: 'rect-radius',
        payload: {shapeId: input.shape.id, corner},
        token: `rect-radius:${corner}`,
      },
      metadata: {corner},
      label: `rect-radius:${corner}`,
    } satisfies OverlayControl
  })
}

/**
 * Builds two ellipse arc-boundary controls (start/end).
 */
function resolveEllipseArcControls(input: {
  shape: DocumentNode
  handleToleranceWorld: number
  activeDrag: ShapeStyleHandleDrag | null
}): OverlayControl[] {
  if (input.shape.type !== 'ellipse') {
    return []
  }
  const bounds = getNormalizedBoundsFromBox(input.shape.x, input.shape.y, input.shape.width, input.shape.height)
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  const rx = Math.max(Number.EPSILON, (bounds.maxX - bounds.minX) / 2)
  const ry = Math.max(Number.EPSILON, (bounds.maxY - bounds.minY) / 2)

  const startAngle = normalizeDegrees(input.shape.ellipseStartAngle ?? 0)
  const endAngle = normalizeDegrees(input.shape.ellipseEndAngle ?? 360)

  const resolveBoundaryPoint = (boundary: EllipseArcBoundary, angle: number) => {
    const activeBoundaryDrag = input.activeDrag?.kind === 'ellipse-arc' &&
      input.activeDrag.payload.shapeId === input.shape.id &&
      input.activeDrag.payload.boundary === boundary
      ? input.activeDrag
      : null

    if (activeBoundaryDrag) {
      return activeBoundaryDrag.payload.point
    }

    const radians = (angle * Math.PI) / 180
    const radiusFactor = 0.5
    const localPoint = {
      // Keep start-angle handle at mid-radius to match product interaction affordance.
      x: center.x + Math.cos(radians) * rx * radiusFactor,
      // Keep handle orientation synced with engine arc-angle semantics (+90deg is upward).
      y: center.y - Math.sin(radians) * ry * radiusFactor,
    }
    return rotateAround(localPoint, center, input.shape.rotation ?? 0)
  }

  const startPoint = resolveBoundaryPoint('start', startAngle)
  const endPoint = resolveBoundaryPoint('end', endAngle)

  return [
    {
      id: `shape-style:ellipse-arc:start:${input.shape.id}`,
      kind: 'arc-angle-start',
      ownerId: input.shape.id,
      priority: CONTROL_PRIORITY.arcAngle,
      hitArea: {
        kind: 'point',
        center: startPoint,
        tolerance: input.handleToleranceWorld,
      },
      cursor: {type: 'pointer'},
      dragBehavior: {
        kind: 'arc-angle',
        payload: {shapeId: input.shape.id, boundary: 'start'},
        token: 'ellipse-arc:start',
      },
      metadata: {boundary: 'start', angle: startAngle},
      label: 'ellipse-arc:start',
    } satisfies OverlayControl,
    {
      id: `shape-style:ellipse-arc:end:${input.shape.id}`,
      kind: 'arc-angle-end',
      ownerId: input.shape.id,
      priority: CONTROL_PRIORITY.arcAngle,
      hitArea: {
        kind: 'point',
        center: endPoint,
        tolerance: input.handleToleranceWorld,
      },
      cursor: {type: 'pointer'},
      dragBehavior: {
        kind: 'arc-angle',
        payload: {shapeId: input.shape.id, boundary: 'end'},
        token: 'ellipse-arc:end',
      },
      metadata: {boundary: 'end', angle: endAngle},
      label: 'ellipse-arc:end',
    } satisfies OverlayControl,
  ]
}

/**
 * Rotates one world point around a center by degrees.
 */
function rotateAround(point: {x: number; y: number}, center: {x: number; y: number}, angleDegrees: number) {
  if (Math.abs(angleDegrees) <= Number.EPSILON) {
    return {x: point.x, y: point.y}
  }

  const radians = (angleDegrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

/**
 * Clamps a value to the inclusive [min, max] range.
 */
function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

/**
 * Normalizes degree angle into [0, 360).
 */
function normalizeDegrees(value: number) {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}
