import type {
  EngineProtocolBackendMode,
  EngineProtocolResolvedBackendMode,
} from "./backend-mode";

/**
 * Minimal surface contract consumed by protocol backend selection.
 */
export interface EngineProtocolSurface {
  /** Surface width in CSS pixels. */
  width: number;
  /** Surface height in CSS pixels. */
  height: number;
  /** Optional canvas handle used for host capability probing. */
  canvas?: {
    /** Canvas width in device pixels. */
    width: number;
    /** Canvas height in device pixels. */
    height: number;
    /** Resolves rendering context for one requested context id. */
    getContext: (
      contextId: "2d" | "webgl" | "webgl2",
    ) => CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext | null;
  };
}

/**
 * Minimal create-options contract consumed by protocol backend selection.
 */
export interface EngineProtocolCreateOptions {
  /** Rendering surface used by capability probes. */
  surface: EngineProtocolSurface;
  /** Requested backend mode. */
  backend?: EngineProtocolBackendMode;
}

/**
 * Backend selection snapshot returned by protocol backend selection.
 */
export interface EngineProtocolBackendSelectionResult {
  /** Backend requested by caller. */
  requested: EngineProtocolBackendMode;
  /** Backend mode resolved for execution. */
  resolved: EngineProtocolBackendMode;
  /** Optional fallback reason when requested/resolved differ. */
  fallbackReason: string | null;
  /** Whether the resolved mode is treated as native execution. */
  nativeEligible: boolean;
}

/**
 * Declares one backend-eligibility probe consumed by protocol auto selector registry.
 */
export interface EngineBackendProbe {
  /** Backend mode this probe enables when available. */
  mode: EngineProtocolResolvedBackendMode;
  /** Returns true when current host/surface can run this backend mode. */
  canUse: (surface: EngineProtocolSurface) => boolean;
}

/**
 * Resolves whether current host reports WebGPU availability.
 * @param _surface Engine surface payload (unused for WebGPU global probe).
 */
function canUseWebGPUBackend(_surface: EngineProtocolSurface): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return "gpu" in navigator && Boolean((navigator as { gpu?: unknown }).gpu);
}

/**
 * Resolves whether one surface can provide a WebGL context.
 * @param surface Engine surface that may carry a canvas-like target.
 */
function canUseWebGLBackend(surface: EngineProtocolSurface): boolean {
  const canvas = surface.canvas;
  if (!canvas || typeof canvas.getContext !== "function") {
    return false;
  }
  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

/**
 * Resolves whether one surface can provide a Canvas2D context.
 * @param surface Engine surface that may carry a canvas-like target.
 */
function canUseCanvas2DBackend(surface: EngineProtocolSurface): boolean {
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
    { mode: "webgpu", canUse: canUseWebGPUBackend },
    { mode: "webgl", canUse: canUseWebGLBackend },
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
  surface: EngineProtocolSurface,
  probes: readonly EngineBackendProbe[],
): EngineProtocolResolvedBackendMode {
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
  options: EngineProtocolCreateOptions,
  probes: readonly EngineBackendProbe[] = createDefaultEngineBackendProbes(),
): EngineProtocolBackendSelectionResult {
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

/**
 * Resolves backend selection through protocol/backend boundary while preserving canonical selector behavior.
 * @param options Engine creation options provided by caller.
 * @param probes Optional ordered backend probe registry override.
 */
export function resolveBackendSelectionFromProtocol(
  options: EngineProtocolCreateOptions,
  probes: readonly EngineBackendProbe[] = createDefaultEngineBackendProbes(),
): EngineProtocolBackendSelectionResult {
  return resolveBackendSelection(options, probes);
}
