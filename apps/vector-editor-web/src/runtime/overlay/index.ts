import type { RuntimePoint } from '../types/index.ts'

export type RuntimeOverlayLayerId =
  | 'overlay.selection'
  | 'overlay.hover'
  | 'overlay.guides'
  | 'overlay.handles'
  | 'overlay.marquee'
  | 'preview.transform'
  | 'debug.hittest'
  | 'debug.spatial'

export type RuntimeOverlayPrimitiveKind =
  | 'line'
  | 'polyline'
  | 'polygon'
  | 'rect'
  | 'roundedRect'
  | 'circle'
  | 'ellipse'
  | 'arc'
  | 'bezier'
  | 'path'
  | 'handle'
  | 'text'
  | 'marker'
  | 'boundsBox'

export interface RuntimeOverlayStyle {
  strokeColor?: string
  strokeWidth?: number
  strokeDash?: number[]
  fillColor?: string
  fillOpacity?: number
  blendMode?: string
  zIndex?: number
  nonScalingStroke?: boolean
}

export interface RuntimeOverlayInstruction {
  readonly id: string
  readonly layerId: RuntimeOverlayLayerId
  readonly primitive: RuntimeOverlayPrimitiveKind
  readonly points?: RuntimePoint[]
  readonly style?: RuntimeOverlayStyle
  readonly hitRegion?: RuntimeOverlayHitRegion
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
      points: toRectPolyline(input.marqueeBounds),
      style: {
        strokeColor: 'rgba(37, 99, 235, 0.95)',
        strokeWidth: 1,
        fillColor: 'rgba(37, 99, 235, 0.12)',
      },
    })
  }

  if (input.hoveredShapeBounds) {
    instructions.push({
      id: 'hover-bounds',
      layerId: 'overlay.hover',
      primitive: 'polyline',
      points: toRectPolyline(input.hoveredShapeBounds),
      style: {
        strokeColor: 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1,
        nonScalingStroke: true,
      },
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

  if (input.highlightedSegment) {
    instructions.push({
      id: `path-segment:${input.activePathShapeId ?? 'unknown'}`,
      layerId: 'overlay.handles',
      primitive: 'line',
      points: [input.highlightedSegment.from, input.highlightedSegment.to],
      style: {
        strokeColor: 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1.5,
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.pathSegment,
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
      points: [anchor],
      style: {
        strokeColor: selected ? '#ffffff' : 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1,
        fillColor: selected ? '#2563eb' : '#ffffff',
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.pathAnchor,
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
      points: [link.anchor, link.handle],
      style: {
        strokeColor: 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1,
        strokeDash: [3, 2],
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.pathHandleLink,
    })

    instructions.push({
      id: `path-handle:${input.activePathShapeId ?? 'unknown'}:${link.anchorIndex}:${link.handleType}`,
      layerId: 'overlay.handles',
      primitive: 'handle',
      points: [link.handle],
      style: {
        strokeColor: 'rgba(14, 165, 233, 0.9)',
        strokeWidth: 1,
        fillColor: selected ? '#2563eb' : '#ffffff',
        nonScalingStroke: true,
      },
      hitRegion: RUNTIME_OVERLAY_HIT_REGION.pathHandle,
    })
  })

  return instructions
}
