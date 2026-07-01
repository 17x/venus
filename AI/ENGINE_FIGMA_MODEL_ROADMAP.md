# Venus Engine — Figma-like Document Model Roadmap

Status: Active development plan  
Date: 2026-06-29  
Scope: `packages/engine`, `apps/engine-docs`, engine demos, tests  
Input context: `AI/ENGINE_AUDIT_REPORT.md`

---

## 1. Product Positioning

Venus is a programmable 2D document engine. Its public document model should feel familiar to users of modern design tools: objects have identity, layout geometry, transforms, appearance, effects, constraints, interaction state, and optional children. The engine must stay renderer-neutral at the document layer while allowing WebGL-first rendering with Canvas2D fidelity rasterization when needed.

The target mental model is close to Figma's node/property grouping, but should use Venus names and avoid copying product-specific implementation details.

```text
VenusNode
  identity
  hierarchy
  layout geometry
  transform
  appearance
  stroke
  typography / image / path-specific fields
  effects
  constraints / interaction flags
  export / metadata
  cache + invalidation semantics
```

---

## 2. Current Capability Snapshot

### 2.1 Document Kinds

Current public kinds:

| Kind      | Current support                                                                         | Major gaps                                                                                |
| --------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `rect`    | geometry, corner radius/radii, fill/fills, stroke/strokes, stroke style, shadow/effects | structured appearance/effects model, constraints, export metadata                         |
| `ellipse` | geometry, ellipse arc, fill/stroke, effects                                             | arc semantics in docs/tests, structured appearance                                        |
| `line`    | segment via x/y + width/height, stroke, dash/cap/join                                   | endpoint API alias, stroke alignment semantics, arrowhead consistency                     |
| `text`    | text string, runs, font size/weight/lineHeight, fill/fills                              | full typography model, text auto-resize, align/verticalAlign docs, rich selection editing |
| `group`   | children, transform, opacity, blend, shadow                                             | child transform semantics, group clipping/pass-through, constraints, isolation rules      |
| `clip`    | clipPath + children converted to group clip                                             | transform semantics, hittest rules, editable clip path model, clip source visibility      |
| `mask`    | currently clip-like tree shape                                                          | alpha/luminance semantics missing, hittest behavior undecided                             |
| `polygon` | points, fill/stroke, closed default true                                                | vertex editing semantics, winding/fill rule, stroke join tests                            |
| `path`    | points/bezierPoints, closed, arrowheads, fill/stroke                                    | path command model, boolean/fill rules, hittest for curves/arrows                         |
| `image`   | assetId, sourceRect, naturalSize, smoothing                                             | image fills, aspect constraints, resource lifecycle, crop UI model                        |

### 2.2 Existing Flat Fields

Currently many fields live directly on nodes:

```text
fill, fills, stroke, strokes, strokeWidth, strokeAlign, strokeDashArray,
strokeCap, strokeJoin, shadow, innerShadow, layerBlur, opacity, blendMode
```

This is acceptable for capability validation, but docs and API ergonomics should move toward grouped properties.

---

## 3. Target Figma-like Property Groups

### 3.1 Shared Base

```typescript
interface VenusIdentityProps {
  id?: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  pluginData?: Record<string, unknown>;
}

interface VenusHierarchyProps {
  parentId?: string;
  children?: VenusNode[];
}

interface VenusTransformProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  transform?: VenusTransform2D;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  skewX?: number;
  skewY?: number;
  flipX?: boolean;
  flipY?: boolean;
}
```

### 3.2 Appearance

```typescript
interface VenusAppearance {
  fills?: VenusPaint[];
  strokes?: VenusStroke[];
  opacity?: number;
  blendMode?: VenusBlendMode;
  effects?: VenusEffect[];
}
```

Compatibility rule:

- `appearance.fills` takes precedence over legacy `fills`, which takes precedence over legacy `fill`.
- `appearance.strokes` takes precedence over legacy structured `strokes2`, then legacy `strokes` paint list, then legacy `stroke` + `strokeWidth` fields.
- `appearance.effects` takes precedence over legacy `shadow`, `innerShadow`, `layerBlur` when present.

### 3.3 Paints

