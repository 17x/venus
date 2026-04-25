import type {RuntimeFeatureEntryV5, RuntimePathCommandV4, RuntimePathV4, RuntimeSceneLatest} from '@venus/document-core'
import type {ElementProps} from '@lite-u/editor/types'
import type {VisionFileType} from '../hooks/useEditorRuntime.ts'
import {getBoundingRectFromBezierPoints} from '@venus/document-core'

type ElementHierarchyMeta = {
  parentId?: string | null
  childIds?: string[]
}

type ElementTextRunStyle = {
  color?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  lineHeight?: number
  shadow?: {
    color?: string
    offsetX?: number
    offsetY?: number
    blur?: number
  }
}

type ElementTextRun = {
  start: number
  end: number
  style?: ElementTextRunStyle
}

function resolveArrowhead(value: unknown) {
  if (
    value === 'none' ||
    value === 'triangle' ||
    value === 'diamond' ||
    value === 'circle' ||
    value === 'bar'
  ) {
    return value
  }
  return undefined
}

function appendGradientMetadata(
  metadataValues: Record<string, string | number | boolean>,
  prefix: 'fill' | 'stroke',
  gradient: unknown,
) {
  if (!gradient || typeof gradient !== 'object') {
    return
  }

  const record = gradient as {
    type?: unknown
    stops?: unknown
    angle?: unknown
    centerX?: unknown
    centerY?: unknown
    radius?: unknown
  }

  if (record.type !== 'linear' && record.type !== 'radial') {
    return
  }

  if (!Array.isArray(record.stops)) {
    return
  }

  const stops = record.stops
    .map((stop) => {
      if (!stop || typeof stop !== 'object') {
        return null
      }

      const candidate = stop as {
        offset?: unknown
        color?: unknown
        opacity?: unknown
      }

      if (typeof candidate.offset !== 'number' || typeof candidate.color !== 'string') {
        return null
      }

      const nextStop: {offset: number; color: string; opacity?: number} = {
        offset: candidate.offset,
        color: candidate.color,
      }
      if (typeof candidate.opacity === 'number') {
        nextStop.opacity = candidate.opacity
      }
      return nextStop
    })
    .filter((stop): stop is {offset: number; color: string; opacity?: number} => stop !== null)

  if (stops.length === 0) {
    return
  }

  metadataValues[`${prefix}GradientType`] = record.type
  metadataValues[`${prefix}GradientStops`] = JSON.stringify(stops)

  if (typeof record.angle === 'number') {
    metadataValues[`${prefix}GradientAngle`] = record.angle
  }
  if (typeof record.centerX === 'number') {
    metadataValues[`${prefix}GradientCenterX`] = record.centerX
  }
  if (typeof record.centerY === 'number') {
    metadataValues[`${prefix}GradientCenterY`] = record.centerY
  }
  if (typeof record.radius === 'number') {
    metadataValues[`${prefix}GradientRadius`] = record.radius
  }
}

/**
 * Converts the app-level JSON file into the normalized file-format runtime
 * scene so the editor can go through a single parse entry afterwards.
 */
export function createRuntimeSceneFromVisionFile(file: VisionFileType): RuntimeSceneLatest {
  const runtimeNodes = file.elements.map((element) => createRuntimeNodeFromElement(element))
  const nodeById = new Map(runtimeNodes.map((node) => [node.id, node]))
  const rootNodes: RuntimeSceneLatest['nodes'] = []

  runtimeNodes.forEach((node) => {
    if (node.parentId) {
      const parent = nodeById.get(node.parentId)
      if (parent) {
        parent.children.push(node)
        return
      }
    }

    rootNodes.push(node)
  })

  return {
    version: 5,
    canvasWidth: file.config.page.width,
    canvasHeight: file.config.page.height,
    gradients: [],
    rootElements: [],
    documentId: file.id,
    product: 'VECTOR',
    editorKey: file.name,
    metadata: [],
    // Keep scene nodes source-of-truth from file elements; avoid injecting a synthetic frame.
    nodes: rootNodes,
  }
}

