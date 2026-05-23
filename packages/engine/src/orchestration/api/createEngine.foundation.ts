import type {
  EngineGraphNodeInput,
  EngineViewSnapshot,
} from "./public-types";
import type { EngineBackend } from "../../backend/backend";
import { resolveBackendSelectionFromProtocol } from "../../platform/protocol/backend/backend-selection";
import { resolveEngineBackendFromAdapters } from "../../backend/backendAdapterRegistry";
import type { Canvas2DBackendAdapterHooks } from "../../backend/adapters/canvas2dBackendAdapter";
import type { NoopBackendAdapterHooks } from "../../backend/adapters/noopBackendAdapter";
import {
  type CreateEngineOptions,
} from "./createEngineContracts";
import {
  type EngineDocumentNode,
  type EngineDocumentNodeKind,
  type EngineDocumentNodePayload,
} from "../../kernel/document/document-contracts";
import type { EngineIncrementalCompileOutput } from "../../kernel/compiler/incrementalCompiler";
import type { EngineSpatialQueryNode } from "../../kernel/spatial/spatialQuery/spatialQuery.contract";
import type { EngineRayPickCandidate } from "../../kernel/picking/hitTestRay/hitTestRay.contract";
import type { EngineDirtyDomain } from "../../kernel/dirty/dirtyPropagation/dirtyPropagation.contract";
import { browserPlatformRuntimeProfile } from "../../kernel/profiles/browser/browser-runtime-profile";
import { headlessRuntimeProfile } from "../../kernel/profiles/headless/headless-runtime-profile";

/**
 * Resolves one document node kind from graph-node input.
 * @param node Graph node payload received from public setGraph/updateGraph APIs.
 */
export function resolveDocumentNodeKindFromGraphNode(node: EngineGraphNodeInput): EngineDocumentNodeKind {
  if (node.kind === "group" || node.kind === "shape" || node.kind === "text" || node.kind === "image" || node.kind === "custom") {
    return node.kind;
  }
  const fallbackKind = typeof node.type === "string" ? node.type : "shape";
  if (fallbackKind === "group" || fallbackKind === "shape" || fallbackKind === "text" || fallbackKind === "image" || fallbackKind === "custom") {
    return fallbackKind;
  }
  return "shape";
}

/**
 * Resolves one document payload revision object from graph-node input payload.
 * @param node Graph node payload received from public setGraph/updateGraph APIs.
 */
export function resolveDocumentNodePayloadFromGraphNode(node: EngineGraphNodeInput): EngineDocumentNodePayload {
  const rawPayload = node.payload;
  return {
    transformRevision: typeof rawPayload?.transformRevision === "number" ? rawPayload.transformRevision : 1,
    geometryRevision: typeof rawPayload?.geometryRevision === "number" ? rawPayload.geometryRevision : 1,
    materialRevision: typeof rawPayload?.materialRevision === "number" ? rawPayload.materialRevision : 1,
    textRevision: typeof rawPayload?.textRevision === "number" ? rawPayload.textRevision : 1,
    visibilityRevision: typeof rawPayload?.visibilityRevision === "number" ? rawPayload.visibilityRevision : 1,
    pickingRevision: typeof rawPayload?.pickingRevision === "number" ? rawPayload.pickingRevision : 1,
    gpuUploadRevision: typeof rawPayload?.gpuUploadRevision === "number" ? rawPayload.gpuUploadRevision : 1,
  };
}

/**
 * Resolves one document node from graph-node input.
 * @param node Graph node payload received from public setGraph/updateGraph APIs.
 */
export function resolveDocumentNodeFromGraphNode(node: EngineGraphNodeInput): EngineDocumentNode {
  return {
    id: node.id,
    kind: resolveDocumentNodeKindFromGraphNode(node),
    parentId: typeof node.parentId === "string" ? node.parentId : undefined,
    payload: resolveDocumentNodePayloadFromGraphNode(node),
  };
}

/**
 * Resolves one public view snapshot from viewport state.
 * @param viewport Viewport state resolved by viewport facade.
 */
export function resolveViewSnapshotFromViewportState(viewport: {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}): EngineViewSnapshot {
  return {
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    offsetX: viewport.offsetX,
    offsetY: viewport.offsetY,
    scale: viewport.scale,
  };
}

/**
 * Resolves one finite numeric value from unknown input.
 * @param value Raw input value.
 * @param fallback Fallback value when input is not finite.
 */
export function resolveFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Resolves one spatial query node from raw graph node payload.
 * @param node Raw graph node payload tracked by createEngine graph state.
 */
export function resolveSpatialQueryNodeFromGraphNode(node: EngineGraphNodeInput): EngineSpatialQueryNode {
  const x = resolveFiniteNumber(node.x, 0);
  const y = resolveFiniteNumber(node.y, 0);
  const width = Math.abs(resolveFiniteNumber(node.width, 0));
  const height = Math.abs(resolveFiniteNumber(node.height, 0));
  return {
    id: node.id,
    x,
    y,
    width,
    height,
  };
}

