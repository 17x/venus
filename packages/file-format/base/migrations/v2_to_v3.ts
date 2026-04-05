import type {
  RuntimeMatrix3x3,
  RuntimeNodeFeature,
  RuntimeNodeType,
  RuntimeSceneV2,
  RuntimeSceneV3,
} from './types.ts'

const IDENTITY_MATRIX: RuntimeMatrix3x3 = {
  m00: 1,
  m01: 0,
  m02: 0,
  m10: 0,
  m11: 1,
  m12: 0,
  m20: 0,
  m21: 0,
  m22: 1,
}

export function v2_to_v3(input: RuntimeSceneV2): RuntimeSceneV3 {
  const nodes = input.rootElements.map((legacyElement, index) => {
    const source = legacyElement as Record<string, unknown>
    const nodeId = numberFromUnknown(source.id, index + 1)
    const nodeType = inferNodeType(source)

    return {
      id: nodeId,
      type: nodeType,
      transform: matrixFromUnknown(source.transform),
      children: [],
      features: extractFeatures(source, nodeType),
    }
  })

  return {
    version: 3,
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
    gradients: input.gradients,
    rootElements: input.rootElements,
    documentId: input.documentId,
    nodes,
    rootNodeIds: nodes.map((node) => node.id),
  }
}

function numberFromUnknown(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback
}

function inferNodeType(source: Record<string, unknown>): RuntimeNodeType {
  const data = source.data as Record<string, unknown> | undefined
  const kind = typeof data?.kind === 'string' ? data.kind.toLowerCase() : ''

  if (kind === 'text') return 'TEXT'
  if (kind === 'image') return 'IMAGE'
  if (kind === 'path' || kind === 'line' || kind === 'arc' || kind === 'polygon') return 'VECTOR'
  if (kind === 'group') return 'GROUP'
  if (kind === 'rect' || kind === 'circle' || kind === 'point') return 'SHAPE'

  return 'FRAME'
}

function matrixFromUnknown(value: unknown): RuntimeMatrix3x3 {
  if (!value || typeof value !== 'object') {
    return IDENTITY_MATRIX
  }

  const source = value as Record<string, unknown>
  return {
    m00: numberFromUnknown(source.m00, 1),
    m01: numberFromUnknown(source.m01, 0),
    m02: numberFromUnknown(source.m02, 0),
    m10: numberFromUnknown(source.m10, 0),
    m11: numberFromUnknown(source.m11, 1),
    m12: numberFromUnknown(source.m12, 0),
    m20: numberFromUnknown(source.m20, 0),
    m21: numberFromUnknown(source.m21, 0),
    m22: numberFromUnknown(source.m22, 1),
  }
}

function extractFeatures(source: Record<string, unknown>, nodeType: RuntimeNodeType): RuntimeNodeFeature[] {
  const features: RuntimeNodeFeature[] = []

  if (source.fill !== undefined) {
    features.push({
      kind: 'FILL',
      fill: source.fill,
      opacity: numberFromUnknown(source.opacity, 1),
    })
  }

  if (source.stroke_color !== undefined || source.strokeColor !== undefined) {
    features.push({
      kind: 'STROKE',
      color: source.stroke_color ?? source.strokeColor,
      width: numberFromUnknown(source.stroke_width ?? source.strokeWidth, 1),
    })
  }

  const data = source.data as Record<string, unknown> | undefined
  const kind = typeof data?.kind === 'string' ? data.kind.toLowerCase() : ''

  if (nodeType === 'TEXT' || kind === 'text') {
    features.push({
      kind: 'TEXT',
      content: stringFromUnknown(data?.content, ''),
      fontSize: numberFromUnknown(data?.font_size ?? data?.fontSize, 12),
      fontFamily: stringFromUnknown(data?.font_family ?? data?.fontFamily, 'Inter'),
      letterSpacing: numberFromUnknown(data?.letter_spacing ?? data?.letterSpacing, 0),
      lineHeight: numberFromUnknown(data?.line_height ?? data?.lineHeight, 1.2),
    })
  }

  if (nodeType === 'IMAGE' || kind === 'image') {
    features.push({
      kind: 'IMAGE',
      assetId: stringFromUnknown(data?.asset_id ?? data?.assetId, ''),
      width: numberFromUnknown(data?.width, 0),
      height: numberFromUnknown(data?.height, 0),
    })
  }

  if (nodeType === 'VECTOR' || kind === 'path' || kind === 'polygon') {
    features.push({
      kind: 'VECTOR',
      vertices: arrayFromUnknown(data?.vertices),
      indices: arrayFromUnknown(data?.indices),
      isClosed: booleanFromUnknown(data?.is_closed ?? data?.isClosed, false),
    })
  }

  if (nodeType === 'FRAME' || nodeType === 'GROUP') {
    features.push({
      kind: 'LAYOUT',
      mode: 'NONE',
      padding: 0,
      gap: 0,
    })
  }

  return features
}

function stringFromUnknown(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function booleanFromUnknown(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function arrayFromUnknown(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => (typeof item === 'number' ? item : 0))
}