function createRuntimeNodeFromElement(element: ElementProps): RuntimeSceneLatest['nodes'][number] {
  const geometry = resolveElementGeometry(element)
  const x = geometry.x
  const y = geometry.y
  const width = geometry.width
  const height = geometry.height
  const type = String(element.type ?? 'rectangle')
  const parentIdMeta = (element as ElementProps & ElementHierarchyMeta).parentId
  const strokeStartArrowhead = resolveArrowhead(element.strokeStartArrowhead)
  const strokeEndArrowhead = resolveArrowhead(element.strokeEndArrowhead)
  const rotation = Number(element.rotation ?? 0)
  const flipX = Boolean(element.flipX)
  const flipY = Boolean(element.flipY)
  const transformMetadataEntries = createTransformMetadataEntries({
    x,
    y,
    width,
    height,
    rotation,
    flipX,
    flipY,
  })
  const metadataValues: Record<string, string | number | boolean> = {
    shapeType: type,
  }
  if (strokeStartArrowhead) {
    metadataValues.strokeStartArrowhead = strokeStartArrowhead
  }
  if (strokeEndArrowhead) {
    metadataValues.strokeEndArrowhead = strokeEndArrowhead
  }
  if (element.fill && typeof element.fill === 'object') {
    if (typeof element.fill.enabled === 'boolean') {
      metadataValues.fillEnabled = element.fill.enabled
    }
    if (typeof element.fill.color === 'string') {
      metadataValues.fillColor = element.fill.color
    }
    appendGradientMetadata(metadataValues, 'fill', (element.fill as {gradient?: unknown}).gradient)
  }
  if (element.stroke && typeof element.stroke === 'object') {
    if (typeof element.stroke.enabled === 'boolean') {
      metadataValues.strokeEnabled = element.stroke.enabled
    }
    if (typeof element.stroke.color === 'string') {
      metadataValues.strokeColor = element.stroke.color
    }
    if (typeof element.stroke.weight === 'number') {
      metadataValues.strokeWeight = element.stroke.weight
    }
    appendGradientMetadata(metadataValues, 'stroke', (element.stroke as {gradient?: unknown}).gradient)
  }
  if (element.shadow && typeof element.shadow === 'object') {
    if (typeof element.shadow.enabled === 'boolean') {
      metadataValues.shadowEnabled = element.shadow.enabled
    }
    if (typeof element.shadow.color === 'string') {
      metadataValues.shadowColor = element.shadow.color
    }
    if (typeof element.shadow.offsetX === 'number') {
      metadataValues.shadowOffsetX = element.shadow.offsetX
    }
    if (typeof element.shadow.offsetY === 'number') {
      metadataValues.shadowOffsetY = element.shadow.offsetY
    }
    if (typeof element.shadow.blur === 'number') {
      metadataValues.shadowBlur = element.shadow.blur
    }
  }
  if (typeof element.cornerRadius === 'number') {
    metadataValues.cornerRadius = element.cornerRadius
  }
  if (element.cornerRadii && typeof element.cornerRadii === 'object') {
    if (typeof element.cornerRadii.topLeft === 'number') {
      metadataValues.cornerTopLeft = element.cornerRadii.topLeft
    }
    if (typeof element.cornerRadii.topRight === 'number') {
      metadataValues.cornerTopRight = element.cornerRadii.topRight
    }
    if (typeof element.cornerRadii.bottomRight === 'number') {
      metadataValues.cornerBottomRight = element.cornerRadii.bottomRight
    }
    if (typeof element.cornerRadii.bottomLeft === 'number') {
      metadataValues.cornerBottomLeft = element.cornerRadii.bottomLeft
    }
  }
  if (typeof element.ellipseStartAngle === 'number') {
    metadataValues.ellipseStartAngle = element.ellipseStartAngle
  }
  if (typeof element.ellipseEndAngle === 'number') {
    metadataValues.ellipseEndAngle = element.ellipseEndAngle
  }
  if (typeof element.maskGroupId === 'string') {
    metadataValues.maskGroupId = element.maskGroupId
  }
  if (element.maskRole === 'host' || element.maskRole === 'source') {
    metadataValues.maskRole = element.maskRole
  }
  const featureEntries: RuntimeFeatureEntryV5[] = [
    createMetadataEntry(`${element.id}:metadata`, metadataValues, transformMetadataEntries),
  ]

  const vectorPaths = createVectorPathsFromElement(element)
  if (vectorPaths.length > 0) {
    featureEntries.push({
      id: `${element.id}:vector`,
      role: 'geometry',
      feature: {
        kind: 'VECTOR',
        paths: vectorPaths,
      },
    })
  }

  if (type === 'text') {
    const content = resolveTextContent(element)
    const textRuns = resolveTextRuns(element, content)
    featureEntries.push({
      id: `${element.id}:text`,
      role: 'content',
      feature: {
        kind: 'TEXT',
        text: content,
        runs: textRuns,
      },
    })
  }

  if (type === 'image' && typeof element.asset === 'string') {
    featureEntries.push({
      id: `${element.id}:image`,
      role: 'content',
      feature: {
        kind: 'IMAGE',
        imageId: element.asset,
        scaleMode: 'FIT',
      },
    })
  }

  if (type === 'image' && typeof element.clipPathId === 'string') {
    featureEntries.push({
      id: `${element.id}:clip`,
      role: 'clip',
      feature: {
        kind: 'CLIP',
        sourceNodeId: element.clipPathId,
        clipRule: element.clipRule === 'evenodd' ? 'EVENODD' : 'NONZERO',
      },
    })
  }

  return {
    id: element.id,
    type: resolveRuntimeNodeType(type),
    transform: createTranslationMatrix(x, y),
    children: [],
    name: String(element.name ?? type),
    parentId: typeof parentIdMeta === 'string' ? parentIdMeta : null,
    featureEntries,
    nodeKind: type,
    isVisible: element.show !== false,
    isLocked: false,
  }
}

