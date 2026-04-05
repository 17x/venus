import {isPointInsideClipShape, type EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@venus/shared-memory'

export interface SelectionDragModifiers {
  shiftKey?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
}

export interface SelectionDragSnapshot {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
}

export interface SelectionDragShapeState {
  shapeId: string
  x: number
  y: number
}

export interface SelectionDragSession {
  start: {x: number; y: number}
  current: {x: number; y: number}
  bounds: {minX: number; minY: number; maxX: number; maxY: number}
  shapes: SelectionDragShapeState[]
}

export interface SelectionDragMoveResult {
  phase: 'none' | 'pending' | 'started' | 'dragging'
  session: SelectionDragSession | null
}

export interface SelectionDragController {
  pointerDown: (
    pointer: {x: number; y: number},
    snapshot: SelectionDragSnapshot,
    modifiers?: SelectionDragModifiers,
    options?: {
      hitShapeId?: string | null
    },
  ) => boolean
  pointerMove: (pointer: {x: number; y: number}, snapshot: SelectionDragSnapshot) => SelectionDragMoveResult
  pointerUp: () => SelectionDragSession | null
  clear: () => void
  getSession: () => SelectionDragSession | null
}

export function createSelectionDragController(options?: {
  dragThresholdPx?: number
  lineHitTolerance?: number
  allowFrameSelection?: boolean
}): SelectionDragController {
  const dragThresholdPx = options?.dragThresholdPx ?? 3
  const lineHitTolerance = options?.lineHitTolerance ?? 6
  const allowFrameSelection = options?.allowFrameSelection ?? true

  let pending: {start: {x: number; y: number}; shapeId: string} | null = null
  let session: SelectionDragSession | null = null

  const clear = () => {
    pending = null
    session = null
  }

  return {
    pointerDown(pointer, snapshot, modifiers, options) {
      // Modifier-based selection edits should not arm drag-pending state.
      if (modifiers?.shiftKey || modifiers?.metaKey || modifiers?.ctrlKey) {
        pending = null
        session = null
        return false
      }

      let hitShape = null as SceneShapeSnapshot | null
      const hintedId = options?.hitShapeId ?? null
      const shapeById = new Map(snapshot.document.shapes.map((item) => [item.id, item]))
      if (hintedId) {
        const hintedShape = snapshot.shapes.find((shape) => shape.id === hintedId) ?? null
        const hintedSource = hintedShape ? shapeById.get(hintedShape.id) : undefined
        if (
          hintedShape &&
          hintedSource &&
          isShapeHitAtPointer(hintedShape, hintedSource, pointer, lineHitTolerance, allowFrameSelection, shapeById)
        ) {
          hitShape = hintedShape
        }
      }
      if (!hitShape) {
        const hitIndex = hitTestSnapshot(snapshot, pointer, lineHitTolerance, allowFrameSelection)
        hitShape = hitIndex >= 0 ? snapshot.shapes[hitIndex] : null
      }
      pending = hitShape
        ? {
            start: pointer,
            shapeId: hitShape.id,
          }
        : null
      session = null
      return !!hitShape
    },
    pointerMove(pointer, snapshot) {
      if (pending) {
        const moved = Math.hypot(pointer.x - pending.start.x, pointer.y - pending.start.y)
        if (moved < dragThresholdPx) {
          return {
            phase: 'pending',
            session: null,
          }
        }

        const selectedIds = snapshot.shapes.filter((shape) => shape.isSelected).map((shape) => shape.id)
        // Drag follows the selected set when hit shape is selected; otherwise
        // it drags the hit shape only (single-shape takeover).
        const dragIds = selectedIds.includes(pending.shapeId) ? selectedIds : [pending.shapeId]
        const dragShapes = dragIds
          .map((id) => snapshot.document.shapes.find((shape) => shape.id === id))
          .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape))
          .map((shape) => ({
            shapeId: shape.id,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
          }))

        if (dragShapes.length === 0) {
          pending = null
          return {
            phase: 'none',
            session: null,
          }
        }

        const first = dragShapes[0]
        const bounds = dragShapes
          .map((shape) => getNormalizedBounds(shape.x, shape.y, shape.width, shape.height))
          .reduce(
            (acc, boundsItem) => ({
              minX: Math.min(acc.minX, boundsItem.minX),
              minY: Math.min(acc.minY, boundsItem.minY),
              maxX: Math.max(acc.maxX, boundsItem.maxX),
              maxY: Math.max(acc.maxY, boundsItem.maxY),
            }),
            getNormalizedBounds(first.x, first.y, first.width, first.height),
          )

        session = {
          start: pending.start,
          current: pointer,
          bounds,
          shapes: dragShapes.map((shape) => ({
            shapeId: shape.shapeId,
            x: shape.x,
            y: shape.y,
          })),
        }
        pending = null
        return {
          phase: 'started',
          session,
        }
      }

      if (session) {
        session = {
          ...session,
          current: pointer,
        }
        return {
          phase: 'dragging',
          session,
        }
      }

      return {
        phase: 'none',
        session: null,
      }
    },
    pointerUp() {
      const finished = session
      pending = null
      session = null
      return finished
    },
    clear,
    getSession() {
      return session
    },
  }
}

