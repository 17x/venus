import {BoundingRect, Point, Rect} from '~/type'

export const generateBoundingRectFromRotatedRect = ({x, y, width, height}: Rect, rotation: number): BoundingRect => {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const rotatedWidth = Math.abs(width * cos) + Math.abs(height * sin)
  const rotatedHeight = Math.abs(width * sin) + Math.abs(height * cos)
  const rectX = centerX - rotatedWidth / 2
  const rectY = centerY - rotatedHeight / 2

  return generateBoundingRectFromRect({
    x: rectX,
    y: rectY,
    width: rotatedWidth,
    height: rotatedHeight,
  })
}

export const generateBoundingRectFromRect = (rect: Rect): BoundingRect => {
  const {x, y, width, height} = rect

  return {
    x,
    y,
    width,
    height,
    top: y,
    bottom: y + height,
    left: x,
    right: x + width,
    cx: x + width / 2,
    cy: y + height / 2,
  }
}

export const generateBoundingRectFromTwoPoints = (p1: Point, p2: Point): BoundingRect => {
  const minX = Math.min(p1.x, p2.x)
  const maxX = Math.max(p1.x, p2.x)
  const minY = Math.min(p1.y, p2.y)
  const maxY = Math.max(p1.y, p2.y)

  return generateBoundingRectFromRect({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  })
}

export function rectsOverlap(r1: BoundingRect, r2: BoundingRect): boolean {
  // if(!r1)debugger
  return !(
    r1.right < r2.left ||
    r1.left > r2.right ||
    r1.bottom < r2.top ||
    r1.top > r2.bottom
  )
}

/*export function rectInside(inner: BoundingRect, outer: BoundingRect): boolean {
  return (
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.top >= outer.top &&
    inner.bottom <= outer.bottom
  )
}*/

export const isInsideRotatedRect = ({x: mouseX, y: mouseY}: Point, rect: Rect, rotation: number): boolean => {
  const {
    x: centerX,
    y: centerY,
    width,
    height,
  } = rect
  if (width <= 0 || height <= 0) {
    return false // Invalid rectangle dimensions
  }

  // If the rotation is 0, no need to apply any rotation logic
  if (rotation === 0) {
    const halfWidth = width / 2
    const halfHeight = height / 2

    return (
      mouseX >= centerX - halfWidth && mouseX <= centerX + halfWidth &&
      mouseY >= centerY - halfHeight && mouseY <= centerY + halfHeight
    )
  }

  // Convert rotation angle from degrees to radians
  const angle = rotation * (Math.PI / 180)

  // Pre-calculate sine and cosine of the rotation angle for optimization
  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)

  // Step 1: Translate the mouse position to the local space of the rotated rectangle
  const dx = mouseX - centerX
  const dy = mouseY - centerY

  // Step 2: Undo the rotation by rotating the mouse position back
  const unrotatedX = dx * cosAngle + dy * sinAngle
  const unrotatedY = -dx * sinAngle + dy * cosAngle

  // Step 3: Check if the unrotated mouse position lies within the bounds of the axis-aligned rectangle
  const halfWidth = width / 2
  const halfHeight = height / 2

  return (
    unrotatedX >= -halfWidth && unrotatedX <= halfWidth &&
    unrotatedY >= -halfHeight && unrotatedY <= halfHeight
  )
}

export const isNegativeZero = (x: number) => x === 0 && (1 / x) === -Infinity

export function throttle<T extends (...args: unknown[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>): void => {
    const now = Date.now()

    const invoke = () => {
      lastCall = now
      func(...args)
    }

    if (now - lastCall >= delay) {
      invoke()
    } else {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(invoke, delay - (now - lastCall))
    }
  }
}

/*

export const setFloatOnProps = <T extends RenderPropsList, K extends keyof RenderPropsList>(obj: T, keys: K[]): void => {
  keys.forEach((key) => {
    (obj[key] as number) = Math.floor(obj[key] as number)
  })
}*/

export function getDirectedBoundingBox(rects: BoundingRect[], rotation: number): BoundingRect {
  const allPoints: Point[] = []

  for (const r of rects) {
    const w = r.width / 2
    const h = r.height / 2

    const localCorners = [
      {x: -w, y: -h},
      {x: w, y: -h},
      {x: w, y: h},
      {x: -w, y: h},
    ]

    const matrix = new DOMMatrix()
      .translate(r.cx, r.cy)
      .rotate(rotation)

    for (const pt of localCorners) {
      const transformed = matrix.transformPoint(pt)
      allPoints.push({x: transformed.x, y: transformed.y})
    }
  }

  const xs = allPoints.map(p => p.x)
  const ys = allPoints.map(p => p.y)

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return generateBoundingRectFromRotatedRect({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }, rotation)
}

// generate unRotated BoundingRect from unRotated BoundingRect(s) and unified rotation
export function getSameRotationRectsBoundingRect(rects: BoundingRect[], rotation: number): BoundingRect {
  if (rects.length === 0) {
    throw new Error('No rectangles provided')
  }

  if (rects.length === 1) {
    // debugger
    return rects[0]
    // return generateBoundingRectFromRotatedRect(rects[0], rotation)
  }

  const normalizeAngle = (angle: number): number => ((angle % 360) + 360) % 360
  const degToRad = (deg: number): number => (deg * Math.PI) / 180

  const rotatePoint = ([x, y]: [number, number], angleDeg: number): [number, number] => {
    const rad = degToRad(angleDeg)
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return [
      x * cos - y * sin,
      x * sin + y * cos,
    ]
  }

  const unrotatePoint = ([x, y]: [number, number], angleDeg: number): [number, number] => {
    return rotatePoint([x, y], -angleDeg)
  }

  const allPoints: [number, number][] = []
  const normalizedAngle = normalizeAngle(rotation)

  for (const rect of rects) {
    const rad = degToRad(normalizedAngle)
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const hw = rect.width / 2
    const hh = rect.height / 2

    const corners: [number, number][] = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ]

    for (const [x, y] of corners) {
      const worldX = rect.cx + x * cos - y * sin
      const worldY = rect.cy + x * sin + y * cos
      const [ux, uy] = unrotatePoint([worldX, worldY], normalizedAngle)
      allPoints.push([ux, uy])
    }
  }

  const xs = allPoints.map(p => p[0])
  const ys = allPoints.map(p => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const [centerX, centerY] = rotatePoint([(minX + maxX) / 2, (minY + maxY) / 2], normalizedAngle)

  const width = maxX - minX
  const height = maxY - minY
  const halfW = width / 2
  const halfH = height / 2

  return {
    cx: centerX,
    cy: centerY,
    width,
    height,
    x: centerX - halfW,
    y: centerY - halfH,
    top: centerY - halfH,
    bottom: centerY + halfH,
    left: centerX - halfW,
    right: centerX + halfW,

  }
}