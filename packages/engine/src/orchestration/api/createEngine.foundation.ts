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
  type EngineDocumentNodeSemantic3D,
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
  const semantic3d = resolveDocumentNodeSemantic3DFromGraphNode(node);
  return {
    id: node.id,
    kind: resolveDocumentNodeKindFromGraphNode(node),
    parentId: typeof node.parentId === "string" ? node.parentId : undefined,
    payload: resolveDocumentNodePayloadFromGraphNode(node),
    ...(semantic3d ? { semantic3d } : {}),
  };
}

/**
 * Resolves one optional 3D semantic envelope from graph-node input payload.
 * @param node Graph node payload received from public setGraph/updateGraph APIs.
 */
export function resolveDocumentNodeSemantic3DFromGraphNode(
  node: EngineGraphNodeInput,
): EngineDocumentNodeSemantic3D | undefined {
  const semanticInput = (
    node.semantic3d && typeof node.semantic3d === "object"
      ? node.semantic3d as Readonly<Record<string, unknown>>
      : null
  );

  const boundsX = resolveFiniteNumber(
    semanticInput?.boundsX ?? semanticInput?.x ?? node.x,
    0,
  );
  const boundsY = resolveFiniteNumber(
    semanticInput?.boundsY ?? semanticInput?.y ?? node.y,
    0,
  );
  const boundsZ = resolveFiniteNumber(
    semanticInput?.boundsZ ?? semanticInput?.z ?? node.z,
    0,
  );
  const boundsWidth = Math.abs(resolveFiniteNumber(
    semanticInput?.boundsWidth ?? semanticInput?.width ?? node.width,
    0,
  ));
  const boundsHeight = Math.abs(resolveFiniteNumber(
    semanticInput?.boundsHeight ?? semanticInput?.height ?? node.height,
    0,
  ));
  const boundsDepth = Math.abs(resolveFiniteNumber(
    semanticInput?.boundsDepth ?? semanticInput?.depth ?? node.depth,
    0,
  ));

  const transformX = resolveFiniteNumber(
    semanticInput?.transformX ?? semanticInput?.x ?? node.x,
    boundsX,
  );
  const transformY = resolveFiniteNumber(
    semanticInput?.transformY ?? semanticInput?.y ?? node.y,
    boundsY,
  );
  const transformZ = resolveFiniteNumber(
    semanticInput?.transformZ ?? semanticInput?.z ?? node.z,
    boundsZ,
  );
  const rotationX = resolveFiniteNumber(
    semanticInput?.rotationX ?? node.rotationX,
    0,
  );
  const rotationY = resolveFiniteNumber(
    semanticInput?.rotationY ?? node.rotationY,
    0,
  );
  const rotationZ = resolveFiniteNumber(
    semanticInput?.rotationZ ?? node.rotationZ,
    0,
  );
  const scaleX = resolveFiniteNumber(
    semanticInput?.scaleX ?? node.scaleX,
    1,
  );
  const scaleY = resolveFiniteNumber(
    semanticInput?.scaleY ?? node.scaleY,
    1,
  );
  const scaleZ = resolveFiniteNumber(
    semanticInput?.scaleZ ?? node.scaleZ,
    1,
  );
  const sourceType = typeof semanticInput?.sourceType === "string"
    ? semanticInput.sourceType
    : typeof node.type === "string"
      ? node.type
      : undefined;
  const renderOrderValue = semanticInput?.renderOrder ?? node.renderOrder ?? node.layer;
  const renderOrder = typeof renderOrderValue === "number" && Number.isFinite(renderOrderValue)
    ? renderOrderValue
    : undefined;
  const visible = typeof semanticInput?.visible === "boolean"
    ? semanticInput.visible
    : typeof node.visible === "boolean"
      ? node.visible
      : undefined;
  const lightingMode = semanticInput?.lightingMode === "inherit" || semanticInput?.lightingMode === "unlit" || semanticInput?.lightingMode === "lit"
    ? semanticInput.lightingMode
    : node.lightingMode === "inherit" || node.lightingMode === "unlit" || node.lightingMode === "lit"
      ? node.lightingMode
      : undefined;
  const materialId = typeof semanticInput?.materialId === "string"
    ? semanticInput.materialId
    : typeof node.materialId === "string"
      ? node.materialId
      : undefined;

  const hasMeaningfulSemantic =
    boundsWidth > 0 ||
    boundsHeight > 0 ||
    boundsDepth > 0 ||
    renderOrder !== undefined ||
    sourceType !== undefined ||
    visible !== undefined ||
    lightingMode !== undefined ||
    materialId !== undefined;

  if (!hasMeaningfulSemantic) {
    return undefined;
  }

  return {
    bounds: {
      x: boundsX,
      y: boundsY,
      z: boundsZ,
      width: boundsWidth,
      height: boundsHeight,
      depth: boundsDepth,
    },
    transform: {
      x: transformX,
      y: transformY,
      z: transformZ,
      rotationX,
      rotationY,
      rotationZ,
      scaleX,
      scaleY,
      scaleZ,
    },
    sourceType,
    renderOrder,
    visible,
    lightingMode,
    materialId,
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
    backendSelectorModule: {
      resolveSelection: (input: CreateEngineOptions) =>
        ReturnType<typeof resolveBackendSelectionFromProtocol>,
    },
  diagnosticsHooks?: {
    /** Optional canvas2d present telemetry hooks injected by orchestration diagnostics. */
    canvas2d?: Pick<Canvas2DBackendAdapterHooks, "onPresentAttempt" | "onPresentSkipped" | "onPresentCommitted">;
    /** Optional noop present telemetry hooks injected by orchestration diagnostics. */
    noop?: Pick<NoopBackendAdapterHooks, "onPresentAttempt" | "onPresentCommitted" | "resolveNativeFramePayload" | "onBackendDiagnostics">;
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
        onPresentAttempt: diagnosticsHooks?.canvas2d?.onPresentAttempt,
        onPresentSkipped: diagnosticsHooks?.canvas2d?.onPresentSkipped,
        onPresentCommitted: diagnosticsHooks?.canvas2d?.onPresentCommitted,
      },
      noop: {
        onPresentAttempt: diagnosticsHooks?.noop?.onPresentAttempt,
        onPresentCommitted: diagnosticsHooks?.noop?.onPresentCommitted,
        resolveNativeFramePayload: diagnosticsHooks?.noop?.resolveNativeFramePayload,
        onBackendDiagnostics: diagnosticsHooks?.noop?.onBackendDiagnostics,
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
