import {
  getBoundingRectFromBezierPoints,
  getNormalizedBoundsFromBox,
  type BezierPoint,
  type DocumentNode,
  type EditorDocument,
  type StrokeArrowhead,
} from '@venus/document-core'
import type {
  RuntimeFeatureEntryV5,
  RuntimeNodeFeatureV5,
  RuntimePathV4,
  RuntimeSceneLatest,
} from './types.ts'

/**
 * Standard parser from the normalized file-format runtime scene into the
 * editor-facing document model used by runtime/worker/renderer packages.
 */
export function parseRuntimeSceneToEditorDocument(scene: RuntimeSceneLatest): EditorDocument {
  const shapes = scene.nodes.flatMap((node) => flattenNode(node)).map((node) => parseRuntimeNode(node))
  deriveGroupBoundsFromChildren(shapes)

  return {
    id: scene.documentId,
    name: scene.editorKey || scene.documentId,
    width: scene.canvasWidth,
    height: scene.canvasHeight,
    shapes,
  }
}

function flattenNode(node: RuntimeSceneLatest['nodes'][number]): RuntimeSceneLatest['nodes'][number][] {
  return [node, ...node.children.flatMap((child) => flattenNode(child))]
}

function parseRuntimeNode(node: RuntimeSceneLatest['nodes'][number]): DocumentNode {
  const metadata = getMetadataMap(node.featureEntries)
  const vectorFeature = getVectorFeature(node)
  const textFeature = getTextFeature(node)
  const imageFeature = getImageFeature(node)
  const clipFeature = getClipFeature(node)
  const shapeType = resolveShapeType(node, metadata)
  const pathData = vectorFeature ? extractPathGeometry(vectorFeature.paths) : null
  const bezierBounds = pathData?.bezierPoints.length
    ? getBoundingRectFromBezierPoints(pathData.bezierPoints)
    : null
  const pointBounds = pathData?.points && pathData.points.length > 0
    ? {
        x: Math.min(...pathData.points.map((point) => point.x)),
        y: Math.min(...pathData.points.map((point) => point.y)),
        width: Math.max(...pathData.points.map((point) => point.x)) - Math.min(...pathData.points.map((point) => point.x)),
        height: Math.max(...pathData.points.map((point) => point.y)) - Math.min(...pathData.points.map((point) => point.y)),
      }
    : null
  const geometryBounds = (shapeType === 'path' || shapeType === 'polygon' || shapeType === 'star')
    ? (bezierBounds ?? pointBounds)
    : null
  const transform = resolveNodeTransform({
    metadata,
    nodeTransform: node.transform,
    geometryBounds,
  })
  const fillEnabled = readBoolean(metadata, 'fillEnabled')
  const fillColor = readString(metadata, 'fillColor')
  const strokeEnabled = readBoolean(metadata, 'strokeEnabled')
  const strokeColor = readString(metadata, 'strokeColor')
  const strokeWeight = readNumber(metadata, 'strokeWeight')
  const shadowEnabled = readBoolean(metadata, 'shadowEnabled')
  const shadowColor = readString(metadata, 'shadowColor')
  const shadowOffsetX = readNumber(metadata, 'shadowOffsetX')
  const shadowOffsetY = readNumber(metadata, 'shadowOffsetY')
  const shadowBlur = readNumber(metadata, 'shadowBlur')
  const cornerRadius = readNumber(metadata, 'cornerRadius')
  const cornerTopLeft = readNumber(metadata, 'cornerTopLeft')
  const cornerTopRight = readNumber(metadata, 'cornerTopRight')
  const cornerBottomRight = readNumber(metadata, 'cornerBottomRight')
  const cornerBottomLeft = readNumber(metadata, 'cornerBottomLeft')
  const ellipseStartAngle = readNumber(metadata, 'ellipseStartAngle')
  const ellipseEndAngle = readNumber(metadata, 'ellipseEndAngle')

  return {
    id: node.id,
    type: shapeType,
    name: node.name || textFeature?.text || node.id,
    parentId: node.parentId,
    childIds: node.children.map((child) => child.id),
    x: transform.x,
    y: transform.y,
    width: transform.width,
    height: transform.height,
    rotation: transform.rotation,
    flipX: transform.flipX,
    flipY: transform.flipY,
    text: textFeature?.text,
    textRuns: textFeature?.runs.map((run) => ({
      start: run.start,
      end: run.end,
      style: {
        color: typeof run.color === 'string' ? run.color : undefined,
        fontFamily: run.fontFamily,
        fontSize: run.fontSize,
        fontWeight: run.fontWeight,
        letterSpacing: run.letterSpacing,
        lineHeight: run.lineHeight,
      },
    })),
    assetId: imageFeature ? resolveImageAssetId(imageFeature) : undefined,
    clipPathId: clipFeature?.sourceNodeId,
    clipRule: clipFeature
      ? clipFeature.clipRule === 'EVENODD'
        ? 'evenodd'
        : 'nonzero'
      : undefined,
    points: pathData?.points,
    bezierPoints: pathData?.bezierPoints,
    strokeStartArrowhead: readArrowhead(metadata, 'strokeStartArrowhead'),
    strokeEndArrowhead: readArrowhead(metadata, 'strokeEndArrowhead'),
    fill: fillEnabled !== null || fillColor !== undefined
      ? {
          enabled: fillEnabled ?? undefined,
          color: fillColor,
        }
      : undefined,
    stroke: strokeEnabled !== null || strokeColor !== undefined || strokeWeight !== null
      ? {
          enabled: strokeEnabled ?? undefined,
          color: strokeColor,
          weight: strokeWeight ?? undefined,
        }
      : undefined,
    shadow: shadowEnabled !== null || shadowColor !== undefined || shadowOffsetX !== null || shadowOffsetY !== null || shadowBlur !== null
      ? {
          enabled: shadowEnabled ?? undefined,
          color: shadowColor,
          offsetX: shadowOffsetX ?? undefined,
          offsetY: shadowOffsetY ?? undefined,
          blur: shadowBlur ?? undefined,
        }
      : undefined,
    cornerRadius: cornerRadius ?? undefined,
    cornerRadii: cornerTopLeft !== null || cornerTopRight !== null || cornerBottomRight !== null || cornerBottomLeft !== null
      ? {
          topLeft: cornerTopLeft ?? undefined,
          topRight: cornerTopRight ?? undefined,
          bottomRight: cornerBottomRight ?? undefined,
          bottomLeft: cornerBottomLeft ?? undefined,
        }
      : undefined,
    ellipseStartAngle: ellipseStartAngle ?? undefined,
    ellipseEndAngle: ellipseEndAngle ?? undefined,
    schema: {
      sourceNodeType: node.type,
      sourceNodeKind: node.nodeKind,
      sourceFeatureKinds: node.featureEntries.map((entry) => entry.feature.kind),
    },
  }
}

