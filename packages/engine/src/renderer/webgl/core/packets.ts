/**
 * Renderer/WebGL packet contract module.
 * Owns packet data contracts and packet plan compilation only.
 * Does not execute backend orchestration or resource management.
 */
import type { EngineRenderPlan } from '../../plan/index.ts'
import type { EngineRenderInstanceView } from '../../instances/instances.ts'
import type { EngineRect, EngineRenderableNode } from '../../../scene/types/types.ts'

export type EngineWebGLPacketKind = 'shape' | 'text' | 'image'

export interface EngineWebGLRenderPacket {
  kind: EngineWebGLPacketKind
  nodeId: string
  batchKey: string
  opacity: number
  worldBounds: EngineRect
  color: readonly [number, number, number, number]
  assetId?: string
  textCacheKey?: string
  // Packet-level style hints let the render loop apply LOD without re-reading scene nodes.
  hasShadow?: boolean
  hasExpensiveEffect?: boolean
  shapeHasStroke?: boolean
  shapeHasFill?: boolean
  shapeStrokeWidth?: number
  shapeKind?: Extract<EngineRenderableNode, { type: 'shape' }>['shape']
  shapePointCount?: number
  shapeBezierPointCount?: number
  /** Whether the shape uses gradient fills (requires model-complete for accuracy). */
  hasGradientFill?: boolean
  /** Whether the shape uses gradient strokes (requires model-complete for accuracy). */
  hasGradientStroke?: boolean
  /** Whether the shape has a non-default blendMode (requires full compositing). */
  hasNonDefaultBlend?: boolean
  /** Whether the shape has inner shadow (requires model-complete). */
  hasInnerShadow?: boolean
  /** Whether the shape has layer blur (requires model-complete). */
  hasLayerBlur?: boolean
}

export interface EngineWebGLPacketPlan {
  packets: EngineWebGLRenderPacket[]
  drawCount: number
  uploadBytesEstimate: number
  imagePacketCount: number
  richTextPacketCount: number
  precomputedTextCacheKeyCount: number
  fallbackTextCacheKeyCount: number
}

interface CachedPacketPlanEntry {
  instanceView: EngineRenderInstanceView
  packetPlan: EngineWebGLPacketPlan
}

const webglPacketPlanCache = new WeakMap<EngineRenderPlan, CachedPacketPlanEntry>()
const objectIdentityMap = new WeakMap<object, number>()
let nextObjectIdentity = 1

const RGBA_ALPHA_INDEX = 3
const MID_COLOR_CHANNEL = 0.5
const COLOR_BYTE_MAX = 255
const HEX_SHORTHAND_LENGTH = 3
const HEX_RGB_LENGTH = 6
const HEX_RGBA_LENGTH = 8
const HEX_SEGMENT_SIZE = 2
const RGB_COMPONENT_COUNT = 3
const RGBA_COMPONENT_COUNT = 4

