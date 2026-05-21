/**
 * Declares engine viewport-pan offset type through canonical interaction namespace.
 */
export type {
  ViewportPanOffset as EngineViewportPanOffset,
  ViewportPanOrigin as EngineViewportPanOrigin,
} from "@venus/lib/viewport";

/**
 * Re-exports pointer-pan origin creation through canonical interaction namespace.
 */
export { createViewportPanOrigin as createEngineViewportPanOrigin } from "@venus/lib/viewport";

/**
 * Re-exports wheel-pan accumulation through canonical interaction namespace.
 */
export { accumulateWheelPanOffset as accumulateEngineWheelPanOffset } from "@venus/lib/viewport";

/**
 * Re-exports pointer-pan accumulation through canonical interaction namespace.
 */
export { accumulatePointerPanOffset as accumulateEnginePointerPanOffset } from "@venus/lib/viewport";
