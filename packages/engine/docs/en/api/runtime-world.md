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

## Compatibility Runtime Helpers

These helpers remain available as compatibility aliases. New adapter code should prefer the canonical `engine.runtime.navigation.*` and `engine.runtime.collision.*` APIs described in [Runtime Navigation And Collision API](runtime-navigation-collision.md).

### engine.runtime.world.setOpenWorldMap(map)

Compatibility guidance:

- Use `engine.runtime.collision.setObstacles(obstacles)` when the adapter only needs collider/obstacle state.
- Keep map/domain size semantics in the adapter when possible.

```ts
engine.runtime.world.setOpenWorldMap(map: {
  mapSize: number;
  obstacles: readonly Array<{
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
  }>;
}): {
  mapSize: number;
  obstacles: readonly Array<{ id: string; x: number; z: number; width: number; depth: number }>;
}
```

### engine.runtime.world.getOpenWorldMap()

```ts
engine.runtime.world.getOpenWorldMap(): {
  mapSize: number;
  obstacles: readonly Array<{ id: string; x: number; z: number; width: number; depth: number }>;
}
```

### engine.runtime.world.setAgents(agents) / getAgents()

Compatibility guidance:

- Use `engine.runtime.navigation.setAgents(agents)` and `engine.runtime.navigation.getAgents()`.

```ts
type Agent = {
  id: string;
  kind: "car" | "pedestrian";
  x: number;
  z: number;
  yaw: number;
  pathIndex: number;
  speed: number;
};
```

### engine.runtime.world.stepAgents(input)

Compatibility guidance:

- Use `engine.runtime.navigation.stepAgents(input)` for raw per-step paths.
- Use `engine.runtime.navigation.registerPath(...)` plus `stepPathAgents(...)` for registered reusable paths.

```ts
engine.runtime.world.stepAgents(input: {
  deltaSeconds: number;
  carPath: readonly Array<{ x: number; z: number }>;
  pedestrianPath: readonly Array<{ x: number; z: number }>;
}): readonly Agent[];
```

### engine.runtime.world.resolveCollision(input)

Compatibility guidance:

- Use `engine.runtime.collision.resolve(input)`.
- Use `registerCollider(...)`, `queryAabb(...)`, and `evaluateTriggers(...)` when richer collision orchestration is required.

```ts
engine.runtime.world.resolveCollision(input: {
  x: number;
  z: number;
  radius: number;
  velocityX?: number;
  velocityZ?: number;
}): {
  x: number;
  z: number;
  velocityX: number;
  velocityZ: number;
  collided: boolean;
}
```
