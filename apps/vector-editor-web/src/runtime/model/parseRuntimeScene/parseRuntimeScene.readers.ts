import type {ShapeGradientStop, ShapeGradientStyle, StrokeArrowhead} from '../index.ts'

/**
 * Reads one optional string value from metadata map.
 * @param metadata Node metadata map.
 * @param key Metadata key.
 */
export function readString(metadata: Map<string, string>, key: string) {
  const value = metadata.get(key)
  if (value === undefined) {
    return undefined
  }

  return value
}

/**
 * Reads one finite numeric value from metadata map.
 * @param metadata Node metadata map.
 * @param key Metadata key.
 */
export function readNumber(metadata: Map<string, string>, key: string) {
  const value = metadata.get(key)
  if (value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Reads one boolean value from metadata map.
 * @param metadata Node metadata map.
 * @param key Metadata key.
 */
export function readBoolean(metadata: Map<string, string>, key: string) {
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

/**
 * Reads one stroke arrowhead enum from metadata map.
 * @param metadata Node metadata map.
 * @param key Metadata key.
 */
export function readArrowhead(metadata: Map<string, string>, key: string): StrokeArrowhead | undefined {
  const value = metadata.get(key)

  if (value === 'none' || value === 'triangle' || value === 'diamond' || value === 'circle' || value === 'bar') {
    return value
  }

  return undefined
}

/**
 * Reads one gradient payload from metadata map.
 * @param metadata Node metadata map.
 * @param prefix fill or stroke gradient namespace.
 */
export function readGradient(
  metadata: Map<string, string>,
  prefix: 'fill' | 'stroke',
): ShapeGradientStyle | undefined {
  const gradientType = readString(metadata, `${prefix}GradientType`)
  if (gradientType !== 'linear' && gradientType !== 'radial') {
    return undefined
  }

  const stopsRaw = readString(metadata, `${prefix}GradientStops`)
  const parsedStops = parseGradientStops(stopsRaw)
  if (!parsedStops || parsedStops.length === 0) {
    return undefined
  }

  return {
    type: gradientType,
    stops: parsedStops,
    angle: readNumber(metadata, `${prefix}GradientAngle`) ?? undefined,
    centerX: readNumber(metadata, `${prefix}GradientCenterX`) ?? undefined,
    centerY: readNumber(metadata, `${prefix}GradientCenterY`) ?? undefined,
    radius: readNumber(metadata, `${prefix}GradientRadius`) ?? undefined,
  }
}

/**
 * Parses gradient stop JSON payload from metadata.
 * @param raw Raw JSON string.
 */
function parseGradientStops(raw: string | undefined): ShapeGradientStop[] | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return null
    }

    const stops: ShapeGradientStop[] = []
    parsed.forEach((stop) => {
      if (!stop || typeof stop !== 'object') {
        return
      }

      const maybeOffset = Number((stop as {offset?: unknown}).offset)
      const maybeColor = (stop as {color?: unknown}).color
      const maybeOpacity = (stop as {opacity?: unknown}).opacity

      if (!Number.isFinite(maybeOffset) || typeof maybeColor !== 'string') {
        return
      }

      stops.push({
        offset: maybeOffset,
        color: maybeColor,
        opacity: typeof maybeOpacity === 'number' && Number.isFinite(maybeOpacity)
          ? maybeOpacity
          : undefined,
      })
    })

    return stops
  } catch {
    return null
  }
}
