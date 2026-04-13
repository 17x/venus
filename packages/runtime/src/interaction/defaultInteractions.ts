import type {PointerState} from '@venus/shared-memory'
import {applyMatrixToPoint, type Point2D} from '../viewport/matrix.ts'
import type {CanvasViewportState} from '../viewport/types.ts'

export interface DefaultCanvasInteractionRuntime {
  postPointer: (
    type: 'pointermove' | 'pointerdown',
    pointer: PointerState,
    modifiers?: {shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean},
  ) => void
  clearHover: () => void
  setViewport: (viewport: CanvasViewportState) => void
  panViewport: (deltaX: number, deltaY: number) => void
  resizeViewport: (width: number, height: number) => void
  zoomViewport: (nextScale: number, anchor?: Point2D) => void
  viewport: CanvasViewportState
}

export interface CreateDefaultCanvasInteractionsOptions {
  getRuntime: () => DefaultCanvasInteractionRuntime
  onContextMenu?: (position: {x: number; y: number}) => void
}

export interface DefaultCanvasInteractions {
  onPointerMove: (pointer: PointerState) => void
  onPointerDown: (
    pointer: PointerState,
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
  ) => void
  onPointerUp: () => void
  onPointerLeave: () => void
  onViewportChange: (viewport: CanvasViewportState) => void
  onViewportPan: (deltaX: number, deltaY: number) => void
  onViewportResize: (width: number, height: number) => void
  onViewportZoom: (nextScale: number, anchor?: {x: number; y: number}) => void
  onContextMenu: (position: {x: number; y: number}) => void
}

/**
 * Pure interaction adapter factory used by app/runtime bridges.
 */
export function createDefaultCanvasInteractions(
  options: CreateDefaultCanvasInteractionsOptions,
): DefaultCanvasInteractions {
  return {
    onPointerMove: (pointer) => {
      options.getRuntime().postPointer('pointermove', pointer)
    },
    onPointerDown: (pointer, modifiers) => {
      options.getRuntime().postPointer('pointerdown', pointer, modifiers)
    },
    // Pointer-up is handled by higher-level drag/marquee/transform sessions.
    onPointerUp: () => {},
    onPointerLeave: () => {
      options.getRuntime().clearHover()
    },
    onViewportChange: (viewport) => {
      options.getRuntime().setViewport(viewport)
    },
    onViewportPan: (deltaX, deltaY) => {
      options.getRuntime().panViewport(deltaX, deltaY)
    },
    onViewportResize: (width, height) => {
      options.getRuntime().resizeViewport(width, height)
    },
    onViewportZoom: (nextScale, anchor) => {
      options.getRuntime().zoomViewport(nextScale, anchor)
    },
    onContextMenu: (position) => {
      const runtime = options.getRuntime()
      // Consumers expect world-space coordinates for menu actions.
      options.onContextMenu?.(applyMatrixToPoint(runtime.viewport.inverseMatrix, position))
    },
  }
}