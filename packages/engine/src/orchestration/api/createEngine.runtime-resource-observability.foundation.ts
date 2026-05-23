import type {
  EngineRuntimeGetTraceOutput,
  EngineRuntimeReplayOutput,
  EngineRuntimeReplayTokenOutput,
  EngineRuntimeResourceCollectGarbageInput,
  EngineRuntimeResourceCollectGarbageOutput,
  EngineRuntimeResourceDescriptor,
  EngineRuntimeResourcePatch,
  EngineRuntimeResourceResidencyOutput,
  EngineRuntimeStartTraceInput,
  EngineRuntimeStartTraceOutput,
  EngineRuntimeStopTraceOutput,
  EngineRuntimeTraceEvent,
} from "./public-types";

/**
 * Defines one internal runtime resource registry record.
 */
type RuntimeResourceRecord = {
  /** Resource identifier. */
  id: string;
  /** Resource kind token. */
  kind: EngineRuntimeResourceDescriptor["kind"];
  /** Current resident size in bytes. */
  sizeBytes: number;
  /** Pinned flag that protects resource from GC. */
  pinned: boolean;
  /** Monotonic residency version for change tracking. */
  residencyVersion: number;
};

/**
 * Defines one internal runtime trace registry record.
 */
type RuntimeTraceRecord = {
  /** Trace identifier. */
  traceId: string;
  /** Trace start timestamp in milliseconds. */
  startedAtMs: number;
  /** Trace stop timestamp in milliseconds when stopped, else null. */
  stoppedAtMs: number | null;
  /** Ordered trace event stream. */
  events: EngineRuntimeTraceEvent[];
};

/**
 * Defines dependencies required to assemble runtime resource and observability helpers.
 */
type RuntimeResourceObservabilityDependencies = {
  /** Runtime resource registry keyed by resource id. */
  runtimeResourceRegistry: Map<string, RuntimeResourceRecord>;
  /** Runtime trace registry keyed by trace id. */
  runtimeTraceRegistry: Map<string, RuntimeTraceRecord>;
  /** Reads current runtime resource residency version counter. */
  getRuntimeResourceResidencyVersion: () => number;
  /** Updates runtime resource residency version counter. */
  setRuntimeResourceResidencyVersion: (nextVersion: number) => void;
  /** Reads current runtime trace id counter. */
  getRuntimeTraceCounter: () => number;
  /** Updates runtime trace id counter. */
  setRuntimeTraceCounter: (nextCounter: number) => void;
  /** Reads current runtime replay token counter. */
  getRuntimeReplayCounter: () => number;
  /** Updates runtime replay token counter. */
  setRuntimeReplayCounter: (nextCounter: number) => void;
  /** Resolves monotonic timestamps in milliseconds. */
  resolveNow: () => number;
  /** Resolves current document revision used by replay token encoding. */
  resolveRevision: () => number;
  /** Emits engine-level diagnostics/trace events. */
  emitEvent: (type: string, payload: unknown) => void;
};

/**
 * Assembles runtime resource residency and observability helper functions.
 * @param deps Shared mutable registries/counters used by runtime helper methods.
 */
