import type {
  EngineRuntimeDirtyFlushInput,
  EngineRuntimeDirtyFlushOutput,
  EngineRuntimeDirtyMarkBatchInput,
  EngineRuntimeDirtyMarkInput,
  EngineRuntimeDirtyResetOutput,
  EngineRuntimeDirtyStateOutput,
} from "./public-types";
import type { EngineDirtyDomain } from "../../kernel/dirty/dirtyPropagation/dirtyPropagation.contract";

/**
 * Minimal dirty-state shape shared across dirty and dirty-command deps.
 */
export type RuntimeDirtyStateLike = {
  /** Pending dirty domain tokens tracked for incremental compile. */
  dirtyDomains: readonly EngineDirtyDomain[];
};

/**
 * Defines dependencies required by the runtime dirty domain helpers.
 */
export type RuntimeDirtyFoundationDeps = {
  /** Reads latest dirty-state record. */
  getLatestDirtyState: () => RuntimeDirtyStateLike;
  /** Writes latest dirty-state record. */
  setLatestDirtyState: (state: RuntimeDirtyStateLike) => void;
  /** Marks one dirty domain. */
  markDirty: (state: RuntimeDirtyStateLike, domain: EngineDirtyDomain) => RuntimeDirtyStateLike;
  /** Marks multiple dirty domains. */
  markDirtyBatch: (state: RuntimeDirtyStateLike, domains: readonly EngineDirtyDomain[]) => RuntimeDirtyStateLike;
  /** Flushes dirty domains. */
  flushDirty: (state: RuntimeDirtyStateLike, domains: readonly EngineDirtyDomain[]) => RuntimeDirtyStateLike;
  /** Creates empty dirty-state record. */
  createEmptyDirtyState: () => RuntimeDirtyStateLike;
  /** Reads last dirty-mark timestamp. */
  getLastRuntimeDirtyMarkedAt: () => number;
  /** Updates last dirty-mark timestamp. */
  setLastRuntimeDirtyMarkedAt: (timestampMs: number) => void;
  /** Resolves monotonic timestamp in milliseconds. */
  resolveNow: () => number;
};

/**
 * Assembles runtime dirty-state helper functions (mark, flush, reset, query).
 * @param deps Shared dirty state and module delegates from createEngine closure.
 */
export function createRuntimeDirtyFoundation(deps: RuntimeDirtyFoundationDeps): {
  resolveRuntimeDirtyStateOutput: () => EngineRuntimeDirtyStateOutput;
  markRuntimeDirtyDomain: (input: EngineRuntimeDirtyMarkInput) => EngineRuntimeDirtyStateOutput;
  markRuntimeDirtyDomainsBatch: (input: EngineRuntimeDirtyMarkBatchInput) => EngineRuntimeDirtyStateOutput;
  resolveRuntimePendingDirtyDomains: () => readonly EngineRuntimeDirtyMarkInput["domain"][];
  flushRuntimeDirtyDomains: (input: EngineRuntimeDirtyFlushInput) => EngineRuntimeDirtyFlushOutput;
  resetRuntimeDirtyState: () => EngineRuntimeDirtyResetOutput;
} {
  /**
   * Returns current runtime dirty state snapshot.
   */
  function resolveRuntimeDirtyStateOutput(): EngineRuntimeDirtyStateOutput {
    return {
      pendingDomains: [...deps.getLatestDirtyState().dirtyDomains],
      lastMarkedAt: deps.getLastRuntimeDirtyMarkedAt(),
    };
  }

  /**
   * Marks one runtime dirty domain and returns updated dirty state snapshot.
   * @param input Runtime dirty mark input.
   */
  function markRuntimeDirtyDomain(input: EngineRuntimeDirtyMarkInput): EngineRuntimeDirtyStateOutput {
    const validDomains: readonly EngineDirtyDomain[] = [
      "transform",
      "geometry",
      "material",
      "visibility",
      "picking",
      "resource",
    ];
    if (!input || !validDomains.includes(input.domain)) {
      throw new Error("ENGINE_DIRTY_INVALID_DOMAIN");
    }
    deps.setLatestDirtyState(deps.markDirty(deps.getLatestDirtyState(), input.domain));
    deps.setLastRuntimeDirtyMarkedAt(deps.resolveNow());
    return resolveRuntimeDirtyStateOutput();
  }

  /**
   * Marks multiple runtime dirty domains in one deterministic batch.
   * @param input Runtime dirty mark-batch request.
   */
  function markRuntimeDirtyDomainsBatch(
    input: EngineRuntimeDirtyMarkBatchInput,
  ): EngineRuntimeDirtyStateOutput {
    if (!input || !Array.isArray(input.domains)) {
      throw new Error("ENGINE_DIRTY_INVALID_DOMAIN");
    }
    deps.setLatestDirtyState(deps.markDirtyBatch(deps.getLatestDirtyState(), input.domains));
    deps.setLastRuntimeDirtyMarkedAt(deps.resolveNow());
    return resolveRuntimeDirtyStateOutput();
  }

  /**
   * Returns current pending dirty domains only.
   */
  function resolveRuntimePendingDirtyDomains(): readonly EngineRuntimeDirtyMarkInput["domain"][] {
    return [...deps.getLatestDirtyState().dirtyDomains];
  }

  /**
   * Flushes requested dirty domains and returns post-flush state.
   * @param input Runtime dirty flush request.
   */
  function flushRuntimeDirtyDomains(
    input: EngineRuntimeDirtyFlushInput,
  ): EngineRuntimeDirtyFlushOutput {
    if (!input || !Array.isArray(input.domains)) {
      throw new Error("ENGINE_DIRTY_INVALID_DOMAIN");
    }
    const before = new Set(deps.getLatestDirtyState().dirtyDomains);
    deps.setLatestDirtyState(deps.flushDirty(deps.getLatestDirtyState(), input.domains));
    const after = new Set(deps.getLatestDirtyState().dirtyDomains);
    let flushedCount = 0;
    for (const domain of before) {
      if (!after.has(domain)) {
        flushedCount += 1;
      }
    }
    return {
      flushedCount,
      state: resolveRuntimeDirtyStateOutput(),
    };
  }

  /**
   * Resets runtime dirty state to empty set.
   */
  function resetRuntimeDirtyState(): EngineRuntimeDirtyResetOutput {
    deps.setLatestDirtyState(deps.createEmptyDirtyState());
    deps.setLastRuntimeDirtyMarkedAt(deps.resolveNow());
    return {
      reset: true,
    };
  }

  return {
    resolveRuntimeDirtyStateOutput,
    markRuntimeDirtyDomain,
    markRuntimeDirtyDomainsBatch,
    resolveRuntimePendingDirtyDomains,
    flushRuntimeDirtyDomains,
    resetRuntimeDirtyState,
  };
}
