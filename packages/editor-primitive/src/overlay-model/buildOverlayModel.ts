import type {Point2D} from '@venus/lib'
import {CONTROL_PRIORITY} from '../control/ControlPriority.ts'
import type {ControlDragBehavior} from '../control/DragBehavior.ts'
import type {OverlayControl} from '../control/OverlayControl.ts'
import type {SelectedMarquee, SelectedMarqueeGeometry} from './SelectedMarquee.ts'
import type {SelectionBox} from './SelectionBox.ts'

/**
 * Defines the canonical marquee corner identifiers.
 */
const MARQUEE_CORNER_IDS = ['nw', 'ne', 'se', 'sw'] as const
type MarqueeCornerId = (typeof MARQUEE_CORNER_IDS)[number]

/**
 * Defines edge identifier discriminator emitted by builder helpers.
 */
type MarqueeEdgeId = 'n' | 'e' | 's' | 'w'

/**
 * Defines build options for the standard marquee controls bundle.
 */
export interface BuildSelectedMarqueeControlsOptions {
  /** Stores selection bounds geometry. */
  geometry: SelectedMarqueeGeometry
  /** Stores world-space tolerance for edge/corner hit areas. */
  edgeToleranceWorld: number
  /** Stores world-space tolerance for corner hit areas. */
  cornerToleranceWorld: number
  /** Stores world-space rotate sector inner radius. */
  rotateSectorInnerRadiusWorld: number
  /** Stores world-space rotate sector outer radius. */
  rotateSectorOuterRadiusWorld: number
  /** Stores world-space corner offset applied to rotate sector centers. */
  rotateCornerOffsetWorld: number
  /** Indicates whether marquee body should expose a move control. */
  emitMoveBody?: boolean
}

/**
 * Builds the standard resize/rotate/move overlay controls anchored to the
 * supplied selection geometry.
 *
 * Geometry corners are consumed in CW order (nw, ne, se, sw); edge midpoints
 * are derived inline so callers do not need to recompute them. The function
 * is intentionally pure so vector-side code can call it both for hit
 * resolution and for engine render descriptor mapping.
 */
export function buildSelectedMarqueeControls(
  options: BuildSelectedMarqueeControlsOptions,
): OverlayControl[] {
  const corners = resolveCornerPoints(options.geometry)
  const cornerByKey = new Map<MarqueeCornerId, Point2D>()
  MARQUEE_CORNER_IDS.forEach((cornerId, index) => {
    cornerByKey.set(cornerId, corners[index])
  })

  const edgeMidpoints: Record<MarqueeEdgeId, Point2D> = {
    n: midpoint(corners[0], corners[1]),
    e: midpoint(corners[1], corners[2]),
    s: midpoint(corners[2], corners[3]),
    w: midpoint(corners[3], corners[0]),
  }

  const rotationDegrees = options.geometry.kind === 'rotated'
    ? options.geometry.rotationDegrees
    : 0
  const controls: OverlayControl[] = []

  // Edge resize controls: 4 segment-shaped hit areas (n/e/s/w).
  controls.push(
    createEdgeResizeControl({
      edgeId: 'n',
      from: corners[0],
      to: corners[1],
      midpoint: edgeMidpoints.n,
      rotationDegrees,
      tolerance: options.edgeToleranceWorld,
    }),
    createEdgeResizeControl({
      edgeId: 'e',
      from: corners[1],
      to: corners[2],
      midpoint: edgeMidpoints.e,
      rotationDegrees,
      tolerance: options.edgeToleranceWorld,
    }),
    createEdgeResizeControl({
      edgeId: 's',
      from: corners[2],
      to: corners[3],
      midpoint: edgeMidpoints.s,
      rotationDegrees,
      tolerance: options.edgeToleranceWorld,
    }),
    createEdgeResizeControl({
      edgeId: 'w',
      from: corners[3],
      to: corners[0],
      midpoint: edgeMidpoints.w,
      rotationDegrees,
      tolerance: options.edgeToleranceWorld,
    }),
  )

  // Corner resize controls: 4 small rect hit areas centered on corners.
  MARQUEE_CORNER_IDS.forEach((cornerId) => {
    const cornerPoint = cornerByKey.get(cornerId)
    if (!cornerPoint) {
      return
    }
    controls.push(createCornerResizeControl({
      cornerId,
      cornerPoint,
      rotationDegrees,
      tolerance: options.cornerToleranceWorld,
    }))
  })

  // Rotate controls: arc-sector hit area for each corner per docs §7.3.
  const center = resolveGeometryCenter(options.geometry)
  MARQUEE_CORNER_IDS.forEach((cornerId) => {
    const cornerPoint = cornerByKey.get(cornerId)
    if (!cornerPoint) {
      return
    }
    controls.push(createRotateControl({
      cornerId,
      cornerPoint,
      center,
      rotationDegrees,
      cornerOffsetWorld: options.rotateCornerOffsetWorld,
      innerRadiusWorld: options.rotateSectorInnerRadiusWorld,
      outerRadiusWorld: options.rotateSectorOuterRadiusWorld,
    }))
  })

  // Marquee body move control: optional, lower priority than handles.
  if (options.emitMoveBody !== false) {
    controls.push(createMarqueeBodyControl({
      corners,
      rotationDegrees,
    }))
  }

  return controls
}

