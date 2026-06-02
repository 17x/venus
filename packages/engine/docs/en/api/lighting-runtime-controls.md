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
    { id: 'key', type: 'directional', color: '#ffffff', intensity: 1.1, targetX: 0, targetY: 0, targetZ: 0 },
    { id: 'ambient', type: 'ambient', color: '#f8fafc', intensity: 0.2 },
  ],
})
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
})
```

## Boundary Rules

- Keep domain semantics in app/runtime adapters.
- Engine accepts only generic light entities and profile tokens.
- Lighting APIs are runtime-scope orchestration controls, not product workflow APIs.
