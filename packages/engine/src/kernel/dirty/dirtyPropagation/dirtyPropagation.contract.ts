/**
 * Dirty domains used by incremental runtime scheduling.
 */
export type EngineDirtyDomain =
  | "transform"
  | "geometry"
  | "material"
  | "visibility"
  | "picking"
  | "resource";

/**
 * Immutable dirty-state snapshot used by scheduler/planning logic.
 */
export interface EngineDirtyStateSnapshot {
  /** Current dirty domains in deterministic sorted order. */
  dirtyDomains: readonly EngineDirtyDomain[];
}

/**
 * Contract for dirty-propagation module state transitions.
 */
export interface EngineDirtyPropagationModule {
  /**
   * Marks one dirty domain and returns updated snapshot.
   */
  markDirty: (
    state: EngineDirtyStateSnapshot,
    domain: EngineDirtyDomain,
  ) => EngineDirtyStateSnapshot;
  /**
   * Marks multiple dirty domains and returns updated snapshot.
   */
  markDirtyBatch: (
    state: EngineDirtyStateSnapshot,
    domains: readonly EngineDirtyDomain[],
  ) => EngineDirtyStateSnapshot;
  /**
   * Flushes one or many domains from dirty state and returns updated snapshot.
   */
  flushDirty: (
    state: EngineDirtyStateSnapshot,
    domains: readonly EngineDirtyDomain[],
  ) => EngineDirtyStateSnapshot;
  /**
   * Creates one empty dirty-state snapshot.
   */
  createEmptyState: () => EngineDirtyStateSnapshot;
}
