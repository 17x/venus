/**
 * Canvas-like host target used by protocol surface contracts.
 */
export interface EngineProtocolCanvasTarget {
  /** Canvas width in device pixels. */
  width: number;
  /** Canvas height in device pixels. */
  height: number;
  /** Resolves one rendering context by context id. */
  getContext: (
    contextId: "2d" | "webgl" | "webgl2",
  ) => CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext | null;
}

/**
 * Surface snapshot contract used by protocol/backend boundaries.
 */
export interface EngineProtocolSurfaceSnapshot {
  /** Surface width in CSS pixels. */
  width: number;
  /** Surface height in CSS pixels. */
  height: number;
  /** Optional canvas-like host target. */
  canvas?: EngineProtocolCanvasTarget;
}

/**
 * Surface boundary contract consumed by backend adapters.
 */
export interface EngineSurfacePort {
  /** Returns current presentation surface snapshot. */
  getSurface: () => EngineProtocolSurfaceSnapshot;
  /** Commits one next presentation surface snapshot. */
  setSurface: (surface: EngineProtocolSurfaceSnapshot) => void;
}
