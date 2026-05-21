# Runtime Document API (`engine.runtime.document.*`)

Audience: Foundation/runtime contract implementers and deterministic replay tooling.

## Scope

This page defines frozen runtime document foundation endpoints used by runtime adapters and replay tooling.

## Endpoints

### engine.runtime.document.createSnapshot(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.document.createSnapshot(input: {
  revision: number;
  nodes: EngineDocumentSnapshot["nodes"];
}): EngineDocumentSnapshot
```

Error Codes:

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

Determinism:

- Same `revision` + same `nodes` must produce an identical snapshot payload.

### engine.runtime.document.validateSnapshot(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.document.validateSnapshot(input: {
  snapshot: EngineDocumentSnapshot;
}): {
  valid: boolean;
  issues: readonly string[];
}
```

Error Codes:

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

Determinism:

- Same `snapshot` must produce identical `valid` and `issues` output.

### engine.runtime.document.getRevision()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.document.getRevision(): number
```

Output:

- Monotonic revision number representing current runtime document state.

Determinism:

- Same document state must return the same revision.

### engine.runtime.document.getSchemaVersion()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.document.getSchemaVersion(): number
```

Output:

- Runtime document schema version.

Determinism:

- Same runtime build must return the same schema version.

### engine.runtime.document.applyChangeSet(changeSet)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.document.applyChangeSet(input: {
  changeSet: EngineDocumentChangeSet;
  baseRevision?: number;
  schemaVersion?: number;
}): {
  nextRevision: number;
  appliedOps: number;
  warnings: readonly string[];
}
```

Error Codes:

- `ENGINE_DOCUMENT_INVALID_CHANGESET`
- `ENGINE_DOCUMENT_REVISION_CONFLICT`

Determinism:

- Same `changeSet` + same `baseRevision` + same `schemaVersion` must produce identical output.

### engine.runtime.document.diffSnapshots(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.document.diffSnapshots(input: {
  base: EngineDocumentSnapshot;
  target: EngineDocumentSnapshot;
}): {
  addedNodeIds: readonly string[];
  removedNodeIds: readonly string[];
  updatedNodeIds: readonly string[];
}
```

Error Codes:

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

Determinism:

- Same `base` + same `target` must produce identical sorted node id diff lists.

### engine.runtime.document.rebaseChangeSet(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.document.rebaseChangeSet(input: {
  baseRevision: number;
  changeSet: EngineDocumentChangeSet;
}): EngineDocumentChangeSet
```

Error Codes:

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

Determinism:

- Same `baseRevision` + same `changeSet` must produce identical rebased output.

### engine.runtime.document.serializeSnapshot(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.document.serializeSnapshot(input: {
  snapshot: EngineDocumentSnapshot;
}): {
  payload: string;
}
```

Error Codes:

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

Determinism:

- Same `snapshot` must produce the same serialized payload.

### engine.runtime.document.deserializeSnapshot(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.document.deserializeSnapshot(input: {
  payload: string;
}): EngineDocumentSnapshot
```

Error Codes:

- `ENGINE_DOCUMENT_INVALID_CHANGESET`

Determinism:

- Same `payload` must produce an identical snapshot object.

## Related Contracts

- `packages/engine/src/runtime/document/document.foundation.contract.ts`
- `packages/engine/src/document/document-contracts.ts`
