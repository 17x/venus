# Engine Module Inventory

Status: Highest priority  
Scope: `packages/engine/src`  
Last updated: 2026-06-29

This inventory classifies the current source tree into internal foundations,
user capability modules, renderer backend ownership, validation support, and
cleanup targets. It is the working checklist for `MOD-P0-001` and
`CLEAN-P0-001`.

## Public User Capability Names

Reserved short names:

| Name | Purpose | Current source ownership |
| --- | --- | --- |
| `render` | static render, scene updates, backend selection | `runtime/createEngine`, `renderer`, `core/render` |
| `camera` | pan, zoom, project, unproject, fit | `interaction/viewport`, `interaction/zoom`, `interaction/viewportPan`, `core/camera` |
| `hitTest` | hover/click/query hit testing | `scene/hitTest`, `interaction/hitTest`, `core/hit` |
| `select` | selected ids, marquee, handles, selection bounds | partial support in `interaction/geometryPayload` |
| `snap` | grid/object/guide/angle snapping | `interaction/snapping` |
| `animate` | keyframes, invalidation-aware animation | `animation`, `runtime/venus` |
| `debug` | inspect, overlays, frame timing, cache diagnostics | `runtime/venus`, renderer diagnostics |
| `scale` | culling, LOD, snapshot, tile/cache strategy | `renderer/zoomPerformance`, `renderer/tileManager`, `renderer/tileScheduler`, WebGL capabilities |
| `effects` | Canvas2D fidelity rasterization and texture composition | `renderer/canvas2d`, `renderer/fallbackTaxonomy`, WebGL texture helpers |
| `history` | commands, undo/redo, patch/replay | planned; scene patch exists |
| `export` | PNG/SVG/PDF/exportSettings | planned |

## Internal Foundations

| Foundation | Current folders/files | Notes |
| --- | --- | --- |
| `core/document` | `scene/types`, `runtime/venus` | Public Venus node model is currently in runtime. Future move should be deliberate and test-backed. |
| `core/scene-store` | `scene/store`, `scene/patch`, `scene/indexing`, `scene/buffer` | Store, patch, index, and render buffer are internal foundations, not user modules. |
| `core/geometry` | `math/matrix`, `scene/geometry`, `scene/worldBounds`, `interaction/shapeTransform` | Geometry math must stay backend-neutral. |
| `core/spatial` | `scene/spatial`, `scene/hitPlan`, `scene/framePlan` | Spatial index and candidate plans are internal; users consume them through hit/snap/scale. |
| `core/geometry-cache` | `core/cache/geometryCache` | Used by hit/snap/scale/effects; not a normal public module. |
| `core/invalidation` | `runtime/venus` mutation classification, render diagnostics | Needs extraction only after invalidation semantics stabilize. |
| `core/viewport` | `interaction/viewport`, `core/camera` | Camera module should consume this service, not own viewport state. |
| `core/render-plan` | `renderer/plan`, `core/render`, `core/compose` | Frame plan and layered command composition sit below public render. |
| `core/scheduler` | `runtime/renderScheduler`, `runtime/createEngine/frameBudgetBroker`, `renderer/tileScheduler` | Frame scheduling and tile scheduling should keep separate names. |
| `core/resource` | `renderer/webgl/runtime/resources`, `renderer/webgl/runtime/textures`, `renderer/canvas2d/text` | Font/image lifecycle is scattered and needs later consolidation. |
| `core/backend-bridge` | `renderer/canvas2d`, `renderer/webgl`, `renderer/webgl/preview`, `renderer/layers` | WebGL presentation and Canvas2D fidelity bridge must be explicit. |

## Renderer Backend Ownership