/**
 * Builds a SelectedMarquee aggregate including geometry and controls.
 */
export function buildSelectedMarquee(input: {
  selectedIds: string[]
  geometry: SelectedMarqueeGeometry
  edgeToleranceWorld: number
  cornerToleranceWorld: number
  rotateSectorInnerRadiusWorld: number
  rotateSectorOuterRadiusWorld: number
  rotateCornerOffsetWorld: number
  emitMoveBody?: boolean
}): SelectedMarquee {
  return {
    selectedIds: [...input.selectedIds],
    geometry: input.geometry,
    controls: buildSelectedMarqueeControls(input),
  }
}

/**
 * Builds a SelectionBox descriptor from drag start/current points.
 */
export function buildSelectionBox(start: Point2D, current: Point2D): SelectionBox {
  // Normalize so output stays axis-aligned regardless of drag direction.
  return {
    minX: Math.min(start.x, current.x),
    minY: Math.min(start.y, current.y),
    maxX: Math.max(start.x, current.x),
    maxY: Math.max(start.y, current.y),
  }
}

/**
 * Resolves the four corners (CW: nw, ne, se, sw) of a marquee geometry.
 */
export function resolveMarqueeGeometryCorners(geometry: SelectedMarqueeGeometry): [Point2D, Point2D, Point2D, Point2D] {
  return resolveCornerPoints(geometry)
}

// Builds one edge resize control per docs §7.1 with full-edge segment hit.
function createEdgeResizeControl(input: {
  edgeId: MarqueeEdgeId
  from: Point2D
  to: Point2D
  midpoint: Point2D
  rotationDegrees: number
  tolerance: number
}): OverlayControl {
  const dragBehavior: ControlDragBehavior<{direction: MarqueeEdgeId}> = {
    kind: 'resize',
    payload: {direction: input.edgeId},
    token: `resize:${input.edgeId}`,
  }
  return {
    id: `marquee:resize-edge:${input.edgeId}`,
    kind: 'resize-edge',
    priority: CONTROL_PRIORITY.resizeEdge,
    hitArea: {
      kind: 'segment',
      from: input.from,
      to: input.to,
      tolerance: input.tolerance,
    },
    cursor: {type: 'resize', direction: input.edgeId, rotation: input.rotationDegrees},
    dragBehavior,
    metadata: {edgeId: input.edgeId, midpoint: input.midpoint},
  }
}

// Builds one corner resize control per docs §7.2 using point-radius hit.
function createCornerResizeControl(input: {
  cornerId: MarqueeCornerId
  cornerPoint: Point2D
  rotationDegrees: number
  tolerance: number
}): OverlayControl {
  const dragBehavior: ControlDragBehavior<{direction: MarqueeCornerId}> = {
    kind: 'resize',
    payload: {direction: input.cornerId},
    token: `resize:${input.cornerId}`,
  }
  return {
    id: `marquee:resize-corner:${input.cornerId}`,
    kind: 'resize-corner',
    priority: CONTROL_PRIORITY.resizeCorner,
    hitArea: {
      kind: 'point',
      center: input.cornerPoint,
      tolerance: input.tolerance,
    },
    cursor: {type: 'resize', direction: input.cornerId, rotation: input.rotationDegrees},
    dragBehavior,
    metadata: {cornerId: input.cornerId},
  }
}

