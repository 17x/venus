import type { ComponentType } from 'react'
import type { EditorDocument } from '@venus/document-core'
import type {CanvasViewportState} from '@venus/runtime'
import type { SceneShapeSnapshot, SceneStats } from '@venus/shared-memory'
import type { CanvasRenderLodLevel } from './lod.ts'

/**
 * Contract implemented by renderer packages.
 *
 * The renderer only needs immutable scene data and the resolved viewport
 * transform. Pointer handling, wheel gestures, and runtime orchestration stay
 * in `@venus/runtime`.
 */
export interface CanvasRendererProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  // Render quality lets the viewport trade detail for responsiveness during
  // high-frequency interactions like wheel zoom.
  renderQuality?: 'full' | 'interactive'
  lodLevel?: CanvasRenderLodLevel
}

export interface CanvasOverlayProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
}

/**
 * Renderer components are pure views over scene snapshot data.
 */
export type CanvasRenderer = ComponentType<CanvasRendererProps>
export type CanvasOverlayRenderer = ComponentType<CanvasOverlayProps>
