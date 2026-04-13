import type {EditorDocument} from '@venus/document-core'
import {resolveNodeTransform, type EngineRenderableNode, type EngineSceneSnapshot} from '@venus/engine'
import type {SceneShapeSnapshot} from '@venus/runtime/shared-memory'

export interface CreateEngineSceneFromRuntimeSnapshotOptions {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  revision: string | number
  backgroundFill?: string
  backgroundStroke?: string
}

/**
 * Build an engine scene snapshot from runtime document + shape snapshot data.
 *
 * Ownership split:
 * - runtime document provides semantic/source geometry + style metadata
 * - snapshot provides current hover/selection flags and visible shape ordering
 */
export function createEngineSceneFromRuntimeSnapshot(
  options: CreateEngineSceneFromRuntimeSnapshotOptions,
): EngineSceneSnapshot {
  const documentShapeById = new Map(options.document.shapes.map((shape) => [shape.id, shape]))
  const nodes: EngineRenderableNode[] = [{
    id: '__doc_background__',
    type: 'shape',
    shape: 'rect',
    x: 0,
    y: 0,
    width: options.document.width,
    height: options.document.height,
    fill: options.backgroundFill ?? '#ffffff',
    stroke: options.backgroundStroke ?? '#d0d7de',
    strokeWidth: 1,
  }]

  options.shapes.forEach((shape) => {
    const sourceShape = documentShapeById.get(shape.id)
    const sourceBounds = resolveSourceShapeBounds(sourceShape)
    const sourceTransform = resolveSourceShapeTransform(sourceShape)
    const paint = resolveShapePaint(sourceShape)

    if (shape.type === 'image') {
      const clipPathId = sourceShape?.clipPathId
      const hasImageSource = Boolean(sourceShape?.assetId || sourceShape?.assetUrl)
      if (!hasImageSource) {
        nodes.push({
          id: shape.id,
          type: 'shape',
          shape: 'rect',
          x: sourceBounds?.x ?? shape.x,
          y: sourceBounds?.y ?? shape.y,
          width: sourceBounds?.width ?? shape.width,
          height: sourceBounds?.height ?? shape.height,
          transform: sourceTransform,
          fill: paint.fill,
          stroke: paint.stroke,
          strokeWidth: paint.strokeWidth,
        })
        return
      }

      nodes.push({
        id: shape.id,
        type: 'image',
        x: sourceBounds?.x ?? shape.x,
        y: sourceBounds?.y ?? shape.y,
        width: sourceBounds?.width ?? shape.width,
        height: sourceBounds?.height ?? shape.height,
        transform: sourceTransform,
        shadow: resolveNodeShadow(sourceShape),
        assetId: sourceShape?.assetId ?? sourceShape?.id ?? shape.id,
        clip: clipPathId && documentShapeById.has(clipPathId)
          ? {
            clipNodeId: clipPathId,
            rule: sourceShape?.clipRule,
          }
          : undefined,
      })
      return
    }

    if (shape.type === 'text') {
      nodes.push({
        id: shape.id,
        type: 'text',
        x: sourceBounds?.x ?? shape.x,
        y: sourceBounds?.y ?? shape.y,
        width: sourceBounds?.width ?? shape.width,
        height: sourceBounds?.height ?? shape.height,
        transform: sourceTransform,
        shadow: resolveNodeShadow(sourceShape),
        text: sourceShape?.text ?? shape.name ?? 'Text',
        runs: sourceShape?.textRuns?.map((run) => ({
          text: (sourceShape.text ?? '').slice(run.start, run.end),
          style: {
            fill: run.style?.color,
            fontFamily: run.style?.fontFamily,
            fontSize: run.style?.fontSize,
            fontWeight: run.style?.fontWeight,
            lineHeight: run.style?.lineHeight,
            letterSpacing: run.style?.letterSpacing,
            align: run.style?.textAlign === 'center'
              ? 'center'
              : run.style?.textAlign === 'right'
                ? 'end'
                : run.style?.textAlign === 'left'
                  ? 'start'
                  : undefined,
            verticalAlign: run.style?.verticalAlign,
          },
        })),
        style: {
          fontFamily: sourceShape?.textRuns?.[0]?.style?.fontFamily ?? 'Arial, sans-serif',
          fontSize: sourceShape?.textRuns?.[0]?.style?.fontSize ?? 16,
          fontWeight: sourceShape?.textRuns?.[0]?.style?.fontWeight,
          lineHeight: sourceShape?.textRuns?.[0]?.style?.lineHeight,
          letterSpacing: sourceShape?.textRuns?.[0]?.style?.letterSpacing,
          fill: sourceShape?.textRuns?.[0]?.style?.color ?? '#111111',
          align: sourceShape?.textRuns?.[0]?.style?.textAlign === 'center'
            ? 'center'
            : sourceShape?.textRuns?.[0]?.style?.textAlign === 'right'
              ? 'end'
              : 'start',
          verticalAlign: sourceShape?.textRuns?.[0]?.style?.verticalAlign,
        },
      })
      return
    }

    nodes.push({
      id: shape.id,
      type: 'shape',
      shape: resolveEngineShapeKind(shape.type),
      ...resolveEngineShapeGeometry(shape, sourceShape, sourceBounds),
      cornerRadius: sourceShape?.cornerRadius,
      cornerRadii: sourceShape?.cornerRadii
        ? {
          topLeft: sourceShape.cornerRadii.topLeft,
          topRight: sourceShape.cornerRadii.topRight,
          bottomRight: sourceShape.cornerRadii.bottomRight,
          bottomLeft: sourceShape.cornerRadii.bottomLeft,
        }
        : undefined,
      ellipseStartAngle: sourceShape?.ellipseStartAngle,
      ellipseEndAngle: sourceShape?.ellipseEndAngle,
      strokeStartArrowhead: sourceShape?.strokeStartArrowhead,
      strokeEndArrowhead: sourceShape?.strokeEndArrowhead,
      shadow: resolveNodeShadow(sourceShape),
      transform: sourceTransform,
      fill: paint.fill,
      stroke: paint.stroke,
      strokeWidth: paint.strokeWidth,
    })
  })

  return {
    revision: options.revision,
    width: options.document.width,
    height: options.document.height,
    nodes,
  }
}

