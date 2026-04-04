import type {RuntimeFeatureEntryV5, RuntimePathCommandV4, RuntimePathV4, RuntimeSceneLatest} from '@venus/file-format/base'
import type {ElementProps} from '@lite-u/editor/types'
import type {VisionFileType} from '../hooks/useEditorRuntime.ts'

/**
 * Converts the app-level JSON file into the normalized file-format runtime
 * scene so the editor can go through a single parse entry afterwards.
 */
export function createRuntimeSceneFromVisionFile(file: VisionFileType): RuntimeSceneLatest {
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
    nodes: [
      createPageFrameNode(file),
      ...file.elements.map((element) => createRuntimeNodeFromElement(element)),
    ],
  }
}

function createPageFrameNode(file: VisionFileType): RuntimeSceneLatest['nodes'][number] {
  return {
    id: `${file.id}:page-frame`,
    type: 'FRAME',
    transform: createTranslationMatrix(0, 0),
    children: [],
    features: [],
    name: file.name,
    parentId: null,
    featureEntries: [
      createMetadataEntry('page-metadata', {
        shapeType: 'frame',
        x: 0,
        y: 0,
        width: file.config.page.width,
        height: file.config.page.height,
      }),
    ],
    nodeKind: 'frame',
    isVisible: true,
    isLocked: false,
  }
}

function createRuntimeNodeFromElement(element: ElementProps): RuntimeSceneLatest['nodes'][number] {
  const x = Number(element.x ?? 0)
  const y = Number(element.y ?? 0)
  const width = Number(element.width ?? 0)
  const height = Number(element.height ?? 0)
  const type = String(element.type ?? 'rectangle')
  const featureEntries: RuntimeFeatureEntryV5[] = [
    createMetadataEntry(`${element.id}:metadata`, {
      shapeType: type,
      x,
      y,
      width,
      height,
    }),
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
    const content = String(element.name ?? 'Text')
    featureEntries.push({
      id: `${element.id}:text`,
      role: 'content',
      feature: {
        kind: 'TEXT',
        text: content,
        runs: [],
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

  return {
    id: element.id,
    type: resolveRuntimeNodeType(type),
    transform: createTranslationMatrix(x, y),
    children: [],
    features: [],
    name: String(element.name ?? type),
    parentId: null,
    featureEntries,
    nodeKind: type,
    isVisible: element.show !== false,
    isLocked: false,
  }
}

function resolveRuntimeNodeType(type: string): RuntimeSceneLatest['nodes'][number]['type'] {
  if (type === 'frame') {
    return 'FRAME'
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
  ]
}

function createMetadataEntry(id: string, values: Record<string, string | number>): RuntimeFeatureEntryV5 {
  return {
    id,
    role: 'metadata',
    feature: {
      kind: 'METADATA',
      entries: Object.entries(values).map(([key, value]) => ({
        key,
        value: String(value),
      })),
    },
  }
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