function resolveShapeType(
  node: RuntimeSceneLatest['nodes'][number],
  metadata: Map<string, string>,
): DocumentNode['type'] {
  const nodeKind = metadata.get('shapeType') ?? node.nodeKind

  if (
    nodeKind === 'frame' ||
    nodeKind === 'group' ||
    nodeKind === 'rectangle' ||
    nodeKind === 'ellipse' ||
    nodeKind === 'polygon' ||
    nodeKind === 'star' ||
    nodeKind === 'lineSegment' ||
    nodeKind === 'path' ||
    nodeKind === 'text' ||
    nodeKind === 'image'
  ) {
    return nodeKind
  }

  return 'rectangle'
}

function getMetadataMap(entries: RuntimeFeatureEntryV5[]) {
  const metadataEntry = entries.find((entry) => entry.feature.kind === 'METADATA')
  const metadata = new Map<string, string>()

  if (!metadataEntry || metadataEntry.feature.kind !== 'METADATA') {
    return metadata
  }

  metadataEntry.feature.entries.forEach((entry) => {
    metadata.set(entry.key, entry.value)
  })

  return metadata
}

function getVectorFeature(node: RuntimeSceneLatest['nodes'][number]) {
  return getFeature(node, 'VECTOR')
}

function getTextFeature(node: RuntimeSceneLatest['nodes'][number]) {
  return getFeature(node, 'TEXT')
}

function getImageFeature(node: RuntimeSceneLatest['nodes'][number]) {
  return getFeature(node, 'IMAGE')
}

function getClipFeature(node: RuntimeSceneLatest['nodes'][number]) {
  return getFeature(node, 'CLIP')
}

function getFeature<TKind extends RuntimeNodeFeatureV5['kind']>(
  node: RuntimeSceneLatest['nodes'][number],
  kind: TKind,
): Extract<RuntimeNodeFeatureV5, {kind: TKind}> | null {
  const entry = node.featureEntries.find((featureEntry) => featureEntry.feature.kind === kind)
  if (entry?.feature.kind === kind) {
    return entry.feature as Extract<RuntimeNodeFeatureV5, {kind: TKind}>
  }

  return null
}

function resolveImageAssetId(imageFeature: ReturnType<typeof getImageFeature>) {
  if (!imageFeature) {
    return undefined
  }

  const feature = imageFeature as {imageId?: string; assetId?: string}
  return feature.imageId ?? feature.assetId
}