function hitTestSnapshot(
  snapshot: SelectionDragSnapshot,
  pointer: {x: number; y: number},
  lineHitTolerance: number,
  allowFrameSelection: boolean,
) {
  const {document, shapes} = snapshot
  const shapeById = new Map(document.shapes.map((item) => [item.id, item]))
  for (let index = shapes.length - 1; index >= 0; index -= 1) {
    const shape = shapes[index]
    const source = shapeById.get(shape.id)
    if (!source) {
      continue
    }
    if (isShapeHitAtPointer(shape, source, pointer, lineHitTolerance, allowFrameSelection, shapeById)) {
      return index
    }
  }

  return -1
}

function isShapeHitAtPointer(
  shape: SceneShapeSnapshot,
  source: EditorDocument['shapes'][number],
  pointer: {x: number; y: number},
  lineHitTolerance: number,
  allowFrameSelection: boolean,
  shapeById: Map<string, EditorDocument['shapes'][number]>,
) {
  if (!allowFrameSelection && shape.type === 'frame') {
    return false
  }
  if (shape.type === 'image' && source.clipPathId) {
    return false
  }
  const tolerance = shape.type === 'lineSegment' || shape.type === 'path' ? lineHitTolerance : 0
  const left = Math.min(shape.x, shape.x + shape.width) - tolerance
  const right = Math.max(shape.x, shape.x + shape.width) + tolerance
  const top = Math.min(shape.y, shape.y + shape.height) - tolerance
  const bottom = Math.max(shape.y, shape.y + shape.height) + tolerance

  const inBounds = pointer.x >= left && pointer.x <= right && pointer.y >= top && pointer.y <= bottom
  if (!inBounds) {
    return false
  }

  if (source.clipPathId) {
    const clipSource = shapeById.get(source.clipPathId)
    if (clipSource && !isPointInsideClipShape(pointer, clipSource, {tolerance: lineHitTolerance})) {
      return false
    }
  }

  if (shape.type === 'ellipse') {
    const radiusX = Math.abs(shape.width) / 2
    const radiusY = Math.abs(shape.height) / 2
    if (radiusX <= 0 || radiusY <= 0) {
      return false
    }

    const centerX = Math.min(shape.x, shape.x + shape.width) + radiusX
    const centerY = Math.min(shape.y, shape.y + shape.height) + radiusY
    const normalized =
      ((pointer.x - centerX) * (pointer.x - centerX)) / (radiusX * radiusX) +
      ((pointer.y - centerY) * (pointer.y - centerY)) / (radiusY * radiusY)

    if (normalized > 1) {
      return false
    }
  }

  if (shape.type === 'lineSegment') {
    const hit = isPointNearLineSegment(pointer, {
      x1: shape.x,
      y1: shape.y,
      x2: shape.x + shape.width,
      y2: shape.y + shape.height,
    }, lineHitTolerance)
    if (!hit) {
      return false
    }
  }

  if (shape.type === 'polygon' || shape.type === 'star') {
    const points = source.points
    if (!points || points.length < 3) {
      return false
    }

    const inside = isPointInsidePolygon(pointer, points)
    const edge = isPointNearPolygonEdge(pointer, points, lineHitTolerance)
    if (!inside && !edge) {
      return false
    }
  }

  if (shape.type === 'path') {
    const strokeHit = resolvePathStrokeHit(pointer, source, shape, lineHitTolerance)
    if (!strokeHit) {
      if (!hasPathFill(source)) {
        return false
      }

      const fillHit = resolvePathFillHit(pointer, source, lineHitTolerance)
      if (!fillHit) {
        return false
      }
    }
  }

  return true
}

function getNormalizedBounds(x: number, y: number, width: number, height: number) {
  return {
    minX: Math.min(x, x + width),
    minY: Math.min(y, y + height),
    maxX: Math.max(x, x + width),
    maxY: Math.max(y, y + height),
  }
}

function hasPathFill(
  shape: SelectionDragSnapshot['document']['shapes'][number] | undefined,
) {
  const featureKinds = shape?.schema?.sourceFeatureKinds ?? []
  if (featureKinds.some((kind) => String(kind).toUpperCase() === 'FILL')) {
    return true
  }

  // Fallback for authoring paths without schema: treat explicitly closed
  // point-list paths as fill-hit capable.
  const points = shape?.points
  if (!points || points.length < 3) {
    return false
  }
  const first = points[0]
  const last = points[points.length - 1]
  return Math.hypot(first.x - last.x, first.y - last.y) <= 1.5
}

function resolvePathStrokeHit(
  pointer: {x: number; y: number},
  source: SelectionDragSnapshot['document']['shapes'][number] | undefined,
  fallbackShape: SceneShapeSnapshot,
  tolerance: number,
) {
  if (source?.bezierPoints && source.bezierPoints.length > 1) {
    return isPointNearBezierPath(pointer, source.bezierPoints, tolerance)
  }
  if (source?.points && source.points.length > 1) {
    return isPointNearPolyline(pointer, source.points, tolerance)
  }

  return isPointNearLineSegment(pointer, {
    x1: fallbackShape.x,
    y1: fallbackShape.y,
    x2: fallbackShape.x + fallbackShape.width,
    y2: fallbackShape.y + fallbackShape.height,
  }, tolerance)
}

