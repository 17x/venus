export type ProjectionBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type ProjectionDiagnosticSource =
  | 'runtime.scene-memory'
  | 'worker.spatial-index'
  | 'engine.hit-geometry'
  | 'engine.render-payload'
  | 'overlay'

export type ProjectionDiagnostic = {
  code:
    | 'v2d.projection.matrix-order.invalid'
    | 'v2d.projection.point-space.mismatch'
    | 'v2d.projection.spatial-bounds.stale'
    | 'v2d.projection.overlay-geometry.mismatch'
    | 'v2d.projection.backend-effect.dropped'
  nodeId: string
  source: ProjectionDiagnosticSource
  expectedBounds: ProjectionBounds
  actualBounds: ProjectionBounds
  tolerance: number
}

type EngineSelectedGeometryPayload = {
  nodeId: string
  bounds?: ProjectionBounds
}

const DEFAULT_PROJECTION_BOUNDS_TOLERANCE = 0.5

function isFiniteBounds(bounds: ProjectionBounds | null | undefined): bounds is ProjectionBounds {
  return Boolean(
    bounds &&
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxX) &&
    Number.isFinite(bounds.maxY),
  )
}

function mergeBounds(bounds: ProjectionBounds[]): ProjectionBounds | null {
  if (bounds.length === 0) {
    return null
  }
  return bounds.reduce<ProjectionBounds>((acc, next) => ({
    minX: Math.min(acc.minX, next.minX),
    minY: Math.min(acc.minY, next.minY),
    maxX: Math.max(acc.maxX, next.maxX),
    maxY: Math.max(acc.maxY, next.maxY),
  }), bounds[0])
}

function exceedsTolerance(expected: ProjectionBounds, actual: ProjectionBounds, tolerance: number) {
  return (
    Math.abs(expected.minX - actual.minX) > tolerance ||
    Math.abs(expected.minY - actual.minY) > tolerance ||
    Math.abs(expected.maxX - actual.maxX) > tolerance ||
    Math.abs(expected.maxY - actual.maxY) > tolerance
  )
}

/**
 * Compares runtime selection bounds against Engine-selected geometry bounds.
 * @param input Runtime selection and Engine geometry snapshots.
 */
export function collectProjectionDiagnostics(input: {
  selectedBounds: ProjectionBounds | null | undefined
  selectedGeometryPayloads: readonly EngineSelectedGeometryPayload[]
  tolerance?: number
}): ProjectionDiagnostic[] {
  const tolerance = input.tolerance ?? DEFAULT_PROJECTION_BOUNDS_TOLERANCE
  if (!isFiniteBounds(input.selectedBounds)) {
    return []
  }

  const selectedGeometryBounds = input.selectedGeometryPayloads
    .map((payload) => payload.bounds)
    .filter(isFiniteBounds)
  const actualBounds = mergeBounds(selectedGeometryBounds)
  if (!actualBounds) {
    return [{
      code: 'v2d.projection.spatial-bounds.stale',
      nodeId: input.selectedGeometryPayloads.map((payload) => payload.nodeId).join(',') || 'selection',
      source: 'engine.hit-geometry',
      expectedBounds: input.selectedBounds,
      actualBounds: input.selectedBounds,
      tolerance,
    }]
  }
  if (!exceedsTolerance(input.selectedBounds, actualBounds, tolerance)) {
    return []
  }

  return [{
    code: 'v2d.projection.overlay-geometry.mismatch',
    nodeId: input.selectedGeometryPayloads.map((payload) => payload.nodeId).join(',') || 'selection',
    source: 'overlay',
    expectedBounds: input.selectedBounds,
    actualBounds,
    tolerance,
  }]
}
