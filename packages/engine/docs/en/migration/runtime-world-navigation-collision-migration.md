# Runtime World Navigation And Collision Migration

This guide defines how adapters should migrate from legacy `engine.runtime.world.*` movement/collision helpers to the canonical stable navigation and collision namespaces.

## Migration Goal

Use product-neutral 3D runtime APIs for movement and collision while keeping scenario semantics in app adapters.

Canonical namespaces:

- `engine.runtime.navigation.*`
- `engine.runtime.collision.*`

Compatibility aliases:

- `engine.runtime.world.setAgents`
- `engine.runtime.world.getAgents`
- `engine.runtime.world.stepAgents`
- `engine.runtime.world.resolveCollision`

The aliases remain available for compatibility, but new code should not use them.

## Mapping

| Compatibility API                                     | Canonical API                                      |
| ----------------------------------------------------- | -------------------------------------------------- |
| `engine.runtime.world.setAgents(agents)`              | `engine.runtime.navigation.setAgents(agents)`      |
| `engine.runtime.world.getAgents()`                    | `engine.runtime.navigation.getAgents()`            |
| `engine.runtime.world.stepAgents(input)`              | `engine.runtime.navigation.stepAgents(input)`      |
| `engine.runtime.world.resolveCollision(input)`        | `engine.runtime.collision.resolve(input)`          |
| `engine.runtime.world.setOpenWorldMap({ obstacles })` | `engine.runtime.collision.setObstacles(obstacles)` |

## Registered Path Migration

Adapters that previously passed raw paths every frame can register paths once and step bound agents deterministically.

```ts
engine.runtime.navigation.registerPath({
  id: "main-path",
  loop: false,
  nodes: [
    { x: 0, z: 0 },
    { x: 20, z: 0 },
  ],
  constraints: {
    arrivalTolerance: 0.5,
    maxStepDistance: 2,
  },
});

engine.runtime.navigation.setAgents([
  { id: "agent-a", kind: "car", x: 0, z: 0, yaw: 0, pathIndex: 0, speed: 8 },
]);

engine.runtime.navigation.stepPathAgents({
  deltaSeconds: 1 / 60,
  pathBindings: [{ agentId: "agent-a", pathId: "main-path" }],
});
```

## Collision Registry Migration

Adapters that previously replaced all obstacles every frame should prefer collider registration when objects change independently.

```ts
engine.runtime.collision.registerCollider({
  id: "building-a",
  x: 0,
  z: 0,
  width: 40,
  depth: 80,
});

const candidates = engine.runtime.collision.queryAabb({
  x: 0,
  z: 0,
  width: 64,
  depth: 64,
});
```

Use `evaluateTriggers` for deterministic enter/stay/exit trigger semantics.

Use `sweepCircle` for high-speed movement that needs continuous circle-vs-collider contact
before a discrete overlap pass can resolve penetration.

## Boundary Rules

- Keep labels such as game, city, vehicle, NPC, road, building, or pedestrian in app adapters.
- Engine payloads use generic agents, paths, obstacles, colliders, and trigger subjects.
- Do not introduce 2D-specific movement or collision APIs into engine runtime.
- Registered path constraints must remain numeric and deterministic.
- Observable trigger events must stay documented and covered by contract tests.

## Readiness Criteria

- App adapters call `engine.runtime.navigation.*` and `engine.runtime.collision.*` directly.
- Compatibility aliases are used only by older integrations or tests that explicitly prove alias parity.
- EN/CN docs and contract tests are updated in the same change as API changes.
- Scenario demos expose diagnostics showing canonical navigation/collision usage.
