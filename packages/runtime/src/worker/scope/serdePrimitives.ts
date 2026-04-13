import type {BezierPoint, DocumentNode} from '@venus/document-core'
import {getBezierPathBounds, getPathBounds} from './model.ts'

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function asOptionalNumber(value: unknown) {
  return typeof value === 'number' ? value : undefined
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : null
}

function asPoint(value: unknown) {
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

function asBezierPoint(value: unknown): BezierPoint | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const anchor = asPoint(record.anchor)
  if (!anchor) {
    return null
  }

  return {
    anchor,
    cp1: asPoint(record.cp1),
    cp2: asPoint(record.cp2),
  }
}

function asClipRule(value: unknown): 'nonzero' | 'evenodd' | undefined {
  return value === 'evenodd' || value === 'nonzero' ? value : undefined
}

function asArrowhead(value: unknown): DocumentNode['strokeStartArrowhead'] {
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

function asFill(value: unknown): DocumentNode['fill'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
  }
}

function asStroke(value: unknown): DocumentNode['stroke'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
    weight: typeof record.weight === 'number' ? record.weight : undefined,
  }
}

function asShadow(value: unknown): DocumentNode['shadow'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
    offsetX: typeof record.offsetX === 'number' ? record.offsetX : undefined,
    offsetY: typeof record.offsetY === 'number' ? record.offsetY : undefined,
    blur: typeof record.blur === 'number' ? record.blur : undefined,
  }
}

function asCornerRadii(value: unknown): DocumentNode['cornerRadii'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    topLeft: typeof record.topLeft === 'number' ? record.topLeft : undefined,
    topRight: typeof record.topRight === 'number' ? record.topRight : undefined,
    bottomRight: typeof record.bottomRight === 'number' ? record.bottomRight : undefined,
    bottomLeft: typeof record.bottomLeft === 'number' ? record.bottomLeft : undefined,
  }
}

export function asRotateBatch(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const shapeId = asString((item as Record<string, unknown>).shapeId)
      const rotation = asNumber((item as Record<string, unknown>).rotation)
      if (!shapeId || rotation === null) {
        return null
      }
      return {shapeId, rotation}
    })
    .filter((item): item is {shapeId: string; rotation: number} => item !== null)
}

export function asDocumentNodeList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => asDocumentNode(item))
    .filter((item): item is DocumentNode => item !== null)
}

function asDocumentNode(value: unknown): DocumentNode | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const id = asString(record.id)
  const type = asString(record.type)
  const name = asString(record.name)
  const text = asOptionalString(record.text)
  const assetId = asOptionalString(record.assetId)
  const assetUrl = asOptionalString(record.assetUrl)
  const clipPathId = asOptionalString(record.clipPathId)
  const clipRule = asClipRule(record.clipRule)
  const rotation = asNumber(record.rotation)
  const flipX = asBoolean(record.flipX)
  const flipY = asBoolean(record.flipY)
  const strokeStartArrowhead = asArrowhead(record.strokeStartArrowhead)
  const strokeEndArrowhead = asArrowhead(record.strokeEndArrowhead)
  const fill = asFill(record.fill)
  const stroke = asStroke(record.stroke)
  const shadow = asShadow(record.shadow)
  const cornerRadius = asOptionalNumber(record.cornerRadius)
  const cornerRadii = asCornerRadii(record.cornerRadii)
  const ellipseStartAngle = asOptionalNumber(record.ellipseStartAngle)
  const ellipseEndAngle = asOptionalNumber(record.ellipseEndAngle)
  const x = asNumber(record.x)
  const y = asNumber(record.y)
  const width = asNumber(record.width)
  const height = asNumber(record.height)

  if (!id || !type || !name || x === null || y === null || width === null || height === null) {
    return null
  }

  const points = Array.isArray(record.points)
    ? record.points
        .map((point) =>
          point && typeof point === 'object' &&
          typeof (point as {x?: unknown}).x === 'number' &&
          typeof (point as {y?: unknown}).y === 'number'
            ? {
                x: Number((point as {x: number}).x),
                y: Number((point as {y: number}).y),
              }
            : null,
        )
        .filter((point): point is {x: number; y: number} => point !== null)
    : undefined
  const bezierPoints = Array.isArray(record.bezierPoints)
    ? record.bezierPoints
        .map((point) => asBezierPoint(point))
        .filter((point): point is BezierPoint => point !== null)
    : undefined
  const nextBounds = type === 'path' && bezierPoints && bezierPoints.length > 0
    ? getBezierPathBounds(bezierPoints)
    : (type === 'path' || type === 'polygon' || type === 'star') && points && points.length > 0
      ? getPathBounds(points)
      : null

  return {
    id,
    type: type as DocumentNode['type'],
    name,
    text,
    assetId,
    assetUrl,
    clipPathId,
    clipRule,
    rotation: rotation === null ? undefined : rotation,
    flipX: flipX ?? undefined,
    flipY: flipY ?? undefined,
    strokeStartArrowhead,
    strokeEndArrowhead,
    fill,
    stroke,
    shadow,
    cornerRadius,
    cornerRadii,
    ellipseStartAngle,
    ellipseEndAngle,
    x: nextBounds?.x ?? x,
    y: nextBounds?.y ?? y,
    width: nextBounds?.width ?? width,
    height: nextBounds?.height ?? height,
    points,
    bezierPoints,
    schema:
      record.schema && typeof record.schema === 'object'
        ? {
            sourceNodeType: asOptionalString((record.schema as Record<string, unknown>).sourceNodeType),
            sourceNodeKind: asOptionalString((record.schema as Record<string, unknown>).sourceNodeKind),
            sourceFeatureKinds: Array.isArray((record.schema as Record<string, unknown>).sourceFeatureKinds)
              ? ((record.schema as Record<string, unknown>).sourceFeatureKinds as unknown[])
                  .map((item) => asOptionalString(item))
                  .filter((item): item is string => typeof item === 'string')
              : undefined,
          }
        : undefined,
  }
}

export function asNumberOrNull(value: unknown) {
  return asNumber(value)
}

export function asOptionalStringOrUndef(value: unknown) {
  return asOptionalString(value)
}

export function asOptionalNumberOrUndef(value: unknown) {
  return asOptionalNumber(value)
}

export function asBooleanOrNull(value: unknown) {
  return asBoolean(value)
}

export function asStringOrNull(value: unknown) {
  return asString(value)
}

export function asFillValue(value: unknown) {
  return asFill(value)
}

export function asStrokeValue(value: unknown) {
  return asStroke(value)
}

export function asShadowValue(value: unknown) {
  return asShadow(value)
}

export function asCornerRadiiValue(value: unknown) {
  return asCornerRadii(value)
}

export function asClipRuleValue(value: unknown) {
  return asClipRule(value)
}
