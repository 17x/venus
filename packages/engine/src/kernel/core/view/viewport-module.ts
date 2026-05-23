import {
  createViewportFacade,
  panViewportState,
  resolveViewportState,
  zoomViewportState,
} from "../../view/viewportFacade";
import type { EngineViewModule } from "./view-module-contracts";

/**
 * Creates one core viewport module wrapper around canonical viewport behavior.
 */
export function createEngineViewModule(): EngineViewModule {
  return {
    /**
     * Creates one viewport facade through canonical view implementation.
     * @param options Accessors and mutators for viewport state.
     */
    createViewportFacade(options) {
      return createViewportFacade(options);
    },
    /**
     * Resolves normalized viewport state through canonical view implementation.
     * @param current Current viewport state.
     * @param patch Partial viewport updates to apply.
     */
    resolveViewportState(current, patch) {
      return resolveViewportState(current, patch);
    },
    /**
     * Applies pan delta through canonical view implementation.
     * @param current Current viewport state.
     * @param deltaX Horizontal pan delta in world units.
     * @param deltaY Vertical pan delta in world units.
     */
    panViewportState(current, deltaX, deltaY) {
      return panViewportState(current, deltaX, deltaY);
    },
    /**
     * Applies zoom around anchor through canonical view implementation.
     * @param current Current viewport state.
     * @param nextScale Target scale factor.
     * @param anchor Anchor point in viewport pixels.
     */
    zoomViewportState(current, nextScale, anchor) {
      return zoomViewportState(current, nextScale, anchor);
    },
  };
}