function resolveTextContent(element: ElementProps) {
  if (typeof element.text === 'string') {
    return element.text
  }

  return String(element.name ?? 'Text')
}

function resolveTextRuns(
  element: ElementProps,
  text: string,
) {
  const candidate = (element as ElementProps & {textRuns?: unknown}).textRuns
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return []
  }

  const textLength = text.length

  return candidate
    .map((run) => normalizeTextRun(run, textLength))
    .filter((run): run is NonNullable<ReturnType<typeof normalizeTextRun>> => run !== null)
}

function normalizeTextRun(value: unknown, textLength: number) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const run = value as ElementTextRun
  if (typeof run.start !== 'number' || typeof run.end !== 'number') {
    return null
  }

  const start = Math.max(0, Math.min(textLength, Math.floor(run.start)))
  const end = Math.max(start, Math.min(textLength, Math.floor(run.end)))
  const style = run.style && typeof run.style === 'object'
    ? run.style
    : undefined

  return {
    start,
    end,
    color: style?.color ?? '#111111',
    fontFamily: style?.fontFamily ?? 'Arial, sans-serif',
    fontSize: typeof style?.fontSize === 'number' ? style.fontSize : 16,
    fontWeight: typeof style?.fontWeight === 'number' ? style.fontWeight : 400,
    letterSpacing: typeof style?.letterSpacing === 'number' ? style.letterSpacing : 0,
    lineHeight: typeof style?.lineHeight === 'number' ? style.lineHeight : 20,
    shadowColor: typeof style?.shadow?.color === 'string' ? style.shadow.color : undefined,
    shadowOffsetX: typeof style?.shadow?.offsetX === 'number' ? style.shadow.offsetX : undefined,
    shadowOffsetY: typeof style?.shadow?.offsetY === 'number' ? style.shadow.offsetY : undefined,
    shadowBlur: typeof style?.shadow?.blur === 'number' ? style.shadow.blur : undefined,
  }
}

