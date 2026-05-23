import type { EngineSurface } from "../../orchestration/api/public-types";
import type { EngineBackend } from "../../backend/backend";
import { createNoopBackendAdapter } from "./noopBackendAdapter";

/**
 * Resolves whether current host reports WebGPU availability.
 * @param _surface Engine surface payload (unused for WebGPU global probe).
 */
export function canUseWebGPUBackendAdapter(_surface: EngineSurface): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return "gpu" in navigator && Boolean((navigator as { gpu?: unknown }).gpu);
}

/**
 * Creates one deterministic WebGPU adapter stub backend.
 */
export function createWebGPUBackendAdapter(): EngineBackend {
  return createNoopBackendAdapter("webgpu");
}
