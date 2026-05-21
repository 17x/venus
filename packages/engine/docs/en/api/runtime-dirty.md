# Runtime Dirty API (`engine.runtime.dirty.*`)

Audience: Runtime scheduler and incremental compilation integrators.

## Scope

This page defines the first frozen runtime dirty foundation endpoints for Batch-1.

## Endpoints

### engine.runtime.dirty.getState()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.dirty.getState(): {
  pendingDomains: readonly EngineDirtyDomain[];
  lastMarkedAt: number;
}
```

Determinism:

- Same dirty-mark state must return the same ordered `pendingDomains` output.

### engine.runtime.dirty.mark(domain, token)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.dirty.mark(input: {
  domain: EngineDirtyDomain;
  token: string;
}): {
  pendingDomains: readonly EngineDirtyDomain[];
  lastMarkedAt: number;
}
```

Error Codes:

- `ENGINE_DIRTY_INVALID_DOMAIN`

Determinism:

- Same mark sequence must produce identical pending-domain ordering.

### engine.runtime.dirty.markBatch(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.dirty.markBatch(input: {
  domains: readonly EngineDirtyDomain[];
  token: string;
}): {
  pendingDomains: readonly EngineDirtyDomain[];
  lastMarkedAt: number;
}
```

Error Codes:

- `ENGINE_DIRTY_INVALID_DOMAIN`

Determinism:

- Same batch sequence must produce identical pending-domain ordering.

### engine.runtime.dirty.getPendingDomains()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.dirty.getPendingDomains(): readonly EngineDirtyDomain[]
```

Determinism:

- Same dirty state must return identical pending domain ordering.

### engine.runtime.dirty.flush(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.dirty.flush(input: {
  domains: readonly EngineDirtyDomain[];
}): {
  flushedCount: number;
  state: {
    pendingDomains: readonly EngineDirtyDomain[];
    lastMarkedAt: number;
  };
}
```

Error Codes:

- `ENGINE_DIRTY_INVALID_DOMAIN`

Determinism:

- Same dirty state and same flush domains must produce identical post-flush state.

### engine.runtime.dirty.reset()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.dirty.reset(): {
  reset: boolean;
}
```

Determinism:

- Same call always resets dirty state to an empty deterministic snapshot.

## Related Contracts

- `packages/engine/src/runtime/dirty/dirty.foundation.contract.ts`
- `packages/engine/src/dirty/dirtyPropagation/dirtyPropagation.contract.ts`