export function buildDocumentImageAssetUrlMap(document: EditorDocument) {
  const map = new Map<string, string>()
  document.shapes.forEach((shape) => {
    if (shape.type !== 'image') {
      return
    }

    if (shape.assetId && shape.assetUrl) {
      map.set(shape.assetId, shape.assetUrl)
    }
    if (shape.assetUrl) {
      map.set(shape.id, shape.assetUrl)
    }
  })

  return map
}

function resolveEngineShapeKind(type: SceneShapeSnapshot['type']): 'rect' | 'ellipse' | 'line' | 'polygon' | 'path' {
  if (type === 'ellipse') {
    return 'ellipse'
  }
  if (type === 'lineSegment') {
    return 'line'
  }
  if (type === 'polygon' || type === 'star') {
    return 'polygon'
  }
  if (type === 'path') {
    return 'path'
  }
  return 'rect'
}

function resolveEngineShapeGeometry(
  snapshotShape: SceneShapeSnapshot,
  sourceShape: EditorDocument['shapes'][number] | undefined,
  sourceBounds: {x: number; y: number; width: number; height: number} | null,
) {
  const points = sourceShape?.points?.map((point) => ({x: point.x, y: point.y})) ?? undefined
  const bezierPoints = sourceShape?.bezierPoints?.map((point) => ({
    anchor: {x: point.anchor.x, y: point.anchor.y},
    cp1: point.cp1 ? {x: point.cp1.x, y: point.cp1.y} : point.cp1,
    cp2: point.cp2 ? {x: point.cp2.x, y: point.cp2.y} : point.cp2,
  })) ?? undefined
  const bounds = resolveShapePointBounds(points, bezierPoints)

  return {
    x: bounds?.x ?? sourceBounds?.x ?? snapshotShape.x,
    y: bounds?.y ?? sourceBounds?.y ?? snapshotShape.y,
    width: bounds?.width ?? sourceBounds?.width ?? snapshotShape.width,
    height: bounds?.height ?? sourceBounds?.height ?? snapshotShape.height,
    points,
    bezierPoints,
    closed: resolveShapeClosed(sourceShape, points, bezierPoints),
  }
}

