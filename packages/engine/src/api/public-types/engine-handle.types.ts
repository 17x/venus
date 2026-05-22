import type {
  BackendSelectionResult,
  EngineBackendMode,
  EngineDiagnosticsSnapshot,
  EngineGraphInput,
  EngineGraphPatchInput,
  EngineInvalidateInput,
  EnginePickOptions,
  EnginePickPointInput,
  EnginePickResult,
  EngineQueryBoundsInput,
  EngineQueryResult,
  EngineRayInput,
  EngineRaycastHit,
  EngineRaycastOptions,
  EngineRenderResult,
  EngineStatsSnapshot,
  EngineViewInput,
  EngineViewSnapshot,
} from "./core-foundation.types";
import type {
  EngineAssetStateOutput,
  EngineAssetStatsOutput,
  EngineCacheApi,
  EngineCaptureImageOutput,
  EngineCaptureVideoFrameOutput,
  EngineEventListener,
  EngineEventsApi,
  EngineExtensionApi,
  EngineGraphValidationOutput,
  EngineHeadlessRenderOutput,
  EngineHeadlessSessionDestroyOutput,
  EngineHeadlessSessionOutput,
  EngineHooksApi,
  EngineLassoInput,
  EnginePoint2,
  EnginePolicyApi,
  EnginePublicCapabilitiesOutput,
  EnginePublicMetricsOutput,
  EngineRectInput,
  EngineSchedulerApi,
  EngineSecurityApi,
} from "./facade-extensions.types";
import type { EngineCapabilityApi, EngineRuntimeApi } from "./runtime-capability.types";
import type {
  EngineRuntimeReplayOutput,
  EngineRuntimeReplayTokenOutput,
} from "./runtime-services.types";