/**
 * Resolves one ray-pick candidate from raw graph node payload.
 * @param node Raw graph node payload tracked by createEngine graph state.
 */
export function resolveRayPickCandidateFromGraphNode(node: EngineGraphNodeInput): EngineRayPickCandidate {
  const x = resolveFiniteNumber(node.x, 0);
  const y = resolveFiniteNumber(node.y, 0);
  const z = resolveFiniteNumber(node.z, 0);
  const width = Math.abs(resolveFiniteNumber(node.width, 0));
  const height = Math.abs(resolveFiniteNumber(node.height, 0));
  const depth = Math.abs(resolveFiniteNumber(node.depth, 0));
  return {
    id: node.id,
    minX: x,
    maxX: x + width,
    minY: y,
    maxY: y + height,
    minZ: z,
    maxZ: z + depth,
  };
}

/**
 * Resolves backend instance for the current createEngine invocation.
 * @param options Engine creation options with requested backend and surface.
 * @param backendSelectorModule Backend selector module instance used for deterministic selection.
 * @param diagnosticsHooks Optional adapter-level diagnostics hooks for present telemetry fan-out.
 */
export function resolveEngineBackend(
  options: CreateEngineOptions,
  backendSelectorModule: { resolveSelection: (input: CreateEngineOptions) => ReturnType<typeof resolveBackendSelectionFromProtocol> },
  diagnosticsHooks?: {
    /** Optional canvas2d present telemetry hooks injected by orchestration diagnostics. */
    canvas2d?: Pick<Canvas2DBackendAdapterHooks, "onPresentAttempt" | "onPresentSkipped" | "onPresentCommitted">;
    /** Optional noop present telemetry hooks injected by orchestration diagnostics. */
    noop?: Pick<NoopBackendAdapterHooks, "onPresentAttempt" | "onPresentCommitted">;
  },
): {
  backend: EngineBackend;
  backendSelection: ReturnType<typeof resolveBackendSelectionFromProtocol>;
} {
  const backendSelection = backendSelectorModule.resolveSelection(options);
  /**
   * Normalizes selector output to concrete adapter mode for strict backend adapter resolution.
   * @param mode Resolved selector mode that may still be typed as EngineBackendMode.
   */
  function normalizeResolvedBackendMode(mode: typeof backendSelection.resolved): "webgpu" | "webgl" | "canvas2d" | "headless" {
    if (mode === "auto") {
      // Keep runtime deterministic even if selector contract drifts and leaks auto mode.
      return "headless";
    }
    return mode;
  }
  const backend = resolveEngineBackendFromAdapters(
    normalizeResolvedBackendMode(backendSelection.resolved),
    {
      surface: options.surface,
      canvas2d: {
        drawFrame: options.canvas2d?.drawFrame,
        onPresentAttempt: diagnosticsHooks?.canvas2d?.onPresentAttempt,
        onPresentSkipped: diagnosticsHooks?.canvas2d?.onPresentSkipped,
        onPresentCommitted: diagnosticsHooks?.canvas2d?.onPresentCommitted,
      },
      noop: {
        onPresentAttempt: diagnosticsHooks?.noop?.onPresentAttempt,
        onPresentCommitted: diagnosticsHooks?.noop?.onPresentCommitted,
      },
    },
  );
  return {
    backend,
    backendSelection,
  };
}

/**
 * Resolves the runtime profile selected for one createEngine invocation.
 * @param backendSelection Backend selection metadata resolved for this engine instance.
 */
export function resolveCreateEngineRuntimeProfile(backendSelection: {
  resolved: string;
}) {
  if (backendSelection.resolved === "headless") {
    return headlessRuntimeProfile;
  }
  return browserPlatformRuntimeProfile;
}

/**
 * Returns a monotonic timestamp in milliseconds in browser and node hosts.
 */
export function performanceNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

/**
 * Resolves dirty domains from compiler invalidation summary.
 * @param compileOutput Incremental compiler output for one applied change-set.
 */
export function resolveDirtyDomainsFromCompileOutput(
  compileOutput: EngineIncrementalCompileOutput,
): readonly EngineDirtyDomain[] {
  const domains: EngineDirtyDomain[] = [];
  if (compileOutput.invalidation.transform) {
    domains.push("transform");
  }
  if (compileOutput.invalidation.geometry) {
    domains.push("geometry");
  }
  if (compileOutput.invalidation.material) {
    domains.push("material");
  }
  if (compileOutput.invalidation.visibility) {
    domains.push("visibility");
  }
  if (compileOutput.invalidation.picking) {
    domains.push("picking");
  }
  if (compileOutput.invalidation.gpuUpload) {
    domains.push("resource");
  }
  return domains;
}
