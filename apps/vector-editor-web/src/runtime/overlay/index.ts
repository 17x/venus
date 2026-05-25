import type {
  CursorIntent,
  OverlayCoordinateSpace,
  OverlayPrimitiveType,
} from '@venus/editor-primitive'
import type { RuntimePoint } from '../types/index.ts'
export {
  createRuntimeInteractionStateMatrixInstructions,
  createRuntimeInteractionStateMatrixOutput,
  type RuntimeInteractionStateMatrixBounds,
  type RuntimeInteractionStateMatrixInput,
  type RuntimeInteractionStateMatrixOutput,
  type RuntimeInteractionStateMatrixState,
} from './interactionStateMatrix.ts'

export type RuntimeOverlayLayerId =
  | 'overlay.selection'
  | 'overlay.hover'
  | 'overlay.guides'
  | 'overlay.handles'
  | 'overlay.marquee'
  | 'preview.transform'
  | 'debug.hittest'
  | 'debug.spatial'

// Reuse primitive overlay geometry taxonomy from editor-primitive contracts.
export type RuntimeOverlayPrimitiveKind = OverlayPrimitiveType

/**
 * Defines runtime overlay styling forwarded to engine canvas drawing.
 */
export interface RuntimeOverlayStyle {
  strokeColor?: string
  strokeWidth?: number
  strokeDash?: number[]
  fillColor?: string
  fillOpacity?: number
  blendMode?: string
  zIndex?: number
  nonScalingStroke?: boolean
  pointRadius?: number
  // Arc/sector start angle in degrees.
  startAngleDegrees?: number
  // Arc/sector end angle in degrees.
  endAngleDegrees?: number
  // Arc/sector inner radius in the current coordinate space.
  innerRadius?: number
  // Arc/sector outer radius in the current coordinate space.
  outerRadius?: number
}

/**
 * Defines one runtime overlay instruction bridging primitive and engine overlays.
 */
export interface RuntimeOverlayInstruction {
  /** Stores stable instruction id. */
  readonly id: string
  /** Stores logical overlay layer id for diagnostics/sorting. */
  readonly layerId: RuntimeOverlayLayerId
  /** Stores primitive renderer dispatch type. */
  readonly primitive: RuntimeOverlayPrimitiveKind
  /** Stores source coordinate space for geometry points. */
  readonly coordinate: OverlayCoordinateSpace
  /** Stores optional point geometry payload. */
  readonly points?: RuntimePoint[]
  /** Stores optional drawing style payload. */
  readonly style?: RuntimeOverlayStyle
  /** Stores optional hit-region semantic tag. */
  readonly hitRegion?: RuntimeOverlayHitRegion
  /** Stores optional cursor hint used by cursor resolver fallback paths. */
  readonly cursor?: CursorIntent
}

export const RUNTIME_OVERLAY_HIT_REGION = {
  selectionBounds: 'selection-bounds',
  marqueeBounds: 'marquee-bounds',
  hoverBounds: 'hover-bounds',
  pathSegment: 'path-segment',
  pathAnchor: 'path-anchor',
  pathHandleLink: 'path-handle-link',
  pathHandle: 'path-handle',
} as const

export type RuntimeOverlayHitRegionBase =
  (typeof RUNTIME_OVERLAY_HIT_REGION)[keyof typeof RUNTIME_OVERLAY_HIT_REGION]

export type RuntimeOverlayHitRegion = RuntimeOverlayHitRegionBase | `snap:${string}`

export function isPathOverlayHitRegion(hitRegion: string | undefined | null): boolean {
  return typeof hitRegion === 'string' && hitRegion.startsWith('path-')
}

export interface RuntimeOverlayBuildInput {
  readonly selectedBounds?: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  } | null
  readonly marqueeBounds?: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  } | null
  readonly hoveredShapeBounds?: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  } | null
  readonly hoveredShapePolygon?: RuntimePoint[] | null
  readonly snapGuides?: Array<{
    axis: 'x' | 'y'
    value: number
    kind?: string
  }>
  readonly canvasBounds?: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
}

export interface RuntimePathEditBuildInput {
  readonly activePathShapeId?: string
  readonly activePathAnchors: Array<{x: number; y: number}>
  readonly activePathHandleLinks: Array<{
    anchor: {x: number; y: number}
    handle: {x: number; y: number}
    handleType: 'inHandle' | 'outHandle'
    anchorIndex: number
  }>
  readonly highlightedSegment: {from: {x: number; y: number}; to: {x: number; y: number}} | null
  readonly highlightedCurvePoints?: Array<{x: number; y: number}> | null
  readonly activePathSubSelection: {
    hitType: 'anchorPoint' | 'segment' | 'inHandle' | 'outHandle'
    anchorPoint?: {index: number}
    handlePoint?: {anchorIndex: number}
  } | null
}

function toRectPolyline(bounds: {
  minX: number
  minY: number
  maxX: number
  maxY: number
}): RuntimePoint[] {
  return [
    {x: bounds.minX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.minY},
  ]
}

/**
 * Build runtime-owned overlay drawing instructions from interaction state.
 * This is a migration-safe contract so engine-side overlay rendering can
 * consume stable data without coupling to React SVG components.
 */