| Area | Current folders/files | Ownership rule |
| --- | --- | --- |
| Canvas2D fidelity | `renderer/canvas2d` | Owns high-fidelity shape/text/clip rasterization. |
| WebGL presentation | `renderer/webgl` | Owns packet, pipeline, runtime resources, tile upload, and composition. |
| Layered rendering | `renderer/layers`, `core/render`, `core/compose` | Backend-neutral command contracts stay in `core`; execution stays in `renderer`. |
| Fallback taxonomy | `renderer/fallbackTaxonomy` | Diagnostic taxonomy for WebGL vs Canvas2D fallback decisions. |
| Scale/performance internals | `renderer/zoomPerformance`, `renderer/tileManager`, `renderer/tileScheduler`, WebGL capabilities | User-facing module name is `scale`; internal files can remain specific. |

## Validation and Support

| Folder | Classification | Notes |
| --- | --- | --- |
| `bench` | validation support | Benchmark scenarios are not shipped user modules. |
| `worker` | environment support | Capability adapters; must not own document semantics. |
| `demo` | local human demo | Keep small and aligned with engine-docs examples. |
| `docs` | human-readable docs | AI working docs belong in `AI`. |
| `AI` | AI planning and audits | Highest-priority roadmap and inventories live here. |

## Cleanup Targets

| Target | Reason | Priority |
| --- | --- | --- |
| `renderer/webglComposite` | Duplicate-looking compatibility path next to `renderer/webgl/preview/composite`. Audit importers before moving/removing. | P0 audit |
| `renderer/webglInteractionPreview` | Duplicate-looking compatibility path next to `renderer/webgl/preview/interaction`. Audit importers before moving/removing. | P0 audit |
| `interaction/lod*` + `renderer/zoomPerformance` | Belongs to public `scale` capability but names are scattered. Keep internals specific; docs should expose `scale`. | P0 naming |
| `runtime/createEngine` vs `runtime/venus` | `createEngine` remains low-level compatibility; `Venus` is the product-facing instance API. Docs must prefer `new Venus()` / `createVenus()`. | P0 docs |
| `scene` vs `core` naming | Some foundations still live under `scene` because they predate the new internal taxonomy. Do not move without boundary tests. | P1 refactor |

## Current Code Contract

- `@venus/engine/base` exports `Venus`, `createVenus`, `defineVenusModule`, module names, internal service names, and module contract types.
- `new Venus({modules: [...]})` installs user capability modules at construction time.
- `defineVenusModule(...)` validates reserved short names for module authors.
- Modules receive `VenusModuleContext` with `venus`, `parameters`, and a read-only internal service registry.
- Runtime currently registers `document`, `viewport`, and `invalidation` services.
- `VenusRegisteredServiceMap` provides typed `services.get(...)` contracts for registered services.
- `services.require(...)` provides a typed fail-fast path for mandatory module dependencies.
- `module.requires` validates required internal services before `install(...)` runs.
- `module.dependsOn` validates user-module dependencies in caller-provided install order.
- Service objects returned from the registry are stable shallow-frozen facades.
- Auto backend fallback is observable through `backend:fallback` and `venus.inspect().backendFallback`.
- Module installation state is observable through `venus.inspect().modules`.
- Backend strategy is WebGL-first, Canvas2D direct for deterministic fallback/docs/tests, and Canvas2D-to-texture for fidelity features that WebGL composites.
- Animation mutates backend-neutral document fields; invalidation class decides whether to reuse geometry, reuse textures, rerasterize fidelity content, or rebuild geometry.
- The global `Venus.use(...)` pattern is intentionally not introduced.
- Internal service names are reserved even when a service has not yet been registered in runtime code.

## Next Task Slices

1. Expand registered services from `document` and `viewport` to geometry/cache/scheduler as those contracts stabilize.
2. Add import-boundary tests that internal foundations never import user capability module entrypoints.
3. Audit duplicate WebGL preview/composite compatibility folders before deleting or renaming anything.
4. Register the next stable internal services in this order: `geometry`, `geometryCache`, `spatial`, `scheduler`, then `backendBridge`.
5. Add backend diagnostics for Canvas2D-to-texture cache hit/miss and last invalidation class before expanding the `effects` module.
6. Keep `apps/engine-docs` synchronized with each new public service, document model property, and backend diagnostic.