function resolveShapePointBounds(
  points?: readonly {x: number; y: number}[],
  bezierPoints?: readonly {
    anchor: {x: number; y: number}
    cp1?: {x: number; y: number} | null
    cp2?: {x: number; y: number} | null
  }[],
) {
  const pool: Array<{x: number; y: number}> = []
  points?.forEach((point) => pool.push(point))
  bezierPoints?.forEach((point) => {
    pool.push(point.anchor)
    if (point.cp1) {
      pool.push(point.cp1)
    }
    if (point.cp2) {
      pool.push(point.cp2)
    }
  })
  if (pool.length === 0) {
    return null
  }

  const minX = Math.min(...pool.map((point) => point.x))
  const minY = Math.min(...pool.map((point) => point.y))
  const maxX = Math.max(...pool.map((point) => point.x))
  const maxY = Math.max(...pool.map((point) => point.y))

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

function resolveShapePaint(
  sourceShape: EditorDocument['shapes'][number] | undefined,
) {
  const baseStroke = sourceShape?.stroke?.enabled === false
    ? 'transparent'
    : sourceShape?.stroke?.color ?? '#1f2937'
  const baseStrokeWidth = sourceShape?.stroke?.weight ?? 1
  const baseFill = sourceShape?.fill?.enabled === false
    ? 'transparent'
    : sourceShape?.fill?.color ?? 'rgba(17,24,39,0.05)'

  return {
    // Hover highlight is rendered by overlay chrome; keep node paint stable.
    fill: baseFill,
    stroke: baseStroke,
    strokeWidth: baseStrokeWidth,
  }
}

function resolveShapeClosed(
  sourceShape: EditorDocument['shapes'][number] | undefined,
  points?: readonly {x: number; y: number}[],
  bezierPoints?: readonly {
    anchor: {x: number; y: number}
    cp1?: {x: number; y: number} | null
    cp2?: {x: number; y: number} | null
  }[],
) {
  if (sourceShape?.type === 'polygon' || sourceShape?.type === 'star') {
    return true
  }

  const compare = (a: {x: number; y: number}, b: {x: number; y: number}) => {
    return Math.hypot(a.x - b.x, a.y - b.y) <= 1e-3
  }

  if (bezierPoints && bezierPoints.length >= 3) {
    return compare(bezierPoints[0].anchor, bezierPoints[bezierPoints.length - 1].anchor)
  }
  if (points && points.length >= 3) {
    return compare(points[0], points[points.length - 1])
  }

  return false
}

function resolveNodeShadow(
  sourceShape: EditorDocument['shapes'][number] | undefined,
) {
  if (sourceShape?.shadow?.enabled === false) {
    return undefined
  }
  if (!sourceShape?.shadow) {
    return undefined
  }

  return {
    color: sourceShape.shadow.color,
    offsetX: sourceShape.shadow.offsetX,
    offsetY: sourceShape.shadow.offsetY,
    blur: sourceShape.shadow.blur,
  }
}

function resolveSourceShapeBounds(
  sourceShape: EditorDocument['shapes'][number] | undefined,
) {
  if (!sourceShape) {
    return null
  }

  const resolved = resolveNodeTransform(sourceShape)
  return {
    x: resolved.bounds.minX,
    y: resolved.bounds.minY,
    width: resolved.bounds.width,
    height: resolved.bounds.height,
  }
}

function resolveSourceShapeTransform(
  sourceShape: EditorDocument['shapes'][number] | undefined,
) {
  if (!sourceShape) {
    return undefined
  }

  const resolved = resolveNodeTransform(sourceShape)
  const affine = resolved.matrix

  return {
    matrix: [
      affine[0],
      affine[2],
      affine[4],
      affine[1],
      affine[3],
      affine[5],
    ] as const,
  }
}