export function createRuntimeResourceObservabilityFoundation(
  deps: RuntimeResourceObservabilityDependencies,
): {
  registerRuntimeResource: (
    descriptor: EngineRuntimeResourceDescriptor,
  ) => EngineRuntimeResourceResidencyOutput;
  updateRuntimeResource: (
    resourceId: string,
    patch: EngineRuntimeResourcePatch,
  ) => EngineRuntimeResourceResidencyOutput;
  releaseRuntimeResource: (resourceId: string) => { released: boolean };
  pinRuntimeResource: (resourceId: string) => EngineRuntimeResourceResidencyOutput;
  unpinRuntimeResource: (resourceId: string) => EngineRuntimeResourceResidencyOutput;
  getRuntimeResourceResidency: (resourceId: string) => EngineRuntimeResourceResidencyOutput;
  collectRuntimeResources: (
    options: EngineRuntimeResourceCollectGarbageInput,
  ) => EngineRuntimeResourceCollectGarbageOutput;
  startRuntimeTrace: (options: EngineRuntimeStartTraceInput) => EngineRuntimeStartTraceOutput;
  stopRuntimeTrace: (traceId: string) => EngineRuntimeStopTraceOutput;
  getRuntimeTrace: (traceId: string) => EngineRuntimeGetTraceOutput;
  createRuntimeReplayToken: (scope: string) => EngineRuntimeReplayTokenOutput;
  replayRuntimeToken: (token: string) => EngineRuntimeReplayOutput;
} {
  /**
   * Converts one internal runtime resource record to public residency output.
   * @param resource Internal resource registry record.
   */
  function resolveRuntimeResourceResidencyOutput(
    resource: RuntimeResourceRecord,
  ): EngineRuntimeResourceResidencyOutput {
    return {
      id: resource.id,
      residencyVersion: resource.residencyVersion,
      pinned: resource.pinned,
      sizeBytes: resource.sizeBytes,
    };
  }

  /**
   * Resolves one runtime resource record by id or throws not-found error.
   * @param resourceId Runtime resource id.
   */
  function resolveRuntimeResourceById(resourceId: string): RuntimeResourceRecord {
    const resource = deps.runtimeResourceRegistry.get(resourceId);
    if (!resource) {
      throw new Error("ENGINE_RESOURCE_NOT_FOUND");
    }
    return resource;
  }

  /**
   * Registers one runtime resource descriptor and returns residency snapshot.
   * @param descriptor Runtime resource descriptor.
   */
  function registerRuntimeResource(
    descriptor: EngineRuntimeResourceDescriptor,
  ): EngineRuntimeResourceResidencyOutput {
    if (!descriptor || typeof descriptor.id !== "string" || descriptor.id.length === 0) {
      throw new Error("ENGINE_RESOURCE_INVALID_DESCRIPTOR");
    }
    const nextVersion = deps.getRuntimeResourceResidencyVersion() + 1;
    deps.setRuntimeResourceResidencyVersion(nextVersion);
    const nextRecord: RuntimeResourceRecord = {
      id: descriptor.id,
      kind: descriptor.kind,
      sizeBytes: Math.max(0, descriptor.sizeBytes),
      pinned: false,
      residencyVersion: nextVersion,
    };
    deps.runtimeResourceRegistry.set(descriptor.id, nextRecord);
    return resolveRuntimeResourceResidencyOutput(nextRecord);
  }

  /**
   * Updates one runtime resource descriptor fields and returns residency snapshot.
   * @param resourceId Runtime resource id.
   * @param patch Runtime resource patch payload.
   */
  function updateRuntimeResource(
    resourceId: string,
    patch: EngineRuntimeResourcePatch,
  ): EngineRuntimeResourceResidencyOutput {
    const resource = resolveRuntimeResourceById(resourceId);
    // Update is intentionally patch-based so callers can evolve one field without re-registering.
    const nextSizeBytes = typeof patch.sizeBytes === "number" ? Math.max(0, patch.sizeBytes) : resource.sizeBytes;
    const nextVersion = deps.getRuntimeResourceResidencyVersion() + 1;
    deps.setRuntimeResourceResidencyVersion(nextVersion);
    const nextRecord: RuntimeResourceRecord = {
      ...resource,
      sizeBytes: nextSizeBytes,
      residencyVersion: nextVersion,
    };
    deps.runtimeResourceRegistry.set(resourceId, nextRecord);
    return resolveRuntimeResourceResidencyOutput(nextRecord);
  }

  /**
   * Releases one runtime resource descriptor.
   * @param resourceId Runtime resource id.
   */
  function releaseRuntimeResource(resourceId: string): { released: boolean } {
    resolveRuntimeResourceById(resourceId);
    deps.runtimeResourceRegistry.delete(resourceId);
    return { released: true };
  }

  /**
   * Pins one runtime resource descriptor and returns residency snapshot.
   * @param resourceId Runtime resource id.
   */
  function pinRuntimeResource(resourceId: string): EngineRuntimeResourceResidencyOutput {
    const resource = resolveRuntimeResourceById(resourceId);
    const nextVersion = deps.getRuntimeResourceResidencyVersion() + 1;
    deps.setRuntimeResourceResidencyVersion(nextVersion);
    const nextRecord: RuntimeResourceRecord = {
      ...resource,
      pinned: true,
      residencyVersion: nextVersion,
    };
    deps.runtimeResourceRegistry.set(resourceId, nextRecord);
    return resolveRuntimeResourceResidencyOutput(nextRecord);
  }

  /**
   * Unpins one runtime resource descriptor and returns residency snapshot.
   * @param resourceId Runtime resource id.
   */
  function unpinRuntimeResource(resourceId: string): EngineRuntimeResourceResidencyOutput {
    const resource = resolveRuntimeResourceById(resourceId);
    const nextVersion = deps.getRuntimeResourceResidencyVersion() + 1;
    deps.setRuntimeResourceResidencyVersion(nextVersion);
    const nextRecord: RuntimeResourceRecord = {
      ...resource,
      pinned: false,
      residencyVersion: nextVersion,
    };
    deps.runtimeResourceRegistry.set(resourceId, nextRecord);
    return resolveRuntimeResourceResidencyOutput(nextRecord);
  }

  /**
   * Returns one runtime resource residency snapshot by id.
   * @param resourceId Runtime resource id.
   */
  function getRuntimeResourceResidency(resourceId: string): EngineRuntimeResourceResidencyOutput {
    return resolveRuntimeResourceResidencyOutput(resolveRuntimeResourceById(resourceId));
  }

  /**
   * Executes one budgeted runtime resource garbage-collection cycle.
   * @param options Runtime resource GC options.
   */
  function collectRuntimeResources(
    options: EngineRuntimeResourceCollectGarbageInput,
  ): EngineRuntimeResourceCollectGarbageOutput {
    if (!options || !Number.isFinite(options.budgetBytes) || options.budgetBytes < 0) {
      throw new Error("ENGINE_RESOURCE_INVALID_DESCRIPTOR");
    }
    const releasedResourceIds: string[] = [];
    let releasedBytes = 0;
    for (const [resourceId, resource] of [...deps.runtimeResourceRegistry.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      // Skip pinned resources so caller pin/unpin state is respected by GC.
      if (resource.pinned) {
        continue;
      }
      if (releasedBytes + resource.sizeBytes > options.budgetBytes) {
        continue;
      }
      releasedBytes += resource.sizeBytes;
      releasedResourceIds.push(resourceId);
      deps.runtimeResourceRegistry.delete(resourceId);
    }
    return {
      releasedResourceIds,
      releasedCount: releasedResourceIds.length,
    };
  }

  /**
   * Starts one runtime trace session.
   * @param options Trace start options.
   */
  function startRuntimeTrace(options: EngineRuntimeStartTraceInput): EngineRuntimeStartTraceOutput {
    if (!options || typeof options.name !== "string" || options.name.length === 0) {
      throw new Error("ENGINE_OBSERVABILITY_INVALID_INPUT");
    }
    const nextCounter = deps.getRuntimeTraceCounter() + 1;
    deps.setRuntimeTraceCounter(nextCounter);
    const traceId = `trace-${nextCounter}`;
    const startedAtMs = deps.resolveNow();
    deps.runtimeTraceRegistry.set(traceId, {
      traceId,
      startedAtMs,
      stoppedAtMs: null,
      events: [
        {
          timestampMs: startedAtMs,
          category: "trace",
          message: `start:${options.name}`,
        },
      ],
    });
    return {
      traceId,
      startedAtMs,
    };
  }

  /**
   * Stops one runtime trace session.
   * @param traceId Runtime trace id.
   */
  function stopRuntimeTrace(traceId: string): EngineRuntimeStopTraceOutput {
    const trace = deps.runtimeTraceRegistry.get(traceId);
    if (!trace) {
      throw new Error("ENGINE_OBSERVABILITY_TRACE_NOT_FOUND");
    }
    const stoppedAtMs = deps.resolveNow();
    trace.stoppedAtMs = stoppedAtMs;
    trace.events.push({
      timestampMs: stoppedAtMs,
      category: "trace",
      message: "stop",
    });
    const output = {
      traceId,
      stoppedAtMs,
      durationMs: Math.max(0, stoppedAtMs - trace.startedAtMs),
    };
    deps.emitEvent("engine.diagnostics.traceReady", output);
    return output;
  }

  /**
   * Returns one runtime trace event stream.
   * @param traceId Runtime trace id.
   */
  function getRuntimeTrace(traceId: string): EngineRuntimeGetTraceOutput {
    const trace = deps.runtimeTraceRegistry.get(traceId);
    if (!trace) {
      throw new Error("ENGINE_OBSERVABILITY_TRACE_NOT_FOUND");
    }
    return {
      traceId,
      events: [...trace.events],
    };
  }

  /**
   * Creates one deterministic replay token.
   * @param scope Caller-provided replay scope token.
   */
  function createRuntimeReplayToken(scope: string): EngineRuntimeReplayTokenOutput {
    if (typeof scope !== "string" || scope.length === 0) {
      throw new Error("ENGINE_OBSERVABILITY_INVALID_INPUT");
    }
    const nextCounter = deps.getRuntimeReplayCounter() + 1;
    deps.setRuntimeReplayCounter(nextCounter);
    return {
      token: `replay-${scope}-${deps.resolveRevision()}-${nextCounter}`,
    };
  }

  /**
   * Replays one deterministic replay token.
   * @param token Replay token produced by createReplayToken.
   */
  function replayRuntimeToken(token: string): EngineRuntimeReplayOutput {
    return {
      accepted: typeof token === "string" && token.startsWith("replay-"),
    };
  }

  return {
    registerRuntimeResource,
    updateRuntimeResource,
    releaseRuntimeResource,
    pinRuntimeResource,
    unpinRuntimeResource,
    getRuntimeResourceResidency,
    collectRuntimeResources,
    startRuntimeTrace,
    stopRuntimeTrace,
    getRuntimeTrace,
    createRuntimeReplayToken,
    replayRuntimeToken,
  };
}
