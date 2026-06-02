# Runtime Navigation And Collision API

This API provides scenario-neutral movement and collision orchestration for 3D runtime scenes.

## Namespace

- `engine.runtime.navigation`
- `engine.runtime.collision`

Stability: `stable`

## Navigation

### `engine.runtime.navigation.setAgents(agents)`

Replaces the active navigation-agent collection.

```ts
engine.runtime.navigation.setAgents([
  { id: "agent-a", kind: "car", x: 0, z: 0, yaw: 0, pathIndex: 0, speed: 4 },
])
```

### `engine.runtime.navigation.getAgents()`

Returns the active navigation-agent snapshot.

### `engine.runtime.navigation.registerPath(path)`

Registers or replaces one waypoint path.

```ts
engine.runtime.navigation.registerPath({
  id: "path-east",
  loop: true,
  nodes: [{ x: 0, z: 0 }, { x: 100, z: 0 }],
  constraints: {
    arrivalTolerance: 0.5,
    maxStepDistance: 2,
  },
})
```

Path constraints are optional:

- `arrivalTolerance` controls the distance threshold that advances the agent to the next waypoint.
- `maxStepDistance` clamps how far an agent may move in one step.
- `loop: false` stops the agent once it reaches the final waypoint instead of wrapping to node `0`.

### `engine.runtime.navigation.unregisterPath(pathId)`

Removes one registered path by id and returns `{ removed, pathCount }`.

### `engine.runtime.navigation.getPaths()`

Returns registered navigation paths in deterministic order.

### `engine.runtime.navigation.stepAgents(input)`

Advances active agents along deterministic waypoint paths.

```ts
engine.runtime.navigation.stepAgents({
  deltaSeconds: 1 / 60,
  carPath: [{ x: 0, z: 0 }, { x: 100, z: 0 }],
  pedestrianPath: [{ x: 0, z: 0 }, { x: 0, z: 100 }],
})
```

### `engine.runtime.navigation.stepPathAgents(input)`

Advances active agents using registered paths and optional agent-to-path bindings.

```ts
engine.runtime.navigation.stepPathAgents({
  deltaSeconds: 1 / 60,
  pathBindings: [{ agentId: "agent-a", pathId: "path-east" }],
})
```

## Collision

### `engine.runtime.collision.registerCollider(collider)`

Registers or replaces one collider in the active collision registry.

```ts
engine.runtime.collision.registerCollider({
  id: "blocker-a",
  x: 0,
  z: 0,
  width: 40,
  depth: 40,
})
```

### `engine.runtime.collision.unregisterCollider(colliderId)`

Removes one collider by id and returns `{ removed, colliderCount }`.

### `engine.runtime.collision.setObstacles(obstacles)`

Replaces the active collision obstacle set.

```ts
engine.runtime.collision.setObstacles([
  { id: "blocker-a", x: 0, z: 0, width: 40, depth: 40 },
])
```

### `engine.runtime.collision.getObstacles()`

Returns the active collision obstacle snapshot.

### `engine.runtime.collision.queryAabb(input)`

Runs a deterministic broadphase AABB query against the active collider registry.

```ts
engine.runtime.collision.queryAabb({
  x: 0,
  z: 0,
  width: 64,
  depth: 64,
})
```

### `engine.runtime.collision.evaluateTriggers(input)`

Evaluates deterministic trigger events for one subject against the active collider registry.
The method returns `enter`, `stay`, and `exit` events and emits `engine.collision.trigger`
when at least one trigger event is produced.

```ts
engine.runtime.collision.evaluateTriggers({
  subjectId: "subject-a",
  x: 0,
  z: 0,
  radius: 5,
})
```

### `engine.runtime.collision.resolve(input)`

Resolves one circle-vs-AABB collision pass against active obstacles.

```ts
engine.runtime.collision.resolve({
  x: 1,
  z: 1,
  radius: 5,
  velocityX: 10,
  velocityZ: 0,
})
```

## Compatibility

The older `engine.runtime.world.setAgents`, `stepAgents`, and `resolveCollision` methods remain available as compatibility aliases while consumers migrate to the more specific navigation/collision namespaces.

## Boundary Rules

- API names stay product-neutral.
- Scenario labels such as game, city, vehicle, or pedestrian belong in app adapters.
- Engine operates on generic agents, waypoint paths, obstacles, and collision inputs.
