/**
 * Viewport snapshot contract used by protocol surface/runtime boundaries.
 */
export interface EngineProtocolViewportSnapshot {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Horizontal world-space offset. */
  offsetX: number;
  /** Vertical world-space offset. */
  offsetY: number;
  /** View-to-world scale factor. */
  scale: number;
}

/**
 * Viewport boundary contract used by runtime planning and interaction modules.
 */
export interface EngineViewportPort {
  /** Returns current viewport snapshot. */
  getViewport: () => EngineProtocolViewportSnapshot;
  /** Commits one next viewport snapshot. */
  setViewport: (next: EngineProtocolViewportSnapshot) => void;
}