export function buildRuntimeOverlayInstructions(input: RuntimeOverlayBuildInput): RuntimeOverlayInstruction[] {
  const instructions: RuntimeOverlayInstruction[] = []

  if (input.selectedBounds) {
    instructions.push({
      id: 'selection-bounds',
      layerId: 'overlay.selection',
      primitive: 'polyline',
      coordinate: 'world',
      points: toRectPolyline(input.selectedBounds),
      style: {
        strokeColor: '#2563eb',
        strokeWidth: 1,
        nonScalingStroke: true,
      },
    })
  }

  if (input.marqueeBounds) {
    instructions.push({
      id: 'marquee-bounds',
      layerId: 'overlay.marquee',
      primitive: 'polyline',
      coordinate: 'world',
      points: toRectPolyline(input.marqueeBounds),
      style: {
        strokeColor: 'rgba(37, 99, 235, 0.95)',
        strokeWidth: 1,
        fillColor: 'rgba(37, 99, 235, 0.12)',
      },
      cursor: {type: 'crosshair'},
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.marqueeBounds,
    })
  }

  if (input.hoveredShapePolygon && input.hoveredShapePolygon.length >= 4) {
    instructions.push({
      id: 'hover-bounds',
      layerId: 'overlay.hover',
      primitive: 'polyline',
      coordinate: 'world',
      points: [...input.hoveredShapePolygon, input.hoveredShapePolygon[0]],
      style: {
        strokeColor: 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1,
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.hoverBounds,
      cursor: {type: 'move'},
    })
  } else if (input.hoveredShapeBounds) {
    instructions.push({
      id: 'hover-bounds',
      layerId: 'overlay.hover',
      primitive: 'polyline',
      coordinate: 'world',
      points: toRectPolyline(input.hoveredShapeBounds),
      style: {
        strokeColor: 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1,
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.hoverBounds,
      cursor: {type: 'move'},
    })
  }

  const canvasBounds = input.canvasBounds ?? {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
  }
  const snapGuides = input.snapGuides ?? []
  snapGuides.forEach((guide, index) => {
    if (guide.axis === 'x') {
      instructions.push({
        id: `snap-guide-x-${index}`,
        layerId: 'overlay.guides',
        primitive: 'line',
        coordinate: 'world',
        points: [
          {x: guide.value, y: canvasBounds.minY},
          {x: guide.value, y: canvasBounds.maxY},
        ],
        style: {
          strokeColor: 'rgba(251, 146, 60, 0.95)',
          strokeWidth: 1,
          strokeDash: [4, 4],
          nonScalingStroke: true,
        },
        hitRegion: guide.kind ? `snap:${guide.kind}` : undefined,
      })
      return
    }

    instructions.push({
      id: `snap-guide-y-${index}`,
      layerId: 'overlay.guides',
      primitive: 'line',
      coordinate: 'world',
      points: [
        {x: canvasBounds.minX, y: guide.value},
        {x: canvasBounds.maxX, y: guide.value},
      ],
      style: {
        strokeColor: 'rgba(251, 146, 60, 0.95)',
        strokeWidth: 1,
        strokeDash: [4, 4],
        nonScalingStroke: true,
      },
      hitRegion: guide.kind ? `snap:${guide.kind}` : undefined,
    })
  })

  return instructions
}

/**
 * Build path-edit overlay instructions from active path sub-selection state.
 */
export function buildRuntimePathEditInstructions(input: RuntimePathEditBuildInput): RuntimeOverlayInstruction[] {
  const instructions: RuntimeOverlayInstruction[] = []

  if (input.highlightedCurvePoints && input.highlightedCurvePoints.length >= 2) {
    instructions.push({
      id: `path-segment:${input.activePathShapeId ?? 'unknown'}`,
      layerId: 'overlay.handles',
      primitive: 'polyline',
      coordinate: 'world',
      points: input.highlightedCurvePoints,
      style: {
        strokeColor: 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1.5,
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.pathSegment,
      cursor: {type: 'crosshair'},
    })
  }

  if (input.highlightedSegment) {
    instructions.push({
      id: `path-segment:${input.activePathShapeId ?? 'unknown'}`,
      layerId: 'overlay.handles',
      primitive: 'line',
      coordinate: 'world',
      points: [input.highlightedSegment.from, input.highlightedSegment.to],
      style: {
        strokeColor: 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1.5,
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.pathSegment,
      cursor: {type: 'crosshair'},
    })
  }

  input.activePathAnchors.forEach((anchor, index) => {
    const selected =
      input.activePathSubSelection?.hitType === 'anchorPoint' &&
      input.activePathSubSelection.anchorPoint?.index === index
    instructions.push({
      id: `path-anchor:${input.activePathShapeId ?? 'unknown'}:${index}`,
      layerId: 'overlay.handles',
      primitive: 'handle',
      coordinate: 'world',
      points: [anchor],
      style: {
        strokeColor: selected ? '#ffffff' : 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1,
        fillColor: selected ? '#2563eb' : '#ffffff',
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.pathAnchor,
      cursor: {type: 'crosshair'},
    })
  })

  input.activePathHandleLinks.forEach((link) => {
    const selected =
      input.activePathSubSelection?.hitType === link.handleType &&
      input.activePathSubSelection.handlePoint?.anchorIndex === link.anchorIndex

    instructions.push({
      id: `path-handle-link:${input.activePathShapeId ?? 'unknown'}:${link.anchorIndex}:${link.handleType}`,
      layerId: 'overlay.handles',
      primitive: 'line',
      coordinate: 'world',
      points: [link.anchor, link.handle],
      style: {
        strokeColor: 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1,
        strokeDash: [3, 2],
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.pathHandleLink,
      cursor: {type: 'crosshair'},
    })

    instructions.push({
      id: `path-handle:${input.activePathShapeId ?? 'unknown'}:${link.anchorIndex}:${link.handleType}`,
      layerId: 'overlay.handles',
      primitive: 'handle',
      coordinate: 'world',
      points: [link.handle],
      style: {
        strokeColor: 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1,
        fillColor: selected ? '#2563eb' : '#ffffff',
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.pathHandle,
      cursor: {type: 'crosshair'},
    })
  })

  return instructions
}
