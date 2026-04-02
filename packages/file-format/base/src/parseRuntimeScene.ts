import {
  getBoundingRectFromBezierPoints,
  type BezierPoint,
  type DocumentNode,
  type EditorDocument,
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
  const shapeType = resolveShapeType(node, metadata)
  const pathData = vectorFeature ? extractPathGeometry(vectorFeature.paths) : null
  const bounds = pathData?.bezierPoints.length
    ? getBoundingRectFromBezierPoints(pathData.bezierPoints)
    : null
  const x = readNumber(metadata, 'x') ?? bounds?.x ?? node.transform.m02
  const y = readNumber(metadata, 'y') ?? bounds?.y ?? node.transform.m12
  const width = readNumber(metadata, 'width') ?? bounds?.width ?? 0
  const height = readNumber(metadata, 'height') ?? bounds?.height ?? 0

  return {
    id: node.id,
    type: shapeType,
    name: node.name || textFeature?.text || node.id,
    x,
    y,
    width,
    height,
    points: pathData?.points,
    bezierPoints: pathData?.bezierPoints,
  }
}

function resolveShapeType(
  node: RuntimeSceneLatest['nodes'][number],
  metadata: Map<string, string>,
): DocumentNode['type'] {
  const nodeKind = metadata.get('shapeType') ?? node.nodeKind

  if (
    nodeKind === 'frame' ||
    nodeKind === 'rectangle' ||
    nodeKind === 'ellipse' ||
    nodeKind === 'lineSegment' ||
    nodeKind === 'path' ||
    nodeKind === 'text'
  ) {
    return nodeKind
  }

  if (node.type === 'FRAME') {
    return 'frame'
  }

  if (node.type === 'TEXT') {
    return 'text'
  }

  if (node.type === 'VECTOR') {
    return 'path'
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
