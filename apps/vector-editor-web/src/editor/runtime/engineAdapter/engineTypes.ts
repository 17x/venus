import type * as React from 'react'
import {type EditorDocument} from '@vector/model'
import type {CanvasViewportState as EngineViewportState, RuntimeEditingMode} from '@vector/runtime'
import type {SceneShapeSnapshot, SceneStats} from '@vector/runtime/shared-memory'
import type {ViewportGestureBindingOptions} from '../../../runtime/interaction/index.ts'
import type {RuntimeLodConfig, RuntimeRenderPhase} from '../renderPolicy.ts'

export interface OverlayDiagnostics {
  degraded: boolean
  guideInputCount: number
  guideKeptCount: number
  guideDroppedCount: number
  guideSelectionStrategy: 'full' | 'axis-first' | 'axis-relevance'
  pathEditWhitelistActive: boolean
}

export interface EngineRendererProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: EngineViewportState
  protectedNodeIds?: readonly string[]
  overlayDiagnostics?: OverlayDiagnostics
  interactionPhase?: RuntimeRenderPhase
  viewportInteractionType?: 'pan' | 'zoom' | 'other'
  lodLevel?: 0 | 1 | 2 | 3
  lodConfig?: RuntimeLodConfig
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
  protectedNodeIds?: readonly string[]
  overlayDiagnostics?: OverlayDiagnostics
  editingMode?: RuntimeEditingMode
  onPointerMove?: ViewportGestureBindingOptions['onPointerMove']
  onPointerDown?: ViewportGestureBindingOptions['onPointerDown']
  onPointerUp?: VoidFunction
  onPointerLeave?: VoidFunction
  onViewportChange?: (viewport: EngineViewportState) => void
  onViewportPan?: (deltaX: number, deltaY: number) => void
  onViewportResize?: (width: number, height: number) => void
  onViewportZoom?: (nextScale: number, anchor?: {x: number; y: number}) => void
}

// Keep a single shared LOD profile preset for both viewport and renderer paths.
export const ENGINE_RENDER_LOD_CONFIG: RuntimeLodConfig & {
  enabled: boolean
  options: {
    mode: 'conservative'
  }
} = {
  enabled: false,
  options: {
    mode: 'conservative',
  },
  lodLevelCapabilities: {
    0: {
      quality: 'full',
      dpr: 'auto',
      interactiveIntervalMs: 8,
    },
    1: {
      quality: 'full',
      dpr: 'auto',
      interactiveIntervalMs: 10,
    },
    2: {
      quality: 'interactive',
      dpr: 1.25,
      interactiveIntervalMs: 12,
    },
    3: {
      quality: 'interactive',
      dpr: 1,
      interactiveIntervalMs: 16,
    },
  },
  interactionCapabilities: {
    pan: {
      quality: 'interactive',
      dpr: 'auto',
      interactionActive: true,
      interactiveIntervalMs: 8,
      interactionPreview: {
        enabled: true,
        mode: 'interaction',
        maxScaleStep: 1.2,
        maxTranslatePx: 220,
      },
    },
    zoom: {
      quality: 'interactive',
      dpr: 1.5,
      interactionActive: true,
      interactiveIntervalMs: 8,
      interactionPreview: {
        enabled: true,
        mode: 'interaction',
        maxScaleStep: 1.2,
        maxTranslatePx: 220,
      },
    },
    drag: {
      quality: 'interactive',
      interactionActive: true,
      interactionPreview: false,
    },
    precision: {
      quality: 'full',
      interactionActive: false,
      interactionPreview: false,
    },
  },
}
