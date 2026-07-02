import type {EngineRect, EngineRenderableNode, EngineTransform2D} from '../../../../scene/types/types.ts'
import {resolveLeafNodeWorldBounds} from '../../../../scene/worldBounds/worldBounds.ts'
import type {EngineOverlayDrawNode} from '../../../../interaction/overlayCanvas.ts'
import type {EngineRuntimeDiagnostics} from '../../../createEngine/createEngine.ts'
import type {VenusCacheDiagnostics, VenusDebugFlags} from '../../Venus.ts'

export const VENUS_DEBUG_HIT_TOLERANCE = 6

const IDENTITY_TRANSFORM: EngineTransform2D['matrix'] = [1, 0, 0, 0, 1, 0]
const DEBUG_BOUNDS_STROKE = '#2563eb'
const DEBUG_HIT_CANDIDATE_STROKE = '#f97316'
const DEBUG_HIT_CANDIDATE_FILL = '#f97316'
const DEBUG_OVERLAY_STROKE_WIDTH = 1

const multiplyTransformMatrices = (
  left: EngineTransform2D['matrix'],
  right: EngineTransform2D['matrix'],
): EngineTransform2D['matrix'] => {
  const [a, b, c, d, e, f] = left
  const [g, h, i, j, k, l] = right
  return [
    a * g + b * j,
    a * h + b * k,
    a * i + b * l + c,
    d * g + e * j,
    d * h + e * k,
    d * i + e * l + f,
  ]
}

const unionEngineBounds = (left: EngineRect, right: EngineRect): EngineRect => {
  const minX = Math.min(left.x, right.x)
  const minY = Math.min(left.y, right.y)
  const maxX = Math.max(left.x + left.width, right.x + right.width)
  const maxY = Math.max(left.y + left.height, right.y + right.height)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

const resolveEngineNodesBounds = (
  nodes: readonly EngineRenderableNode[],
  parentMatrix: EngineTransform2D['matrix'] = IDENTITY_TRANSFORM,
): EngineRect | null => {
  let aggregate: EngineRect | null = null

  for (const node of nodes) {
    const nodeMatrix = multiplyTransformMatrices(parentMatrix, node.transform?.matrix ?? IDENTITY_TRANSFORM)
    const nodeBounds = node.type === 'group'
      ? resolveEngineNodesBounds(node.children, nodeMatrix)
      : resolveLeafNodeWorldBounds(node, nodeMatrix)

    if (!nodeBounds) {
      continue
    }

    aggregate = aggregate ? unionEngineBounds(aggregate, nodeBounds) : nodeBounds
  }

  return aggregate
}

const collectEngineNodeBounds = (
  nodes: readonly EngineRenderableNode[],
  parentMatrix: EngineTransform2D['matrix'] = IDENTITY_TRANSFORM,
): {id: string; bounds: EngineRect}[] => {
  const entries: {id: string; bounds: EngineRect}[] = []

  for (const node of nodes) {
    const nodeMatrix = multiplyTransformMatrices(parentMatrix, node.transform?.matrix ?? IDENTITY_TRANSFORM)
    const bounds = node.type === 'group'
      ? resolveEngineNodesBounds(node.children, nodeMatrix)
      : resolveLeafNodeWorldBounds(node, nodeMatrix)

    if (bounds) {
      entries.push({id: node.id, bounds})
    }

    if (node.type === 'group') {
      entries.push(...collectEngineNodeBounds(node.children, nodeMatrix))
    }
  }

  return entries
}

const createBoundsOverlayNode = (
  id: string,
  bounds: EngineRect,
  style: NonNullable<EngineOverlayDrawNode['style']>,
): EngineOverlayDrawNode => {
  return {
    id,
    type: 'rect',
    coordinate: 'world',
    points: [
      {x: bounds.x, y: bounds.y},
      {x: bounds.x + bounds.width, y: bounds.y + bounds.height},
    ],
    style,
  }
}

export const createVenusCacheDiagnostics = (
  enabled: boolean,
  engine: EngineRuntimeDiagnostics | null,
): VenusCacheDiagnostics => {
  const stats = engine?.renderStats

  return {
    enabled,
    available: Boolean(stats),
    geometry: {
      hitCount: stats?.geometryCacheHitCount ?? 0,
      missCount: stats?.geometryCacheMissCount ?? 0,
      hitRate: stats?.geometryCacheHitRate ?? 0,
    },
    render: {
      hitCount: stats?.cacheHits ?? 0,
      missCount: stats?.cacheMisses ?? 0,
    },
    frameReuse: {
      hitCount: stats?.frameReuseHits ?? 0,
      missCount: stats?.frameReuseMisses ?? 0,
    },
    tile: {
      size: stats?.tileCacheSize ?? 0,
      dirtyCount: stats?.tileDirtyCount ?? 0,
      totalBytes: stats?.tileCacheTotalBytes ?? 0,
    },
    fallbackReason: stats?.cacheFallbackReason ?? engine?.strategySnapshot?.fallbackReason ?? null,
  }
}

export function createVenusDebugOverlayNodes(
  nodes: readonly EngineRenderableNode[],
  debugFlags: VenusDebugFlags,
  hitCandidateNodeIds: readonly string[],
): EngineOverlayDrawNode[] {
  const overlays: EngineOverlayDrawNode[] = []
  const boundsEntries = collectEngineNodeBounds(nodes)

  if (debugFlags.showBounds) {
    for (const entry of boundsEntries) {
      overlays.push(createBoundsOverlayNode(`debug-bounds-${entry.id}`, entry.bounds, {
        strokeColor: DEBUG_BOUNDS_STROKE,
        strokeWidth: DEBUG_OVERLAY_STROKE_WIDTH,
        strokeDash: [4, 4],
        zIndex: 20,
      }))
    }
  }

  if (debugFlags.showHitCandidates && hitCandidateNodeIds.length > 0) {
    const candidateIds = new Set(hitCandidateNodeIds)
    const boundsById = new Map(boundsEntries.map((entry) => [entry.id, entry.bounds]))
    for (const candidateId of candidateIds) {
      const candidateBounds = boundsById.get(candidateId)
      if (!candidateBounds) {
        continue
      }
      overlays.push(createBoundsOverlayNode(`debug-hit-candidate-${candidateId}`, candidateBounds, {
        strokeColor: DEBUG_HIT_CANDIDATE_STROKE,
        strokeWidth: DEBUG_OVERLAY_STROKE_WIDTH,
        fillColor: DEBUG_HIT_CANDIDATE_FILL,
        fillOpacity: 0.08,
        zIndex: 30,
      }))
    }
  }

  return overlays
}
