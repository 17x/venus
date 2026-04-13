import {getBoundingRectFromBezierPoints, getNormalizedBoundsFromBox, type BezierPoint} from './geometry.ts'
import type {DocumentNode, EditorDocument, StrokeArrowhead} from './index.ts'
import type {
  RuntimeFeatureEntryV5,
  RuntimeNodeFeatureV5,
  RuntimePathV4,
  RuntimeSceneLatest,
} from './runtimeSceneTypes.ts'

/**
 * Standard parser from the normalized runtime scene into the
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
        shadow:
          typeof run.shadowColor === 'string' ||
          typeof run.shadowOffsetX === 'number' ||
          typeof run.shadowOffsetY === 'number' ||
          typeof run.shadowBlur === 'number'
            ? {
                color: typeof run.shadowColor === 'string' ? run.shadowColor : undefined,
                offsetX: typeof run.shadowOffsetX === 'number' ? run.shadowOffsetX : undefined,
                offsetY: typeof run.shadowOffsetY === 'number' ? run.shadowOffsetY : undefined,
                blur: typeof run.shadowBlur === 'number' ? run.shadowBlur : undefined,
              }
            : undefined,
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

        const prevBezierPoint = bezierPoints[bezierPoints.length - 1]
        if (prevBezierPoint) {
          prevBezierPoint.cp2 = cp1
        }

        const bezierPoint: BezierPoint = {
          anchor,
          cp1: cp2,
        }

        points.push(anchor)
        bezierPoints.push(bezierPoint)
        return
      }

      if (command.type === 'CLOSE') {
        const lastPoint = points[points.length - 1]
        const shouldClosePoint = !!currentSubpathPointStart && (
          !lastPoint ||
          Math.hypot(
            lastPoint.x - currentSubpathPointStart.x,
            lastPoint.y - currentSubpathPointStart.y,
          ) > 1e-3
        )
        if (shouldClosePoint && currentSubpathPointStart) {
          points.push(currentSubpathPointStart)
        }

        if (currentSubpathBezierStart && bezierPoints.length > 0) {
          const lastBezierPoint = bezierPoints[bezierPoints.length - 1]
          if (lastBezierPoint.anchor.x !== currentSubpathBezierStart.anchor.x || lastBezierPoint.anchor.y !== currentSubpathBezierStart.anchor.y) {
            bezierPoints.push({
              anchor: currentSubpathBezierStart.anchor,
              cp1: currentSubpathBezierStart.cp1,
              cp2: currentSubpathBezierStart.cp2,
            })
          }
        }
      }
    })
  })

  return {
    points,
    bezierPoints,
  }
}

function toPoint(points: number[], startIndex: number) {
  const x = points[startIndex]
  const y = points[startIndex + 1]

  if (typeof x !== 'number' || typeof y !== 'number') {
    return null
  }

  return {x, y}
}

function readString(metadata: Map<string, string>, key: string) {
  const value = metadata.get(key)
  if (value === undefined) {
    return undefined
  }

  return value
}

function readNumber(metadata: Map<string, string>, key: string) {
  const value = metadata.get(key)
  if (value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readBoolean(metadata: Map<string, string>, key: string) {
  const value = metadata.get(key)
  if (value === undefined) {
    return null
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return null
}

function readArrowhead(metadata: Map<string, string>, key: string): StrokeArrowhead | undefined {
  const value = metadata.get(key)

  if (value === 'none' || value === 'triangle' || value === 'diamond' || value === 'circle' || value === 'bar') {
    return value
  }

  return undefined
}

function parseRuntimeRotation(transform: RuntimeSceneLatest['nodes'][number]['transform']) {
  const cos = transform.m00
  const sin = transform.m10
  const rotationRadians = Math.atan2(sin, cos)
  return rotationRadians * (180 / Math.PI)
}

function parseRuntimeScale(transform: RuntimeSceneLatest['nodes'][number]['transform']) {
  const scaleX = Math.hypot(transform.m00, transform.m10)
  const scaleY = Math.hypot(transform.m01, transform.m11)
  return {
    scaleX,
    scaleY,
  }
}

function resolveNodeTransform(params: {
  metadata: Map<string, string>
  nodeTransform: RuntimeSceneLatest['nodes'][number]['transform']
  geometryBounds: {x: number; y: number; width: number; height: number} | null
}) {
  const {metadata, nodeTransform, geometryBounds} = params
  const parsedWidth = readNumber(metadata, 'width')
  const parsedHeight = readNumber(metadata, 'height')
  const parsedX = readNumber(metadata, 'x')
  const parsedY = readNumber(metadata, 'y')
  const parsedRotation = readNumber(metadata, 'rotation')
  const parsedFlipX = readBoolean(metadata, 'flipX')
  const parsedFlipY = readBoolean(metadata, 'flipY')

  const {scaleX, scaleY} = parseRuntimeScale(nodeTransform)
  const flipX = parsedFlipX ?? scaleX < 0
  const flipY = parsedFlipY ?? scaleY < 0

  const width = parsedWidth ?? geometryBounds?.width ?? Math.abs(scaleX)
  const height = parsedHeight ?? geometryBounds?.height ?? Math.abs(scaleY)

  const normalizedBounds = geometryBounds
    ? getNormalizedBoundsFromBox(
      geometryBounds.x,
      geometryBounds.y,
      geometryBounds.width,
      geometryBounds.height,
    )
    : {
        minX: 0,
        minY: 0,
        maxX: width,
        maxY: height,
      }

  const fallbackX = nodeTransform.m02 - normalizedBounds.minX
  const fallbackY = nodeTransform.m12 - normalizedBounds.minY

  return {
    x: parsedX ?? fallbackX,
    y: parsedY ?? fallbackY,
    width,
    height,
    // Keep metadata rotation as compatibility-first fallback for legacy scenes
    // where matrix fields may not fully encode persisted editor rotation.
    rotation: parsedRotation ?? parseRuntimeRotation(nodeTransform),
    flipX,
    flipY,
  }
}

function deriveGroupBoundsFromChildren(nodes: DocumentNode[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index]
    if (node.type !== 'group' || !node.childIds || node.childIds.length === 0) {
      continue
    }

    const children = node.childIds
      .map((childId) => nodeById.get(childId))
      .filter((child): child is DocumentNode => Boolean(child))

    if (children.length === 0) {
      continue
    }

      const childBounds = children.map((child) => getNormalizedBoundsFromBox(
        child.x,
        child.y,
        child.width,
        child.height,
      ))
      const minX = Math.min(...childBounds.map((bounds) => bounds.minX))
      const minY = Math.min(...childBounds.map((bounds) => bounds.minY))
      const maxX = Math.max(...childBounds.map((bounds) => bounds.maxX))
      const maxY = Math.max(...childBounds.map((bounds) => bounds.maxY))

    node.x = minX
    node.y = minY
    node.width = Math.max(0, maxX - minX)
    node.height = Math.max(0, maxY - minY)
  }
}
