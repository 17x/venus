import {
  panEngineViewportState,
  resolveEngineViewportState,
  zoomEngineViewportState,
} from '../../interaction/viewport/viewport.ts'
import type { Engine } from './createEngineContracts.ts'

/**
 * Builds viewport/camera/interaction mutation facade methods.
 * @param options Viewport lifecycle and mutable context dependencies.
 * @returns Engine facade slice containing viewport and interaction mutation APIs.
 */
export function createEngineViewportFacade(options: {
  getViewport: () => Engine['setViewport'] extends (next: any) => infer R ? R : never
  setViewportState: (viewport: Engine['setViewport'] extends (next: any) => infer R ? R : never) => void
  stopCameraAnimationInternal: (commitTarget: boolean) => void
  startCameraAnimationInternal: Engine['startCameraAnimation']
  markInteractionMutation: (kind: 'set' | 'pan' | 'zoom') => void
  applyResizeSurface: Engine['resize']
  renderContext: {
    protectedNodeIds?: readonly string[]
    interactionActiveNodeIds?: readonly string[]
    overlayNodes?: readonly unknown[]
    loader?: unknown
    textShaper?: unknown
    dirtyRegions?: Array<{ zoomLevel?: number; bounds: { x: number; y: number; width: number; height: number } }>
  }
}) {
  return {
    /**
     * Handles setViewport.
     * @param next next parameter.
     */
    setViewport(next) {
      options.stopCameraAnimationInternal(false)
      options.markInteractionMutation('set')
      const viewport = options.getViewport()
      const nextViewport = resolveEngineViewportState({
        viewportWidth: next.viewportWidth ?? viewport.viewportWidth,
        viewportHeight: next.viewportHeight ?? viewport.viewportHeight,
        offsetX: next.offsetX ?? viewport.offsetX,
        offsetY: next.offsetY ?? viewport.offsetY,
        scale: next.scale ?? viewport.scale,
      })
      options.setViewportState(nextViewport)
      return nextViewport
    },
    /**
     * Handles panBy.
     * @param deltaX deltaX parameter.
     * @param deltaY deltaY parameter.
     */
    panBy(deltaX, deltaY) {
      options.stopCameraAnimationInternal(false)
      options.markInteractionMutation('pan')
      const nextViewport = panEngineViewportState(options.getViewport(), deltaX, deltaY)
      options.setViewportState(nextViewport)
      return nextViewport
    },
    /**
     * Handles zoomTo.
     * @param scale Scale value.
     * @param anchor anchor parameter.
     */
    zoomTo(scale, anchor) {
      options.stopCameraAnimationInternal(false)
      options.markInteractionMutation('zoom')
      const nextViewport = zoomEngineViewportState(options.getViewport(), scale, anchor)
      options.setViewportState(nextViewport)
      return nextViewport
    },
    /**
     * Handles startCameraAnimation.
     * @param target target parameter.
     * @param animationOptions animationOptions parameter.
     */
    startCameraAnimation(target, animationOptions) {
      options.startCameraAnimationInternal(target, animationOptions)
    },
    /**
     * Handles updateCameraAnimation.
     * @param target target parameter.
     * @param animationOptions animationOptions parameter.
     */
    updateCameraAnimation(target, animationOptions) {
      // Updates restart from the current viewport to keep pan/zoom targets
      // responsive to high-frequency input streams.
      options.startCameraAnimationInternal(target, animationOptions)
    },
    /**
     * Handles stopCameraAnimation.
     * @param stopOptions stopOptions parameter.
     */
    stopCameraAnimation(stopOptions) {
      options.stopCameraAnimationInternal(stopOptions?.commitTarget ?? true)
    },
    /**
     * Handles resize.
     * @param size size parameter.
     */
    resize(size) {
      options.markInteractionMutation('set')
      return options.applyResizeSurface(size)
    },
    /**
     * Handles setProtectedNodeIds.
     * @param nodeIds nodeIds parameter.
     */
    setProtectedNodeIds(nodeIds) {
      if (!nodeIds || nodeIds.length === 0) {
        options.renderContext.protectedNodeIds = undefined
        return
      }

      // Keep protected ids de-duplicated and stable for planner-side guards.
      options.renderContext.protectedNodeIds = Array.from(new Set(nodeIds))
    },
    /**
     * Handles setInteractionActiveNodeIds.
     * @param nodeIds Active node ids for editing-layer routing.
     */
    setInteractionActiveNodeIds(nodeIds) {
      if (!nodeIds || nodeIds.length === 0) {
        options.renderContext.interactionActiveNodeIds = undefined
        return
      }

      // Keep interaction ids de-duplicated so active/base split remains deterministic.
      options.renderContext.interactionActiveNodeIds = Array.from(new Set(nodeIds))
    },
    /**
     * Handles setOverlayNodes.
     * @param nodes nodes parameter.
     */
    setOverlayNodes(nodes) {
      if (!nodes || nodes.length === 0) {
        options.renderContext.overlayNodes = undefined
        return
      }

      // Keep one immutable snapshot so render loop reads stable overlay data.
      options.renderContext.overlayNodes = [...nodes]
    },
    /**
     * Handles setResourceLoader.
     * @param loader loader parameter.
     */
    setResourceLoader(loader) {
      options.renderContext.loader = loader
    },
    /**
     * Handles setTextShaper.
     * @param textShaper textShaper parameter.
     */
    setTextShaper(textShaper) {
      options.renderContext.textShaper = textShaper
    },
    /**
     * Handles markDirtyBounds.
     * @param bounds Bounds data.
     * @param zoomLevel zoomLevel parameter.
     */
    markDirtyBounds(bounds, zoomLevel) {
      if (bounds.width <= 0 || bounds.height <= 0) {
        return
      }

      options.renderContext.dirtyRegions = (options.renderContext.dirtyRegions ?? []).concat({
        zoomLevel,
        bounds,
      })
    },
  } satisfies Pick<
    Engine,
    | 'setViewport'
    | 'panBy'
    | 'zoomTo'
    | 'startCameraAnimation'
    | 'updateCameraAnimation'
    | 'stopCameraAnimation'
    | 'resize'
    | 'setProtectedNodeIds'
    | 'setInteractionActiveNodeIds'
    | 'setOverlayNodes'
    | 'setResourceLoader'
    | 'setTextShaper'
    | 'markDirtyBounds'
  >
}
