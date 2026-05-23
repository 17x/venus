import { createEngineRuntimeShell } from "../../orchestration/runtime/engineRuntime";
import { createEngineRuntimeFacade } from "../../orchestration/render-runtime/runtimeFacade";
import type { CreateEngineOptions } from "./createEngineContracts";
import type { EngineRenderFrameStats } from "../../orchestration/render-runtime/runtimeFacade";
import type { EngineDocumentChangeSet } from "../../kernel/document/document-contracts";

/**
 * Defines dependencies required to seed bootstrap document state and wire runtime shell/facade.
 */
type BootstrapRuntimeFoundationDependencies = {
  /** Engine create options used for surface sizing and runtime shell wiring. */
  options: CreateEngineOptions;
  /** Resolved backend instance selected for this engine handle. */
  backend: Parameters<typeof createEngineRuntimeShell>[1];
  /** Backend selection metadata produced by backend resolver. */
  backendSelection: Parameters<typeof createEngineRuntimeShell>[2];
  /** Applies one document change set and compiles runtime projections. */
  applyDocumentAndCompile: (changeSet: EngineDocumentChangeSet) => void;
  /** Resolves one orchestrated frame at the provided timestamp. */
  resolveFrameOrchestration: (timestampMs: number) => EngineRenderFrameStats;
  /** Resolves monotonic timestamp in milliseconds. */
  resolveNow: () => number;
  /** Resolves latest frame stats for diagnostics facade snapshots. */
  getLatestFrameStats: () => EngineRenderFrameStats;
  /** Resolves current viewport state snapshot for diagnostics facade snapshots. */
  getViewport: () => { width: number; height: number; offsetX: number; offsetY: number; scale: number };
};

/**
 * Seeds default bootstrap graph state and assembles runtime shell/facade adapters.
 * @param deps Shared runtime wiring dependencies from createEngine closure.
 */
export function createEngineBootstrapRuntimeFoundation(
  deps: BootstrapRuntimeFoundationDependencies,
): {
  runtimeShell: ReturnType<typeof createEngineRuntimeShell>;
  runtimeFacade: ReturnType<typeof createEngineRuntimeFacade>;
} {
  // Seeds one bootstrap document so E2 contracts are exercised by default lifecycle flow.
  deps.applyDocumentAndCompile({
    id: "bootstrap-root-shape",
    operations: [
      {
        type: "upsert-node",
        node: {
          id: "root-shape",
          kind: "shape",
          payload: {
            transformRevision: 1,
            geometryRevision: 1,
            materialRevision: 1,
            visibilityRevision: 1,
            pickingRevision: 1,
            gpuUploadRevision: 1,
          },
        },
      },
    ],
  });

  // Primes staged planning resolver so create path already validates orchestration contracts.
  void deps.resolveFrameOrchestration(deps.resolveNow());

  deps.backend.resize(deps.options.surface);

  const runtimeShell = createEngineRuntimeShell(
    deps.options,
    deps.backend,
    deps.backendSelection,
    {
      onFrame: (timestampMs) => {
        void deps.resolveFrameOrchestration(timestampMs);
      },
    },
  );

  const runtimeFacade = createEngineRuntimeFacade({
    loop: {
      start: () => runtimeShell.start(),
      stop: () => runtimeShell.stop(),
      isRunning: () => runtimeShell.getStats().lifecycleState === "running",
    },
    render: {
      renderFrame: async () => deps.resolveFrameOrchestration(deps.resolveNow()),
      dispose: () => runtimeShell.dispose(),
    },
    diagnostics: {
      getDiagnostics: () => ({
        frame: deps.getLatestFrameStats(),
        viewport: deps.getViewport(),
      }),
    },
  });

  return {
    runtimeShell,
    runtimeFacade,
  };
}