function resolveElementGeometry(element: ElementProps) {
  const points = Array.isArray(element.points)
    ? element.points
        .map((point) => toPointLike(point))
        .filter((point): point is NonNullable<ReturnType<typeof toPointLike>> => point !== null)
    : []
  const pointBounds = points.length > 0
    ? {
        minX: Math.min(...points.map((point) => point.x)),
        minY: Math.min(...points.map((point) => point.y)),
        maxX: Math.max(...points.map((point) => point.x)),
        maxY: Math.max(...points.map((point) => point.y)),
      }
    : null

  const bezierPoints = Array.isArray(element.bezierPoints)
    ? element.bezierPoints
        .map((point) => toBezierPointLike(point))
        .filter((point): point is NonNullable<ReturnType<typeof toBezierPointLike>> => point !== null)
    : []
  const bezierBounds = bezierPoints.length > 0
    ? getBoundingRectFromBezierPoints(bezierPoints)
    : null

  const width = Number(
    element.width ??
      (bezierBounds
        ? bezierBounds.width
        : pointBounds
          ? pointBounds.maxX - pointBounds.minX
          : 0),
  )
  const height = Number(
    element.height ??
      (bezierBounds
        ? bezierBounds.height
        : pointBounds
          ? pointBounds.maxY - pointBounds.minY
          : 0),
  )
  const x = Number(
    element.x ??
      (bezierBounds
        ? bezierBounds.x
        : pointBounds
          ? pointBounds.minX
          : ((element.cx ?? 0) - width / 2)),
  )
  const y = Number(
    element.y ??
      (bezierBounds
        ? bezierBounds.y
        : pointBounds
          ? pointBounds.minY
          : ((element.cy ?? 0) - height / 2)),
  )

  return {
    x,
    y,
    width,
    height,
  }
}

function resolveRuntimeNodeType(type: string): RuntimeSceneLatest['nodes'][number]['type'] {
  if (type === 'frame') {
    return 'FRAME'
  }

  if (type === 'group') {
    return 'GROUP'
  }

  if (type === 'text') {
    return 'TEXT'
  }

  if (type === 'image') {
    return 'IMAGE'
  }

  if (type === 'path' || type === 'lineSegment') {
    return 'VECTOR'
  }
  if (type === 'polygon' || type === 'star') {
    return 'SHAPE'
  }

  return 'SHAPE'
}

function createVectorPathsFromElement(element: ElementProps): RuntimePathV4[] {
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

  if (isClosedBezierCommandPath(filtered)) {
    commands.push({
      type: 'CLOSE',
      points: [],
    })
  }

  return commands
}

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

function createMetadataEntry(
  id: string,
  values: Record<string, string | number | boolean>,
  leadingEntries: Array<{key: string; value: string}> = [],
): RuntimeFeatureEntryV5 {
  return {
    id,
    role: 'metadata',
    feature: {
      kind: 'METADATA',
      entries: [
        ...leadingEntries,
        ...Object.entries(values).map(([key, value]) => ({
          key,
          value: String(value),
        })),
      ],
    },
  }
}

function createTransformMetadataEntries(transform: {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  flipX: boolean
  flipY: boolean
}) {
  return [
    {key: 'x', value: String(transform.x)},
    {key: 'y', value: String(transform.y)},
    {key: 'width', value: String(transform.width)},
    {key: 'height', value: String(transform.height)},
    {key: 'rotation', value: String(transform.rotation)},
    {key: 'flipX', value: String(transform.flipX)},
    {key: 'flipY', value: String(transform.flipY)},
  ]
}

function createTranslationMatrix(x: number, y: number) {
  return {
    m00: 1,
    m01: 0,
    m02: x,
    m10: 0,
    m11: 1,
    m12: y,
    m20: 0,
    m21: 0,
    m22: 1,
  }
}

function toPointLike(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as {x?: unknown}).x !== 'number' ||
    typeof (value as {y?: unknown}).y !== 'number'
  ) {
    return null
  }

  return {
    x: Number((value as {x: number}).x),
    y: Number((value as {y: number}).y),
  }
}

function toBezierPointLike(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const anchor = toPointLike(record.anchor)
  if (!anchor) {
    return null
  }

  return {
    anchor,
    cp1: toPointLike(record.cp1),
    cp2: toPointLike(record.cp2),
  }
}
