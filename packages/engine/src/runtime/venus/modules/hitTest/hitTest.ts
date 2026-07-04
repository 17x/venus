import type {Engine} from '../../../createEngine/createEngine.ts'
import type {EngineRenderableNode} from '../../../../scene/types/types.ts'
import type {
  VenusDetailedHitTestResult,
  VenusDocumentModelType,
  VenusHitAnchor,
  VenusHitTargetKind,
  VenusHitTestOptions,
  VenusNode,
} from '../../Venus.ts'

export interface VenusResolvedHitTestOptions {
  phase: 'hover' | 'click'
  tolerance: number
  includeLocked: boolean
}

export interface ResolveVenusDetailedHitsOptions {
  point: {x: number; y: number}
  options: VenusResolvedHitTestOptions
  hits: readonly (Partial<ReturnType<Engine['hitTestAll']>[number]> & {nodeId: string})[]
  resolveNode: (id: string) => VenusNode | undefined
  resolveBounds: (node: VenusNode) => {x: number; y: number; width: number; height: number} | null
}

const DEFAULT_CLICK_HIT_TOLERANCE = 0
const DEFAULT_HOVER_HIT_TOLERANCE = 6

const distanceBetweenPoints = (a: {x: number; y: number}, b: {x: number; y: number}) => {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const isVisibleColor = (color: string | undefined) => {
  return Boolean(color && color !== 'transparent' && color !== 'rgba(0,0,0,0)')
}

export function resolveVenusHitTestOptions(options: VenusHitTestOptions = {}): VenusResolvedHitTestOptions {
  const phase = options.phase ?? 'click'
  const defaultTolerance = phase === 'hover' ? DEFAULT_HOVER_HIT_TOLERANCE : DEFAULT_CLICK_HIT_TOLERANCE

  return {
    phase,
    tolerance: Math.max(0, options.tolerance ?? defaultTolerance),
    includeLocked: options.includeLocked ?? false,
  }
}

export function resolveVenusNodeAnchors(node: VenusNode): VenusHitAnchor[] {
  if (node.type === 'line') {
    const points = node.points && node.points.length >= 2
      ? [node.points[0], node.points[node.points.length - 1]]
      : [{x: node.x ?? 0, y: node.y ?? 0}, {x: (node.x ?? 0) + node.width, y: (node.y ?? 0) + node.height}]
    return points.map((point, index) => ({index, x: point.x, y: point.y}))
  }

  if (node.type === 'polygon' || node.type === 'star') {
    return (node.points ?? []).map((point, index) => ({index, x: point.x, y: point.y}))
  }

  if (node.type === 'path') {
    if (node.bezierPoints && node.bezierPoints.length > 0) {
      return node.bezierPoints.map((point, index) => ({index, x: point.anchor.x, y: point.anchor.y}))
    }

    return (node.points ?? []).map((point, index) => ({index, x: point.x, y: point.y}))
  }

  return []
}

export function resolveVenusDetailedHits({
  point,
  options,
  hits,
  resolveNode,
  resolveBounds,
}: ResolveVenusDetailedHitsOptions): VenusDetailedHitTestResult[] {
  const filteredHits = options.includeLocked
    ? hits
    : hits.filter((hit) => !resolveNode(hit.nodeId)?.locked)

  return filteredHits.map((hit) => {
    const node = resolveNode(hit.nodeId)
    const bounds = node ? resolveBounds(node) : null
    const center = bounds
      ? {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2}
      : null
    const anchors = node ? resolveVenusNodeAnchors(node) : []
    const target = resolveVenusHitTarget(point, node, bounds, center, anchors, options.tolerance)

    return {
      nodeId: hit.nodeId,
      nodeType: hit.nodeType as EngineRenderableNode['type'] | undefined,
      documentType: node?.type as VenusDocumentModelType | undefined,
      hitType: hit.hitType,
      index: hit.index,
      score: hit.score,
      zOrder: hit.zOrder,
      hitPoint: hit.hitPoint ?? point,
      bounds,
      center,
      anchors,
      target,
      regions: resolveVenusHitRegions(node, target),
    }
  })
}

function hasVenusNodeStroke(node: VenusNode | undefined) {
  switch (node?.type) {
    case 'rect':
    case 'ellipse':
    case 'line':
    case 'polygon':
    case 'star':
    case 'path':
      return (
        ((node.strokes?.length ?? 0) > 0) ||
        (isVisibleColor(node.stroke) && (node.strokeWidth ?? 1) > 0)
      )
    default:
      return false
  }
}

function hasVenusNodeFill(node: VenusNode | undefined) {
  switch (node?.type) {
    case 'text':
    case 'image':
      return true
    case 'rect':
    case 'ellipse':
    case 'polygon':
    case 'star':
    case 'path':
      return ((node.fills?.length ?? 0) > 0) || isVisibleColor(node.fill)
    default:
      return false
  }
}

function resolveVenusHitTarget(
  point: {x: number; y: number},
  node: VenusNode | undefined,
  bounds: {x: number; y: number; width: number; height: number} | null,
  center: {x: number; y: number} | null,
  anchors: readonly VenusHitAnchor[],
  tolerance: number,
): {kind: VenusHitTargetKind; anchorIndex?: number} {
  const snapDistance = Math.max(6, tolerance)
  const nearestAnchor = anchors
    .map((anchor) => ({anchor, distance: distanceBetweenPoints(point, anchor)}))
    .sort((a, b) => a.distance - b.distance)[0]

  if (nearestAnchor && nearestAnchor.distance <= snapDistance) {
    return {kind: 'shape.anchor', anchorIndex: nearestAnchor.anchor.index}
  }

  if (center && distanceBetweenPoints(point, center) <= snapDistance) {
    return {kind: 'shape.center'}
  }

  if (hasVenusNodeStroke(node) && (!hasVenusNodeFill(node) || node?.type === 'line')) {
    return {kind: 'shape.stroke'}
  }

  if (hasVenusNodeFill(node)) {
    return {kind: 'shape.fill'}
  }

  if (bounds) {
    return {kind: 'shape.bounds'}
  }

  return {kind: 'shape.stroke'}
}

function resolveVenusHitRegions(
  node: VenusNode | undefined,
  target: {kind: VenusHitTargetKind},
): VenusHitTargetKind[] {
  const regions = new Set<VenusHitTargetKind>([target.kind])
  if (hasVenusNodeStroke(node)) {
    regions.add('shape.stroke')
  }
  if (hasVenusNodeFill(node)) {
    regions.add('shape.fill')
  }
  if (node && resolveVenusNodeAnchors(node).length > 0) {
    regions.add('shape.anchor')
  }
  if (node) {
    regions.add('shape.center')
    regions.add('shape.bounds')
  }
  return [...regions]
}
