import type {DocumentNode} from '@venus/document-core'
import {toLegacyShapeTransformRecord, type MatrixFirstNodeTransform, type ShapeTransformRecord} from '@venus/engine'
import type {HistoryPatch} from '../history.ts'
import {cloneCornerRadii, cloneFill, cloneShadow, cloneStroke} from './model.ts'

type ParsedTransformBatchItem = {
  id: string
  from: ShapeTransformRecord & {flipX: boolean; flipY: boolean}
  to: ShapeTransformRecord & {flipX: boolean; flipY: boolean}
}

export function resolveTransformBatchItemToLegacy(item: {
  fromMatrix: MatrixFirstNodeTransform
  toMatrix: MatrixFirstNodeTransform
}) {
  const from = toLegacyShapeTransformRecord(item.fromMatrix)
  const to = toLegacyShapeTransformRecord(item.toMatrix)

  if (!from || !to) {
    return null
  }

  return {
    from: {
      ...from,
      flipX: !!from.flipX,
      flipY: !!from.flipY,
    },
    to: {
      ...to,
      flipX: !!to.flipX,
      flipY: !!to.flipY,
    },
  }
}

export function createTransformPatches(
  shape: DocumentNode,
  from: ShapeTransformRecord,
  to: ShapeTransformRecord,
): HistoryPatch[] {
  const patches: HistoryPatch[] = []

  if (from.x !== to.x || from.y !== to.y) {
    patches.push({
      type: 'move-shape',
      shapeId: shape.id,
      prevX: from.x,
      prevY: from.y,
      nextX: to.x,
      nextY: to.y,
    })
  }

  if (from.width !== to.width || from.height !== to.height) {
    patches.push({
      type: 'resize-shape',
      shapeId: shape.id,
      prevWidth: from.width,
      prevHeight: from.height,
      nextWidth: to.width,
      nextHeight: to.height,
    })
  }

  if (from.rotation !== to.rotation) {
    patches.push({
      type: 'rotate-shape',
      shapeId: shape.id,
      prevRotation: from.rotation,
      nextRotation: to.rotation,
    })
  }

  if (!!from.flipX !== !!to.flipX || !!from.flipY !== !!to.flipY) {
    patches.push({
      type: 'patch-shape',
      shapeId: shape.id,
      prevFill: cloneFill(shape.fill),
      nextFill: cloneFill(shape.fill),
      prevStroke: cloneStroke(shape.stroke),
      nextStroke: cloneStroke(shape.stroke),
      prevShadow: cloneShadow(shape.shadow),
      nextShadow: cloneShadow(shape.shadow),
      prevCornerRadius: shape.cornerRadius,
      nextCornerRadius: shape.cornerRadius,
      prevCornerRadii: cloneCornerRadii(shape.cornerRadii),
      nextCornerRadii: cloneCornerRadii(shape.cornerRadii),
      prevEllipseStartAngle: shape.ellipseStartAngle,
      nextEllipseStartAngle: shape.ellipseStartAngle,
      prevEllipseEndAngle: shape.ellipseEndAngle,
      nextEllipseEndAngle: shape.ellipseEndAngle,
      prevFlipX: !!from.flipX,
      nextFlipX: !!to.flipX,
      prevFlipY: !!from.flipY,
      nextFlipY: !!to.flipY,
    })
  }

  return patches
}

export function asTransformBatch(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const record = item as Record<string, unknown>
      const id = asString(record.id)
      const fromMatrix = record.fromMatrix && typeof record.fromMatrix === 'object'
        ? asMatrixFirstTransform(record.fromMatrix as Record<string, unknown>)
        : null
      const toMatrix = record.toMatrix && typeof record.toMatrix === 'object'
        ? asMatrixFirstTransform(record.toMatrix as Record<string, unknown>)
        : null
      if (!id || !fromMatrix || !toMatrix) {
        return null
      }
      return {
        id,
        from: toLegacyShapeTransformRecord(fromMatrix),
        to: toLegacyShapeTransformRecord(toMatrix),
      }
    })
    .filter((item): item is ParsedTransformBatchItem => item !== null)
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : null
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function asMatrixFirstTransform(value: Record<string, unknown>): MatrixFirstNodeTransform | null {
  const bounds = value.bounds && typeof value.bounds === 'object'
    ? value.bounds as Record<string, unknown>
    : null
  const minX = bounds ? asNumber(bounds.minX) : null
  const minY = bounds ? asNumber(bounds.minY) : null
  const maxX = bounds ? asNumber(bounds.maxX) : null
  const maxY = bounds ? asNumber(bounds.maxY) : null
  const rotation = asNumber(value.rotation)
  const flipX = asBoolean(value.flipX)
  const flipY = asBoolean(value.flipY)

  if (minX === null || minY === null || maxX === null || maxY === null || rotation === null) {
    return null
  }

  const matrix = Array.isArray(value.matrix) && value.matrix.length === 9
    ? value.matrix.map((entry) => asNumber(entry)).filter((entry): entry is number => entry !== null)
    : null

  if (!matrix || matrix.length !== 9) {
    return null
  }

  const center = value.center && typeof value.center === 'object'
    ? value.center as Record<string, unknown>
    : null
  const centerX = center ? asNumber(center.x) : null
  const centerY = center ? asNumber(center.y) : null

  return {
    matrix: [
      matrix[0], matrix[1], matrix[2],
      matrix[3], matrix[4], matrix[5],
    ],
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
    center: {
      x: centerX ?? (minX + maxX) / 2,
      y: centerY ?? (minY + maxY) / 2,
    },
    width: asNumber(value.width) ?? (maxX - minX),
    height: asNumber(value.height) ?? (maxY - minY),
    rotation,
    flipX: flipX ?? false,
    flipY: flipY ?? false,
  }
}
