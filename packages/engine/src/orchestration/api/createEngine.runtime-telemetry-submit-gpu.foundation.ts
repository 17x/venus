import type {
  EngineRuntimeCaptureFrameInput,
  EngineRuntimeCaptureFrameOutput,
  EngineRuntimeCommandValidateInput,
  EngineRuntimeCompileTriggerOutput,
  EngineRuntimeGpuResourceDescriptor,
  EngineRuntimeGpuResourceOutput,
  EngineRuntimeMetricsSnapshot,
  EngineRuntimeSubmitOutput,
  EngineRuntimeWorldSnapshotOutput,
} from "./public-types";
import type { EngineDocumentSnapshot } from "../../kernel/document/document-contracts";

/**
 * Defines dependencies required by runtime telemetry/submit/gpu helper assembly.
 */
type RuntimeTelemetrySubmitGpuFoundationDependencies = {
  /** Resolves latest encoded command count. */
  getLastEncodedCommandCount: () => number;
  /** Resolves latest replayed command count. */
  getLastReplayEventCount: () => number;
  /** Resolves latest runtime draw count. */
  getLatestDrawCount: () => number;
  /** Resolves monotonic now timestamp in milliseconds. */
  resolveNow: () => number;
  /** Emits one engine event payload. */
  emitEvent: (type: string, payload: unknown) => void;
  /** Resolves current document snapshot. */
  getDocumentSnapshot: () => EngineDocumentSnapshot;
  /** Compiles runtime world from explicit document snapshot. */
  compileRuntimeWorldFromDocument: (input: {
    /** Snapshot override used by runtime compile path. */
    snapshot: EngineDocumentSnapshot;
  }) => EngineRuntimeWorldSnapshotOutput;
  /** Resolves runtime world snapshot output from current closure state. */
  resolveRuntimeWorldSnapshotOutput: () => EngineRuntimeWorldSnapshotOutput;
  /** Mutable runtime GPU resource registry. */
  runtimeGpuResources: Map<string, EngineRuntimeGpuResourceDescriptor>;
};

/**
 * Assembles runtime telemetry, compile trigger, submit, and gpu resource helper functions.
 * @param deps Shared state readers/writers from createEngine closure.
 */
