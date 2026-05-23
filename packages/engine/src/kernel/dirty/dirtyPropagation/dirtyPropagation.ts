import type {
  EngineDirtyDomain,
  EngineDirtyPropagationModule,
  EngineDirtyStateSnapshot,
} from "./dirtyPropagation.contract";

/**
 * Creates dirty-propagation module with deterministic set semantics.
 */
export function createEngineDirtyPropagationModule(): EngineDirtyPropagationModule {
  return {
    markDirty: (state, domain) => resolveMarkedDirtyState(state, [domain]),
    markDirtyBatch: (state, domains) => resolveMarkedDirtyState(state, domains),
    flushDirty: (state, domains) => resolveFlushedDirtyState(state, domains),
    createEmptyState: () => ({ dirtyDomains: [] }),
  };
}

/**
 * Resolves next snapshot after adding dirty domains.
 * @param state Current dirty-state snapshot.
 * @param domains Domains to add into dirty set.
 */
function resolveMarkedDirtyState(
  state: EngineDirtyStateSnapshot,
  domains: readonly EngineDirtyDomain[],
): EngineDirtyStateSnapshot {
  const next = new Set<EngineDirtyDomain>(state.dirtyDomains);
  for (const domain of domains) {
    next.add(domain);
  }
  return { dirtyDomains: Array.from(next).sort() };
}

/**
 * Resolves next snapshot after flushing dirty domains.
 * @param state Current dirty-state snapshot.
 * @param domains Domains to remove from dirty set.
 */
function resolveFlushedDirtyState(
  state: EngineDirtyStateSnapshot,
  domains: readonly EngineDirtyDomain[],
): EngineDirtyStateSnapshot {
  if (domains.length === 0) {
    return state;
  }
  const flushSet = new Set<EngineDirtyDomain>(domains);
  return {
    dirtyDomains: state.dirtyDomains.filter((domain) => !flushSet.has(domain)),
  };
}
