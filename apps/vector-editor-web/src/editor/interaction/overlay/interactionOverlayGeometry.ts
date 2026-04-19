import {applyMatrixToPoint} from '@vector/runtime'
import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  getNormalizedBoundsFromBox,
} from '@vector/runtime/engine'
import type {EditorDocument} from '@venus/document-core'
import type {CanvasRendererProps} from '../../runtime/canvasAdapter.tsx'

export function buildPathStrokeD(shape: EditorDocument['shapes'][number]) {
  if (shape.bezierPoints && shape.bezierPoints.length > 1) {
    const first = shape.bezierPoints[0]
    let d = `M ${first.anchor.x} ${first.anchor.y}`
    for (let index = 0; index < shape.bezierPoints.length - 1; index += 1) {
      const current = shape.bezierPoints[index]
      const next = shape.bezierPoints[index + 1]
      const cp1 = current.cp2 ?? current.anchor
      const cp2 = next.cp1 ?? next.anchor
      d += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${next.anchor.x} ${next.anchor.y}`
    }
    return d
  }

  if (shape.points && shape.points.length > 1) {
    const [first, ...rest] = shape.points
    return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(' ')}`
  }

  return null
}

export interface RoundedRectCornerRadii {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

export function resolveRoundedRectCornerRadii(
  shape: Pick<EditorDocument['shapes'][number], 'cornerRadius' | 'cornerRadii'>,
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
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

export function buildRoundedRectStrokeD(shape: EditorDocument['shapes'][number]) {
  const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
  const width = Math.max(0, bounds.width)
  const height = Math.max(0, bounds.height)
  if (width <= 0 || height <= 0) {
    return null
  }

  const radii = resolveRoundedRectCornerRadii(shape, bounds)
  const hasRoundedCorners = radii.topLeft > 0 || radii.topRight > 0 || radii.bottomRight > 0 || radii.bottomLeft > 0
  if (!hasRoundedCorners) {
    return null
  }

  const minX = bounds.minX
  const minY = bounds.minY
  const maxX = bounds.maxX
  const maxY = bounds.maxY

  return [
    `M ${minX + radii.topLeft} ${minY}`,
    `L ${maxX - radii.topRight} ${minY}`,
    `A ${radii.topRight} ${radii.topRight} 0 0 1 ${maxX} ${minY + radii.topRight}`,
    `L ${maxX} ${maxY - radii.bottomRight}`,
    `A ${radii.bottomRight} ${radii.bottomRight} 0 0 1 ${maxX - radii.bottomRight} ${maxY}`,
    `L ${minX + radii.bottomLeft} ${maxY}`,
    `A ${radii.bottomLeft} ${radii.bottomLeft} 0 0 1 ${minX} ${maxY - radii.bottomLeft}`,
    `L ${minX} ${minY + radii.topLeft}`,
    `A ${radii.topLeft} ${radii.topLeft} 0 0 1 ${minX + radii.topLeft} ${minY}`,
    'Z',
  ].join(' ')
}

export function buildRectPolygon(
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
  options: {
    rotationDegrees: number
    flipX?: boolean
    flipY?: boolean
  },
) {
  const rotationDegrees = options.rotationDegrees
  const flipX = options.flipX ? -1 : 1
  const flipY = options.flipY ? -1 : 1
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const corners = [
    {x: bounds.minX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
  ]
  if (Math.abs(rotationDegrees) <= 0.0001 && flipX === 1 && flipY === 1) {
    return corners
  }
  const matrix = createAffineMatrixAroundPoint(
    {x: centerX, y: centerY},
    {
      rotationDegrees,
      scaleX: flipX,
      scaleY: flipY,
    },
  )
  return corners.map((point) => applyAffineMatrixToPoint(matrix, point))
}

export function buildDraftPolygonPoints(x: number, y: number, width: number, height: number) {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const radius = Math.min(width, height) / 2
  const sides = 5

  return Array.from({length: sides}, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

export function buildDraftStarPoints(x: number, y: number, width: number, height: number) {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const outerRadius = Math.min(width, height) / 2
  const innerRadius = outerRadius * 0.46

  return Array.from({length: 10}, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI / 5) * index
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

export function projectPolygon(
  points: Array<{x: number; y: number}>,
  matrix: CanvasRendererProps['viewport']['matrix'],
) {
  return points.map((point) => projectPoint(point, matrix))
}

export function projectPoint(
  point: {x: number; y: number},
  matrix: CanvasRendererProps['viewport']['matrix'],
) {
  return applyMatrixToPoint(matrix, point)
}

export function toSvgPoints(points: Array<{x: number; y: number}>) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}