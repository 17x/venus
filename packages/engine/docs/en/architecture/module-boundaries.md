# Engine Module Boundaries

This document defines ownership, boundaries, and one-way dependencies for `@venus/engine`.

## Ownership Domains

- `src/math`, `src/time`, `src/utils`, `src/core`
  - Shared primitives and foundational utilities.
  - `src/core/cache`, `src/core/hit`, and `src/core/camera` own backend-neutral
    geometry/tile cache contracts, layered command hit-testing, and camera
    projection helpers.
- `src/scene`
  - Scene storage, indexing, geometry contracts, world-bounds derivation.
- `src/interaction`
  - Interaction algorithms (hit-test, shape transform, zoom/pan math, snapping).
- `src/renderer`
  - Render planning and backends (WebGL/Canvas2D/tile/composite).
- `src/runtime`
  - Engine runtime orchestration and scheduler coordination.
- `src/worker`
  - Worker bridge/capability adapters.

## Public Module Layer

The user-facing module layer uses short capability names:

| Module | Purpose |
| --- | --- |
| `render` | Static rendering, scene updates, backend selection. |
| `camera` | Pan, zoom, fit, project, unproject. |
| `hitTest` | Hover, click, and query hit testing. |
| `select` | Selection state, marquee, handles, selection bounds. |
| `snap` | Grid, guide, object, and angle snapping. |
| `animate` | Keyframes and invalidation-aware animation. |
| `debug` | Inspect, overlays, frame timing, cache diagnostics. |
| `scale` | Culling, LOD, snapshot, tile, and cache strategy. |
| `effects` | Canvas2D fidelity rasterization and texture composition. |
| `history` | Commands, undo/redo, patch, replay. |
| `export` | PNG/SVG/PDF export and export settings. |

The default package entry may stay broad for compatibility. Advanced users can
start from the base entry:

```ts
import {createVenus, defineVenusModule} from '@venus/engine/base'

const debugNames = defineVenusModule({
  name: 'debug',
  install({venus}) {
    venus.on('render:after', () => console.log(venus.modules()))
  },
})

const venus = createVenus({
  modules: [debugNames],
})
```

Capability modules are installed per instance through constructor parameters.
The engine does not use a global `Venus.use(...)` registry.

## One-Way Dependency Rule

Allowed direction only:

- `math|time|utils|core -> (no renderer/runtime/worker)`
- `scene -> math|time|utils|core`
- `interaction -> scene|math|time|utils|core`
- `renderer -> scene|interaction|math|time|utils|core`
- `runtime -> renderer|scene|interaction|math|time|utils|core`
- `worker -> runtime|renderer|scene|interaction|math|time|utils|core`

Forbidden:

- Reverse dependencies (for example `scene -> renderer`, `renderer -> runtime`, `interaction -> runtime`).
- Backend-neutral document model, scene hit-test, geometry cache, tile cache,
  and camera helpers importing from `renderer/*`.

## Renderer WebGL Subsystem Boundaries

WebGL responsibilities are split by domain:

- `renderer/webgl/`
  - Backend orchestrator entry and frame-level control flow.
- `renderer/webglComposite/` + `renderer/webglInteractionPreview/`
  - Snapshot capture/reuse and interaction preview lane.
- `renderer/webgl*Capability.ts`
  - CRUD-style capability state machines for LOD/snapshot/tile-cache/tile-queue.
- `renderer/webglTiles.ts` + `renderer/webglTileTextureIO.ts`
  - Tile composition, tile upload/cropping, tile GPU IO.
- `renderer/webglResources.ts`, `renderer/webglTextures.ts`, `renderer/webglSurfaceHelpers.ts`, `renderer/webglRuntimeHelpers.ts`
  - Runtime helper and resource lifecycle utilities.

Rules:

- Helper/resource modules must not import backend orchestrator or capability modules.
- Capability modules must not import backend orchestrator.
- Orchestrator (`renderer/webgl/webgl.ts`) may depend on helper/resource/capability modules.

## Backend-Neutral Ownership

The following modules must stay isolated from renderer backend ownership:

- `scene/types/*`: render-facing scene/document model contracts.
- `scene/hitTest/*`: scene-state exact/coarse hit-test execution.
- `core/cache/*`: geometry and tile cache contracts.
- `core/hit/*`: layered draw-command hit-test policy.
- `core/camera/*`: project/unproject helpers.

`renderer/cache/*`, `renderer/hit/*`, and `renderer/camera/*` are compatibility
forwarders only. New code should import from `core/*` or the public package
barrel rather than treating renderer backend directories as the owner.

## File Header Policy

Every touched engine module must begin with a responsibility header comment that states:

- module ownership domain,
- core responsibility,
- explicit non-responsibility (what must stay outside this file).