export function createRuntimeTelemetrySubmitGpuFoundation(
  deps: RuntimeTelemetrySubmitGpuFoundationDependencies,
): {
  getRuntimeMetricsSnapshot: () => EngineRuntimeMetricsSnapshot;
  captureRuntimeFrame: (options?: EngineRuntimeCaptureFrameInput) => EngineRuntimeCaptureFrameOutput;
  resolveRuntimeDocumentSnapshot: () => EngineDocumentSnapshot;
  compileRuntimeWorld: (options?: { snapshot?: EngineDocumentSnapshot }) => EngineRuntimeWorldSnapshotOutput;
  scheduleRuntimeIncrementalCompile: (options?: { reason?: string }) => EngineRuntimeCompileTriggerOutput;
  forceRuntimeFullCompile: (reason: string) => EngineRuntimeCompileTriggerOutput;
  submitRuntimeCommandBuffer: (commandBuffer: EngineRuntimeCommandValidateInput) => EngineRuntimeSubmitOutput;
  submitRuntimeCommandBufferBatch: (commandBuffers: readonly EngineRuntimeCommandValidateInput[]) => EngineRuntimeSubmitOutput;
  createRuntimeGpuResource: (descriptor: EngineRuntimeGpuResourceDescriptor) => EngineRuntimeGpuResourceOutput;
  updateRuntimeGpuResource: (resourceId: string, patch: Readonly<Record<string, unknown>>) => EngineRuntimeGpuResourceOutput;
} {
  /**
   * Returns one runtime metrics snapshot from current orchestration counters.
   */
  function getRuntimeMetricsSnapshot(): EngineRuntimeMetricsSnapshot {
    return {
      encodedCommandCount: deps.getLastEncodedCommandCount(),
      replayedCommandCount: deps.getLastReplayEventCount(),
      drawCount: deps.getLatestDrawCount(),
    };
  }

  /**
   * Captures one runtime frame diagnostics token with optional label.
   * @param options Optional capture options.
   */
  function captureRuntimeFrame(
    options?: EngineRuntimeCaptureFrameInput,
  ): EngineRuntimeCaptureFrameOutput {
    const output = {
      timestampMs: deps.resolveNow(),
      label: typeof options?.label === "string" ? options.label : null,
    };
    deps.emitEvent("engine.diagnostics.captureReady", output);
    return output;
  }

  /**
   * Returns current runtime document snapshot.
   */
  function resolveRuntimeDocumentSnapshot(): EngineDocumentSnapshot {
    const documentSnapshot = deps.getDocumentSnapshot();
    return {
      revision: documentSnapshot.revision,
      nodes: documentSnapshot.nodes,
    };
  }

  /**
   * Compiles runtime world from optional document snapshot payload.
   * @param options Optional compile options including document snapshot override.
   */
  function compileRuntimeWorld(options?: { snapshot?: EngineDocumentSnapshot }): EngineRuntimeWorldSnapshotOutput {
    if (options?.snapshot) {
      return deps.compileRuntimeWorldFromDocument({ snapshot: options.snapshot });
    }
    return deps.resolveRuntimeWorldSnapshotOutput();
  }

  /**
   * Schedules one incremental compile trigger.
   * @param options Optional trigger options.
   */
  function scheduleRuntimeIncrementalCompile(
    options?: { reason?: string },
  ): EngineRuntimeCompileTriggerOutput {
    return {
      scheduled: true,
      reason: options?.reason ?? "manual-schedule",
    };
  }

  /**
   * Forces one full compile trigger.
   * @param reason Explicit caller reason token.
   */
  function forceRuntimeFullCompile(reason: string): EngineRuntimeCompileTriggerOutput {
    return {
      scheduled: true,
      reason,
    };
  }

  /**
   * Submits one command buffer and returns deterministic submitted-count summary.
   * @param commandBuffer Runtime command buffer payload.
   */
  function submitRuntimeCommandBuffer(
    commandBuffer: EngineRuntimeCommandValidateInput,
  ): EngineRuntimeSubmitOutput {
    return {
      submittedCount: Array.isArray(commandBuffer?.commands) ? commandBuffer.commands.length : 0,
    };
  }

  /**
   * Submits one command buffer batch and returns aggregate submitted-count summary.
   * @param commandBuffers Runtime command buffer batch payload.
   */
  function submitRuntimeCommandBufferBatch(
    commandBuffers: readonly EngineRuntimeCommandValidateInput[],
  ): EngineRuntimeSubmitOutput {
    let submittedCount = 0;
    for (const buffer of commandBuffers) {
      submittedCount += Array.isArray(buffer?.commands) ? buffer.commands.length : 0;
    }
    return {
      submittedCount,
    };
  }

  /**
   * Creates one runtime GPU resource descriptor record.
   * @param descriptor Runtime GPU resource descriptor payload.
   */
  function createRuntimeGpuResource(
    descriptor: EngineRuntimeGpuResourceDescriptor,
  ): EngineRuntimeGpuResourceOutput {
    deps.runtimeGpuResources.set(descriptor.id, descriptor);
    return {
      id: descriptor.id,
      exists: true,
    };
  }

  /**
   * Updates one runtime GPU resource descriptor record.
   * @param resourceId Runtime GPU resource id.
   * @param patch Runtime GPU resource patch payload.
   */
  function updateRuntimeGpuResource(
    resourceId: string,
    patch: Readonly<Record<string, unknown>>,
  ): EngineRuntimeGpuResourceOutput {
    const current = deps.runtimeGpuResources.get(resourceId);
    if (!current) {
      return {
        id: resourceId,
        exists: false,
      };
    }
    const next: EngineRuntimeGpuResourceDescriptor = {
      ...current,
      kind: typeof patch.kind === "string" ? patch.kind : current.kind,
      sizeBytes:
        typeof patch.sizeBytes === "number" && Number.isFinite(patch.sizeBytes)
          ? patch.sizeBytes
          : current.sizeBytes,
    };
    deps.runtimeGpuResources.set(resourceId, next);
    return {
      id: resourceId,
      exists: true,
    };
  }

  return {
    getRuntimeMetricsSnapshot,
    captureRuntimeFrame,
    resolveRuntimeDocumentSnapshot,
    compileRuntimeWorld,
    scheduleRuntimeIncrementalCompile,
    forceRuntimeFullCompile,
    submitRuntimeCommandBuffer,
    submitRuntimeCommandBufferBatch,
    createRuntimeGpuResource,
    updateRuntimeGpuResource,
  };
}
