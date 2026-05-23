import type { EngineSurface } from "../../orchestration/api/public-types";
import type { EngineBackend } from "../../backend/backend";
import { createNoopBackendAdapter } from "./noopBackendAdapter";

/**
 * Resolves whether one surface can provide a WebGL context.
 * @param surface Engine surface that may carry a canvas-like target.
 */
export function canUseWebGLBackendAdapter(surface: EngineSurface): boolean {
  const canvas = surface.canvas;
  if (!canvas || typeof canvas.getContext !== "function") {
    return false;
  }

  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

/**
 * Creates one deterministic WebGL adapter stub backend.
 */
export function createWebGLBackendAdapter(): EngineBackend {
  return createNoopBackendAdapter("webgl");
}
