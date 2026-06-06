import type * as React from 'react'
import {type EditorDocument} from '../../model/index.ts'
import type {CanvasViewportState as EngineViewportState, RuntimeEditingMode} from '../../index.ts'
import type {SceneShapeSnapshot, SceneStats} from '../../shared-memory/index.ts'
import type {ViewportGestureBindingOptions} from '../../interaction/index.ts'
import type {EngineOverlayDrawNode} from '../engine.ts'

// Keep runtime render phase vocabulary local to the bridge so engine quality
// policy can evolve internally without exposing tuning contracts here.
export type RuntimeRenderPhase =
  | 'static'
  | 'pan'
  | 'zoom'
  | 'drag'
  | 'precision'
  | 'settled'

export interface OverlayDiagnostics {
  degraded: boolean
  guideInputCount: number
  guideKeptCount: number
  guideDroppedCount: number
  guideSelectionStrategy: 'full' | 'axis-first' | 'axis-relevance'
  pathEditWhitelistActive: boolean
  projectionDiagnostics?: Array<{
    code: string
    nodeId: string
    source: string
    expectedBounds: {minX: number; minY: number; maxX: number; maxY: number}
    actualBounds: {minX: number; minY: number; maxX: number; maxY: number}
    tolerance: number
  }>
}

export interface EngineRendererProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: EngineViewportState
  // Signals whether runtime is in one continuous transform-preview session.
  transformPreviewActive?: boolean
  overlayNodes?: readonly EngineOverlayDrawNode[]
  protectedNodeIds?: readonly string[]
  overlayDiagnostics?: OverlayDiagnostics
  interactionPhase?: RuntimeRenderPhase
  viewportInteractionType?: 'pan' | 'zoom' | 'other'
}

export interface EngineOverlayProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: EngineViewportState
}

export type EngineRendererComponent = React.ComponentType<EngineRendererProps>
export type EngineOverlayRenderer = React.ComponentType<EngineOverlayProps>

export interface EngineViewportProps {
  document: EditorDocument
  renderer?: EngineRendererComponent
  overlayRenderer?: EngineOverlayRenderer
  cursor?: string
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: EngineViewportState
  // Signals whether runtime is in one continuous transform-preview session.
  transformPreviewActive?: boolean
  overlayNodes?: readonly EngineOverlayDrawNode[]
  protectedNodeIds?: readonly string[]
  overlayDiagnostics?: OverlayDiagnostics
  editingMode?: RuntimeEditingMode
  onPointerMove?: ViewportGestureBindingOptions['onPointerMove']
  onPointerDown?: ViewportGestureBindingOptions['onPointerDown']
  onPointerUp?: VoidFunction
  onPointerLeave?: VoidFunction
  onPointerCaptureLoss?: VoidFunction
  onViewportChange?: (viewport: EngineViewportState) => void
  onViewportPan?: (deltaX: number, deltaY: number) => void
  onViewportResize?: (width: number, height: number) => void
  onViewportZoom?: (nextScale: number, anchor?: {x: number; y: number}) => void
}
