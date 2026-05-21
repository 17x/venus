import type {
  EngineViewportAnchor,
  EngineViewportFacade,
  EngineViewportPatch,
  EngineViewportState,
} from "../../view/viewportFacade";

/**
 * Declares one core-owned viewport module contract.
 */
export interface EngineViewModule {
  /**
   * Creates one viewport facade bound to external state accessors.
   */
  createViewportFacade: (options: {
    /** Reads current viewport state. */
    getViewportState: () => EngineViewportState;
    /** Commits next viewport state. */
    setViewportState: (next: EngineViewportState) => void;
  }) => EngineViewportFacade;
  /**
   * Resolves normalized viewport state from one partial patch.
   */
  resolveViewportState: (
    current: EngineViewportState,
    patch: EngineViewportPatch,
  ) => EngineViewportState;
  /**
   * Applies pan delta to current viewport state.
   */
  panViewportState: (
    current: EngineViewportState,
    deltaX: number,
    deltaY: number,
  ) => EngineViewportState;
  /**
   * Applies zoom around anchor to current viewport state.
   */
  zoomViewportState: (
    current: EngineViewportState,
    nextScale: number,
    anchor: EngineViewportAnchor,
  ) => EngineViewportState;
}
