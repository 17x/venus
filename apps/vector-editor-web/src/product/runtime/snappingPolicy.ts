import type {SnapGuide} from '../../runtime/interaction/index.ts'

/** Declares one snapping enablement decision used by product interaction policy. */
export interface RuntimeSnappingEnablement {
  /** Stores whether snapping is enabled for the current interaction scope. */
  readonly enabled: boolean
  /** Stores optional disable reason for diagnostics and UI messaging. */
  readonly reason?: 'user-disabled' | 'scene-too-large'
}

/** Declares one guide-visualization strategy token consumed by overlay diagnostics. */
export type RuntimeGuideVisualizationStrategy = 'full' | 'axis-first' | 'axis-relevance'

/** Declares one reduced snap-guide result produced by product visualization policy. */
export interface RuntimeReducedSnapGuides {
  /** Stores effective guide set after visualization policy filtering. */
  readonly guides: SnapGuide[]
  /** Stores strategy token describing how the guides were selected. */
  readonly strategy: RuntimeGuideVisualizationStrategy
}

/** Stores max shape count before snapping auto-disables for large-scene interaction safety. */
export const RUNTIME_SNAP_AUTO_DISABLE_SHAPE_COUNT = 25_000

/**
 * Resolves whether snapping is enabled after combining user toggle and scene-size guard.
 * @param input User toggle state and current interaction-shape count.
 */
export function resolveRuntimeSnappingEnablement(input: {
  userEnabled: boolean
  interactionShapeCount: number
}): RuntimeSnappingEnablement {
  if (!input.userEnabled) {
    return {
      enabled: false,
      reason: 'user-disabled',
    }
  }

  if (input.interactionShapeCount >= RUNTIME_SNAP_AUTO_DISABLE_SHAPE_COUNT) {
    return {
      enabled: false,
      reason: 'scene-too-large',
    }
  }

  return {enabled: true}
}

/**
 * Resolves world-space snapping tolerance from viewport scale.
 * @param input Viewport scale used to keep snapping feel stable across zoom levels.
 */
export function resolveRuntimeMoveSnapToleranceWorld(input: {
  viewportScale: number
}): number {
  const safeScale = Math.max(0.01, input.viewportScale)
  const worldPerPx = 1 / safeScale
  return Math.min(12, Math.max(0.5, worldPerPx * 6))
}

/**
 * Resolves effective snap guides for overlay rendering under degraded/non-degraded interaction modes.
 * @param input Raw guides, degradation flag, and optional selected bounds context.
 */
export function resolveRuntimeEffectiveSnapGuides(input: {
  guides: SnapGuide[]
  overlayInteractionDegraded: boolean
  selectedBounds: {minX: number; minY: number; maxX: number; maxY: number} | null
}): RuntimeReducedSnapGuides {
  if (!input.overlayInteractionDegraded) {
    return {
      guides: input.guides,
      strategy: 'full',
    }
  }

  if (!input.selectedBounds) {
    const primaryGuideByAxis = new Map<SnapGuide['axis'], SnapGuide>()
    for (const guide of input.guides) {
      if (!primaryGuideByAxis.has(guide.axis)) {
        primaryGuideByAxis.set(guide.axis, guide)
      }
    }
    return {
      guides: Array.from(primaryGuideByAxis.values()),
      strategy: 'axis-first',
    }
  }

  const resolveAnchorValue = (guide: SnapGuide) => {
    if (guide.axis === 'x') {
      if (guide.kind === 'edge-min') {
        return input.selectedBounds!.minX
      }
      if (guide.kind === 'edge-max') {
        return input.selectedBounds!.maxX
      }
      return (input.selectedBounds!.minX + input.selectedBounds!.maxX) / 2
    }

    if (guide.kind === 'edge-min') {
      return input.selectedBounds!.minY
    }
    if (guide.kind === 'edge-max') {
      return input.selectedBounds!.maxY
    }
    return (input.selectedBounds!.minY + input.selectedBounds!.maxY) / 2
  }

  const primaryGuideByAxis = new Map<SnapGuide['axis'], SnapGuide>()
  for (const guide of input.guides) {
    const existing = primaryGuideByAxis.get(guide.axis)
    if (!existing) {
      primaryGuideByAxis.set(guide.axis, guide)
      continue
    }

    const existingDistance = Math.abs(resolveAnchorValue(existing) - existing.value)
    const nextDistance = Math.abs(resolveAnchorValue(guide) - guide.value)
    if (nextDistance < existingDistance) {
      primaryGuideByAxis.set(guide.axis, guide)
    }
  }

  return {
    guides: Array.from(primaryGuideByAxis.values()),
    strategy: 'axis-relevance',
  }
}
