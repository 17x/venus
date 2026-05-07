# Engine Module Boundaries

This document defines ownership, boundaries, and one-way dependencies for `@venus/engine`.

## Ownership Domains

- `src/math`, `src/time`, `src/utils`, `src/core`
  - Shared primitives and foundational utilities.
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

## File Header Policy

Every touched engine module must begin with a responsibility header comment that states:

- module ownership domain,
- core responsibility,
- explicit non-responsibility (what must stay outside this file).
