# Capability API Reference (`engine.capability.*`)

Capability APIs are the only scene-agnostic composition surface for product scenarios.

## Scope

This page follows the staged rollout model:

1. `Implemented now`: APIs currently available on `EngineHandle.capability`.
2. `Planned packs`: roadmap anchors from full-surface governance.

Level: `advanced`
Stability: `beta`

## Implemented Now

### engine.capability.spatial.query(query)

```ts
engine.capability.spatial.query(query: EngineQueryBoundsInput): EngineQueryResult
```

Input contract:

- `query.x`
- `query.y`
- `query.width`
- `query.height`

Determinism:

- For equivalent graph state and query bounds, `nodeIds` ordering remains stable.

### engine.capability.picking.pick(point, options)

```ts
engine.capability.picking.pick(point: EnginePickPointInput, options?: EnginePickOptions): EnginePickResult
```

Output contract:

- Ordered `hits` list (`id`, `rank`) from highest to lowest priority.

### engine.capability.picking.raycast(ray, options)

```ts
engine.capability.picking.raycast(ray: EngineRayInput, options?: EngineRaycastOptions): EngineRaycastHit | null
```

Ray input fields:

- `originX`, `originY`, `originZ`
- `directionX`, `directionY`, `directionZ`

### engine.capability.diagnostics.getSummary()

```ts
engine.capability.diagnostics.getSummary(): EngineDiagnosticsSnapshot
```

Summary contract mirrors the diagnostics payload exposed by `engine.getDiagnostics()`.

### engine.capability.replay.createToken(scope)

```ts
engine.capability.replay.createToken(scope: string): EngineRuntimeReplayTokenOutput
```

### engine.capability.replay.validateToken(token)

```ts
engine.capability.replay.validateToken(token: string): { valid: boolean }
```

### engine.capability.replay.run(token)

```ts
engine.capability.replay.run(token: string): EngineRuntimeReplayOutput
```

### engine.capability.replay.export(token)

```ts
engine.capability.replay.export(token: string): { token: string; accepted: boolean }
```

## Planned Packs (Roadmap Anchors)

The following packs are defined in full-surface planning and remain tracked roadmap anchors:

- geometry
- view
- overlay/annotation
- timeline
- simulation
- resource/streaming
- render/composition
- gpu
- backend/session
- field
- geo
- media
- collaboration

Representative roadmap anchor examples:

- `engine.capability.geometry.setModel(model)`
- `engine.capability.view.setCamera(camera)`
- `engine.capability.render.renderFrame(request)`
- `engine.capability.replay.run(token)`

## Governance

1. Pack names are fixed and neutral.
2. Do not add product nouns to public API names.
3. New capability methods must include EN/CN docs and contract tests.
