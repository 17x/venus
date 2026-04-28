import type {RuntimeFeatureEntryV5, RuntimeSceneLatest} from '../../model/index.ts'

// Resolves optional arrowhead literal into supported runtime value.
export function resolveArrowhead(value: unknown) {
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

// Extracts gradient fields into metadata KV pairs when gradient payload is valid.
export function appendGradientMetadata(
  metadataValues: Record<string, string | number | boolean>,
  prefix: 'fill' | 'stroke',
  gradient: unknown,
) {
  if (!gradient || typeof gradient !== 'object') {
    return
  }

  const record = gradient as {
    type?: unknown
    stops?: unknown
    angle?: unknown
    centerX?: unknown
    centerY?: unknown
    radius?: unknown
  }

  if (record.type !== 'linear' && record.type !== 'radial') {
    return
  }

  if (!Array.isArray(record.stops)) {
    return
  }

  const stops = record.stops
    .map((stop) => {
      if (!stop || typeof stop !== 'object') {
        return null
      }

      const candidate = stop as {
        offset?: unknown
        color?: unknown
        opacity?: unknown
      }

      if (typeof candidate.offset !== 'number' || typeof candidate.color !== 'string') {
        return null
      }

      const nextStop: {offset: number; color: string; opacity?: number} = {
        offset: candidate.offset,
        color: candidate.color,
      }
      if (typeof candidate.opacity === 'number') {
        nextStop.opacity = candidate.opacity
      }
      return nextStop
    })
    .filter((stop): stop is {offset: number; color: string; opacity?: number} => stop !== null)

  if (stops.length === 0) {
    return
  }

  metadataValues[`${prefix}GradientType`] = record.type
  metadataValues[`${prefix}GradientStops`] = JSON.stringify(stops)

  if (typeof record.angle === 'number') {
    metadataValues[`${prefix}GradientAngle`] = record.angle
  }
  if (typeof record.centerX === 'number') {
    metadataValues[`${prefix}GradientCenterX`] = record.centerX
  }
  if (typeof record.centerY === 'number') {
    metadataValues[`${prefix}GradientCenterY`] = record.centerY
  }
  if (typeof record.radius === 'number') {
    metadataValues[`${prefix}GradientRadius`] = record.radius
  }
}

// Creates one METADATA feature entry from key/value payload and optional leading entries.
export function createMetadataEntry(
  id: string,
  values: Record<string, string | number | boolean>,
  leadingEntries: Array<{key: string; value: string}> = [],
): RuntimeFeatureEntryV5 {
  return {
    id,
    role: 'metadata',
    feature: {
      kind: 'METADATA',
      entries: [
        ...leadingEntries,
        ...Object.entries(values).map(([key, value]) => ({
          key,
          value: String(value),
        })),
      ],
    },
  }
}

// Converts transform payload into deterministic metadata key/value entries.
export function createTransformMetadataEntries(transform: {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  flipX: boolean
  flipY: boolean
}) {
  return [
    {key: 'x', value: String(transform.x)},
    {key: 'y', value: String(transform.y)},
    {key: 'width', value: String(transform.width)},
    {key: 'height', value: String(transform.height)},
    {key: 'rotation', value: String(transform.rotation)},
    {key: 'flipX', value: String(transform.flipX)},
    {key: 'flipY', value: String(transform.flipY)},
  ]
}

// Creates a translation-only matrix used by file adapter runtime nodes.
export function createTranslationMatrix(
  x: number,
  y: number,
): RuntimeSceneLatest['nodes'][number]['transform'] {
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
