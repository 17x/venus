# Engine Direction

Status: active

This is the repository-level brief for `@venus/engine` and its relationship to
Vector. Detailed API truth belongs in engine types, tests, package docs, and
[engine-local restrictions](../packages/engine/AI/ENGINE_RESTRICTIONS.md). The
[module inventory](../packages/engine/AI/MODULE_INVENTORY.md) tracks current
implementation ownership.

## Product boundary

- Engine is an embeddable graphics mechanism: document-tree mechanics,
  geometry, render planning/backends, spatial indexing, hit-testing, selection
  mechanics, layer ordering, export mechanics, and history-ready patches.
- Vector is the product and validation app: UI, tools, commands, shortcuts,
  file/persistence policy, presets, and product-specific decisions.
- `@venus/ui` owns reusable UI primitives/themes without document or engine
  policy.
- Vector must not become a second graphics engine. Engine must not absorb editor
  product policy.

Generic capability moves from Vector to engine only through a scoped migration
that adds engine tests and removes the replaced app implementation.

## Runtime architecture

The always-enabled base owns document storage, nested order, base rendering,
geometry/spatial services, layer mechanics, revision data, and base events.

Optional modules are installed per engine instance:

| Module | Responsibility |
| --- | --- |
| `camera` | Pan, zoom, fit, project, unproject |
| `hitTest` | Detailed point/rect/anchor/stroke/fill hits |
| `interaction` | Selection, marquee, snapping, overlay geometry |
| `animate` | Scheduler-backed interpolation |
| `history` | Patch/revision undo and redo |
| `export` | SVG/raster/node/selection output |
| `debug` | Diagnostics and traces |
| `effects` | Reusable shadow/blur/effect mechanics |

Modules are installation and documentation units, not runtime namespaces.
Public calls stay flat:

```ts
venus.hitTest(point)
venus.selectInRect(rect)
venus.exportSVG(options)
```

An uninstalled optional capability must be absent from a narrowed typed entry or
throw a clear module-not-installed error.

## Rendering

- WebGL is the primary composition and interaction backend.
- Canvas2D is the fidelity rasterization path for complex 2D features and may
  upload textures for WebGL composition; it is not merely a legacy fallback.
- Base renders stable document content.
- Overlay renders non-document selection, hover, handles, guides, and debug
  geometry.
- Active renders high-frequency interaction previews and commits back to base.

Vector chooses styling and interaction policy. Engine owns reusable overlay and
active geometry/mechanics.

## Document and geometry model

- Public documents are plain serializable data; proxies and caches are runtime
  state only.
- Keep distinct authored nodes for rect, ellipse/arc, line, polygon, star, path,
  text, image, frame, group, clip, and mask-like structures.
- Group is structure-only and derives bounds from descendants.
- Frame owns bounds and may own tested background/clip/export behavior.
- Host apps own asset persistence/loading policy; engine owns image geometry,
  diagnostics, render lookup, and export behavior.
- Clip graphs must validate missing references, self-reference, cycles, rules,
  and inline geometry. Render, hit-test, and export must agree.

Do not force all vector nodes to inherit from `path`. Instead, derive one
engine-owned canonical geometry payload containing authored/render/hit kinds,
outline, geometry/stroke/handle/visual bounds, hit regions, render commands,
point counts, and a cache key. Render, hit-test, overlay, marquee, transforms,
export, and dirty-bounds invalidation consume the same payload.

Canonical package APIs include:

- `resolveEngineShapeGeometry`
- `resolveEngineClipGeometry`
- `resolveRenderableNodeWorldBounds`
- `resolveRenderableNodesWorldBounds`
- `resolveEngineGeometryRotationAroundPoint`
- `rotateEnginePointAroundPoint`
- `resolveEngineViewportWorldBounds`
- `resolveEngineViewportWorldRect`

Viewport, culling, frame-plan, and tile coverage must use the same viewport-world
helpers. Overscan is expressed in CSS pixels and converted through scale. Tests
must cover asymmetric overscan, negative scale, predictive pan tiles, stale
shortlists, and transparent/offscreen tile-cache protection.

## Current alignment

| Area | Current baseline | Next requirement |
| --- | --- | --- |
| Nodes | Common Vector nodes are represented; star remains native point-authored geometry | Complete field/default/render/hit/export parity |
| Tree | Nested replace/remove/insert/reparent exists | Engine-owned cross-parent transactions and visual parity |
| Selection | Root selection and basic rect selection exist | Spatial/cache broad phase and richer metadata |
| Layers | Root sibling-order APIs exist | Patch/revision results and structure events |
| Export | Root SVG/PNG/JPEG and scoped SVG exist | Scoped raster and clip/resource parity |
| Clip | Graph validation, container hit pruning, and inline SVG clip exist | Node-reference render/hit/export parity |
| Overlay | Selection/hover payloads exist | Transform/anchor handles and active-set API |
| Performance | Spatial, culling, tile, and cache pieces exist | One canonical bounds/geometry path and invalidation coverage |

## Execution order

1. Keep contracts, docs, and typed events synchronized with public APIs.
2. Complete canonical geometry and full-chain shape tests.
3. Complete base tree/layer patch and revision results.
4. Complete clip, text, image, resource, and export parity.
5. Move generic selection/hit/overlay mechanics from Vector and delete replaced
   app logic.
6. Extract reusable Vector UI only after component contracts are product-free.

Each slice stays within one package/app unless the user authorizes a global
migration. A cross-scope migration must state both ownership and cleanup before
editing.

## Acceptance

- Root APIs are flat, typed, documented, gated, and tested.
- Events provide revisions and affected ids without mutable internal data.
- Authored, derived, and cached fields are not confused or serialized together.
- Vector uses engine mechanisms for migrated generic behavior and keeps product
  policy locally.
- No parallel old/new path remains after a migration.
- Relevant engine, Vector, UI, lint, and typecheck gates pass for the authorized
  scope.