export interface EngineHandle {
  /** Waits until engine runtime is ready for external API calls. */
  ready: () => Promise<void>;
  /** Mounts engine output to one host target. */
  mount: (target: unknown) => void;
  /** Unmounts engine output from current host target. */
  unmount: () => void;
  /** Applies developer-level config overrides. */
  configure: (options: Readonly<Record<string, unknown>>) => void;
  /** Returns current developer-level config snapshot. */
  getConfig: () => Readonly<Record<string, unknown>>;
  /** Resets developer-level config state for one optional scope token. */
  resetConfig: (scope?: string) => void;
  /**
   * Starts frame processing.
   */
  start: () => void;
  /**
   * Stops frame processing.
   */
  stop: () => void;
  /**
   * Pauses frame processing without disposing resources.
   */
  pause: () => void;
  /**
   * Resumes frame processing from paused state.
   */
  resume: () => void;
  /**
   * Resizes the engine surface.
   */
  resize: (width: number, height: number) => void;
  /**
   * Sets a full graph snapshot as runtime document source.
   */
  setGraph: (graph: EngineGraphInput) => void;
  /**
   * Applies an incremental graph patch batch.
   */
  updateGraph: (patch: EngineGraphPatchInput) => void;
  /** Applies a batch of incremental graph patches. */
  batchUpdateGraph: (patches: readonly EngineGraphPatchInput[]) => void;
  /** Returns current graph snapshot tracked by engine facade. */
  getGraph: () => EngineGraphInput;
  /** Clears all graph nodes from current engine session. */
  clearGraph: () => void;
  /** Validates graph payload against minimal runtime contract checks. */
  validateGraph: (graph: EngineGraphInput) => EngineGraphValidationOutput;
  /** Normalizes graph payload to deterministic node ordering. */
  normalizeGraph: (input: EngineGraphInput) => EngineGraphInput;
  /** Imports graph payload and applies it to current engine session. */
  importGraph: (payload: unknown, options?: Readonly<Record<string, unknown>>) => EngineGraphInput;
  /** Exports current graph payload with optional export options. */
  exportGraph: (options?: Readonly<Record<string, unknown>>) => EngineGraphInput;
  /**
   * Queries graph nodes intersecting one world-space bounds payload.
   */
  query: (bounds: EngineQueryBoundsInput) => EngineQueryResult;
  /**
   * Resolves deterministic point hits against current graph bounds.
   */
  pick: (point: EnginePickPointInput, options?: EnginePickOptions) => EnginePickResult;
  /**
   * Resolves nearest 3D ray hit against current graph bounds.
   */
  raycast: (ray: EngineRayInput, options?: EngineRaycastOptions) => EngineRaycastHit | null;
  /**
   * Renders one frame on demand and returns stable frame metrics.
   */
  render: () => Promise<EngineRenderResult>;
  /** Renders one frame immediately with optional request payload. */
  renderNow: (request?: Readonly<Record<string, unknown>>) => Promise<EngineRenderResult>;
  /**
   * Applies viewport state updates.
   */
  setView: (view: EngineViewInput) => EngineViewSnapshot;
  /** Returns current viewport state snapshot. */
  getView: () => EngineViewSnapshot;
  /** Fits viewport to one world-space bounds payload. */
  fitToBounds: (
    bounds: EngineQueryBoundsInput,
    options?: Readonly<Record<string, unknown>>,
  ) => EngineViewSnapshot;
  /** Resets viewport state to deterministic defaults. */
  resetView: (options?: Readonly<Record<string, unknown>>) => EngineViewSnapshot;
  /** Sets current multi-viewport layout payload. */
  setViewportLayout: (layout: unknown) => void;
  /** Returns current multi-viewport layout payload. */
  getViewportLayout: () => unknown;
  /** Converts one screen point to world point using current viewport transform. */
  screenToWorld: (point: EnginePoint2, options?: Readonly<Record<string, unknown>>) => EnginePoint2;
  /** Converts one world point to screen point using current viewport transform. */
  worldToScreen: (point: EnginePoint2, options?: Readonly<Record<string, unknown>>) => EnginePoint2;
  /** Sets quality profile token consumed by runtime orchestration. */
  setQuality: (profile: string) => void;
  /** Returns current quality profile token. */
  getQuality: () => string;
  /** Sets frame budget in milliseconds. */
  setFrameBudget: (budget: number) => void;
  /** Returns current frame budget in milliseconds. */
  getFrameBudget: () => number;
  /**
   * Sets overlay nodes consumed by overlay runtime channels.
   */
  setOverlays: (overlays: readonly unknown[]) => void;
  /** Appends overlay nodes to current overlay set. */
  appendOverlays: (overlays: readonly unknown[]) => void;
  /** Updates one overlay by id with patch payload. */
  updateOverlay: (overlayId: string, patch: Readonly<Record<string, unknown>>) => void;
  /** Removes one overlay by id. */
  removeOverlay: (overlayId: string) => void;
  /** Clears overlays for one optional scope token. */
  clearOverlays: (scope?: string) => void;
  /** Sets transform preview payload consumed by interaction tooling. */
  setTransformPreview: (preview: unknown) => void;
  /** Clears transform preview payload. */
  clearTransformPreview: () => void;
  /** Sets annotation payload collection. */
  setAnnotations: (annotations: readonly unknown[]) => void;
  /** Clears annotation payload collection for one optional scope token. */
  clearAnnotations: (scope?: string) => void;
  /**
   * Marks runtime state dirty for one optional reason/region payload.
   */
  invalidate: (input?: EngineInvalidateInput) => void;
  /** Resolves deterministic rect-pick hits for current graph state. */
  pickRect: (rect: EngineRectInput, options?: EnginePickOptions) => EnginePickResult;
  /** Resolves deterministic lasso-pick hits for current graph state. */
  pickLasso: (lasso: EngineLassoInput, options?: EnginePickOptions) => EnginePickResult;
  /** Resolves deterministic frustum query for current graph state. */
  queryFrustum: (
    frustum: Readonly<Record<string, unknown>>,
    options?: Readonly<Record<string, unknown>>,
  ) => EngineQueryResult;
  /** Sets interaction state payload consumed by runtime planner. */
  setInteractionState: (state: Readonly<Record<string, unknown>>) => void;
  /** Clears interaction state for one optional scope token. */
  clearInteractionState: (scope?: string) => void;
  /** Loads assets into current engine session. */
  loadAssets: (assets: readonly { id: string }[]) => readonly EngineAssetStateOutput[];
  /** Preloads assets into current engine session. */
  preloadAssets: (request: readonly { id: string }[]) => readonly EngineAssetStateOutput[];
  /** Unloads assets from current engine session. */
  unloadAssets: (assetIds: readonly string[]) => readonly EngineAssetStateOutput[];
  /** Returns state for one asset id. */
  getAssetState: (assetId: string) => EngineAssetStateOutput;
  /** Returns aggregate asset stats. */
  getAssetStats: () => EngineAssetStatsOutput;
  /** Sets media source payload list for runtime consumption. */
  setMediaSources: (sources: readonly unknown[]) => void;
  /** Seeks active media timeline to one timestamp. */
  seekMedia: (time: number) => void;
  /** Captures one image payload from current frame state. */
  captureImage: (options?: Readonly<Record<string, unknown>>) => EngineCaptureImageOutput;
  /** Captures one video-frame payload from current frame state. */
  captureVideoFrame: (
    options?: Readonly<Record<string, unknown>>,
  ) => EngineCaptureVideoFrameOutput;
  /** Sets preferred backend mode token for future backend selection operations. */
  setBackendPreference: (preference: EngineBackendMode) => void;
  /** Returns public capability snapshot. */
  getCapabilities: () => EnginePublicCapabilitiesOutput;
  /** Creates one headless render session. */
  createHeadlessSession: (
    options?: Readonly<Record<string, unknown>>,
  ) => EngineHeadlessSessionOutput;
  /** Destroys one headless render session by id. */
  destroyHeadlessSession: (sessionId: string) => EngineHeadlessSessionDestroyOutput;
  /** Executes one headless render and returns deterministic summary. */
  renderHeadless: (request?: Readonly<Record<string, unknown>>) => Promise<EngineHeadlessRenderOutput>;
  /** Returns events namespace API for deterministic subscription control. */
  events: EngineEventsApi;
  /** Returns hooks namespace API for stage-based lifecycle extension points. */
  hooks: EngineHooksApi;
  /** Returns extension namespace API for plugin lifecycle governance. */
  extension: EngineExtensionApi;
  /** Returns scheduler namespace API for task queue governance. */
  scheduler: EngineSchedulerApi;
  /** Returns cache namespace API for cache governance and invalidation. */
  cache: EngineCacheApi;
  /** Returns policy namespace API for effective policy controls. */
  policy: EnginePolicyApi;
  /** Returns security namespace API for trust/access governance. */
  security: EngineSecurityApi;
  /** Registers one event listener for provided event type. */
  on: (event: string, listener: EngineEventListener) => void;
  /** Unregisters one event listener for provided event type. */
  off: (event: string, listener: EngineEventListener) => void;
  /** Registers one one-shot event listener for provided event type. */
  once: (event: string, listener: EngineEventListener) => void;
  /** Returns public metrics snapshot. */
  getMetrics: () => EnginePublicMetricsOutput;
  /** Enables or disables diagnostics capture paths. */
  setDiagnosticsEnabled: (enabled: boolean) => void;
  /** Captures one debug frame payload with optional metadata options. */
  captureDebugFrame: (options?: Readonly<Record<string, unknown>>) => EngineCaptureImageOutput;
  /** Creates one replay token from provided scope string. */
  createReplayToken: (scope: string) => EngineRuntimeReplayTokenOutput;
  /** Replays one token through runtime replay pipeline. */
  replay: (token: string) => EngineRuntimeReplayOutput;
  /**
   * Returns public diagnostics payload for runtime bridge and tooling.
   */
  getDiagnostics: () => EngineDiagnosticsSnapshot;
  /**
   * Captures a frame token for diagnostics.
   */
  captureFrame: () => { timestampMs: number };
  /**
   * Returns a stable stats snapshot.
   */
  getStats: () => EngineStatsSnapshot;
  /**
   * Returns backend selection metadata.
   */
  getBackendInfo: () => BackendSelectionResult;
  /**
   * Returns runtime foundation API namespaces.
   */
  runtime: EngineRuntimeApi;
  /**
   * Returns capability-oriented public API namespaces.
   */
  capability: EngineCapabilityApi;
  /**
   * Releases runtime resources and terminally stops execution.
   */
  dispose: () => void;
}