/**
 * Compile plan output into render packets so backend commit paths can submit
 * draw work without reinterpreting scene/business structures.
  * @param plan plan parameter.
 * @param instanceView instanceView parameter.
*/
export function compileEngineWebGLPacketPlan(
  plan: EngineRenderPlan,
  instanceView: EngineRenderInstanceView,
): EngineWebGLPacketPlan {
  // Reuse packet organization when both the render plan and instance payload
  // are unchanged so WebGL commit prep does not rebuild packet arrays on
  // duplicate frames.
  const cached = webglPacketPlanCache.get(plan)
  if (cached && cached.instanceView === instanceView) {
    return cached.packetPlan
  }

  const packets: EngineWebGLRenderPacket[] = []
  let imagePacketCount = 0
  let richTextPacketCount = 0
  let precomputedTextCacheKeyCount = 0
  let fallbackTextCacheKeyCount = 0

  for (const preparedIndex of plan.drawList) {
    const prepared = plan.preparedNodes[preparedIndex]
    if (!prepared || !prepared.worldBounds) {
      continue
    }

    const packetKind = resolvePacketKind(prepared.node)
    if (packetKind === 'image') {
      imagePacketCount += 1
    }
    // Track rich-text packets once during packet compilation so the WebGL
    // renderer does not need to rescan packets to decide text fallback mode.
    if (
      packetKind === 'text' &&
      prepared.node.type === 'text' &&
      prepared.node.runs &&
      prepared.node.runs.length > 0
    ) {
      richTextPacketCount += 1
    }

    const textCacheKey = prepared.node.type === 'text'
      ? resolvePreparedTextCacheKey(prepared.node)
      : undefined

    packets.push({
      kind: packetKind,
      nodeId: prepared.node.id,
      batchKey: prepared.bucketKey,
      opacity: resolveNodeOpacity(prepared.node),
      // Keep commit-stage packet handling focused on WebGL resource work by
      // precomputing immutable draw inputs during packet compilation.
      worldBounds: prepared.worldBounds,
      color: resolveNodeColor(prepared.node),
      assetId: prepared.node.type === 'image' ? prepared.node.assetId : undefined,
      textCacheKey,
      hasShadow: resolveNodeHasShadow(prepared.node),
      hasExpensiveEffect: resolveNodeHasExpensiveEffect(prepared.node),
      // Check both legacy scalar stroke and structured strokes array (populated
      // from VenusAppearance.strokes projection) to avoid false negatives for
      // nodes that only use structured appearance.
      shapeHasStroke: prepared.node.type === 'shape' && (
        (Boolean(prepared.node.stroke) && (prepared.node.strokeWidth ?? 1) > 0) ||
        (prepared.node.strokes?.length ?? 0) > 0
      ),
      // Check both legacy scalar fill and structured fills array (populated
      // from VenusAppearance.fills projection) to avoid false negatives for
      // nodes that only use structured appearance.
      shapeHasFill: prepared.node.type === 'shape' && (
        Boolean(prepared.node.fill) ||
        (prepared.node.fills?.length ?? 0) > 0
      ),
      shapeStrokeWidth: prepared.node.type === 'shape' ? prepared.node.strokeWidth : undefined,
      shapeKind: prepared.node.type === 'shape' ? prepared.node.shape : undefined,
      shapePointCount: prepared.node.type === 'shape' ? (prepared.node.pointCount ?? prepared.node.points?.length ?? 0) : undefined,
      shapeBezierPointCount: prepared.node.type === 'shape'
        ? (prepared.node.bezierPointCount ?? prepared.node.bezierPoints?.length ?? 0)
        : undefined,
      hasGradientFill: resolveNodeHasGradientFill(prepared.node),
      hasGradientStroke: resolveNodeHasGradientStroke(prepared.node),
      hasNonDefaultBlend: resolveNodeHasNonDefaultBlend(prepared.node),
      hasInnerShadow: resolveNodeHasInnerShadow(prepared.node),
      hasLayerBlur: resolveNodeHasLayerBlur(prepared.node),
    })

    if (prepared.node.type === 'text') {
      if (prepared.node.cacheKey) {
        precomputedTextCacheKeyCount += 1
      } else if (textCacheKey) {
        fallbackTextCacheKeyCount += 1
      }
    }
  }

  // One upload estimate gives the resource manager a stable frame-level signal
  // for buffer pressure, before concrete draw-program uploads are wired.
  const uploadBytesEstimate =
    instanceView.transforms.byteLength +
    instanceView.bounds.byteLength +
    instanceView.indices.byteLength

  const packetPlan = {
    packets,
    drawCount: packets.length,
    uploadBytesEstimate,
    imagePacketCount,
    richTextPacketCount,
    precomputedTextCacheKeyCount,
    fallbackTextCacheKeyCount,
  }
  webglPacketPlanCache.set(plan, {
    instanceView,
    packetPlan,
  })
  return packetPlan
}

/**
 * Handles resolvePreparedTextCacheKey.
 * @param node Target node.
 */
function resolvePreparedTextCacheKey(
  node: Extract<EngineRenderableNode, { type: 'text' }>,
) {
  return node.cacheKey ?? resolveTextPacketCacheKey(node)
}

/**
 * Handles resolvePacketKind.
 * @param node Target node.
 */