// Builds one rotate control per docs §7.3 with arc-sector hit area outside the corner.
function createRotateControl(input: {
  cornerId: MarqueeCornerId
  cornerPoint: Point2D
  center: Point2D
  rotationDegrees: number
  cornerOffsetWorld: number
  innerRadiusWorld: number
  outerRadiusWorld: number
}): OverlayControl {
  const outwardX = input.cornerPoint.x - input.center.x
  const outwardY = input.cornerPoint.y - input.center.y
  const length = Math.max(Number.EPSILON, Math.hypot(outwardX, outwardY))
  const normalX = outwardX / length
  const normalY = outwardY / length
  const sectorCenter: Point2D = {
    // Use marquee corner as sector center so rotate hit area anchors exactly to each corner.
    x: input.cornerPoint.x,
    y: input.cornerPoint.y,
  }

  // Sector spans 270 degrees, leaving a 90-degree gap facing inward to keep
  // corner-resize controls as the dominant interaction near the marquee center.
  const inwardAngle = Math.atan2(-normalY, -normalX)
  const inwardDegrees = (inwardAngle * 180) / Math.PI
  const startAngleDegrees = inwardDegrees + 45
  const endAngleDegrees = inwardDegrees - 45 + 360

  const dragBehavior: ControlDragBehavior<{anchor: MarqueeCornerId}> = {
    kind: 'rotate',
    payload: {anchor: input.cornerId},
    token: `rotate:${input.cornerId}`,
  }

  return {
    id: `marquee:rotate:${input.cornerId}`,
    kind: 'rotate',
    priority: CONTROL_PRIORITY.rotate,
    hitArea: {
      kind: 'arc-sector',
      center: sectorCenter,
      innerRadius: input.innerRadiusWorld,
      outerRadius: input.outerRadiusWorld,
      startAngleDegrees,
      endAngleDegrees,
    },
    cursor: {type: 'rotate', angle: input.rotationDegrees},
    dragBehavior,
    metadata: {cornerId: input.cornerId, sectorCenter},
  }
}

// Builds one move-body control covering the marquee interior.
function createMarqueeBodyControl(input: {
  corners: [Point2D, Point2D, Point2D, Point2D]
  rotationDegrees: number
}): OverlayControl {
  const dragBehavior: ControlDragBehavior = {
    kind: 'move',
    token: 'move:marquee-body',
  }
  return {
    id: 'marquee:move-body',
    kind: 'move-body',
    priority: CONTROL_PRIORITY.marqueeBody,
    hitArea: {
      kind: 'rotated-rect',
      corners: input.corners,
    },
    cursor: {type: 'move'},
    dragBehavior,
    metadata: {rotationDegrees: input.rotationDegrees},
  }
}

// Resolves canonical CW corner ordering for both axis-aligned and rotated geometry.
function resolveCornerPoints(geometry: SelectedMarqueeGeometry): [Point2D, Point2D, Point2D, Point2D] {
  if (geometry.kind === 'rotated') {
    return geometry.corners
  }
  return [
    {x: geometry.minX, y: geometry.minY},
    {x: geometry.maxX, y: geometry.minY},
    {x: geometry.maxX, y: geometry.maxY},
    {x: geometry.minX, y: geometry.maxY},
  ]
}

// Resolves marquee center for rotate sector orientation math.
function resolveGeometryCenter(geometry: SelectedMarqueeGeometry): Point2D {
  if (geometry.kind === 'rotated') {
    const sum = geometry.corners.reduce(
      (acc, point) => ({x: acc.x + point.x, y: acc.y + point.y}),
      {x: 0, y: 0},
    )
    return {x: sum.x / 4, y: sum.y / 4}
  }
  return {
    x: (geometry.minX + geometry.maxX) / 2,
    y: (geometry.minY + geometry.maxY) / 2,
  }
}

// Resolves midpoint between two points for edge-control anchoring.
function midpoint(a: Point2D, b: Point2D): Point2D {
  return {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2}
}
