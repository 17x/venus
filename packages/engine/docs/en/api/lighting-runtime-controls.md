# Lighting Runtime Controls

This API provides a scenario-neutral lighting contract for 3D runtime orchestration.

## Namespace

- `engine.runtime.lighting`

## Methods

### `engine.runtime.lighting.setCollection(collection)`

Replace active runtime light collection.

```ts
engine.runtime.lighting.setCollection({
  lights: [
    {
      id: "key",
      type: "directional",
      color: "#ffffff",
      intensity: 1.1,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    },
    { id: "ambient", type: "ambient", color: "#f8fafc", intensity: 0.2 },
  ],
});
```

### `engine.runtime.lighting.getCollection()`

Read active runtime light collection.

### `engine.runtime.lighting.clearCollection()`

Clear active runtime light collection.

### `engine.runtime.lighting.applyProfile(profile)`

Apply built-in profile:

- `studio`
- `editor`
- `gameplay`

### `engine.runtime.lighting.resolveEnvironment(input)`

Resolves deterministic environment-driven lighting output without mutating active collection.

### `engine.runtime.lighting.applyEnvironment(input)`

Resolves deterministic environment-driven lighting output and applies resulting light collection.

```ts
engine.runtime.lighting.applyEnvironment({
  timeOfDayHours: 14.5,
  directionDeg: 35,
  cloudCover: 0.4,
  precipitation: 0.1,
  fogDensity: 0.05,
  directionalIntensity: 1.1,
  ambientIntensity: 0.25,
  additionalLights: [],
});
```

## Native Mesh Shading

The active light collection is forwarded into native mesh frame payloads. The WebGL native mesh presenter applies deterministic per-mesh shading before submitting draw colors:

- `ambient` lights add uniform color contribution.
- `hemisphere` lights blend sky and ground colors from the mesh surface normal.
- `directional` lights use the light target vector and mesh surface normal.
- `point` and `spot` lights use mesh center distance, decay, range, and surface direction.

Playground browser parity covers both the driving game and 3D editor routes by comparing canvas screenshots with lighting enabled and disabled. The S10 game route keeps lamp point lights as generic `point` entities so nearby surfaces visibly change without adding game-specific engine API names.

## Boundary Rules

- Keep domain semantics in app/runtime adapters.
- Engine accepts only generic light entities and profile tokens.
- Lighting APIs are runtime-scope orchestration controls, not product workflow APIs.