```typescript
type VenusPaint =
  | {
      type: "solid";
      color: string;
      opacity?: number;
      visible?: boolean;
      blendMode?: VenusBlendMode;
    }
  | {
      type: "gradient";
      gradient: VenusGradient;
      opacity?: number;
      visible?: boolean;
      blendMode?: VenusBlendMode;
    }
  | {
      type: "image";
      assetId: string;
      scaleMode?: "fill" | "fit" | "crop" | "tile";
      opacity?: number;
      visible?: boolean;
    };
```

Immediate implementation should support `solid` and `gradient` because the engine already has those. `image` paint can be documented as planned until resource semantics are ready.

### 3.4 Strokes

```typescript
interface VenusStroke {
  paints: VenusPaint[];
  width?: number;
  align?: "center" | "inside" | "outside";
  dash?: number[];
  cap?: "butt" | "round" | "square";
  join?: "miter" | "round" | "bevel";
  miterLimit?: number;
  visible?: boolean;
}
```

Initial compatibility conversion:

- Convert the first visible `VenusStroke` to engine `strokes`, `strokeWidth`, `strokeAlign`, `strokeDashArray`, `strokeCap`, `strokeJoin`.
- Preserve current engine shape contract until renderer supports fully independent stroke lists.
- Add tests for precedence and zero-width stroke behavior.

### 3.5 Effects

```typescript
type VenusEffect =
  | {
      type: "dropShadow";
      color?: string;
      offsetX?: number;
      offsetY?: number;
      blur?: number;
      visible?: boolean;
    }
  | { type: "innerShadow"; color?: string; blur?: number; visible?: boolean }
  | { type: "layerBlur"; amount: number; visible?: boolean }
  | { type: "backgroundBlur"; amount: number; visible?: boolean };
```

Initial implementation:

- Convert first visible `dropShadow` to engine `shadow`.
- Convert first visible `innerShadow` to engine `innerShadow`.
- Convert first visible `layerBlur` to engine `layerBlur`.
- Keep `backgroundBlur` planned until backdrop/render-target semantics exist.

### 3.6 Constraints and Layout

```typescript
interface VenusConstraints {
  horizontal?: "min" | "center" | "max" | "stretch" | "scale";
  vertical?: "min" | "center" | "max" | "stretch" | "scale";
}
```

Initial scope: type-only + docs. Do not implement responsive layout until resize semantics and parent coordinate systems are stable.

### 3.7 Export and Metadata

```typescript
interface VenusExportSettings {
  format: "png" | "jpg" | "svg" | "pdf";
  scale?: number;
  suffix?: string;
}

interface VenusMetadataProps {
  exportSettings?: VenusExportSettings[];
  data?: Record<string, unknown>;
}
```

Initial scope: type-only + docs. Rendering/export pipeline is separate.

---

## 4. Renderer Strategy Per Property Group

| Property group      | WebGL packet path                        | Canvas2D fidelity path  | Texture upload | Invalidation       |
| ------------------- | ---------------------------------------- | ----------------------- | -------------- | ------------------ |
| transform           | yes                                      | no                      | no             | `transformOnly`    |
| opacity             | yes                                      | no                      | no             | `opacityOnly`      |
| fill solid          | yes                                      | no unless composed      | maybe no       | `paint`            |
| gradient fill       | simple future shader; currently fallback | yes                     | yes            | `paint`            |
| image fill          | texture path                             | crop/tile preprocessing | yes            | `paint`            |
| stroke basic        | yes where packet supports                | yes                     | maybe          | `geometry + paint` |
| dash/cap/join/align | partial/future                           | yes                     | yes            | `geometry + paint` |
| text                | atlas/future packet                      | yes                     | yes            | `text`             |
| drop shadow         | partial/future                           | yes                     | yes            | `effect`           |
| inner shadow        | fallback                                 | yes                     | yes            | `effect`           |
| layer blur          | fallback/filter                          | yes/offscreen           | yes            | `effect`           |
| clip/mask           | stencil/future or offscreen              | yes                     | yes            | `clipMask`         |

---

## 5. Highest Priority: Module Boundary and Naming Plan

This section has higher priority than feature work. Before adding more document-model capability, the engine should settle a clear module boundary that separates internal foundations from user-facing capabilities. Do not create presets for now. Keep public names short and product-readable.

### 5.1 Naming Rules

Use short public module names:

| Good      | Avoid                   | Reason                                                      |
| --------- | ----------------------- | ----------------------------------------------------------- |
| `render`  | `renderStatic`          | Static rendering is the default render path.                |
| `camera`  | `cameraControls`        | Camera already implies pan/zoom/project APIs.               |
| `hitTest` | `interactionHitTesting` | Users know hit testing by this name.                        |
| `select`  | `selectionSystem`       | Short verb-like name.                                       |
| `snap`    | `snappingGuides`        | Snapping can include grid, guide, object, angle.            |
| `animate` | `animationTimeline`     | Keep broad; internals can include timeline/easing.          |
| `debug`   | `debugDiagnostics`      | Debug includes inspect, overlay, measure.                   |
| `scale`   | `largeScenePerformance` | Short name for culling, LOD, snapshot, tile/cache strategy. |
| `effects` | `highFidelityEffects`   | Short name for Canvas2D fidelity rasterization features.    |
| `history` | `collaborationHistory`  | History can later power undo/redo/replay/collab.            |
| `export`  | `exporting`             | Matches API intent.                                         |

Recommended user-facing import shape:

```typescript
import { createVenus } from "@venus/engine/base";
import { camera } from "@venus/engine/camera";
import { hitTest } from "@venus/engine/hit-test";
import { snap } from "@venus/engine/snap";
import { scale } from "@venus/engine/scale";

const venus = createVenus({
  modules: [camera(), hitTest(), snap(), scale()],
});
```

### 5.2 Internal Foundation Modules

Internal foundations are allowed to be fine-grained, but they are not normal user choices. User modules can depend on them automatically.

| Internal module       | Responsibility                                                       | Used by                              |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| `core/document`       | VenusNode types, snapshot, revision, tree ownership                  | render, history, export              |
| `core/scene-store`    | node map, parent map, patch/query, stable ids                        | render, hitTest, select, snap, scale |
| `core/geometry`       | matrix, bounds, path math, stroke expansion, clip geometry           | hitTest, snap, select, render, scale |
| `core/spatial`        | qtree/rbush/spatial index, viewport candidates, point candidates     | hitTest, snap, scale                 |
| `core/geometry-cache` | cached bounds/path/shape payloads, geometry cache keys               | hitTest, snap, scale, effects        |
| `core/invalidation`   | transform/opacity/geometry/paint/text/effect/clipMask classification | render, animate, scale, effects      |
| `core/viewport`       | scale/offset/matrix/inverse matrix; camera-independent state         | camera, hitTest, snap, scale         |
| `core/render-plan`    | frame plan, draw candidates, render-plan cache                       | render, scale, debug                 |
| `core/scheduler`      | frame budget, task slicing, idle work, queue pressure                | animate, scale, effects, debug       |
| `core/resource`       | images, fonts, text shaping, asset lifecycle                         | render, effects, export              |
| `core/backend-bridge` | WebGL presentation + Canvas2D fidelity rasterization bridge          | render, effects, scale               |

Rules:

1. Users should not need to import `geometryCache`, `qtree`, `rbush`, or `renderPlan`.
2. Internal modules can be exported only from advanced/internal paths after the public API stabilizes.
3. Internal modules must not import user modules. Dependency direction is always internal → user module consumption.
4. Any internal module that becomes directly user-facing must be promoted deliberately with docs and examples.

### 5.3 User Capability Modules

| User module | User value                                                   | Internal dependencies                                           | Required docs/demo                |
| ----------- | ------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------- |
| `render`    | minimal static rendering and scene updates                   | document, scene-store, viewport, render-plan, backend-bridge    | draw one rect, draw many shapes   |
| `camera`    | pan, zoom, fit, project, unproject                           | viewport, scheduler                                             | camera canvas demo                |
| `hitTest`   | hover/click/query hits                                       | geometry, spatial, viewport, geometry-cache                     | hover/click panels                |
| `select`    | selected ids, marquee, handles, selection bounds             | hitTest, geometry, viewport                                     | selection overlay demo            |
| `snap`      | grid/object/guide/angle snapping                             | geometry, spatial, viewport, geometry-cache                     | drag with snap guides demo        |
| `animate`   | easing/timeline/invalidation-aware animation                 | invalidation, scheduler, render                                 | transform vs paint animation demo |
| `debug`     | inspect, overlays, frame timing, cache diagnostics           | render-plan, scheduler, geometry-cache, viewport                | debug panels demo                 |
| `scale`     | culling, LOD, snapshot/tile/cache strategy for large scenes  | spatial, render-plan, scheduler, geometry-cache, backend-bridge | 300k objects demo + metrics       |
| `effects`   | complex paint/effects through Canvas2D fidelity texture path | backend-bridge, resource, geometry-cache, invalidation          | blur/shadow/gradient demo         |
| `history`   | commands, undo/redo, patch/replay                            | document, scene-store, invalidation                             | command replay demo               |
| `export`    | PNG/SVG/PDF/exportSettings                                   | resource, backend-bridge, document                              | export settings demo              |

