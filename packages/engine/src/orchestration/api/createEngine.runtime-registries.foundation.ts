import type {
  EngineRuntimeAuthoringGraphComparisonOutput,
  EngineRuntimeAuthoringGraphSnapshotOutput,
  EngineRuntimeModelAssetDescriptor,
  EngineHookListener,
  EngineHookStage,
  EngineRuntimeDecodeCheckpointMode,
  EngineRuntimeDecodePrecisionPolicy,
  EngineRuntimeGpuResourceDescriptor,
  EngineRuntimeResourceCompressionDescriptor,
  EngineRuntimeResourceDecodeStatusOutput,
  EngineRuntimeResourceDescriptor,
  EngineRuntimeTraceEvent,
} from "./public-types";

/**
 * Creates runtime registries and deterministic id allocators shared by createEngine helpers.
 */
export function createEngineRuntimeRegistriesFoundation(): {
  eventListeners: Map<string, Set<(payload: unknown) => void>>;
  eventListenerMetadata: Map<string, Map<(payload: unknown) => void, {
    scope?: "global" | "session" | "trace";
    sampleRate?: number;
    throttleMs?: number;
  }>>;
  pausedEventTypes: Set<string>;
  eventTypeDeliveryCounters: Map<string, number>;
  eventListenerLastDeliveredAt: Map<string, Map<(payload: unknown) => void, number>>;
  hookStages: readonly EngineHookStage[];
  hookListeners: Map<EngineHookStage, Set<EngineHookListener>>;
  hookListenerMetadata: Map<EngineHookStage, Map<EngineHookListener, {
    scope?: "global" | "session" | "trace";
  }>>;
  extensionRegistry: Map<string, { pluginId: string; state: "registered" | "active" | "errored" | "disposed" }>;
  schedulerTaskRegistry: Map<string, {
    taskId: string;
    queue: string;
    priority: "low" | "normal" | "high";
    budgetMs: number;
    task: unknown;
  }>;
  createSchedulerTaskId: () => string;
  cacheNamespaces: Map<string, Map<string, {
    value: unknown;
    tags: readonly string[];
    policy: { ttlMs?: number; pinned?: boolean; tags?: readonly string[] } | undefined;
  }>>;
  cacheNamespaceStats: Map<string, { hitCount: number; missCount: number }>;
  assetStates: Map<string, "loaded" | "preloaded" | "unloaded">;
  headlessSessions: Map<string, { createdAtMs: number }>;
  createHeadlessSessionId: () => string;
  runtimeGpuResources: Map<string, EngineRuntimeGpuResourceDescriptor>;
  runtimeUploadBatches: Map<string, readonly string[]>;
  runtimeBarrierPlans: Map<string, readonly string[]>;
  runtimeAuthoringSnapshots: Map<string, EngineRuntimeAuthoringGraphSnapshotOutput>;
  getLastRuntimeAuthoringComparison: () => EngineRuntimeAuthoringGraphComparisonOutput | null;
  setLastRuntimeAuthoringComparison: (comparison: EngineRuntimeAuthoringGraphComparisonOutput | null) => void;
  getRuntimeAuthoringPreviewTokenCounter: () => number;
  setRuntimeAuthoringPreviewTokenCounter: (nextCounter: number) => void;
  runtimeResourceRegistry: Map<string, {
    id: string;
    kind: EngineRuntimeResourceDescriptor["kind"];
    sizeBytes: number;
    compression: EngineRuntimeResourceCompressionDescriptor | null;
    decodeStatus: EngineRuntimeResourceDecodeStatusOutput["stage"];
    decodePrecisionPolicy: EngineRuntimeDecodePrecisionPolicy;
    decodeCheckpointMode: EngineRuntimeDecodeCheckpointMode;
    decodeErrorCode: string | null;
    pinned: boolean;
    residencyVersion: number;
  }>;
  runtimeModelAssets: Map<string, {
    id: string;
    resourceId?: string;
    scene: EngineRuntimeModelAssetDescriptor["scene"];
    lodDistances: readonly number[];
  }>;
  runtimeModelInstances: Map<string, {
    id: string;
    modelId: string;
    translation: readonly [number, number, number];
    rotation: readonly [number, number, number];
    scale: readonly [number, number, number];
    color?: string;
    lodLevelOverride?: number;
  }>;
  runtimeTraceRegistry: Map<string, {
    traceId: string;
    startedAtMs: number;
    stoppedAtMs: number | null;
    events: EngineRuntimeTraceEvent[];
  }>;
} {
  const eventListeners = new Map<string, Set<(payload: unknown) => void>>();
  const eventListenerMetadata = new Map<string, Map<(payload: unknown) => void, {
    scope?: "global" | "session" | "trace";
    sampleRate?: number;
    throttleMs?: number;
  }>>();
  const pausedEventTypes = new Set<string>();
  const eventTypeDeliveryCounters = new Map<string, number>();
  const eventListenerLastDeliveredAt = new Map<string, Map<(payload: unknown) => void, number>>();
  const hookStages: readonly EngineHookStage[] = [
    "beforeCompile",
    "afterCompile",
    "beforeRenderPlan",
    "afterRenderPlan",
    "beforeSubmit",
    "afterSubmit",
  ];
  const hookListeners = new Map<EngineHookStage, Set<EngineHookListener>>();
  const hookListenerMetadata = new Map<EngineHookStage, Map<EngineHookListener, {
    scope?: "global" | "session" | "trace";
  }>>();
  const extensionRegistry = new Map<string, { pluginId: string; state: "registered" | "active" | "errored" | "disposed" }>();
  const schedulerTaskRegistry = new Map<string, {
    taskId: string;
    queue: string;
    priority: "low" | "normal" | "high";
    budgetMs: number;
    task: unknown;
  }>();
  let schedulerTaskCounter = 0;

  /**
   * Allocates one deterministic scheduler task id.
   */
  function createSchedulerTaskId(): string {
    schedulerTaskCounter += 1;
    return `scheduler-task-${schedulerTaskCounter}`;
  }

  const cacheNamespaces = new Map<string, Map<string, {
    value: unknown;
    tags: readonly string[];
    policy: { ttlMs?: number; pinned?: boolean; tags?: readonly string[] } | undefined;
  }>>();
  const cacheNamespaceStats = new Map<string, { hitCount: number; missCount: number }>();
  const assetStates = new Map<string, "loaded" | "preloaded" | "unloaded">();
  const headlessSessions = new Map<string, { createdAtMs: number }>();
  let headlessSessionCounter = 0;

  /**
   * Allocates one deterministic headless session id.
   */
  function createHeadlessSessionId(): string {
    headlessSessionCounter += 1;
    return `headless-${headlessSessionCounter}`;
  }

  const runtimeGpuResources = new Map<string, EngineRuntimeGpuResourceDescriptor>();
  const runtimeUploadBatches = new Map<string, readonly string[]>();
  const runtimeBarrierPlans = new Map<string, readonly string[]>();
  const runtimeAuthoringSnapshots = new Map<string, EngineRuntimeAuthoringGraphSnapshotOutput>();
  let lastRuntimeAuthoringComparison: EngineRuntimeAuthoringGraphComparisonOutput | null = null;
  let runtimeAuthoringPreviewTokenCounter = 0;
  const runtimeResourceRegistry = new Map<string, {
    id: string;
    kind: EngineRuntimeResourceDescriptor["kind"];
    sizeBytes: number;
    compression: EngineRuntimeResourceCompressionDescriptor | null;
    decodeStatus: EngineRuntimeResourceDecodeStatusOutput["stage"];
    decodePrecisionPolicy: EngineRuntimeDecodePrecisionPolicy;
    decodeCheckpointMode: EngineRuntimeDecodeCheckpointMode;
    decodeErrorCode: string | null;
    pinned: boolean;
    residencyVersion: number;
  }>();
  const runtimeModelAssets = new Map<string, {
    id: string;
    resourceId?: string;
    scene: EngineRuntimeModelAssetDescriptor["scene"];
    lodDistances: readonly number[];
  }>();
  const runtimeModelInstances = new Map<string, {
    id: string;
    modelId: string;
    translation: readonly [number, number, number];
    rotation: readonly [number, number, number];
    scale: readonly [number, number, number];
    color?: string;
    lodLevelOverride?: number;
  }>();
  const runtimeTraceRegistry = new Map<string, {
    traceId: string;
    startedAtMs: number;
    stoppedAtMs: number | null;
    events: EngineRuntimeTraceEvent[];
  }>();

  return {
    eventListeners,
    eventListenerMetadata,
    pausedEventTypes,
    eventTypeDeliveryCounters,
    eventListenerLastDeliveredAt,
    hookStages,
    hookListeners,
    hookListenerMetadata,
    extensionRegistry,
    schedulerTaskRegistry,
    createSchedulerTaskId,
    cacheNamespaces,
    cacheNamespaceStats,
    assetStates,
    headlessSessions,
    createHeadlessSessionId,
    runtimeGpuResources,
    runtimeUploadBatches,
    runtimeBarrierPlans,
    runtimeAuthoringSnapshots,
    getLastRuntimeAuthoringComparison: () => lastRuntimeAuthoringComparison,
    setLastRuntimeAuthoringComparison: (comparison) => { lastRuntimeAuthoringComparison = comparison; },
    getRuntimeAuthoringPreviewTokenCounter: () => runtimeAuthoringPreviewTokenCounter,
    setRuntimeAuthoringPreviewTokenCounter: (nextCounter) => { runtimeAuthoringPreviewTokenCounter = nextCounter; },
    runtimeResourceRegistry,
    runtimeModelAssets,
    runtimeModelInstances,
    runtimeTraceRegistry,
  };
}
