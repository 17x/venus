import type { ComponentType } from 'react'
import type { EditorDocument } from '@venus/document-core'
import type { SceneShapeSnapshot } from '@venus/shared-memory'
import type { CanvasViewportState } from '../viewport/types.ts'

/**
 * Contract implemented by renderer packages.
 *
 * The renderer only needs immutable scene data and the resolved viewport
 * transform. Pointer handling, wheel gestures, and runtime orchestration stay
 * in `canvas-base`.
 */
export interface CanvasRendererProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  viewport: CanvasViewportState
}

/**
 * Renderer components are pure views over scene snapshot data.
 */
export type CanvasRenderer = ComponentType<CanvasRendererProps>