function extractPathGeometry(paths: RuntimePathV4[]) {
  const points: Array<{x: number; y: number}> = []
  const bezierPoints: BezierPoint[] = []
  let currentSubpathPointStart: {x: number; y: number} | null = null
  let currentSubpathBezierStart: BezierPoint | null = null

  paths.forEach((path) => {
    path.commands.forEach((command) => {
      if (command.type === 'MOVE_TO') {
        const point = toPoint(command.points, 0)
        if (!point) {
          return
        }

        points.push(point)
        const bezierPoint = {
          anchor: point,
        }
        bezierPoints.push(bezierPoint)
        currentSubpathPointStart = point
        currentSubpathBezierStart = bezierPoint
        return
      }

      if (command.type === 'LINE_TO') {
        const point = toPoint(command.points, 0)
        if (!point) {
          return
        }

        points.push(point)
        bezierPoints.push({
          anchor: point,
        })
        return
      }

      if (command.type === 'CURVE_TO') {
        const cp1 = toPoint(command.points, 0)
        const cp2 = toPoint(command.points, 2)
        const anchor = toPoint(command.points, 4)

        if (!cp1 || !cp2 || !anchor) {
          return
        }

        points.push(anchor)
        const previous = bezierPoints[bezierPoints.length - 1]
        if (previous) {
          previous.cp2 = cp1
        }
        bezierPoints.push({
          anchor,
          cp1: cp2,
        })
        return
      }

      if (command.type === 'CLOSE') {
        const firstPoint = currentSubpathPointStart
        const firstBezierPoint = currentSubpathBezierStart
        const lastPoint = points[points.length - 1]
        if (
          !firstPoint ||
          !firstBezierPoint ||
          !lastPoint ||
          Math.hypot(lastPoint.x - firstPoint.x, lastPoint.y - firstPoint.y) <= 1e-3
        ) {
          return
        }

        points.push(firstPoint)
        bezierPoints.push({
          anchor: firstBezierPoint.anchor,
        })
      }
    })
  })

  return {
    points,
    bezierPoints,
  }
}

function toPoint(points: number[], offset: number) {
  const x = points[offset]
  const y = points[offset + 1]
  if (typeof x !== 'number' || typeof y !== 'number') {
    return null
  }

  return {x, y}
}

function readNumber(metadata: Map<string, string>, key: string) {
  const value = metadata.get(key)
  if (value === undefined) {
    return null
  }

  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : null
}

function readBoolean(metadata: Map<string, string>, key: string) {
  const value = metadata.get(key)
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return null
}

function readString(metadata: Map<string, string>, key: string) {
  const value = metadata.get(key)
  return typeof value === 'string' ? value : undefined
}

function readArrowhead(metadata: Map<string, string>, key: string): StrokeArrowhead | undefined {
  const value = metadata.get(key)
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

function resolveNodeTransform(source: {
  metadata: Map<string, string>
  nodeTransform: RuntimeSceneLatest['nodes'][number]['transform']
  geometryBounds?: {
    x: number
    y: number
    width: number
    height: number
  } | null
}) {
  const geometryBounds = source.geometryBounds ?? null

  return {
    x: geometryBounds?.x ?? readNumber(source.metadata, 'x') ?? source.nodeTransform.m02,
    y: geometryBounds?.y ?? readNumber(source.metadata, 'y') ?? source.nodeTransform.m12,
    width: geometryBounds?.width ?? readNumber(source.metadata, 'width') ?? 0,
    height: geometryBounds?.height ?? readNumber(source.metadata, 'height') ?? 0,
    rotation: readNumber(source.metadata, 'rotation') ?? 0,
    flipX: readBoolean(source.metadata, 'flipX') ?? false,
    flipY: readBoolean(source.metadata, 'flipY') ?? false,
  }
}

function deriveGroupBoundsFromChildren(shapes: DocumentNode[]) {
  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]))
  const childrenByParent = new Map<string, DocumentNode[]>()

  shapes.forEach((shape) => {
    if (!shape.parentId) {
      return
    }
    const parent = shapeById.get(shape.parentId)
    if (!parent) {
      return
    }
    const list = childrenByParent.get(parent.id)
    if (list) {
      list.push(shape)
      return
    }
    childrenByParent.set(parent.id, [shape])
  })

  const cache = new Map<string, Bounds | null>()
  const visiting = new Set<string>()

  const visit = (shape: DocumentNode): Bounds | null => {
    if (cache.has(shape.id)) {
      return cache.get(shape.id) ?? null
    }
    if (visiting.has(shape.id)) {
      return getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
    }

    visiting.add(shape.id)
    let bounds: Bounds | null = null

    if (shape.type === 'group') {
      const children = childrenByParent.get(shape.id) ?? []
      for (const child of children) {
        const childBounds = visit(child)
        if (!childBounds) {
          continue
        }
        bounds = bounds ? mergeBounds(bounds, childBounds) : childBounds
      }

      if (bounds) {
        const nextBounds = bounds
        shape.x = nextBounds.minX
        shape.y = nextBounds.minY
        shape.width = nextBounds.maxX - nextBounds.minX
        shape.height = nextBounds.maxY - nextBounds.minY
      }
    }

    if (!bounds) {
      bounds = getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
    }

    visiting.delete(shape.id)
    cache.set(shape.id, bounds)
    return bounds
  }

  shapes.forEach((shape) => {
    if (shape.type === 'group') {
      visit(shape)
    }
  })
}

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function mergeBounds(left: Bounds, right: Bounds): Bounds {
  return {
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY),
  }
}

function getNormalizedBounds(x: number, y: number, width: number, height: number): Bounds {
  const bounds = getNormalizedBoundsFromBox(x, y, width, height)

  return {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
  }
}
