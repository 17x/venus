import type {
  BackendSelectionResult,
  EngineBackendMode,
  EngineCreateOptions,
  EngineSurface,
} from "../api/public-types";
import { canUseWebGLBackendAdapter } from "../adapters/backend/webglBackendAdapter";
import { canUseWebGPUBackendAdapter } from "../adapters/backend/webgpuBackendAdapter";

/**
 * Declares one backend-eligibility probe consumed by auto selector registry.
 */
export interface EngineBackendProbe {
  /** Backend mode this probe enables when available. */
  mode: Exclude<EngineBackendMode, "auto">;
  /** Returns true when current host/surface can run this backend mode. */
  canUse: (surface: EngineSurface) => boolean;
}

/**
 * Resolves whether one surface can provide a Canvas2D context.
 * @param surface Engine surface that may carry a canvas-like target.
 */
function canUseCanvas2DBackend(surface: EngineSurface): boolean {
  const canvas = surface.canvas;
  if (!canvas || typeof canvas.getContext !== "function") {
    return false;
  }

  return Boolean(canvas.getContext("2d"));
}

/**
 * Returns default backend probe registry in architecture-priority order.
 */
export function createDefaultEngineBackendProbes(): readonly EngineBackendProbe[] {
  return [
    { mode: "webgpu", canUse: canUseWebGPUBackendAdapter },
    { mode: "webgl", canUse: canUseWebGLBackendAdapter },
    { mode: "canvas2d", canUse: canUseCanvas2DBackend },
    {
      mode: "headless",
      canUse: () => true,
    },
  ];
}

/**
 * Resolves one backend mode from ordered registry probes.
 * @param surface Engine surface passed into backend selector.
 * @param probes Ordered backend probes where first eligible mode wins.
 */
export function resolveAutoBackendMode(
  surface: EngineSurface,
  probes: readonly EngineBackendProbe[],
): Exclude<EngineBackendMode, "auto"> {
  for (const probe of probes) {
    if (probe.canUse(surface)) {
      return probe.mode;
    }
  }
  return "headless";
}

/**
 * Resolves backend selection with explicit fallback metadata and probe registry.
 * @param options Engine creation options provided by caller.
 * @param probes Optional ordered backend probe registry override for deterministic tests.
 */
export function resolveBackendSelection(
  options: EngineCreateOptions,
  probes: readonly EngineBackendProbe[] = createDefaultEngineBackendProbes(),
): BackendSelectionResult {
  const requested = options.backend ?? "auto";
  if (requested === "auto") {
    const resolved = resolveAutoBackendMode(options.surface, probes);
    return {
      requested,
      resolved,
      fallbackReason: `auto-priority-${resolved}`,
      nativeEligible: true,
    };
  }
  return {
    requested,
    resolved: requested,
    fallbackReason: null,
    nativeEligible: requested !== "canvas2d",
  };
}