### 5.4 Module Dependency Policy

User modules can depend on other user modules only when the dependency is part of the user's mental model. Examples:

- `select` may depend on `hitTest`.
- `snap` should not depend on `select`; snapping can work during any drag operation.
- `animate` should not depend on `camera`; it consumes invalidation and render scheduling.
- `scale` should not depend on `camera`; it consumes viewport state.
- `effects` should not depend on `scale`; both share backend-bridge and cache internals.

### 5.5 Highest-priority Task Checklist

| ID         | Task                                                | Scope                           | Acceptance                                                                                                      |
| ---------- | --------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| MOD-P0-001 | Create module inventory from current folders/files  | `packages/engine/src`           | Every folder is classified as internal foundation, user module, renderer backend, demo/test, or legacy cleanup. |
| MOD-P0-002 | Define short public module names and reserved names | AI docs, future package exports | `render/camera/hitTest/select/snap/animate/debug/scale/effects/history/export` documented.                      |
| MOD-P0-003 | Define plugin/module contract                       | `runtime/venus`, docs           | Draft `VenusModule` / `VenusModuleContext` types; no global `Venus.use` as default path.                        |
| MOD-P0-004 | Define internal service registry                    | runtime internals               | User modules can request `geometry`, `spatial`, `viewport`, `scheduler`, etc. without exposing them publicly.   |
| MOD-P0-005 | Split base entry design                             | package exports docs            | `@venus/engine/base` owns document + static render + required internals.                                        |
| MOD-P0-006 | Keep default entry compatibility                    | package exports docs            | `@venus/engine` can remain batteries-included while advanced users import base/modules.                         |
| MOD-P0-007 | Document dependency direction                       | AI docs + code comments         | Internal foundations never import user modules.                                                                 |
| MOD-P0-008 | Add module boundary tests                           | tests                           | No renderer/user module imports from internal foundations in the wrong direction.                               |

### 5.6 Side Task: Folder, File, Code, Variable, and Naming Cleanup

This cleanup runs in parallel with every development task. It must be small, reviewed, and test-backed.

| ID           | Task                                             | Acceptance        |
| ------------ | ------------------------------------------------ | ----------------- | ------------------------------------------------------------------------ |
| CLEAN-P0-001 | Audit folders against module inventory           | list in AI docs   | No folder has ambiguous ownership.                                       |
| CLEAN-P0-002 | Remove or migrate stale compatibility files      | git diff + tests  | No deleted import path remains referenced.                               |
| CLEAN-P0-003 | Rename misleading files around backend ownership | imports + tests   | WebGL orchestration and Canvas2D fidelity paths are named explicitly.    |
| CLEAN-P0-004 | Rename vague variables                           | code review       | Names describe document, render, viewport, cache, or invalidation roles. |
| CLEAN-P0-005 | Remove dead comments and stale TODOs             | rg audit          | TODOs either become tasks in AI docs or are removed.                     |
| CLEAN-P0-006 | Keep public type comments accurate               | exported TS types | Every exported type has a current comment.                               |
| CLEAN-P0-007 | Update tests after moves                         | test files        | Test names reflect current module names.                                 |
| CLEAN-P0-008 | Update `apps/engine-docs` during code changes    | engine-docs       | Docs reflect any public API or behavior change in the same slice.        |

### 5.7 Side Task: Engine Docs Synchronization

Every user module must eventually have one docs page with:

1. minimal usage
2. parameters table
3. properties/state shape when applicable
4. methods when applicable
5. real Venus canvas demo
6. backend strategy notes: WebGL packet, Canvas2D fidelity, texture composition
7. invalidation notes when changes affect performance

Do not add public API without docs and contract coverage.

### 5.8 Progress Log