function resolvePacketKind(node: EngineRenderableNode): EngineWebGLPacketKind {
  switch (node.type) {
    case 'shape':
      return 'shape'
    case 'text':
      return 'text'
    case 'image':
      return 'image'
    case 'group':
      // Group thumbnails are submitted as simple shape packets.
      return 'shape'
    default:
      return 'shape'
  }
}

/**
 * Handles resolveNodeHasShadow.
 * @param node Target node.
 */
function resolveNodeHasShadow(node: EngineRenderableNode) {
  if (node.type === 'text') {
    return Boolean(node.shadow || node.style.shadow)
  }

  return Boolean(node.shadow)
}

/**
 * Handles resolveNodeHasExpensiveEffect.
 * @param node Target node.
 */
function resolveNodeHasExpensiveEffect(node: EngineRenderableNode) {
  // Treat non-default blend/clip usage as expensive so effect LOD can skip them.
  return Boolean((node.blendMode && node.blendMode !== 'normal') || node.clip)
}

/**
 * Detects gradient fills (requires model-complete path for accuracy).
 * @param node Target node.
 */
function resolveNodeHasGradientFill(node: EngineRenderableNode) {
  if (node.type !== 'shape') return false
  return (node.fills?.some((p) => p.type === 'gradient')) ?? false
}

/**
 * Detects gradient strokes (requires model-complete path for accuracy).
 * @param node Target node.
 */
function resolveNodeHasGradientStroke(node: EngineRenderableNode) {
  if (node.type !== 'shape') return false
  return (node.strokes?.some((p) => p.type === 'gradient')) ?? false
}

/**
 * Detects non-default blend modes that need full compositing.
 * @param node Target node.
 */
function resolveNodeHasNonDefaultBlend(node: EngineRenderableNode) {
  const bm = node.blendMode
  return Boolean(bm && bm !== 'normal' && bm !== 'passThrough')
}

/**
 * Detects inner shadow effects (require model-complete path).
 * @param node Target node.
 */
function resolveNodeHasInnerShadow(node: EngineRenderableNode) {
  return Boolean(node.innerShadow?.color && node.innerShadow?.blur && node.innerShadow.blur > 0)
}

/**
 * Detects layer blur (requires model-complete path).
 * @param node Target node.
 */
function resolveNodeHasLayerBlur(node: EngineRenderableNode) {
  return Boolean(node.layerBlur?.amount && node.layerBlur.amount > 0)
}

/**
 * Handles resolveNodeOpacity.
 * @param node Target node.
 */
function resolveNodeOpacity(node: EngineRenderableNode) {
  const value = node.opacity
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1
  }

  if (value < 0) {
    return 0
  }

  if (value > 1) {
    return 1
  }

  return value
}

/**
 * Handles resolveNodeColor.
 * @param node Target node.
 */
function resolveNodeColor(node: EngineRenderableNode): readonly [number, number, number, number] {
  if (node.type === 'shape') {
    return parseEngineColor(node.fill ?? node.stroke ?? '#9ca3af')
  }

  if (node.type === 'text') {
    return parseEngineColor(node.style.fill ?? '#111827')
  }

  if (node.type === 'group') {
    return resolveGroupPlaceholderColor(node.children)
  }

  return [1, 1, 1, 1]
}

/**
 * Handles resolveGroupPlaceholderColor.
 * @param children children parameter.
 */
function resolveGroupPlaceholderColor(children: readonly EngineRenderableNode[]): readonly [number, number, number, number] {
  // Use the first concrete descendant color as a cheap dominant-color approximation.
  for (const child of children) {
    if (child.type === 'group') {
      const nested = resolveGroupPlaceholderColor(child.children)
      if (nested[RGBA_ALPHA_INDEX] > 0) {
        return nested
      }
      continue
    }

    return resolveNodeColor(child)
  }

  return [MID_COLOR_CHANNEL, MID_COLOR_CHANNEL, MID_COLOR_CHANNEL, 1]
}

/**
 * Handles resolveTextPacketCacheKey.
 * @param node Target node.
 */