function resolvePathFillHit(
  pointer: {x: number; y: number},
  source: SelectionDragSnapshot['document']['shapes'][number] | undefined,
  tolerance: number,
) {
  if (!source) {
    return false
  }

  if (source.bezierPoints && source.bezierPoints.length > 1) {
    const polygon = sampleBezierPathPolygon(source.bezierPoints, 16)
    if (polygon.length < 3) {
      return false
    }
    return isPointInsidePolygon(pointer, polygon) || isPointNearPolygonEdge(pointer, polygon, tolerance)
  }

  if (source.points && source.points.length > 2) {
    return (
      isPointInsidePolygon(pointer, source.points) ||
      isPointNearPolygonEdge(pointer, source.points, tolerance)
    )
  }

  return false
}

function isPointNearLineSegment(
  pointer: {x: number; y: number},
  line: {x1: number; y1: number; x2: number; y2: number},
  tolerance = 6,
) {
  const dx = line.x2 - line.x1
  const dy = line.y2 - line.y1
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    const distanceSquared =
      (pointer.x - line.x1) * (pointer.x - line.x1) +
      (pointer.y - line.y1) * (pointer.y - line.y1)
    return distanceSquared <= tolerance * tolerance
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointer.x - line.x1) * dx + (pointer.y - line.y1) * dy) / lengthSquared,
    ),
  )
  const nearestX = line.x1 + t * dx
  const nearestY = line.y1 + t * dy
  const distanceSquared =
    (pointer.x - nearestX) * (pointer.x - nearestX) +
    (pointer.y - nearestY) * (pointer.y - nearestY)

  return distanceSquared <= tolerance * tolerance
}

function isPointNearPolyline(
  pointer: {x: number; y: number},
  points: Array<{x: number; y: number}>,
  tolerance = 6,
) {
  for (let index = 1; index < points.length; index += 1) {
    if (
      isPointNearLineSegment(pointer, {
        x1: points[index - 1].x,
        y1: points[index - 1].y,
        x2: points[index].x,
        y2: points[index].y,
      }, tolerance)
    ) {
      return true
    }
  }

  return false
}

function isPointNearBezierPath(
  pointer: {x: number; y: number},
  points: Array<{
    anchor: {x: number; y: number}
    cp1?: {x: number; y: number} | null
    cp2?: {x: number; y: number} | null
  }>,
  tolerance = 6,
) {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    for (let step = 0; step <= 32; step += 1) {
      const t = step / 32
      const sampled = sampleCubicBezierPoint(
        previous.anchor,
        previous.cp2 ?? previous.anchor,
        current.cp1 ?? current.anchor,
        current.anchor,
        t,
      )
      const dx = sampled.x - pointer.x
      const dy = sampled.y - pointer.y
      if (dx * dx + dy * dy <= tolerance * tolerance) {
        return true
      }
    }
  }

  return false
}

function isPointInsidePolygon(
  pointer: {x: number; y: number},
  points: Array<{x: number; y: number}>,
) {
  let inside = false

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const current = points[index]
    const last = points[previous]
    const intersects =
      ((current.y > pointer.y) !== (last.y > pointer.y)) &&
      pointer.x < ((last.x - current.x) * (pointer.y - current.y)) / ((last.y - current.y) || 1e-9) + current.x

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

function isPointNearPolygonEdge(
  pointer: {x: number; y: number},
  points: Array<{x: number; y: number}>,
  tolerance = 6,
) {
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const edgeHit = isPointNearLineSegment(pointer, {
      x1: current.x,
      y1: current.y,
      x2: next.x,
      y2: next.y,
    }, tolerance)

    if (edgeHit) {
      return true
    }
  }

  return false
}

function sampleBezierPathPolygon(
  points: Array<{
    anchor: {x: number; y: number}
    cp1?: {x: number; y: number} | null
    cp2?: {x: number; y: number} | null
  }>,
  stepsPerSegment = 16,
) {
  if (points.length < 2) {
    return []
  }

  const sampled: Array<{x: number; y: number}> = [{...points[0].anchor}]

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const cp1 = current.cp2 ?? current.anchor
    const cp2 = next.cp1 ?? next.anchor

    for (let step = 1; step <= stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment
      sampled.push(sampleCubicBezierPoint(current.anchor, cp1, cp2, next.anchor, t))
    }
  }

  return sampled
}

function sampleCubicBezierPoint(
  p0: {x: number; y: number},
  p1: {x: number; y: number},
  p2: {x: number; y: number},
  p3: {x: number; y: number},
  t: number,
) {
  const inv = 1 - t
  const a = inv * inv * inv
  const b = 3 * inv * inv * t
  const c = 3 * inv * t * t
  const d = t * t * t

  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  }
}
