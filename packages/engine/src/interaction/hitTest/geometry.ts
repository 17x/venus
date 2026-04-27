interface PointLike {
  x: number
  y: number
}

interface BoundsLike {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface RoundedRectCornerRadii {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

// Keep low-level geometry predicates shared so hitTest.ts can stay centered on
// shape-type dispatch rather than point-in-shape math details.
export function isPointInsideBounds(
  pointer: PointLike,
  bounds: BoundsLike,
) {
  return (
    pointer.x >= bounds.minX &&
    pointer.x <= bounds.maxX &&
    pointer.y >= bounds.minY &&
    pointer.y <= bounds.maxY
  )
}

export function isPointInsidePolygon(
  pointer: PointLike,
  points: PointLike[],
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

export function isPointNearPolygonEdge(
  pointer: PointLike,
  points: PointLike[],
  tolerance = 6,
) {
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    if (isPointNearLineSegment(pointer, {x1: current.x, y1: current.y, x2: next.x, y2: next.y}, tolerance)) {
      return true
    }
  }

  return false
}

export function isPointInsideEllipse(
  pointer: PointLike,
  bounds: BoundsLike,
) {
  const radiusX = (bounds.maxX - bounds.minX) / 2
  const radiusY = (bounds.maxY - bounds.minY) / 2
  if (radiusX <= 0 || radiusY <= 0) {
    return false
  }

  const centerX = bounds.minX + radiusX
  const centerY = bounds.minY + radiusY
  const normalized =
    ((pointer.x - centerX) * (pointer.x - centerX)) / (radiusX * radiusX) +
    ((pointer.y - centerY) * (pointer.y - centerY)) / (radiusY * radiusY)

  return normalized <= 1
}

export function isPointNearEllipseEdge(
  pointer: PointLike,
  bounds: BoundsLike,
  tolerance: number,
) {
  const radiusX = (bounds.maxX - bounds.minX) / 2
  const radiusY = (bounds.maxY - bounds.minY) / 2
  if (radiusX <= 0 || radiusY <= 0) {
    return false
  }

  const centerX = bounds.minX + radiusX
  const centerY = bounds.minY + radiusY
  const deltaX = pointer.x - centerX
  const deltaY = pointer.y - centerY

  const normalized =
    (deltaX * deltaX) / ((radiusX + tolerance) * (radiusX + tolerance)) +
    (deltaY * deltaY) / ((radiusY + tolerance) * (radiusY + tolerance))
  const inner = Math.max(0, tolerance)
  const innerRadiusX = Math.max(1e-6, radiusX - inner)
  const innerRadiusY = Math.max(1e-6, radiusY - inner)
  const normalizedInner =
    (deltaX * deltaX) / (innerRadiusX * innerRadiusX) +
    (deltaY * deltaY) / (innerRadiusY * innerRadiusY)

  return normalized <= 1 && normalizedInner >= 1
}

export function isPointNearRectEdge(
  pointer: PointLike,
  bounds: BoundsLike,
  tolerance: number,
) {
  const expanded = {
    minX: bounds.minX - tolerance,
    minY: bounds.minY - tolerance,
    maxX: bounds.maxX + tolerance,
    maxY: bounds.maxY + tolerance,
  }
  if (!isPointInsideBounds(pointer, expanded)) {
    return false
  }

  const inner = {
    minX: bounds.minX + tolerance,
    minY: bounds.minY + tolerance,
    maxX: bounds.maxX - tolerance,
    maxY: bounds.maxY - tolerance,
  }

  if (inner.minX > inner.maxX || inner.minY > inner.maxY) {
    return true
  }

  return !isPointInsideBounds(pointer, inner)
}

export function resolveRoundedRectCornerRadii(
  shape: Pick<{
    cornerRadius?: number
    cornerRadii?: {
      topLeft?: number
      topRight?: number
      bottomRight?: number
      bottomLeft?: number
    }
  }, 'cornerRadius' | 'cornerRadii'>,
  bounds: BoundsLike,
): RoundedRectCornerRadii {
  const width = Math.max(0, bounds.maxX - bounds.minX)
  const height = Math.max(0, bounds.maxY - bounds.minY)
  const fallback = Math.max(0, shape.cornerRadius ?? 0)
  const requested: RoundedRectCornerRadii = {
    topLeft: Math.max(0, shape.cornerRadii?.topLeft ?? fallback),
    topRight: Math.max(0, shape.cornerRadii?.topRight ?? fallback),
    bottomRight: Math.max(0, shape.cornerRadii?.bottomRight ?? fallback),
    bottomLeft: Math.max(0, shape.cornerRadii?.bottomLeft ?? fallback),
  }

  if (width <= 0 || height <= 0) {
    return {
      topLeft: 0,
      topRight: 0,
      bottomRight: 0,
      bottomLeft: 0,
    }
  }

  const horizontalTop = requested.topLeft + requested.topRight
  const horizontalBottom = requested.bottomLeft + requested.bottomRight
  const verticalLeft = requested.topLeft + requested.bottomLeft
  const verticalRight = requested.topRight + requested.bottomRight
  const scale = Math.min(
    1,
    horizontalTop > 0 ? width / horizontalTop : 1,
    horizontalBottom > 0 ? width / horizontalBottom : 1,
    verticalLeft > 0 ? height / verticalLeft : 1,
    verticalRight > 0 ? height / verticalRight : 1,
  )

  return {
    topLeft: requested.topLeft * scale,
    topRight: requested.topRight * scale,
    bottomRight: requested.bottomRight * scale,
    bottomLeft: requested.bottomLeft * scale,
  }
}

export function isPointInsideRoundedRect(
  pointer: PointLike,
  bounds: BoundsLike,
  radii: RoundedRectCornerRadii,
) {
  if (!isPointInsideBounds(pointer, bounds)) {
    return false
  }

  const {topLeft, topRight, bottomRight, bottomLeft} = radii
  const nearLeft = pointer.x < bounds.minX + topLeft
  const nearRight = pointer.x > bounds.maxX - topRight
  const nearTop = pointer.y < bounds.minY + topLeft
  const nearTopRight = pointer.y < bounds.minY + topRight
  const nearBottom = pointer.y > bounds.maxY - bottomLeft
  const nearBottomRight = pointer.y > bounds.maxY - bottomRight

  if (topLeft > 0 && nearLeft && nearTop) {
    const centerX = bounds.minX + topLeft
    const centerY = bounds.minY + topLeft
    return Math.hypot(pointer.x - centerX, pointer.y - centerY) <= topLeft
  }

  if (topRight > 0 && nearRight && nearTopRight) {
    const centerX = bounds.maxX - topRight
    const centerY = bounds.minY + topRight
    return Math.hypot(pointer.x - centerX, pointer.y - centerY) <= topRight
  }

  if (bottomRight > 0 && pointer.x > bounds.maxX - bottomRight && nearBottomRight) {
    const centerX = bounds.maxX - bottomRight
    const centerY = bounds.maxY - bottomRight
    return Math.hypot(pointer.x - centerX, pointer.y - centerY) <= bottomRight
  }

  if (bottomLeft > 0 && pointer.x < bounds.minX + bottomLeft && nearBottom) {
    const centerX = bounds.minX + bottomLeft
    const centerY = bounds.maxY - bottomLeft
    return Math.hypot(pointer.x - centerX, pointer.y - centerY) <= bottomLeft
  }

  return true
}

export function isPointNearRoundedRectEdge(
  pointer: PointLike,
  bounds: BoundsLike,
  radii: RoundedRectCornerRadii,
  tolerance: number,
) {
  const safeTolerance = Math.max(0, tolerance)
  const outerBounds = {
    minX: bounds.minX - safeTolerance,
    minY: bounds.minY - safeTolerance,
    maxX: bounds.maxX + safeTolerance,
    maxY: bounds.maxY + safeTolerance,
  }
  const outerRadii: RoundedRectCornerRadii = {
    topLeft: radii.topLeft + safeTolerance,
    topRight: radii.topRight + safeTolerance,
    bottomRight: radii.bottomRight + safeTolerance,
    bottomLeft: radii.bottomLeft + safeTolerance,
  }

  if (!isPointInsideRoundedRect(pointer, outerBounds, outerRadii)) {
    return false
  }

  const innerBounds = {
    minX: bounds.minX + safeTolerance,
    minY: bounds.minY + safeTolerance,
    maxX: bounds.maxX - safeTolerance,
    maxY: bounds.maxY - safeTolerance,
  }
  if (innerBounds.minX > innerBounds.maxX || innerBounds.minY > innerBounds.maxY) {
    return true
  }

  // Keep rounded-rect stroke hit as an annulus (outer shape minus inner shape)
  // so corner cutouts are respected in strict stroke-only mode.
  const innerRadii: RoundedRectCornerRadii = {
    topLeft: Math.max(0, radii.topLeft - safeTolerance),
    topRight: Math.max(0, radii.topRight - safeTolerance),
    bottomRight: Math.max(0, radii.bottomRight - safeTolerance),
    bottomLeft: Math.max(0, radii.bottomLeft - safeTolerance),
  }

  return !isPointInsideRoundedRect(pointer, innerBounds, innerRadii)
}

export function isPointNearLineSegment(
  pointer: PointLike,
  segment: {x1: number; y1: number; x2: number; y2: number},
  tolerance: number,
) {
  const dx = segment.x2 - segment.x1
  const dy = segment.y2 - segment.y1
  const lengthSq = dx * dx + dy * dy
  if (lengthSq <= 1e-9) {
    return Math.hypot(pointer.x - segment.x1, pointer.y - segment.y1) <= tolerance
  }

  const projected = ((pointer.x - segment.x1) * dx + (pointer.y - segment.y1) * dy) / lengthSq
  const clamped = Math.max(0, Math.min(1, projected))
  const closestX = segment.x1 + clamped * dx
  const closestY = segment.y1 + clamped * dy

  return Math.hypot(pointer.x - closestX, pointer.y - closestY) <= tolerance
}