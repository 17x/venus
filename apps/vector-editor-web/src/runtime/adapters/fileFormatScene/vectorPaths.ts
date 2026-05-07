import type {ElementProps} from '../../types/index.ts'
import type {RuntimePathCommandV4, RuntimePathV4} from '../../model/index.ts'
import {toBezierPointLike, toPointLike} from './elementGeometry.ts'

// Converts path-capable element payloads into runtime vector path commands.
export function createVectorPathsFromElement(element: ElementProps): RuntimePathV4[] {
  const type = String(element.type ?? 'rectangle')

  if (type === 'path') {
    const bezierPoints = Array.isArray(element.bezierPoints)
      ? element.bezierPoints
      : []
    if (bezierPoints.length >= 2) {
      return [
        {
          commands: createBezierCommands(bezierPoints),
        },
      ]
    }

    const points = Array.isArray(element.points) ? element.points : []
    if (points.length >= 2) {
      return [
        {
          commands: createPolylineCommands(points),
        },
      ]
    }
  }

  if (type === 'polygon' || type === 'star') {
    const points = Array.isArray(element.points) ? element.points : []
    if (points.length >= 3) {
      return [
        {
          commands: createPolylineCommands(points),
        },
      ]
    }
  }

  if (type === 'lineSegment') {
    return [
      {
        commands: [
          {
            type: 'MOVE_TO',
            points: [Number(element.x ?? 0), Number(element.y ?? 0)],
          },
          {
            type: 'LINE_TO',
            points: [
              Number(element.x ?? 0) + Number(element.width ?? 0),
              Number(element.y ?? 0) + Number(element.height ?? 0),
            ],
          },
        ],
      },
    ]
  }

  return []
}

// Converts bezier point list into runtime curve commands and optional close command.
function createBezierCommands(points: unknown[]): RuntimePathCommandV4[] {
  const filtered = points
    .map((point) => toBezierPointLike(point))
    .filter((point): point is NonNullable<ReturnType<typeof toBezierPointLike>> => point !== null)

  if (filtered.length === 0) {
    return []
  }

  const commands: RuntimePathCommandV4[] = [
    {
      type: 'MOVE_TO',
      points: [filtered[0].anchor.x, filtered[0].anchor.y],
    },
  ]

  for (let index = 1; index < filtered.length; index += 1) {
    const previous = filtered[index - 1]
    const current = filtered[index]
    commands.push({
      type: 'CURVE_TO',
      points: [
        previous.cp2?.x ?? previous.anchor.x,
        previous.cp2?.y ?? previous.anchor.y,
        current.cp1?.x ?? current.anchor.x,
        current.cp1?.y ?? current.anchor.y,
        current.anchor.x,
        current.anchor.y,
      ],
    })
  }

  // Add CLOSE only when first/last anchors overlap so fill parity matches author intent.
  if (isClosedBezierCommandPath(filtered)) {
    commands.push({
      type: 'CLOSE',
      points: [],
    })
  }

  return commands
}

// Converts polyline points into runtime line commands and optional close command.
function createPolylineCommands(points: unknown[]): RuntimePathCommandV4[] {
  const filtered = points
    .map((point) => toPointLike(point))
    .filter((point): point is NonNullable<ReturnType<typeof toPointLike>> => point !== null)

  if (filtered.length === 0) {
    return []
  }

  return [
    {
      type: 'MOVE_TO',
      points: [filtered[0].x, filtered[0].y],
    },
    ...filtered.slice(1).map((point) => ({
      type: 'LINE_TO' as const,
      points: [point.x, point.y],
    })),
    ...(isClosedPointCommandPath(filtered)
      ? [{type: 'CLOSE' as const, points: []}]
      : []),
  ]
}

// Detects closure for bezier paths by anchor proximity.
function isClosedBezierCommandPath(
  points: Array<NonNullable<ReturnType<typeof toBezierPointLike>>>,
) {
  if (points.length < 3) {
    return false
  }
  const first = points[0].anchor
  const last = points[points.length - 1].anchor
  return Math.hypot(first.x - last.x, first.y - last.y) <= 1e-3
}

// Detects closure for polyline paths by endpoint proximity.
function isClosedPointCommandPath(
  points: Array<NonNullable<ReturnType<typeof toPointLike>>>,
) {
  if (points.length < 3) {
    return false
  }
  const first = points[0]
  const last = points[points.length - 1]
  return Math.hypot(first.x - last.x, first.y - last.y) <= 1e-3
}