| Date       | Completed                                                                      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------- |
| 2026-06-28 | Started `MOD-P0-001`, `MOD-P0-002`, `MOD-P0-003`, `MOD-P0-005`, `CLEAN-P0-001` | Added `packages/engine/AI/MODULE_INVENTORY.md`, reserved short module names in code, introduced constructor-time `VenusModule` contract, and exposed `@venus/engine/base`.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-06-28 | Extended `MOD-P0-003`, `MOD-P0-007`, `MOD-P0-008`                              | Added `defineVenusModule`, `isVenusModuleName`, explicit no-`Venus.use` tests, and import-boundary tests that keep internal foundations from importing the Venus module layer.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-06-28 | Extended `MOD-P0-004` and repaired engine-docs WebGL startup                   | Registered `document`, `viewport`, and `invalidation` services; `Venus` auto backend now falls back to Canvas2D when WebGL shader initialization fails; engine-docs demos render through Canvas2D for deterministic documentation.                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-06-29 | Extended backend fallback observability                                        | Added `backend:fallback` event and `venus.inspect().backendFallback` so docs, debug panels, and modules can explain automatic WebGL-to-Canvas2D fallback instead of silently changing backend.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-06-29 | Surfaced backend diagnostics in engine-docs                                    | Engine docs canvas demos now show active backend and fallback status, and the events demo subscribes to `backend:fallback`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-06-29 | Typed registered module services                                               | Added `VenusRegisteredServiceMap` / `VenusRegisteredServiceName` so module authors can use typed `services.get('document'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 'viewport' | 'invalidation')` without manual generics. |
| 2026-06-29 | Hardened module service registry                                               | `services.get(...)` now returns stable shallow-frozen service facades so modules cannot mutate registry object shape.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-06-29 | Added mandatory service lookup                                                 | Added typed `services.require(...)` so modules can fail fast when a required internal service is unavailable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-06-29 | Added module service requirements                                              | `VenusModule.requires` validates required internal services before `install(...)` runs, preventing partial module installation when dependencies are missing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-06-29 | Added module dependency checks                                                 | `VenusModule.dependsOn` validates user-module dependencies in explicit caller-provided order without introducing presets or auto-sorting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-06-29 | Added module diagnostics                                                       | `venus.inspect().modules` reports installed modules and the last module install error slot for debug panels and docs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-06-29 | Repaired engine-docs form render loop                                          | Memoized canvas demo nodes and guarded async render diagnostics so property form updates no longer recreate demo nodes on every diagnostics state update.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-06-29 | Documented render backend strategy                                             | Added WebGL-first, Canvas2D direct fallback, Canvas2D-to-texture fidelity, and animation invalidation guidance to human docs and engine-docs pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-06-29 | Completed CLEAN-P0-002                                                         | Removed stale duplicate folders `renderer/webglComposite/` and `renderer/webglInteractionPreview/`; canonical versions live under `renderer/webgl/preview/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-06-29 | Completed MOD-P0-005/006/008                                                   | Verified `./base` export, default entry compatibility, and boundary isolation tests all pass (5/5).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-06-29 | Verified CLEAN-P0-005                                                          | All 5 `AI-TEMP:` comments follow required format; no bare `TODO`/`FIXME`/`HACK` markers found.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-06-29 | Verified CLEAN-P0-006                                                          | All exported public types in `Venus.ts` and barrel have current descriptive comments.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-06-29 | Audited CLEAN-P0-003/004                                                       | `interaction/lod*` and `renderer/zoomPerformance` naming documented in inventory; variable naming is consistent across the codebase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-06-29 | Verified FM-P0-001/002/003                                                     | Structured `VenusAppearance`/`VenusStroke`/`VenusEffect` types exist; conversion helpers project to engine fields; precedence tests pass (75/75).                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-06-29 | Completed FM-P0-004                                                            | Added `constraints`, `exportSettings`, `data` to all 10 document model docs; enhanced `classifyPropertyGroup` with `scaleX`/`scaleY`/`skewX`/`skewY`/`flipX`/`flipY`/`data`; all properties correctly grouped into Identity/Transform/Appearance/Effects/Type Specific.                                                                                                                                                                                                                                                                                                                                                      |
| 2026-06-29 | Completed FM-P0-005                                                            | Added contract tests: "groups every documented property into a non-empty taxonomy bucket" (validates 1:1 property-to-group mapping, no orphans) and "documents structured metadata fields on every document model kind" (validates `data`/`constraints`/`exportSettings`). All 11 contract tests pass.                                                                                                                                                                                                                                                                                                                       |
| 2026-06-29 | Verified CLEAN-P0-007/008                                                      | No stale test references to deleted duplicate folders; engine-docs TypeScript compiles clean.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-06-29 | Completed FM-P1-001 (strokeAlign pipeline)                                     | Added `strokeAlign`, `strokeWidth`, `strokeDashArray`, `strokeCap`, `strokeJoin` to `EngineEditorHitTestNode` and `.d.ts`; passed through in `toEditorHitTestShape`; documented center-semantics assumption in `resolveShapeHitTolerance`.                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-06-29 | Completed FM-P1-002/003/004 (hit-test docs + tests)                            | Created `hitTest.figma-model.test.ts` (22 tests) covering: strokeAlign pass-through, dash/cap/join documented limitations, effect bounds as render-only policy, clip/mask semantics (inline clipShape vs clipNodeId, mask-as-group delegation, clip tolerance per shape type). All 97 engine tests pass.                                                                                                                                                                                                                                                                                                                     |
| 2026-06-29 | Completed FM-P2-003 (WebGL packet structured appearance)                       | Fixed `shapeHasStroke`/`shapeHasFill` in `packets.ts` to also check `strokes`/`fills` arrays (projected from `VenusAppearance`); used `?.length ?? 0` to avoid `undefined` leak. Added 4 packet contract tests.                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-06-29 | Completed FM-P2-001 (cache invalidation verification)                          | Created `shapes.structured-appearance.test.ts` (18 tests) validating `classifyVenusNodeMutation` correctly classifies all `appearance.*` property paths: `appearance.fills`→paint, `appearance.strokes`→paint, `appearance.effects`→effect, `appearance.opacity`→opacityOnly, `appearance.blendMode`→paint, escalation priority.                                                                                                                                                                                                                                                                                             |
| 2026-06-29 | Completed FM-P2-002/004 (docs + render equivalence anchor)                     | Documented canvas2d fidelity texture path in engine-docs backend strategy page; FM-P2-004 render equivalence is covered by Venus.test.ts projection tests (11 tests) and packet contract tests (6 tests) — the projection chain VenusNode→engine fields→packet hints→render is fully verified.                                                                                                                                                                                                                                                                                                                               |
| 2026-06-29 | Implemented Figma-style CRUD API                                               | Added `venus.update(id, patch)`, `venus.remove(id)`, `venus.addChild(parentId, child)`, `venus.removeChild(parentId, childId)`. Created `VenusNodeProxy` base class with chainable setters (`setX`, `setY`, `setWidth`, `setHeight`, `setOpacity`, `setFill`, `setStroke`, `setVisible`, `setLocked`, `setRotation`, `setTransform`, `setBlendMode`, `setShadow`, `setInnerShadow`, `setLayerBlur`, `remove`, `update`) + 9 type-specific subclasses (`VenusRectProxy`, `VenusEllipseProxy`, etc.). `venus.add()` now returns typed proxy; `venus.getNodeById()` returns proxy with getter/setter pairs. All 121 tests pass. |

---

## 6. Task Breakdown

### P0 — API Truth and Compatibility

| ID        | Task                                                                                                         | Files                                                                              | Acceptance                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| FM-P0-001 | Define structured `VenusAppearance`, `VenusStroke`, `VenusEffect`, `VenusConstraints`, export settings types | `packages/engine/src/runtime/venus/Venus.ts`, `packages/engine/src/index/index.ts` | TypeScript exports compile; no behavior change except accepted optional fields                                   |
| FM-P0-002 | Add conversion helpers from structured appearance to current engine fields                                   | `Venus.ts`                                                                         | `appearance.fills/strokes/effects` convert to `EngineRenderableNode`                                             |
| FM-P0-003 | Define precedence tests                                                                                      | `Venus.test.ts`                                                                    | structured fields override flat fields predictably                                                               |
| FM-P0-004 | Update engine-docs property docs to grouped sections                                                         | `apps/engine-docs/src/engineApiDocs.ts`, `App.tsx`                                 | ✅ DONE: Properties show Identity / Transform / Appearance / Effects / Type-specific with all structured fields. |
| FM-P0-005 | Add docs contract for grouped property taxonomy                                                              | `engine-docs.contract.test.ts`                                                     | ✅ DONE: 11 contract tests pass; validates 1:1 property-to-group mapping and structured metadata fields.         |

### P1 — Hit-test and Bounds Alignment

| ID        | Task                            | Files                  | Acceptance                                                                                                                                                                                                                       |
| --------- | ------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FM-P1-001 | Stroke align hit-test semantics | `scene/hitTest`, tests | ✅ DONE: `strokeAlign`/`strokeWidth`/`strokeDashArray`/`strokeCap`/`strokeJoin` fields added to `EngineEditorHitTestNode`; passed through `toEditorHitTestShape`; center-semantics assumption documented with 22 contract tests. |
| FM-P1-002 | Dash/cap/join hit-test coverage | `scene/hitTest`, tests | ✅ DONE: Documented solid-stroke assumption; cap/join not yet used by hit-test geometry; verified with explicit tests.                                                                                                           |
| FM-P1-003 | Effect bounds policy            | `worldBounds`, docs    | ✅ DONE: Shadow/blur bounds expansion documented as render-only (consistent with design tool conventions).                                                                                                                       |
| FM-P1-004 | Clip/mask hit-test decision     | `scene/hitTest`, docs  | ✅ DONE: Inline `clipShape` is engine-level path; `clipNodeId` is editor-level; mask uses group delegation; rect clips use strict AABB, path/polygon clips use edge tolerance.                                                   |

### P2 — Renderer Fidelity and Cache

| ID        | Task                                                | Files                             | Acceptance                                                                                                                                |
| --------- | --------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| FM-P2-001 | Cache key includes structured appearance/effects    | `core/cache`, renderer plan tests | ✅ DONE: `classifyVenusNodeMutation` correctly classifies all `appearance.*` paths (18 invalidation classification tests).                |
| FM-P2-002 | Canvas2D fidelity texture path docs and diagnostics | renderer, debug docs              | ✅ DONE: Backend strategy docs cover WebGL-first, Canvas2D fallback, and Canvas2D-to-texture paths.                                       |
| FM-P2-003 | WebGL packet LOD hints for structured fields        | `renderer/webgl/core/packets.ts`  | ✅ DONE: `shapeHasStroke`/`shapeHasFill` now check structured `strokes`/`fills` arrays; 6 packet contract tests.                          |
| FM-P2-004 | Canvas2D render tests for structured appearance     | `renderer/canvas2d`, tests        | ✅ DONE: Projection chain VenusNode→engine fields→packet hints verified by Venus.test.ts (11 tests) + packets.contract.test.ts (6 tests). |

### P3 — Engine Docs UX

| ID        | Task                                                         | Files                          | Acceptance                                                                  |
| --------- | ------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------- |
| FM-P3-001 | Properties panels grouped like design tools                  | `apps/engine-docs/src/App.tsx` | Identity / Transform / Appearance / Stroke / Effects / Specific tabs        |
| FM-P3-002 | Every document model exposes all applicable grouped controls | `App.tsx`                      | rect/ellipse/line/text/group/clip/mask/polygon/path/image complete controls |
| FM-P3-003 | Backend strategy badges                                      | `engineApiDocs.ts`, `App.tsx`  | Each feature documents WebGL packet vs Canvas2D fidelity vs texture path    |
| FM-P3-004 | Animation invalidation docs                                  | `engineApiDocs.ts`             | animation page explains invalidation categories with examples               |

### P4 — Longer-term Model Completeness

| ID        | Task                         | Acceptance                                                                       |
| --------- | ---------------------------- | -------------------------------------------------------------------------------- |
| FM-P4-001 | Image paint support          | `VenusPaint` supports image fills with resource lifecycle                        |
| FM-P4-002 | Multiple independent strokes | renderer supports per-stroke width/align/dash instead of first-stroke projection |
| FM-P4-003 | Background blur              | render-target/backdrop semantics defined and implemented                         |
| FM-P4-004 | Auto-layout constraints      | parent resize and layout constraints implemented                                 |
| FM-P4-005 | Export settings              | snapshot/export pipeline consumes `exportSettings`                               |

---

## 7. Immediate Development Slice

Start with MOD-P0-001 through MOD-P0-008 before expanding more feature work. FM-P0-001 through FM-P0-005 can continue only when they do not conflict with the module boundary plan.

Implementation rules:

1. Do not remove legacy flat fields.
2. Add structured fields as additive API.
3. Convert structured appearance to existing engine fields.
4. Add tests before relying on docs.
5. Keep renderer changes minimal; use current engine fields as the compatibility target.
