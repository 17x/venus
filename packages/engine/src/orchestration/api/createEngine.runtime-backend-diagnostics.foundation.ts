import type {
  EngineDiagnosticsRuntimeCapability,
  EngineInvalidateInput,
  EngineRuntimeBackendCapabilitiesOutput,
  EngineRuntimeBackendFallbackTraceItem,
  EngineRuntimeBackendGetActiveOutput,
  EngineRuntimeBackendGetFallbackTraceOutput,
  EngineRuntimeBackendLimitsOutput,
  EngineRuntimeBackendProbeHeadlessOutput,
  EngineRuntimeBackendSelectInput,
  EngineRuntimeBackendSelectOutput,
} from "./public-types";
import {
  resolveEngineGeometryPayload,
  type EngineGeometryPayload,
  type ResolveEngineGeometryPayloadOptions,
} from "../../kernel/interaction/geometryPayload";
import {
  resolveEngineAdaptiveHitTolerance,
  type EngineAdaptiveHitTolerance,
  type ResolveEngineAdaptiveHitToleranceOptions,
} from "../../kernel/interaction/hitTolerance";
import {
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
  type BoxTransformSource,
  type ResolvedNodeTransform,
} from "../../kernel/interaction/shapeTransform";

/**
 * Defines dependencies required by runtime backend/diagnostics helper assembly.
 */
type RuntimeBackendDiagnosticsFoundationDependencies = {
  /** Resolves active backend runtime info. */
  getBackendInfo: () => {
    requested: "auto" | "webgpu" | "webgl" | "canvas2d" | "headless";
    resolved: "webgpu" | "webgl" | "canvas2d" | "headless";
    fallbackReason: string | null;
  };
  /** Resolves available backend modes. */
  getAvailableBackendModes: () => readonly ("auto" | "webgpu" | "webgl" | "canvas2d" | "headless")[];
  /** Resolves diagnostics snapshot consumed by public APIs. */
  resolveDiagnosticsSnapshot: () => {
    pixelRatio: number;
    outputPixelRatio: number;
    framePlan: {
      candidateNodeIds: readonly string[];
      candidateCount: number;
      sceneNodeCount: number;
      planVersion: number;
    };
    hitPlan: {
      planVersion: number;
      candidateCount: number;
      hitCount: number;
      exactCheckCount: number;
    };
    overlays: { count: number };
    invalidate: EngineInvalidateInput | null | undefined;
    capabilities: { schemaVersion: number; runtime: readonly EngineDiagnosticsRuntimeCapability[] };
  };
};

/**
 * Assembles backend capability, diagnostics, and geometry helper functions.
 * @param deps Shared state readers from createEngine closure.
 */
