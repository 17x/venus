const MIN_VIEWPORT_SCALE = 0.0001;

/**
 * Canonical viewport state used by engine view/runtime coordination.
 */
export interface EngineViewportState {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Horizontal world-space offset. */
  offsetX: number;
  /** Vertical world-space offset. */
  offsetY: number;
  /** Scale factor mapping world space to viewport space. */
  scale: number;
}

/**
 * Anchor coordinates used when zooming around a viewport point.
 */
export interface EngineViewportAnchor {
  /** Anchor x coordinate in viewport pixels. */
  x: number;
  /** Anchor y coordinate in viewport pixels. */
  y: number;
}

/**
 * Viewport mutation options accepted by setViewport.
 */
export interface EngineViewportPatch {
  /** Optional replacement width. */
  width?: number;
  /** Optional replacement height. */
  height?: number;
  /** Optional replacement horizontal offset. */
  offsetX?: number;
  /** Optional replacement vertical offset. */
  offsetY?: number;
  /** Optional replacement scale. */
  scale?: number;
}

/**
 * Resolves a normalized viewport state from partial updates.
 * @param current Current viewport state.
 * @param patch Partial viewport updates to apply.
 */
export function resolveViewportState(
  current: EngineViewportState,
  patch: EngineViewportPatch,
): EngineViewportState {
  return {
    width: patch.width ?? current.width,
    height: patch.height ?? current.height,
    offsetX: patch.offsetX ?? current.offsetX,
    offsetY: patch.offsetY ?? current.offsetY,
      scale: Math.max(MIN_VIEWPORT_SCALE, patch.scale ?? current.scale),
  };
}

/**
 * Applies a pan delta to viewport offsets.
 * @param current Current viewport state.
 * @param deltaX Horizontal pan delta in world units.
 * @param deltaY Vertical pan delta in world units.
 */
export function panViewportState(
  current: EngineViewportState,
  deltaX: number,
  deltaY: number,
): EngineViewportState {
  return {
    ...current,
    offsetX: current.offsetX + deltaX,
    offsetY: current.offsetY + deltaY,
  };
}

/**
 * Applies zoom around an anchor while preserving anchor world position.
 * @param current Current viewport state.
 * @param nextScale Target scale factor.
 * @param anchor Anchor point in viewport pixels.
 */
export function zoomViewportState(
  current: EngineViewportState,
  nextScale: number,
  anchor: EngineViewportAnchor,
): EngineViewportState {
    const clampedScale = Math.max(MIN_VIEWPORT_SCALE, nextScale);
  const anchorWorldX = current.offsetX + anchor.x / current.scale;
  const anchorWorldY = current.offsetY + anchor.y / current.scale;

  return {
    ...current,
    scale: clampedScale,
    offsetX: anchorWorldX - anchor.x / clampedScale,
    offsetY: anchorWorldY - anchor.y / clampedScale,
  };
}

/**
 * Viewport facade contract used by runtime and interaction layers.
 */
export interface EngineViewportFacade {
  /** Returns current viewport snapshot. */
  getViewport: () => EngineViewportState;
  /** Applies partial viewport patch and returns updated state. */
  setViewport: (patch: EngineViewportPatch) => EngineViewportState;
  /** Applies pan delta and returns updated state. */
  panBy: (deltaX: number, deltaY: number) => EngineViewportState;
  /** Applies zoom around anchor and returns updated state. */
  zoomTo: (scale: number, anchor: EngineViewportAnchor) => EngineViewportState;
  /** Updates viewport dimensions and returns updated state. */
  resize: (width: number, height: number) => EngineViewportState;
}

/**
 * Creates viewport facade methods that mutate viewport state through one boundary.
 * @param options Accessors and mutators for viewport state.
 */
export function createViewportFacade(options: {
  /** Reads current viewport state. */
  getViewportState: () => EngineViewportState;
  /** Commits next viewport state. */
  setViewportState: (next: EngineViewportState) => void;
}): EngineViewportFacade {
  return {
    getViewport() {
      return options.getViewportState();
    },
    setViewport(patch) {
      const next = resolveViewportState(options.getViewportState(), patch);
      options.setViewportState(next);
      return next;
    },
    panBy(deltaX, deltaY) {
      const next = panViewportState(options.getViewportState(), deltaX, deltaY);
      options.setViewportState(next);
      return next;
    },
    zoomTo(scale, anchor) {
      const next = zoomViewportState(options.getViewportState(), scale, anchor);
      options.setViewportState(next);
      return next;
    },
    resize(width, height) {
      const next = resolveViewportState(options.getViewportState(), { width, height });
      options.setViewportState(next);
      return next;
    },
  };
}
