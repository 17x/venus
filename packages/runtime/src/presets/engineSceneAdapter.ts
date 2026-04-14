import type {EditorDocument, ShapeType} from '@venus/document-core'
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
    const sourceType = sourceShape?.type ?? shape.type
    const clip = resolveNodeClip(sourceShape, documentShapeById)

    if (sourceType === 'group') {
      nodes.push({
        id: shape.id,
        type: 'group',
        children: [],
        transform: sourceTransform,
      })
      return
    }

    if (sourceType === 'image') {
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
          clip,
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
        clip,
      })
      return
    }

    if (sourceType === 'text') {
      nodes.push({
        id: shape.id,
        type: 'text',
        x: sourceBounds?.x ?? shape.x,
        y: sourceBounds?.y ?? shape.y,
        width: sourceBounds?.width ?? shape.width,
        height: sourceBounds?.height ?? shape.height,
        transform: sourceTransform,
        shadow: resolveNodeShadow(sourceShape),
        clip,
        text: sourceShape?.text ?? shape.name ?? 'Text',
        runs: sourceShape?.textRuns?.map((run) => {
          const style = {
            fill: run.style?.color,
            fontFamily: run.style?.fontFamily,
            fontSize: run.style?.fontSize,
            fontWeight: run.style?.fontWeight,
            lineHeight: run.style?.lineHeight,
            letterSpacing: run.style?.letterSpacing,
            align: resolveEngineTextAlign(run.style?.textAlign),
            verticalAlign: run.style?.verticalAlign,
          }
          const shadow = readRunShadow(run.style)
          if (shadow) {
            // Keep shadow transport compatible even before all type surfaces are refreshed.
            ;(style as Record<string, unknown>).shadow = shadow
          }

          return {
            text: (sourceShape.text ?? '').slice(run.start, run.end),
            style,
          }
        }),
        style: (() => {
          const firstRun = sourceShape?.textRuns?.[0]
          const style = {
            fontFamily: firstRun?.style?.fontFamily ?? 'Arial, sans-serif',
            fontSize: firstRun?.style?.fontSize ?? 16,
            fontWeight: firstRun?.style?.fontWeight,
            lineHeight: firstRun?.style?.lineHeight,
            letterSpacing: firstRun?.style?.letterSpacing,
            fill: firstRun?.style?.color ?? '#111111',
            align: resolveEngineTextAlign(firstRun?.style?.textAlign) ?? 'start',
            verticalAlign: firstRun?.style?.verticalAlign,
          }
          const shadow = readRunShadow(firstRun?.style)
          if (shadow) {
            ;(style as Record<string, unknown>).shadow = shadow
          }
          return style
        })(),
      })
      return
    }

    nodes.push({
      id: shape.id,
      type: 'shape',
      shape: resolveEngineShapeKind(sourceType),
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
      clip,
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

function resolveEngineShapeKind(type: ShapeType): 'rect' | 'ellipse' | 'line' | 'polygon' | 'path' {
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
  if (type === 'group') {
    return 'rect'
  }
  if (type === 'frame') {
    return 'rect'
  }
  return 'rect'
}

function resolveEngineShapeGeometry(
  snapshotShape: SceneShapeSnapshot,
  sourceShape: EditorDocument['shapes'][number] | undefined,
  sourceBounds: {x: number; y: number; width: number; height: number} | null,
) {
  const rawPoints = sourceShape?.points?.map((point) => ({x: point.x, y: point.y})) ?? undefined
  const bezierPoints = sourceShape?.bezierPoints?.map((point) => ({
    anchor: {x: point.anchor.x, y: point.anchor.y},
    cp1: point.cp1 ? {x: point.cp1.x, y: point.cp1.y} : point.cp1,
    cp2: point.cp2 ? {x: point.cp2.x, y: point.cp2.y} : point.cp2,
  })) ?? undefined
  const fallbackRect = sourceBounds ?? {
    x: snapshotShape.x,
    y: snapshotShape.y,
    width: snapshotShape.width,
    height: snapshotShape.height,
  }
  const points = (
    sourceShape?.type === 'lineSegment' && (!rawPoints || rawPoints.length < 2)
      ? [
        {x: fallbackRect.x, y: fallbackRect.y},
        {x: fallbackRect.x + fallbackRect.width, y: fallbackRect.y + fallbackRect.height},
      ]
      : rawPoints
  )
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

function resolveNodeClip(
  sourceShape: EditorDocument['shapes'][number] | undefined,
  shapeById: Map<string, EditorDocument['shapes'][number]>,
) {
  if (!sourceShape?.clipPathId) {
    return undefined
  }

  if (!shapeById.has(sourceShape.clipPathId) || sourceShape.clipPathId === sourceShape.id) {
    return undefined
  }

  return {
    clipNodeId: sourceShape.clipPathId,
    rule: sourceShape.clipRule,
  }
}

function readRunShadow(style: unknown) {
  if (!style || typeof style !== 'object') {
    return undefined
  }

  const shadow = (style as {shadow?: unknown}).shadow
  if (!shadow || typeof shadow !== 'object') {
    return undefined
  }

  const value = shadow as {
    color?: unknown
    offsetX?: unknown
    offsetY?: unknown
    blur?: unknown
  }

  const color = typeof value.color === 'string' ? value.color : undefined
  const offsetX = typeof value.offsetX === 'number' ? value.offsetX : undefined
  const offsetY = typeof value.offsetY === 'number' ? value.offsetY : undefined
  const blur = typeof value.blur === 'number' ? value.blur : undefined

  if (color === undefined && offsetX === undefined && offsetY === undefined && blur === undefined) {
    return undefined
  }

  return {
    color,
    offsetX,
    offsetY,
    blur,
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

function resolveEngineTextAlign(value: unknown): 'start' | 'center' | 'end' | undefined {
  if (value === 'left') {
    return 'start'
  }
  if (value === 'center') {
    return 'center'
  }
  if (value === 'right') {
    return 'end'
  }
  return undefined
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
