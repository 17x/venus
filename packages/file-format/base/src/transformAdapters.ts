import {
  createMatrixFirstNodeTransform,
  toLegacyShapeTransformRecord,
  type MatrixFirstNodeTransform,
  type ShapeTransformRecord,
} from '@venus/document-core'
import type {RuntimeKeyValueV5, RuntimeMatrix3x3} from '../migrations/types.ts'

export interface GeometryBoundsLike {
  x: number
  y: number
  width: number
  height: number
}

export interface FileFormatTransformSource {
  metadata: Map<string, string>
  nodeTransform: RuntimeMatrix3x3
  geometryBounds?: GeometryBoundsLike | null
}

/**
 * Resolve legacy decomposed runtime transform fields from file-format node
 * transform + metadata. Geometry-derived bounds win for point-authored shapes.
 */
export function resolveLegacyShapeTransformFromFileFormat(
  source: FileFormatTransformSource,
): ShapeTransformRecord {
  const geometryBounds = source.geometryBounds ?? null
  const x = geometryBounds?.x ?? readNumber(source.metadata, 'x') ?? source.nodeTransform.m02
  const y = geometryBounds?.y ?? readNumber(source.metadata, 'y') ?? source.nodeTransform.m12
  const width = geometryBounds?.width ?? readNumber(source.metadata, 'width') ?? 0
  const height = geometryBounds?.height ?? readNumber(source.metadata, 'height') ?? 0
  const rotation = readNumber(source.metadata, 'rotation') ?? 0
  const flipX = readBoolean(source.metadata, 'flipX') ?? false
  const flipY = readBoolean(source.metadata, 'flipY') ?? false

  return {
    x,
    y,
    width,
    height,
    rotation,
    flipX,
    flipY,
  }
}

/**
 * Resolve matrix-first transform payload from file-format node transform and
 * metadata compatibility fields.
 */
export function resolveMatrixFirstTransformFromFileFormat(
  source: FileFormatTransformSource,
): MatrixFirstNodeTransform {
  return createMatrixFirstNodeTransform(
    resolveLegacyShapeTransformFromFileFormat(source),
  )
}

/**
 * Serialize matrix-first transform payload back into v5 metadata key/value
 * entries used by current runtime adapters.
 */
export function createFileFormatTransformMetadataEntries(
  transform: MatrixFirstNodeTransform,
): RuntimeKeyValueV5[] {
  const legacy = toLegacyShapeTransformRecord(transform)

  return [
    {key: 'x', value: String(legacy.x)},
    {key: 'y', value: String(legacy.y)},
    {key: 'width', value: String(legacy.width)},
    {key: 'height', value: String(legacy.height)},
    {key: 'rotation', value: String(legacy.rotation)},
    {key: 'flipX', value: String(Boolean(legacy.flipX))},
    {key: 'flipY', value: String(Boolean(legacy.flipY))},
  ]
}

function readNumber(metadata: Map<string, string>, key: string) {
  const value = metadata.get(key)
  if (value === undefined) {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
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
