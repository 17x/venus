# Runtime World API (`engine.runtime.world.*`)

Audience: Foundation/runtime world integrators and orchestration tooling.

## Scope

This page defines the first frozen runtime world foundation endpoints for Batch-2.

## Endpoints

### engine.runtime.world.compileFromDocument(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.world.compileFromDocument(input: {
  snapshot: EngineDocumentSnapshot;
}): {
  worldRevision: number;
  entities: readonly EngineRuntimeEntity[];
}
```

Error Codes:

- `ENGINE_WORLD_NOT_COMPILED`

Determinism:

- Same input snapshot must produce identical world revision and entity ordering.

### engine.runtime.world.getWorldSnapshot()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.world.getWorldSnapshot(): {
  worldRevision: number;
  entities: readonly EngineRuntimeEntity[];
}
```

Error Codes:

- `ENGINE_WORLD_NOT_COMPILED`

Determinism:

- Same compiled document revision must yield identical entity ordering in snapshot output.

### engine.runtime.world.queryEntity(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.world.queryEntity(input: {
  entityId: string;
}): {
  found: boolean;
  entity: EngineRuntimeEntity | null;
}
```

Error Codes:

- `ENGINE_WORLD_NOT_COMPILED`

Determinism:

- Same world snapshot and same entity id must produce identical lookup output.

### engine.runtime.world.queryComponent(input)

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.world.queryComponent(input: {
  component: "transform" | "geometry" | "material" | "visibility" | "picking";
}): {
  entityIds: readonly string[];
}
```

Error Codes:

- `ENGINE_WORLD_NOT_COMPILED`

Determinism:

- Same world snapshot and same component key must produce identical entity id ordering.

### engine.runtime.world.getGraphStats()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.world.getGraphStats(): {
  worldRevision: number;
  entityCount: number;
}
```

Error Codes:

- `ENGINE_WORLD_NOT_COMPILED`

Determinism:

- Same runtime world snapshot must yield identical `worldRevision` and `entityCount`.

### engine.runtime.world.clear()

Level: `foundation`
Stability: `beta`

```ts
engine.runtime.world.clear(): {
  clearedEntityCount: number;
}
```

Error Codes:

- `ENGINE_WORLD_NOT_COMPILED`

Determinism:

- Same pre-clear world state must produce identical `clearedEntityCount`.

## Related Contracts

- `packages/engine/src/runtime/world/runtime-world.foundation.contract.ts`
- `packages/engine/src/scene-runtime/runtimeWorld/runtimeWorld.contract.ts`
- `packages/engine/src/ecs/runtimeWorld.ts`