export function createRuntimeBackendDiagnosticsFoundation(
  deps: RuntimeBackendDiagnosticsFoundationDependencies,
): {
  resolvePublicDiagnostics: () => ReturnType<RuntimeBackendDiagnosticsFoundationDependencies["resolveDiagnosticsSnapshot"]>;
  resolveRuntimeBackendGetActiveOutput: () => EngineRuntimeBackendGetActiveOutput;
  resolveRuntimeBackendGetFallbackTraceOutput: () => EngineRuntimeBackendGetFallbackTraceOutput;
  selectRuntimeBackend: (input: EngineRuntimeBackendSelectInput) => EngineRuntimeBackendSelectOutput;
  resolveRuntimeBackendCapabilities: () => EngineRuntimeBackendCapabilitiesOutput;
  resolveRuntimeBackendLimits: () => EngineRuntimeBackendLimitsOutput;
  probeRuntimeHeadlessBackend: () => EngineRuntimeBackendProbeHeadlessOutput;
  createRuntimeHitGeometryPayload: (request: ResolveEngineGeometryPayloadOptions) => EngineGeometryPayload;
  resolveRuntimeHitTolerance: (options?: ResolveEngineAdaptiveHitToleranceOptions) => EngineAdaptiveHitTolerance;
  queryRuntimeNodeTransform: (source: BoxTransformSource) => ResolvedNodeTransform;
  formatRuntimeNodeSvgTransform: (transform: ResolvedNodeTransform) => string | undefined;
} {
  /**
   * Resolves one public diagnostics snapshot for runtime bridge/tooling callers.
   */
  function resolvePublicDiagnostics() {
    return deps.resolveDiagnosticsSnapshot();
  }

  /**
   * Returns active backend mode for current runtime session.
   */
  function resolveRuntimeBackendGetActiveOutput(): EngineRuntimeBackendGetActiveOutput {
    return {
      active: deps.getBackendInfo().resolved,
    };
  }

  /**
   * Returns deterministic fallback trace for current backend selection state.
   */
  function resolveRuntimeBackendGetFallbackTraceOutput(): EngineRuntimeBackendGetFallbackTraceOutput {
    const backendInfo = deps.getBackendInfo();
    const traceItem: EngineRuntimeBackendFallbackTraceItem = {
      requested: backendInfo.requested,
      resolved: backendInfo.resolved,
      reason: backendInfo.fallbackReason,
    };
    return {
      fallbackTrace: [traceItem],
    };
  }

  /**
   * Selects runtime backend preference and returns deterministic resolution snapshot.
   * @param input Runtime backend select request.
   */
  function selectRuntimeBackend(input: EngineRuntimeBackendSelectInput): EngineRuntimeBackendSelectOutput {
    const availableModes = deps.getAvailableBackendModes();
    const requested = input?.preference ?? "auto";
    const resolved = requested === "auto" || !availableModes.includes(requested)
      ? resolveRuntimeBackendGetActiveOutput().active
      : requested;
    return {
      requested,
      resolved,
    };
  }

  /**
   * Returns runtime capability switches for active backend mode.
   */
  function resolveRuntimeBackendCapabilities(): EngineRuntimeBackendCapabilitiesOutput {
    const active = resolveRuntimeBackendGetActiveOutput().active;
    return {
      compute: active !== "canvas2d",
      readback: true,
    };
  }

  /**
   * Returns runtime operational limits for active backend mode.
   */
  function resolveRuntimeBackendLimits(): EngineRuntimeBackendLimitsOutput {
    const active = resolveRuntimeBackendGetActiveOutput().active;
    if (active === "canvas2d") {
      return {
        maxTextureSize: 4096,
        maxCommandsPerSubmit: 1024,
      };
    }
    return {
      maxTextureSize: 16384,
      maxCommandsPerSubmit: 16384,
    };
  }

  /**
   * Probes whether headless backend mode is available in current host.
   */
  function probeRuntimeHeadlessBackend(): EngineRuntimeBackendProbeHeadlessOutput {
    return {
      supported: deps.getAvailableBackendModes().includes("headless"),
    };
  }

  /**
   * Creates unified hit geometry payload from runtime plan request.
   * @param request Geometry payload request with nodes/pointer/selection context.
   */
  function createRuntimeHitGeometryPayload(
    request: ResolveEngineGeometryPayloadOptions,
  ): EngineGeometryPayload {
    return resolveEngineGeometryPayload(request);
  }

  /**
   * Resolves adaptive hit tolerance from viewport/tuning options.
   * @param options Optional viewport and tuning options.
   */
  function resolveRuntimeHitTolerance(
    options?: ResolveEngineAdaptiveHitToleranceOptions,
  ): EngineAdaptiveHitTolerance {
    return resolveEngineAdaptiveHitTolerance(options);
  }

  /**
   * Resolves node transform metadata from source box fields.
   * @param source Raw source box transform fields.
   */
  function queryRuntimeNodeTransform(source: BoxTransformSource): ResolvedNodeTransform {
    return resolveNodeTransform(source);
  }

  /**
   * Formats resolved node transform metadata into SVG transform syntax.
   * @param transform Resolved node transform metadata.
   */
  function formatRuntimeNodeSvgTransform(transform: ResolvedNodeTransform): string | undefined {
    return toResolvedNodeSvgTransform(transform);
  }

  return {
    resolvePublicDiagnostics,
    resolveRuntimeBackendGetActiveOutput,
    resolveRuntimeBackendGetFallbackTraceOutput,
    selectRuntimeBackend,
    resolveRuntimeBackendCapabilities,
    resolveRuntimeBackendLimits,
    probeRuntimeHeadlessBackend,
    createRuntimeHitGeometryPayload,
    resolveRuntimeHitTolerance,
    queryRuntimeNodeTransform,
    formatRuntimeNodeSvgTransform,
  };
}