function resolveTextPacketCacheKey(
  node: Extract<EngineRenderableNode, { type: 'text' }>,
) {
  // Use object identities instead of deep JSON serialization so packet
  // compilation cost stays stable on large text-heavy scenes.
  const styleIdentity = resolveObjectIdentity(node.style as object)
  const runsIdentity = node.runs ? resolveObjectIdentity(node.runs as object) : 0
  return `${node.text ?? ''}|${node.wrap ?? 'none'}|s${styleIdentity}|r${runsIdentity}|n${node.runs?.length ?? 0}`
}

/**
 * Handles resolveObjectIdentity.
 * @param target target parameter.
 */
function resolveObjectIdentity(target: object) {
  const cached = objectIdentityMap.get(target)
  if (typeof cached === 'number') {
    return cached
  }

  const nextIdentity = nextObjectIdentity++
  objectIdentityMap.set(target, nextIdentity)
  return nextIdentity
}

/**
 * Handles parseEngineColor.
 * @param value value parameter.
 */
function parseEngineColor(value: string): readonly [number, number, number, number] {
  const color = value.trim().toLowerCase()
  const named = NAMED_COLORS[color]
  if (named) {
    return named
  }

  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === HEX_SHORTHAND_LENGTH) {
      const [rHex = '0', gHex = '0', bHex = '0'] = hex.split('')
      const r = parseInt(rHex + rHex, 16)
      const g = parseInt(gHex + gHex, 16)
      const b = parseInt(bHex + bHex, 16)
      return [r / COLOR_BYTE_MAX, g / COLOR_BYTE_MAX, b / COLOR_BYTE_MAX, 1]
    }

    if (hex.length === HEX_RGB_LENGTH || hex.length === HEX_RGBA_LENGTH) {
      const pairs = hex.match(new RegExp(`.{1,${String(HEX_SEGMENT_SIZE)}}`, 'g')) ?? []
      const [rHex = '00', gHex = '00', bHex = '00', aHex = 'ff'] = pairs
      const r = parseInt(rHex, 16)
      const g = parseInt(gHex, 16)
      const b = parseInt(bHex, 16)
      const a = hex.length === HEX_RGBA_LENGTH ? parseInt(aHex, 16) / COLOR_BYTE_MAX : 1
      return [r / COLOR_BYTE_MAX, g / COLOR_BYTE_MAX, b / COLOR_BYTE_MAX, a]
    }
  }

  const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/)
  if (rgbaMatch) {
    const components = rgbaMatch[1]
      .split(',')
      .map((entry) => entry.trim())
    if (components.length === RGB_COMPONENT_COUNT || components.length === RGBA_COMPONENT_COUNT) {
      const [rComponent = '0', gComponent = '0', bComponent = '0', aComponent = '1'] = components
      const r = clamp255(Number(rComponent))
      const g = clamp255(Number(gComponent))
      const b = clamp255(Number(bComponent))
      const a = components.length === RGBA_COMPONENT_COUNT ? clamp01(Number(aComponent)) : 1
      return [r / COLOR_BYTE_MAX, g / COLOR_BYTE_MAX, b / COLOR_BYTE_MAX, a]
    }
  }

  return [MID_COLOR_CHANNEL, MID_COLOR_CHANNEL, MID_COLOR_CHANNEL, 1]
}

const NAMED_COLORS: Record<string, readonly [number, number, number, number]> = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [1, 1, 1, 1],
  red: [1, 0, 0, 1],
  green: [0, MID_COLOR_CHANNEL, 0, 1],
  blue: [0, 0, 1, 1],
  yellow: [1, 1, 0, 1],
  cyan: [0, 1, 1, 1],
  magenta: [1, 0, 1, 1],
  gray: [MID_COLOR_CHANNEL, MID_COLOR_CHANNEL, MID_COLOR_CHANNEL, 1],
  grey: [MID_COLOR_CHANNEL, MID_COLOR_CHANNEL, MID_COLOR_CHANNEL, 1],
}

/**
 * Handles clamp255.
 * @param value value parameter.
 */
function clamp255(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(COLOR_BYTE_MAX, Math.max(0, value))
}

/**
 * Handles clamp01.
 * @param value value parameter.
 */
function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.min(1, Math.max(0, value))
}
