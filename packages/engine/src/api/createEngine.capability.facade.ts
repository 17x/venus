import type {
  EngineCapabilityApi,
  EngineDiagnosticsSnapshot,
  EnginePickOptions,
  EnginePickPointInput,
  EnginePickResult,
  EngineQueryBoundsInput,
  EngineQueryResult,
  EngineRayInput,
  EngineRaycastHit,
  EngineRaycastOptions,
  EngineRuntimeReplayOutput,
  EngineRuntimeReplayTokenOutput,
} from "./public-types";
import type {
  BoxTransformSource,
  ResolvedNodeTransform,
} from "../interaction/shapeTransform";
import type {
  ResolveEngineAdaptiveHitToleranceOptions,
  EngineAdaptiveHitTolerance,
} from "../interaction/hitTolerance";
import type {
  ResolveEngineGeometryPayloadOptions,
  EngineGeometryPayload,
} from "../interaction/geometryPayload";

/**
 * Builds capability namespace facade for the engine handle.
 * @param deps Capability dependency bridge backed by createEngine runtime closures.
 */
export function createEngineCapabilityFacade(deps: {
  queryRuntimeNodeTransform: (source: BoxTransformSource) => ResolvedNodeTransform;
  formatRuntimeNodeSvgTransform: (transform: ResolvedNodeTransform) => string | undefined;
  queryGraph: (query: EngineQueryBoundsInput) => EngineQueryResult;
  createRuntimeHitGeometryPayload: (request: ResolveEngineGeometryPayloadOptions) => EngineGeometryPayload;
  pickGraph: (point: EnginePickPointInput, options?: EnginePickOptions) => EnginePickResult;
  raycastGraph: (ray: EngineRayInput, options?: EngineRaycastOptions) => EngineRaycastHit | null;
  resolveRuntimeHitTolerance: (options?: ResolveEngineAdaptiveHitToleranceOptions) => EngineAdaptiveHitTolerance;
  resolvePublicDiagnostics: () => EngineDiagnosticsSnapshot;
  createRuntimeReplayToken: (scope: string) => EngineRuntimeReplayTokenOutput;
  replayRuntimeToken: (token: string) => EngineRuntimeReplayOutput;
}): EngineCapabilityApi {
  return {
    geometry: {
      computeNodeTransform: (source) => deps.queryRuntimeNodeTransform(source),
      formatNodeSvgTransform: (transform) => deps.formatRuntimeNodeSvgTransform(transform),
    },
    spatial: {
      query: (query) => deps.queryGraph(query),
      createHitGeometryPayload: (request) => deps.createRuntimeHitGeometryPayload(request),
    },
    picking: {
      pick: (point, pickOptions) => deps.pickGraph(point, pickOptions),
      raycast: (ray, raycastOptions) => deps.raycastGraph(ray, raycastOptions),
      getAdaptiveTolerance: (options) => deps.resolveRuntimeHitTolerance(options),
    },
    diagnostics: {
      getSummary: () => deps.resolvePublicDiagnostics(),
    },
    replay: {
      createToken: (scope) => deps.createRuntimeReplayToken(scope),
      validateToken: (token) => ({
        valid: typeof token === "string" && token.startsWith("replay-"),
      }),
      run: (token) => deps.replayRuntimeToken(token),
      export: (token) => ({
        token,
        accepted: typeof token === "string" && token.startsWith("replay-"),
      }),
    },
  };
}
