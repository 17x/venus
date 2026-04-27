import type { EngineRenderPlan } from './plan.ts'
import type { EngineRenderInstanceView } from './instances.ts'
import type { EngineRect, EngineRenderableNode } from '../scene/types.ts'

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

/**
 * Compile plan output into render packets so backend commit paths can submit
 * draw work without reinterpreting scene/business structures.
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
      shapeHasStroke: prepared.node.type === 'shape' && Boolean(prepared.node.stroke),
      shapeHasFill: prepared.node.type === 'shape' && Boolean(prepared.node.fill),
      shapeStrokeWidth: prepared.node.type === 'shape' ? prepared.node.strokeWidth : undefined,
      shapeKind: prepared.node.type === 'shape' ? prepared.node.shape : undefined,
      shapePointCount: prepared.node.type === 'shape' ? (prepared.node.pointCount ?? prepared.node.points?.length ?? 0) : undefined,
      shapeBezierPointCount: prepared.node.type === 'shape'
        ? (prepared.node.bezierPointCount ?? prepared.node.bezierPoints?.length ?? 0)
        : undefined,
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

function resolvePreparedTextCacheKey(
  node: Extract<EngineRenderableNode, { type: 'text' }>,
) {
  return node.cacheKey ?? resolveTextPacketCacheKey(node)
}

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

function resolveNodeHasShadow(node: EngineRenderableNode) {
  if (node.type === 'text') {
    return Boolean(node.shadow || node.style.shadow)
  }

  return Boolean(node.shadow)
}

function resolveNodeHasExpensiveEffect(node: EngineRenderableNode) {
  // Treat non-default blend/clip usage as expensive so effect LOD can skip them.
  return Boolean((node.blendMode && node.blendMode !== 'normal') || node.clip)
}

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

function resolveGroupPlaceholderColor(children: readonly EngineRenderableNode[]): readonly [number, number, number, number] {
  // Use the first concrete descendant color as a cheap dominant-color approximation.
  for (const child of children) {
    if (child.type === 'group') {
      const nested = resolveGroupPlaceholderColor(child.children)
      if (nested[3] > 0) {
        return nested
      }
      continue
    }

    return resolveNodeColor(child)
  }

  return [0.5, 0.5, 0.5, 1]
}

function resolveTextPacketCacheKey(
  node: Extract<EngineRenderableNode, { type: 'text' }>,
) {
  // Use object identities instead of deep JSON serialization so packet
  // compilation cost stays stable on large text-heavy scenes.
  const styleIdentity = resolveObjectIdentity(node.style as object)
  const runsIdentity = node.runs ? resolveObjectIdentity(node.runs as object) : 0
  return `${node.text ?? ''}|${node.wrap ?? 'none'}|s${styleIdentity}|r${runsIdentity}|n${node.runs?.length ?? 0}`
}

function resolveObjectIdentity(target: object) {
  const cached = objectIdentityMap.get(target)
  if (typeof cached === 'number') {
    return cached
  }

  const nextIdentity = nextObjectIdentity++
  objectIdentityMap.set(target, nextIdentity)
  return nextIdentity
}

function parseEngineColor(value: string): readonly [number, number, number, number] {
  const color = value.trim().toLowerCase()
  const named = NAMED_COLORS[color]
  if (named) {
    return named
  }

  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      return [r / 255, g / 255, b / 255, 1]
    }

    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      return [r / 255, g / 255, b / 255, a]
    }
  }

  const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/)
  if (rgbaMatch) {
    const components = rgbaMatch[1]
      .split(',')
      .map((entry) => entry.trim())
    if (components.length === 3 || components.length === 4) {
      const r = clamp255(Number(components[0]))
      const g = clamp255(Number(components[1]))
      const b = clamp255(Number(components[2]))
      const a = components.length === 4 ? clamp01(Number(components[3])) : 1
      return [r / 255, g / 255, b / 255, a]
    }
  }

  return [0.5, 0.5, 0.5, 1]
}

const NAMED_COLORS: Record<string, readonly [number, number, number, number]> = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [1, 1, 1, 1],
  red: [1, 0, 0, 1],
  green: [0, 0.5, 0, 1],
  blue: [0, 0, 1, 1],
  yellow: [1, 1, 0, 1],
  cyan: [0, 1, 1, 1],
  magenta: [1, 0, 1, 1],
  gray: [0.5, 0.5, 0.5, 1],
  grey: [0.5, 0.5, 0.5, 1],
}

function clamp255(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(255, Math.max(0, value))
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.min(1, Math.max(0, value))
}
