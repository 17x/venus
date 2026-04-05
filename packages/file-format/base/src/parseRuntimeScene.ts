import {
  getBoundingRectFromBezierPoints,
  type BezierPoint,
  type DocumentNode,
  type EditorDocument,
  type StrokeArrowhead,
} from '@venus/document-core'
import type {
  RuntimeFeatureEntryV5,
  RuntimePathV4,
  RuntimeSceneLatest,
} from '../migrations/types.ts'

/**
 * Standard parser from the normalized file-format runtime scene into the
 * editor-facing document model used by canvas-base/worker/renderer.
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
  const x = geometryBounds?.x ?? readNumber(metadata, 'x') ?? node.transform.m02
  const y = geometryBounds?.y ?? readNumber(metadata, 'y') ?? node.transform.m12
  const width = geometryBounds?.width ?? readNumber(metadata, 'width') ?? 0
  const height = geometryBounds?.height ?? readNumber(metadata, 'height') ?? 0
  const rotation = readNumber(metadata, 'rotation') ?? 0

  return {
    id: node.id,
    type: shapeType,
    name: node.name || textFeature?.text || node.id,
    parentId: node.parentId,
    childIds: node.children.map((child) => child.id),
    x,
    y,
    width,
    height,
    rotation,
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

  if (node.type === 'FRAME') {
    return 'frame'
  }

  if (node.type === 'GROUP') {
    return 'group'
  }

  if (node.type === 'TEXT') {
    return 'text'
  }

  if (node.type === 'VECTOR') {
    return 'path'
  }

  if (node.type === 'IMAGE') {
    return 'image'
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
  const entry = node.featureEntries.find((featureEntry) => featureEntry.feature.kind === 'VECTOR')
  if (entry?.feature.kind === 'VECTOR') {
    return entry.feature
  }

  const legacyFeature = node.features.find((feature) => feature.kind === 'VECTOR')
  if (legacyFeature?.kind === 'VECTOR') {
    return legacyFeature
  }

  return null
}

function getTextFeature(node: RuntimeSceneLatest['nodes'][number]) {
  const entry = node.featureEntries.find((featureEntry) => featureEntry.feature.kind === 'TEXT')
  if (entry?.feature.kind === 'TEXT') {
    return entry.feature
  }

  const legacyFeature = node.features.find((feature) => feature.kind === 'TEXT')
  if (legacyFeature?.kind === 'TEXT') {
    return legacyFeature
  }

  return null
}

function getImageFeature(node: RuntimeSceneLatest['nodes'][number]) {
  const entry = node.featureEntries.find((featureEntry) => featureEntry.feature.kind === 'IMAGE')
  if (entry?.feature.kind === 'IMAGE') {
    return entry.feature
  }

  const legacyFeature = node.features.find((feature) => feature.kind === 'IMAGE')
  if (legacyFeature?.kind === 'IMAGE') {
    return legacyFeature
  }

  return null
}

function getClipFeature(node: RuntimeSceneLatest['nodes'][number]) {
  const entry = node.featureEntries.find((featureEntry) => featureEntry.feature.kind === 'CLIP')
  if (entry?.feature.kind === 'CLIP') {
    return entry.feature
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

  paths.forEach((path) => {
    path.commands.forEach((command) => {
      if (command.type === 'MOVE_TO') {
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
  return {
    minX: Math.min(x, x + width),
    minY: Math.min(y, y + height),
    maxX: Math.max(x, x + width),
    maxY: Math.max(y, y + height),
  }
}
