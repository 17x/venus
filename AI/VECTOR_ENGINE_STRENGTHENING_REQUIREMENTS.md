# Vector / Engine Strengthening Requirements

**Date:** 2026-07-04
**Status:** Active master requirement
**Owner:** Engine architecture / Vector validation / UI library extraction
**Inputs:**

- `AI/AI_HIGHEST_STANDARD.md`
- `AI/VECTOR_ENGINE_CAPABILITY_ALIGNMENT_TASK.md`
- `AI/VECTOR_ENGINE_CAPABILITY_MATRIX.md`
- `packages/engine/AI/ENGINE_RESTRICTIONS.md`
- `packages/engine/AI/MODULE_INVENTORY.md`
- `packages/engine/docs/en/api/base-and-modules.md`
- `packages/engine/docs/en/architecture/module-boundaries.md`
- `apps/engine-docs/src/engineApiDocs.ts`
- `apps/vector-editor-web/src/runtime/**`
- `apps/vector-editor-web/src/product/**`
- `apps/vector-editor-web/src/views/**`
- `apps/vector-editor-web/src/ui/**`
- `packages/ui/src/**`

This document merges the current Vector/Engine capability matrix, the alignment
task, and the new engine-strengthening requirement into one executable task
document. Future work that moves generic Vector capability into engine, migrates
Vector to root-level engine APIs, or extracts Vector UI into `@venus/ui` must use
this document as the scope source.

## 0. Mandatory Protocol

Every non-trivial change must follow `AI/AI_HIGHEST_STANDARD.md` in this exact
order:

1. Scope Definition
2. Type Definition
3. CHANGE REQUEST
4. Test Design
5. Implementation
6. Validation
7. Cleanup Check

No code change may start before a CHANGE REQUEST exists.

Required CHANGE REQUEST shape:

```md
[CHANGE REQUEST]

Target:

- File / Module:

Goal:

- Problem being solved:

Change Type:

- Add / Modify / Remove

Impact:

- Affected modules:

Cleanup:

- Old logic to remove:

Tests:

- Tests to add/update:
```

## 1. Core Goal

Strengthen `@venus/engine` so Vector becomes a validation application for engine
capabilities instead of a parallel graphics system.

Benchmark positioning:

- `@venus/engine` should feel like the embeddable mechanism layer of Paper.js or
  Fabric.js: stable drawing/document/runtime APIs, deterministic events,
  geometry/render/export primitives, and no product UI policy.
- Vector should feel like the Figma-style product layer on top: documents,
  panels, command flows, design-tool UX, shortcuts, file policy, and validation
  scenarios that prove engine capability in real editing workflows.
- The combination is intentional: engine is not a full Figma clone; Vector is
  not allowed to become a second Paper.js/Fabric.js hidden inside the app.

The desired end state:

- Engine owns reusable document model mechanics, base render mechanics, geometry
  cache, spatial index, hit-test, selection, layer ordering, clip validation,
  export, history-ready patch data, overlay model primitives, active render
  primitives, and viewport/math helpers.
- Vector owns product shell, menus, shortcuts, UI panels, product command policy,
  app persistence, file format adapters, preset scenarios, and engine validation
  surfaces.
- `@venus/ui` owns reusable UI primitives, commercial/editor UI components, and
  Vector theme tokens that are not product-specific.
- Public engine calls stay flat on the root instance, for example
  `venus.hitTest(...)`, `venus.selectInRect(...)`, `venus.exportSVG(...)`.
- Modules remain install units, documentation categories, and package entries;
  they are not runtime namespaces.
- Internal engine files remain small and mechanism-owned; public modules export
  larger coherent capability surfaces.
- No new package dependency may be added unless a future CHANGE REQUEST proves
  the current workspace cannot reasonably support the capability.

Current document model policy:

- Vector and engine node type coverage is sufficient for the current phase.
- Sufficient type coverage does not mean the document models are complete.
  Existing node fields, defaults, derived values, mutation logic, invalidation,
  render behavior, hit-test behavior, export behavior, and Vector mapping must
  still be completed against the competitor comparison in section 5.
- Do not add new top-level node types before the API, event, and field contracts
  below are defined, documented, and covered by tests.
- New fields on existing node types are allowed only through a CHANGE REQUEST
  that proves a root API, event payload, render behavior, hit/export behavior,
  and Vector workflow need the field.
- Product-only Vector persistence fields must stay outside engine unless they
  become generic graphics mechanics.

## 2. Ownership Boundaries

### 2.1 Repository Layer DAG

Allowed dependency edges:

- `app -> editor-primitive`
- `app -> engine`
- `app -> lib`
- `app -> ui`
- `editor-primitive -> lib`
- `engine -> lib`
- `ui -> lib` only for generic helpers, not engine/product semantics

Forbidden:

- `engine -> app`
- `engine -> ui`
- `editor-primitive -> engine`
- `ui -> engine`
- cross-layer private imports
- product command policy inside engine

### 2.2 Engine Boundary

Engine is mechanism-only:

- document tree mechanics
- render-facing scene conversion
- base/overlay/active render layers
- geometry cache
- spatial index
- viewport/camera math
- hit-test algorithms
- selection candidate mechanics
- layer order mechanics
- clip graph validation
- export traversal/render serialization
- history-ready patch and revision data
- module installation and service registry

Engine must not own:

- toolbar/panel UI
- product shortcuts
- product command naming
- file menu behavior
- Vector-specific business policy
- React state composition
- DOM/SVG overlay UI implementation

### 2.3 Vector Boundary

Vector may be destructively refactored.

Vector should keep:

- product shell
- command/menu/shortcut entry points
- tool state machine
- panels and inspectors
- app-specific document persistence
- import/save file format policy
- fixture and QA scenarios for engine
- adapters that map product-only extensions to engine data

Vector should remove or downgrade:

- duplicate generic document node contract
- duplicate generic bounds/path/cache math
- duplicate layer ordering mutation
- duplicate selection geometry filtering
- duplicate hit-test classifier
- duplicate export traversal/render traversal
- generic overlay model core builder
- generic active-render preview mechanics

### 2.4 UI Boundary

`packages/ui` is the reusable UI library.

It should own:

- shared primitives
- form controls
- buttons, inputs, menus, modals, cards, separators, tooltips
- Vector-compatible theme tokens
- Vector editor UI components that are reusable outside Vector
- tests for component behavior, style entry, and theme exports

It must not own:

- Vector document model
- engine runtime calls
- file/command/product state
- panel-specific business policy

## 3. Module Architecture Direction

### 3.1 Base And Extra Modules

Engine has one default base module plus optional extra modules.

Base module must be enabled by default and provide the smallest useful document
and render runtime:

- document tree storage
- root and nested child order
- group/frame/clip/image/text basic model behavior
- base render pipeline
- geometry cache and spatial index registration
- base dirty bounds and render scheduling hooks
- layer ordering API
- root-level event emission for document/render/layer changes

Optional modules are installed per `Venus` instance:

| Module | Role | Default |
| --- | --- | --- |
| `base` | document tree, base render, layer order, base services | enabled |
| `camera` | viewport fit, pan, zoom, project, unproject | optional |
| `hitTest` | pointer/rect/anchor/stroke/fill/bounds hit detail | optional |
| `interaction` | selection state, marquee, snap, overlay interaction model | optional |
| `animate` | scheduler-backed interpolation and animation invalidation | optional |
| `history` | patch/revision undo-redo integration | optional |
| `export` | SVG/raster/node/selection export | optional |
| `debug` | diagnostics, traces, debug overlays | optional |
| `effects` | effect helpers for shadows/blur | optional |

### 3.2 Flat Public API Rule

Public engine API must not expose `venus.module.method(...)`.

Allowed:

```ts
venus.hitTest(point, options)
venus.querySelectionInRect(rect, options)
venus.getLayerOrder(parentId)
venus.exportSVG(options)
```

Forbidden:

```ts
venus.hitTest.hitTest(point)
venus.interaction.selection.get()
venus.export.svg(options)
```

When an optional module is not installed, one of two strategies is allowed:

- the method is absent from the typed surface for a narrowed base-only entry; or
- the method throws a clear `module "<name>" is not installed` error.

Current root `Venus` compatibility may keep throwing methods, but docs and tests
must make the behavior explicit.

### 3.3 Small Internal Modules, Large Public Modules

Implementation files should stay small and responsibility-scoped.

Preferred shape:

- internal files: one mechanism per file
- module directory: collects related internals
- public module entry: exports one coherent capability module
- root `Venus`: delegates to module APIs and stable services

Do not create `utils.ts`, `helpers.ts`, `common.ts`, `new`, `v2`, or temporary
parallel paths.

Do not introduce an abstraction until the behavior has at least two real usages
or removes meaningful existing duplication.

### 3.4 API And Event Contract Gate

Before implementing or changing a public API or event, the contract must be
defined in this document or a linked package-local API contract document.

Required contract fields:

- owner module
- root API name or event name
- lifecycle status: `required`, `planned`, `compatibility`, or `deprecated`
- purpose
- parameters or payload
- return value for APIs
- emission timing for events
- no-op behavior
- module gating behavior
- JSDoc/comment requirement
- required tests

Implementation is blocked when any required contract field is missing.

Contract naming rules:

- Root APIs use verb-first names: `add`, `update`, `remove`, `hitTest`,
  `selectInRect`, `exportSVG`.
- Events use domain-qualified names: `document:changed`, `layer:changed`,
  `selection:changed`, `export:completed`.
- Event names must describe a completed or observable lifecycle point.
- Do not introduce aliases unless the alias is temporary compatibility with an
  `AI-TEMP:` removal condition.
- Do not introduce module namespaces on the runtime surface.

### 3.5 Root API Contract Catalog

All APIs in this table are root-level calls on a `Venus` instance unless marked
as package entrypoints.

| Owner | API | Status | Requirement | Comment/JSDoc Contract |
| --- | --- | --- | --- | --- |
| package | `new Venus(parameters)` | required | Creates one isolated engine runtime with default `base` plus optional modules. | Document constructor parameters, module install semantics, and that modules are per instance. |
| package | `createVenus(parameters)` | required | Package helper equivalent to `new Venus(parameters)`. | Comment as a convenience factory; no hidden global registry. |
| package | `defineVenusModule(module)` | required | Validates a module definition and its reserved short name. | Document `name`, `dependsOn`, `requires`, and `install`. |
| base | `modules()` | required | Returns installed module names in install order. | State that `base` appears by default. |
| base | `on(eventName, handler)` | required | Subscribes to typed runtime events and returns unsubscribe. | Document event name, handler payload, and unsubscribe return. |
| base | `off(eventName, handler)` | required | Removes a handler registered with the same function reference. | Document no-op behavior when handler is absent. |
| base | `add(node)` | required | Adds a document node or subtree and returns a typed proxy. | Document source node ownership, id assignment, revision increment, and `document:node-added`/`document:changed` emission. |
| base | `update(id, patch)` | required | Applies a shallow document patch. | Document no-op when id is missing, mutation classification, revision behavior, and node update events. |
| base | `remove(id)` | required | Removes a node or subtree. | Document parent-local removal, no-op when id is missing, revision behavior, and remove events. |
| base | `children()` | required | Returns root document nodes without flattening containers. | Document readonly/snapshot expectations; callers must not depend on internal mutation. |
| base | `getNodeById(id)` | required | Returns a proxy for one document node or null. | Document null behavior and proxy mutation path. |
| base | `getParentId(id)` | required | Returns parent id or null for root nodes. | Document that frame/group/clip children are indexed. |
| base | `bounds()` | required | Returns aggregate world/document bounds. | Document empty bounds behavior and derived group bounds. |
| base | `snapshot()` | required | Returns render-facing engine scene snapshot. | Document that snapshot is render-facing, not product file format. |
| base | `mount(canvas)` | required | Mounts render backend to a canvas. | Document backend creation, `mounted`, and fallback behavior. |
| base | `resize(size)` | required | Updates viewport/output dimensions. | Document no-op before mount and `resized` emission after mounted resize. |
| base | `render()` | required | Renders current snapshot to mounted backend. | Document no-op before mount and `render:before`/`render:after` events. |
| base | `destroy()` | required | Releases runtime/backend subscriptions and emits destroy. | Document idempotency and `destroyed` emission. |
| base | `setDefaultFillColor(color)` | required | Sets runtime fallback fill used only when a node lacks fill data. | Document revision and render invalidation behavior. |
| base | `setDefaultStrokeColor(color)` | required | Sets runtime fallback stroke used only when a node lacks stroke data. | Document revision and render invalidation behavior. |
| base | `getLayerIndex(id)` | required | Reads node index among siblings. | Document `-1` for missing nodes. |
| base | `getLayerOrder(parentId)` | required | Reads parent-local child order. | Document root behavior for null/undefined parent. |
| base | `moveLayer(id, index)` | required | Moves a node within its sibling list. | Target return is `VenusLayerMutationResult`; numeric return is compatibility only while callers migrate. |
| base | `moveBefore(id, targetId)` | required | Moves a node before a sibling target. | Document cross-parent rejection and no-op behavior. |
| base | `moveAfter(id, targetId)` | required | Moves a node after a sibling target. | Document cross-parent rejection and no-op behavior. |
| base | `bringForward(id)` | required | Moves one sibling one step forward. | Document no-op at front. |
| base | `sendBackward(id)` | required | Moves one sibling one step backward. | Document no-op at back. |
| base | `bringToFront(id)` | required | Moves one sibling to the highest index. | Document layer result payload and event emission. |
| base | `sendToBack(id)` | required | Moves one sibling to index zero. | Document layer result payload and event emission. |
| base | `group(ids, options)` | required | Wraps sibling nodes in a structure-only group. | Document same-parent requirement and child geometry preservation. |
| base | `ungroup(id)` | required | Lifts a structure-only group's children into its parent. | Document frame/clip/mask restrictions and order preservation. |
| base | `addChild(parentId, child)` | required | Adds a child to frame/group/clip/mask. | Document parent validation and structure event behavior. |
| base | `removeChild(parentId, childId)` | required | Removes a child from frame/group/clip/mask. | Document no-op behavior and subtree indexing cleanup. |
| base | `validateClipGraph(snapshot?)` | required | Validates clip references, cycles, rules, and inline geometry. | Document result issue codes and default current snapshot. |
| base | `resolveClipDependencies(nodeId, snapshot?)` | required | Returns direct/transitive clip node ids. | Document cycle handling and missing node behavior. |
| camera | `fitBounds(bounds, padding?)` | required | Computes and applies viewport that fits document bounds. | Document camera module gating and return viewport fields. |
| camera | `zoomTo(scale, anchor?)` | required | Applies zoom around an optional screen anchor. | Document scale clamp policy and anchor invariance. |
| camera | `panBy(delta)` | required | Applies screen-space pan delta. | Document viewport return and no document mutation. |
| camera | `project(point)` | required | Converts document point to screen point. | Document camera module gating. |
| camera | `unproject(point)` | required | Converts screen point to document point. | Document camera module gating. |
| hitTest | `hitTest(point, options?)` | required | Returns topmost detailed hit. | Document coordinate space, tolerance, locked policy, and `hit` event. |
| hitTest | `hitTestAll(point, options?)` | required | Returns all detailed hits in paint order. | Document topmost-first sorting and target metadata. |
| interaction | `getSelection()` | required | Returns readonly selected id snapshot. | Document snapshot immutability. |
| interaction | `setSelection(ids, options?)` | required | Replaces selection. | Document filtering policy, event behavior, and no-op duplicate suppression. |
| interaction | `select(ids, options?)` | required | Adds ids to selection. | Document single and array forms. |
| interaction | `deselect(ids)` | required | Removes ids from selection. | Document no-op missing ids. |
| interaction | `selectAll(options?)` | required | Selects selectable document nodes. | Document root/subtree policy. |
| interaction | `clearSelection()` | required | Clears selection. | Document no-op when already empty. |
| interaction | `isSelected(id)` | required | Checks one id. | Document boolean return. |
| interaction | `onSelectionChange(handler)` | compatibility | Existing convenience subscription. | Prefer `on('selection:changed', ...)`; keep only with removal criteria. |
| interaction | `querySelectionInRect(rect, options?)` | required | Returns ids matching marquee rectangle. | Document coordinate space, contain/intersect policy, and locked/hidden/container options. |
| interaction | `selectInRect(rect, options?)` | required | Applies marquee selection results. | Document replace/add/subtract/toggle behavior and event emission. |
| interaction | `getSelectionOverlay(options?)` | planned | Returns generic selection overlay geometry. | Document that Vector owns styling, engine owns geometry. |
| interaction | `getHoverOverlay(options?)` | planned | Returns generic hover overlay geometry. | Document dependency on hit state. |
| interaction | `getTransformHandles(nodeIds, options?)` | planned | Returns transform handle positions. | Document camera/viewport coordinate policy. |
| interaction | `getAnchorHandles(nodeId, options?)` | planned | Returns path/line anchor handle geometry. | Document path/line support scope. |
| animate | `animate(id, keyframes, options?)` | required | Runs numeric property interpolation. | Document controller lifecycle, cancellation, and invalidation class. |
| history | `undo()` | required | Applies previous engine document patch/snapshot. | Document false return when unavailable. |
| history | `redo()` | required | Applies next engine document patch/snapshot. | Document false return when unavailable. |
| history | `canUndo()` | required | Reports undo availability. | Document graceful false when history module absent if kept. |
| history | `canRedo()` | required | Reports redo availability. | Document graceful false when history module absent if kept. |
| history | `clearHistory()` | required | Clears undo/redo stacks. | Document no document mutation. |
| export | `exportPNG(options?)` | required | Exports current canvas/scene to PNG. | Document mount/resource requirements and failure event. |
| export | `exportJPEG(options?)` | required | Exports current canvas/scene to JPEG. | Document background/quality defaults. |
| export | `exportSVG(options?)` | required | Serializes scene to SVG. | Document clip/text/image support and `respectClip`. |
| export | `exportNode(id, options?)` | required | Exports one node/subtree. | Document missing node error and scoped viewBox behavior. |
| export | `exportSelection(options?)` | required | Exports current selection. | Document empty selection error and selection module dependency. |
| export | `toPNG(options?)` | compatibility | Temporary alias for `exportPNG`. | Must carry compatibility docs and removal condition before deletion. |
| export | `toJPEG(options?)` | compatibility | Temporary alias for `exportJPEG`. | Must carry compatibility docs and removal condition before deletion. |
| export | `toSVG(options?)` | compatibility | Temporary alias for `exportSVG`. | Must carry compatibility docs and removal condition before deletion. |
| effects | `applyDropShadow(id, shadow)` | required | Applies drop shadow effect metadata. | Document effect projection and repaint class. |
| effects | `removeDropShadow(id)` | required | Removes drop shadow metadata. | Document no-op missing effect. |
| effects | `applyInnerShadow(id, shadow)` | required | Applies inner shadow metadata. | Document supported node scope. |
| effects | `removeInnerShadow(id)` | required | Removes inner shadow metadata. | Document no-op missing effect. |
| effects | `applyLayerBlur(id, blur)` | required | Applies layer blur metadata. | Document render invalidation class. |
| effects | `removeLayerBlur(id)` | required | Removes layer blur metadata. | Document no-op missing effect. |
| effects | `clearEffects(id)` | required | Clears supported effect metadata. | Document remaining unsupported effects policy. |
| debug | `enableDebug(options)` | required | Enables diagnostics surfaces. | Document returned flags and debug overlay refresh. |
| debug | `inspect()` | required | Returns runtime/backend/module diagnostics. | Document snapshot semantics and no mutation. |
| debug | `measureFrame()` | required | Measures one render frame. | Document null before mount and timing units. |

### 3.6 Event Contract Catalog

All events are subscribed through `venus.on(eventName, handler)` and removed
through `venus.off(eventName, handler)` or the unsubscribe returned by `on`.

| Owner | Event | Status | Emission Requirement | Payload Contract | Comment/JSDoc Contract |
| --- | --- | --- | --- | --- | --- |
| base | `mounted` | required | Emit once per successful `mount`. | `{canvas}` | Document that backend may already have fallen back before this event. |
| base | `resized` | required | Emit after mounted output resize succeeds. | `{width, height}` | Document no event when resize is called before mount. |
| base | `render:before` | required | Emit immediately before loading/rendering current snapshot. | `{revision}` | Document render no-op before mount. |
| base | `render:after` | required | Emit after backend render frame resolves. | `{revision}` | Document same revision as rendered snapshot. |
| base | `destroyed` | required | Emit once when runtime is destroyed. | `{}` | Document idempotency policy. |
| base | `document:changed` | required | Emit after any document revision change. | `{revision, node?, affectedNodeIds?, reason?}` | Document as broad compatibility event; specific events below are preferred. |
| base | `document:node-added` | required | Emit after `add` or `addChild` stores new public node ids. | `{revision, nodeIds, parentId}` | Document subtree id inclusion policy. |
| base | `document:node-updated` | required | Emit after `update` changes stored node data. | `{revision, nodeId, changedProperties, invalidation}` | Document no event for missing id or no-op patch. |
| base | `document:node-removed` | required | Emit after `remove` or `removeChild` deletes public node ids. | `{revision, nodeIds, parentId}` | Document subtree id inclusion policy. |
| base | `document:structure-changed` | required | Emit after group/ungroup/addChild/removeChild/reparent-like changes. | `{revision, parentId, affectedNodeIds, order}` | Document parent-local order and affected subtree. |
| base | `layer:changed` | required | Emit after a successful layer order mutation. | `VenusLayerMutationResult` | Document no event for failed/no-op moves. |
| render | `backend:fallback` | required | Emit when auto backend falls back from WebGL to Canvas2D. | `{from, to, reason}` | Document explicit WebGL failures still throw. |
| hitTest | `hit` | required | Emit after `hitTest`, not after `hitTestAll` unless explicitly requested later. | `{point, phase, tolerance, result}` | Document coordinate space and locked filtering. |
| interaction | `selection:changed` | required | Emit only when selection set changes. | `{selection, previousSelection, added, removed}` | Document readonly arrays/sets and duplicate suppression. |
| interaction | `overlay:changed` | planned | Emit when generic overlay model changes independently from document. | `{revision?, kind, nodeIds}` | Document Vector styling remains outside engine. |
| history | `history:changed` | required | Emit after undo/redo stack availability changes. | `{canUndo, canRedo, revision}` | Document no product command semantics. |
| export | `export:completed` | required | Emit after export resolves. | `{format, target, nodeIds?, byteLength?}` | Document target values: `scene`, `node`, `selection`. |
| export | `export:failed` | required | Emit when export rejects after module handled the request. | `{format, target, nodeIds?, reason}` | Document thrown error and event ordering. |
| animate | `animation:started` | planned | Emit when animation controller starts. | `{nodeId, properties}` | Document optional module gating. |
| animate | `animation:completed` | planned | Emit when animation finishes naturally. | `{nodeId, properties}` | Document cancellation does not emit completed. |
| animate | `animation:canceled` | planned | Emit when controller cancels. | `{nodeId, properties}` | Document no remaining keyframe application. |
| debug | `debug:trace` | planned | Emit structured debug traces when debug module opts in. | `{category, message, data?}` | Document diagnostics-only, not app control flow. |

Event payload rules:

- Payload arrays must be `readonly` or newly allocated snapshots.
- Payload objects must be named TypeScript contracts before implementation.
- Event comments must describe exactly when the event fires and when it does
  not fire.
- Tests must prove subscribe, unsubscribe, payload shape, no-op suppression, and
  revision behavior.

### 3.7 Comment And Documentation Contract

Each API and event implementation must carry documentation before behavior is
changed.

Required API JSDoc:

```ts
/**
 * @name Venus.<apiName>
 * @description <one sentence purpose and ownership boundary>
 * @example Usage
 * <minimal usage>
 * @param <name> <meaning, units, coordinate space, no-op behavior>
 * @returns <return payload and failure/no-op behavior>
 */
```

Required event contract comment:

```ts
/** Payload emitted after <exact lifecycle point>; not emitted when <no-op>. */
interface VenusXxxEvent {
  /** Current document revision associated with this event. */
  revision: number
}
```

Docs synchronization requirements:

- `apps/engine-docs/src/engineApiDocs.ts` must list the API before or in the
  same change as implementation.
- Package docs under `packages/engine/docs/en/api/` must explain module gating
  and root-level API shape.
- Tests must fail if a public API exists without a catalog row or docs entry.

## 4. Event Mechanism Requirements

Engine eventing must become a first-class mechanism rather than incidental
callbacks.

The event names and payload requirements in section 3.6 are the source of truth.
This section defines implementation behavior for that catalog.

### 4.1 Event Surface

Root event API:

```ts
venus.on(name, handler)
venus.off(name, handler)
```

The event map must remain typed and documented.

Required base events:

- `mounted`
- `document:changed`
- `document:node-added`
- `document:node-updated`
- `document:node-removed`
- `document:structure-changed`
- `layer:changed`
- `render:before`
- `render:after`
- `resized`
- `destroyed`

Required optional module events:

- `selection:changed` from interaction
- `hit` from hitTest
- `history:changed` from history
- `export:completed` and `export:failed` from export
- `backend:fallback` from render/backend
- `debug:trace` from debug

### 4.2 Event Payload Rules

Every event payload must include enough data for Vector to update UI without
recomputing generic engine state:

- current revision where document state changed
- affected node ids for structural or property changes
- parent id for layer changes
- previous and next index for layer moves
- selection ids for selection changes
- hit result details for hit events
- export target and format for export events

Event payloads must not expose mutable internal arrays. Use readonly arrays or
new snapshots.

### 4.3 Event Tests

Each event must have tests that prove:

- subscribe works
- unsubscribe works
- payload shape is stable
- no event fires for no-op mutations
- document revision increments only when state changes

## 5. Document Model Requirements

Engine public model must cover Vector's common node types:

- `frame`
- `group`
- `rect` / Vector `rectangle`
- `ellipse`
- `polygon`
- `star`
- `line` / Vector `lineSegment`
- `path`
- `text`
- `image`
- `clip` / mask-like clip container

### 5.0 Type Coverage Versus Model Completeness

The current node type set is frozen for this phase, but field and logic
completeness is active work.

Engine should learn from Paper.js and Fabric.js as a generic graphics mechanism
model: common item/object metadata, hierarchy, transforms, bounds, style,
clipping, raster data, export, and cache invalidation. Vector should learn from
Figma as a product document model: design-tool fields, selection semantics,
constraints, text editing, masks, effects, asset references, and UI-facing
workflows.

No field is accepted only because a competitor has it. A field is accepted only
when at least one of these is true:

- it is a generic graphics mechanic needed by engine.
- it preserves data already present in Vector without app-local duplication.
- it is required by a root API or event payload.
- it affects render, hit-test, export, history, or adapter correctness.

Every accepted field must have a field definition record before implementation:

```md
Field:
Owner module:
Status: required | planned | compatibility | deprecated
Source: authored | derived | cache | adapter-only
Default:
Valid values:
Serialization:
Patch behavior:
Revision behavior:
Events:
Invalidation class:
Render behavior:
Hit-test behavior:
Export behavior:
Vector mapping:
Comment/JSDoc requirement:
Required tests:
```

Derived and cache fields must never be serialized as user-owned source data.
Adapter-only fields must not leak into root engine snapshots unless the adapter
explicitly maps them to supported engine semantics.

### 5.0.1 Competitor Reference Anchors

Reference links:

- Paper.js Item reference: `https://paperjs.org/reference/item/`
- Fabric.js BaseFabricObject reference:
  `https://fabricjs.com/api/classes/basefabricobject/`
- Figma plugin typings:
  `https://github.com/figma/plugin-typings/blob/master/plugin-api.d.ts`

Paper.js model lessons:

- shared item fields belong on a common base, including identity, name, style,
  locked, visible, blend mode, opacity, selected state, clipping, custom data,
  hierarchy, bounds, and matrix-related fields.
- hierarchy is controlled through item operations instead of direct child-array
  mutation.
- there are multiple bounds concepts: geometric bounds, stroke bounds, handle
  bounds, and internal bounds.
- style and event capability are common item behavior, not per-shape accidents.

Fabric.js model lessons:

- base objects carry local geometry, transform, opacity, composite mode, shadow,
  stroke/fill behavior, parent reference, padding, scale/skew, cache flags, and
  matrix cache concepts.
- object caching and matrix caching are explicit runtime mechanisms and should
  not become serialized product data.
- render-facing behavior such as stroke uniformity, paint order, origin, and
  composite mode must be defined because it changes bounds, hit-test, and export.

Figma model lessons:

- product documents separate node identity/type/name from dimensions,
  constraints, relative transforms, effects, fills, layout rules, selection, and
  document change events.
- layout and constraints have side effects and must not be treated as passive
  fields without a layout module.
- text, masks, images, effects, and export settings must preserve editor data
  well enough for product workflows, not just basic rendering.

### 5.0.2 Competitor Capability Comparison Matrix

| Dimension | Competitor Signal | Engine Requirement | Vector Requirement | Required Tests |
| --- | --- | --- | --- | --- |
| identity and metadata | Paper Item identity/name/data; Fabric object metadata; Figma node id/type/name | common base fields with stable id, name, type, user data, visibility, lock, export metadata | preserve Vector node names, schema metadata, and user-visible identity | add/update/snapshot round trip; adapter round trip |
| hierarchy | Paper controlled item hierarchy; Fabric parent; Figma children and current page selection | parent-local child order, parent lookup, controlled add/remove/group/ungroup/reparent APIs | layers panel, grouping, frames, masks, and order operations use engine mechanics | order mutations; parent lookup; structure events |
| authored geometry | Paper position/bounds; Fabric left/top/width/height; Figma x/y/width/height | source fields distinguish authored geometry from derived bounds | existing Vector x/y/width/height map without loss for supported nodes | node conversion; update invalidation; export viewBox |
| transforms | Paper matrix/global matrix; Fabric origin/scale/skew/flip; Figma relative transform | keep current top-level x/y/rotation, define transform fields before adding scale/skew/matrix | Vector may keep product transform adapter fields until engine supports them | local/world matrix; anchor invariance; proxy update |
| bounds | Paper geometric/stroke/handle/internal bounds; Fabric transformed bounds and padding | expose authored, geometry, stroke, visual, handle, and aggregate bounds semantics as APIs or derived cache | selection boxes, handles, marquee, export bounds use consistent engine data | bounds for stroke/effects/groups/text/images |
| style and paint | Paper style; Fabric fill/stroke/shadow/composite; Figma fills/strokes/effects | appearance owns fills, strokes, effects, opacity, blend/composite, paint order | Vector style panels map to engine fields or remain product-only with explicit adapter loss policy | render parity; patch invalidation; SVG style |
| text | Paper text items; Fabric text object behavior; Figma text characters and ranges | text supports plain text plus runs, default typography, layout metrics, and editable bounds | Vector rich text and style runs round trip where supported | runs conversion; style override; bounds; export |
| raster/image | Paper Raster; Fabric image object; Figma image paints/assets | image node owns quad geometry and resource reference, not file persistence policy | Vector assets map through asset id/url/resource state | missing resource diagnostic; crop/source rect; export |
| clip and mask | Paper clip mask; Fabric clipPath/inverted; Figma masks/clips content | clip graph validates missing refs, cycles, rules, inline geometry, and render/export behavior | Vector mask and clip interactions use engine validation | graph validation; render/hit/export agreement |
| layout and constraints | Figma constraints/auto layout side effects | constraints are serialized only when their behavior is implemented or explicitly marked planned/no-op | Vector can store product layout data, but engine must not pretend it is active | no-op docs; layout-gated mutation tests |
| selection and hit | Paper selected; Figma selection events; Fabric target controls | engine provides selectable mechanics, hit detail, lock/hidden policy, and overlay geometry | Vector owns UI styling and command policy | topmost hit; locked/hidden filtering; selection event |
| export | Figma export settings; Fabric/SVG export behavior | export settings and export APIs define node/subtree/selection output | Vector file/export panels call engine APIs | SVG/PNG/JPEG path; scoped node export |
| cache and invalidation | Fabric object/matrix cache; Paper derived matrices/bounds | cache state is internal and invalidated by classified mutations | Vector observes events rather than reading cache internals | invalidation classification; no stale bounds |

### 5.0.3 Node Field Completion Matrix

| Node Area | Required Source Fields | Required Derived/Cache Fields | Logic Requirement | Comment/Test Requirement |
| --- | --- | --- | --- | --- |
| common base | `id`, `type`, `name`, `visible`, `locked`, `opacity`, `blendMode`, `appearance`, `data`, `exportSettings`, `constraints` | revision, parent id, local index, invalidation class | defaulting, validation, patch classification, snapshot serialization | JSDoc states defaults and source/derived split; tests cover default node, patch, snapshot |
| transform base | `x`, `y`, `width`, `height`, `rotation`, planned `transform` | local matrix, world matrix, inverse matrix, aggregate bounds | keep top-level fields stable; only add scale/skew/matrix with complete API and events | tests prove local/world conversion and no serialization of cache matrices |
| rect and ellipse | geometry fields, corner radius or arc fields, appearance | geometry bounds, stroke bounds, visual bounds | normalized positive size, radius/arc clamping, fill/stroke/effect invalidation | tests cover render conversion, hit-test, SVG export |
| polygon and star | center/size or points, sides, inner radius, appearance | generated points, geometry bounds, stroke bounds | deterministic point generation, stable winding, edit-friendly point mapping | tests cover generator output, hit-test, export |
| line and path | points, bezier points, path commands, arrowheads, fill rule, stroke fields | path length, segment bounds, handle bounds | preserve authored path data; normalize only invalid commands; arrowheads affect visual bounds | tests cover anchor handles, stroke hit-test, SVG path |
| group | `children`, identity, visibility, lock, appearance metadata | aggregate bounds, child order, child parent index | structure-only; no authored geometry; moves translate children; resizing blocked until transform policy exists | tests cover grouping, ungrouping, nested order, derived bounds |
| frame | `x`, `y`, `width`, `height`, `children`, appearance, optional clip/export policy | background render node, aggregate child bounds, frame bounds | bounds-owned container; internal background maps hit target to public frame id | tests cover frame background, child indexing, resize, export bounds |
| text | `text`, `runs`, `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `lineHeight`, `letterSpacing`, `align`, `verticalAlign`, `width`, `height`, appearance/effects | line metrics, glyph/layout cache, text bounds | plain text fast path plus rich runs; layout cache invalidates on text/style/size changes | tests cover style runs, defaults, text hit, SVG export |
| image | `assetId`, `assetUrl`, `sourceRect`, `naturalSize`, `imageSmoothing`, `x`, `y`, `width`, `height`, appearance/effects | resolved resource state, image quad, visual bounds | host owns persistence; engine owns geometry, diagnostics, render/export resource lookup | tests cover source rect, missing resource, render/export consistency |
| clip and mask | `clipPath`, `clipNodeId`, `clipShape`, `clipRule`, optional inverted/mask role | dependency graph, cycle diagnostics, clipped bounds | validate refs, cycles, rule, inline geometry; render/hit/export agree under `respectClip` | tests cover missing refs, self-cycle, cycles, rule mismatch, export |
| constraints and layout | constraints fields, planned layout fields | computed layout result only inside layout module | stored constraints are inert until layout module defines side effects | comments state no-op/module gating; tests prove no hidden layout mutation |

### 5.0.4 Document Model Logic Completion Matrix

| Logic Area | Required Behavior | Event/API Link | Tests |
| --- | --- | --- | --- |
| defaulting | every optional field has a documented default and no renderer-only fallback changes source data | constructor, `add`, `snapshot` | default node snapshots for each supported type |
| validation | invalid enum/range/ref values produce deterministic diagnostics or documented no-op behavior | `add`, `update`, `validateClipGraph` | invalid size, style, clip ref, asset ref |
| patch application | shallow public patches classify changed fields and reject derived/cache mutation | `update`, `document:node-updated` | no-op patch emits nothing; changed fields listed |
| revision | revision increments only after state changes and is included in document events | all mutating APIs | revision stability and increment tests |
| hierarchy | parent/child/order indexes update atomically | `addChild`, `removeChild`, `group`, `ungroup`, layer APIs | parent lookup, order snapshots, structure events |
| transform math | local and world coordinate conversion uses one source of truth | camera, hit-test, overlay APIs | nested transform hit and overlay coordinates |
| bounds | bounds are computed by explicit class: authored, geometry, stroke, visual, handle, aggregate | `bounds`, hit-test, overlay, export | stroke/effect/text/group/frame bounds |
| render conversion | source nodes convert to render nodes without losing supported fields | `snapshot`, `render` | snapshot shape for each node type |
| hit-test | hit policy defines hidden, locked, clip, stroke, fill, text, image, and container behavior | `hitTest`, `hitTestAll` | topmost ordering and policy options |
| export | export traversal respects visibility, clip policy, text fields, images, effects, and scoped output | `exportSVG`, `exportNode`, `exportSelection` | SVG scoped export and resource handling |
| invalidation | field changes map to geometry, style, text, resource, hierarchy, or full invalidation | `document:node-updated`, render cache | update classifications and stale cache prevention |
| adapter mapping | Vector-to-engine and engine-to-Vector mappings are explicit for supported and unsupported fields | Vector scene sync, product specs | no silent data loss for claimed fields |

### 5.0.5 Current Phase Field Decisions

- Node type additions are out of scope unless a future CHANGE REQUEST changes
  this policy.
- Field additions to existing types are in scope when section 5.0 field records
  are supplied.
- `rotation` remains top-level for compatibility and clarity.
- `transform` remains reserved for local transform fields not represented by
  authored geometry. It must not become an untyped escape hatch.
- `group` remains structure-only and does not serialize `x`, `y`, `width`, or
  `height`.
- `frame` remains bounds-owned and may own background/clip/export behavior only
  when those semantics are explicitly tested.
- `text` must support plain text and rich runs before Vector text editing is
  migrated off app-local logic.
- `image` must support resource diagnostics before Vector relies on engine image
  rendering/export.
- `clip` and mask-like behavior must be graph-validated before it is used by
  hit-test or export.

### 5.1 Common Fields

Every document node should support:

- `id`
- `name`
- `type`
- `visible`
- `locked`
- `opacity`
- `blendMode`
- `appearance`
- `transform`
- `rotation`
- `data`
- `exportSettings`

Rules:

- `rotation` remains top-level.
- `transform` is for local transform fields not represented by authored
  geometry.
- public document model stays plain object / serializable data.
- runtime proxies and cache state must not leak into serialized documents.

### 5.2 Group

Group is a structure-only container.

Source data:

- `type: 'group'`
- `children`
- identity/visibility/lock/appearance metadata

Forbidden authored geometry:

- `x`
- `y`
- `width`
- `height`
- `rotation`
- `transform`

Behavior:

- bounds derive from visible children.
- moving a group by setting `x/y` on a proxy may translate children, but the
  group itself must remain structure-only after commit.
- resizing group bounds is not allowed until a real layout transform policy is
  designed.
- layer order inside a group is local to that group.

Tests:

- add group with children
- sanitize authored geometry from group input
- derive bounds from children
- translate group children through proxy/setPosition
- reject or ignore group width/height source data
- group siblings under same parent
- reject grouping nodes from different parents
- ungroup preserves child geometry and order
- nested group order and parent lookup remain correct

### 5.3 Frame

Frame is a bounds-owned container.

Source data:

- `type: 'frame'`
- `x`
- `y`
- `width`
- `height`
- `children`
- fill/stroke/effects

Behavior:

- frame bounds are authored source data.
- frame children keep independent geometry.
- render snapshot may normalize frame to a group plus internal background rect.
- internal background hit-test must return the public frame id through
  `hitTargetId`.
- frame should support clip/export bounds later, but clip behavior must be
  explicit and tested before becoming default.

Tests:

- frame converts to render group plus background node.
- background has `hitTargetId` equal to frame id.
- `getLayerOrder(frameId)` returns only public child ids, not internal background.
- frame resize updates background and document bounds.
- frame children remain indexed by parent id.

### 5.4 Text

Text must support both plain and rich text paths.

Source data:

- `text`
- `runs`
- `fontFamily`
- `fontSize`
- `fontWeight`
- `fontStyle`
- `lineHeight`
- `letterSpacing`
- `align`
- `verticalAlign`
- `width`
- `height`
- `fill` / `fills` / `appearance.fills`
- text shadow/effects

Behavior:

- renderer prefers `runs` when present.
- plain `text` remains the fast path.
- `lineCount` and text layout cache fields are derived/cache, not user-owned
  source data.
- Vector text style fields must map through engine without information loss for
  fields engine claims to support.

Tests:

- default typography conversion.
- rich runs preserve text and style overrides.
- text fill from `appearance.fills` beats flat `fill`.
- text bounds update invalidates text/cache.
- text hit-test returns bounds/fill target detail.
- SVG export preserves text content and supported style fields.

### 5.5 Image

Image must be a first-class base document node.

Source data:

- `assetId`
- `assetUrl` or external asset map path
- `x`
- `y`
- `width`
- `height`
- `sourceRect`
- `naturalSize`
- `imageSmoothing`
- opacity/blend/effects

Behavior:

- engine owns image quad geometry.
- host app owns file loading policy and resource persistence.
- engine resource loader resolves `assetId` and optional URL maps.
- image hit-test uses image bounds by default.
- image export resolves the same resource path used by render.

Tests:

- image converts to `EngineImageNode`.
- image proxy exposes asset id and smoothing.
- image source rect survives snapshot.
- missing resource reports deterministic diagnostic, not silent failure.
- image hit-test and export use the same bounds.

### 5.6 Clip

Clip must become graph-validated and parity-tested.

Source data:

- clip container with `clipPath`
- node-level `clip.clipNodeId`
- inline `clip.clipShape`
- `clip.rule`

Behavior:

- validate missing clip node.
- validate self-reference.
- validate cycles.
- validate rule.
- validate inline clip geometry.
- render, hit-test, and export must agree when `respectClip` is true.

Tests:

- valid inline rect clip.
- valid path clip.
- missing clip node.
- self clip.
- cyclic clip.
- invalid rule.
- invalid inline clip.
- hit-test outside clip returns no hit with `respectClip`.
- SVG export emits equivalent clip path.

## 6. Base Module P0 Requirements

The first implementation priority is base module completion.

### 6.1 Required Base APIs

Base root APIs:

```ts
venus.add(node)
venus.update(id, patch)
venus.remove(id)
venus.children()
venus.getNodeById(id)
venus.getParentId(id)
venus.bounds()
venus.snapshot()
venus.getLayerIndex(id)
venus.getLayerOrder(parentId)
venus.moveLayer(id, index)
venus.moveBefore(id, targetId)
venus.moveAfter(id, targetId)
venus.bringForward(id)
venus.sendBackward(id)
venus.bringToFront(id)
venus.sendToBack(id)
venus.group(ids, options)
venus.ungroup(id)
venus.addChild(parentId, child)
venus.removeChild(parentId, childId)
```

P0 upgrade:

- layer mutation APIs should return a patch/revision result, not only an index.
- base should emit `layer:changed` and `document:structure-changed`.
- base should expose enough patch data for history without moving product
  command policy into engine.

Target result shape:

```ts
type VenusLayerMutationResult = {
  applied: boolean
  revision: number
  parentId: string | null
  nodeId: string
  fromIndex: number
  toIndex: number
  order: readonly string[]
}
```

Compatibility may keep numeric aliases temporarily only with an `AI-TEMP:` tag
and a removal condition.

### 6.2 Required Base Internals

Base should be split into mechanism-scoped internals:

- document tree indexing
- parent lookup
- bounds resolution
- group/frame normalization
- layer ordering
- mutation result / patch creation
- event payload creation
- snapshot rebuild and revision update

Do not split into generic helper buckets.

### 6.3 Base Tests

Required tests:

- root add/update/remove.
- nested add/update/remove.
- group/frame/clip/image/text model conversion.
- layer order root and nested parent.
- move before/after rejects cross-parent moves.
- group/ungroup keeps order.
- revision increments once per mutation.
- events fire once with correct payload.
- no-op update does not emit mutation event.
- document service exposes stable readonly methods to modules.

## 7. Overlay, Active, Interaction, And Math Extraction

Vector currently owns generic overlay and interaction logic that should be
pulled down into engine.

### 7.1 Overlay

Engine should own overlay model primitives:

- selection outline geometry
- hover outline geometry
- marquee rectangle geometry
- transform handle positions
- anchor handle positions
- snap guide geometry
- debug guide geometry

Vector should own:

- visual styling
- colors and icons
- panel toggles
- product-specific overlay visibility rules

APIs:

```ts
venus.getSelectionOverlay(options)
venus.getHoverOverlay(options)
venus.getTransformHandles(nodeIds, options)
venus.getAnchorHandles(nodeId, options)
```

These may live behind the interaction module but must be root-level calls.

### 7.2 Active Layer

Engine should own active render primitives:

- active node id set
- temporary base exclusion/protection
- dirty bounds while dragging
- fast transform preview data
- commit-to-base handoff hooks

Vector should own:

- tool mode state
- pointer command policy
- when to start/commit/cancel interactions

### 7.3 Interaction

Interaction module should own:

- selection state
- selection change event
- marquee candidate query
- anchor candidate query
- snap candidate query
- group/frame child selection policy options

Vector should only call APIs and apply product policy.

### 7.4 Math Functions

Move generic math from Vector into engine when used by render/hit/selection or
document model mechanics:

- matrix compose/invert/project/unproject
- bounds union/intersection/containment
- point transform
- parent-local transform resolution
- path anchor conversion
- bezier bounds helpers
- clip shape bounds

Keep app-only layout math in Vector.

## 8. Vector Migration Requirements

### 8.1 Engine Adapter

Vector adapter should become thin:

- map product node names to engine names.
- map product-only metadata into `data`.
- choose flat/tree scene mode while migration is active.
- never recompute generic engine-owned bounds if engine can provide them.

Required Vector changes:

- layer panel uses engine layer order APIs.
- arrange commands use engine layer APIs.
- marquee selection uses engine `querySelectionInRect` / `selectInRect`.
- hover/click selection uses engine `hitTest` result detail.
- export UI uses engine export module.
- overlay builder uses engine overlay model once available.

### 8.2 Destructive Refactor Allowance

Vector may be destructively refactored if it removes duplicate generic logic.

Allowed:

- replace old runtime interaction adapters.
- remove duplicate geometry/hit/export code after engine tests pass.
- change app file boundaries.
- change product runtime bridge shape.

Not allowed:

- breaking engine public API to satisfy Vector shortcuts.
- moving product UI policy into engine.
- keeping old and new Vector logic indefinitely.

Every destructive Vector refactor must remove replaced code in the same change.

## 9. UI Library Extraction Requirements

### 9.1 Package Direction

`packages/ui` should absorb reusable UI from Vector:

- foundation theme provider
- Vector theme tokens
- semantic CSS
- editor primitives that are not tied to document state
- kit components
- primitives already proven in Vector

Current repository already contains `packages/ui/src/vector/**`; future work
should validate, export, and de-duplicate rather than copying another parallel
tree.

### 9.2 Theme Requirements

Vector theme should be available through package exports:

```ts
import '@venus/ui/vector/styles.css'
import {VectorThemeProvider} from '@venus/ui/vector'
```

Theme extraction must include:

- base tokens
- semantic tokens
- dark/light mode behavior
- editor chrome spacing/radius/elevation tokens
- interaction states
- focus rings
- disabled states

Tests:

- CSS entrypoint exists.
- vector entry exports theme provider.
- existing Vector imports can move to `@venus/ui/vector`.
- theme config tests cover default mode and mode switching.

### 9.3 Component Requirements

Candidate components to own in `@venus/ui`:

- button
- input
- textarea
- select
- separator
- tooltip
- dialog/modal
- dropdown/context menu
- tabs
- input group
- card
- notification/toast shell
- compact field / form controls
- color swatch picker only if product-independent

Do not extract:

- layer panel
- inspector sections
- toolbar command wiring
- runtime debug panel
- file receiver
- document-aware menu actions

## 10. Code Simplification And Comment Requirements

### 10.1 Simplification

Every implementation slice must remove or flatten at least one replaced path
unless it is strictly additive public API work.

Preferred cleanup:

- remove duplicate Vector math after engine API exists.
- remove duplicate app UI components after package export exists.
- remove compatibility aliases after callers migrate.
- replace stringly typed payloads with named contracts.
- move dense multi-responsibility code into semantic modules.

### 10.2 Comment Rules

For AI-touched TypeScript:

- every new or modified function needs a leading intent comment.
- every new or modified exported type/interface needs declaration comments.
- every new or modified parameter needs JSDoc `@param`.
- non-obvious branches need rationale comments.
- temporary compatibility requires:

```ts
// AI-TEMP: <why>; remove when <condition>; ref VECTOR_ENGINE_STRENGTHENING_REQUIREMENTS
```

### 10.3 Type Rules

Forbidden:

- `any`
- implicit exported function parameters
- untyped cross-module payloads
- public object payloads without named contracts

Allowed only with explicit temporary exception:

- compatibility casts using `unknown as ...`
- feature flags used during Vector tree/flat scene migration

## 11. Test Requirements

### 11.1 Engine Tests

Required categories:

- model schema tests
- scene object model contract tests
- base module tests
- module gating tests
- event tests
- geometry cache tests
- spatial query tests
- layer ordering tests
- group/frame tests
- text tests
- image tests
- clip graph tests
- hit-test detail tests
- selection/marquee tests
- export parity tests
- module combination tests

### 11.2 Vector Tests

Required categories:

- adapter parity tests
- engine tree/flat parity tests while migration exists
- layer panel command tests
- marquee selection integration tests
- hit-test bridge tests
- overlay adapter tests
- export command tests
- UI import migration tests

### 11.3 UI Tests

Required categories:

- component render/contract tests
- style entry tests
- vector theme export tests
- interaction state tests
- form control tests

### 11.4 Validation Commands

Minimum validation before handoff:

```bash
pnpm --filter @venus/engine test
pnpm --filter @venus/ui test
pnpm --filter @venus/vector-editor-web lint
pnpm typecheck
pnpm lint
```

If a command cannot run, record the exact command, failure, and residual risk.

## 12. P0 Execution Slices

### P0.1 Master Requirement

Scope:

- create this document
- link it from `AI/README.md`

Acceptance:

- all existing matrix/alignment/new requirements are represented.
- no runtime code changed.

### P0.2 Base Module Contract Completion

Scope:

- define `VenusLayerMutationResult`
- add event payload contracts for base mutations
- upgrade base API comments and return contracts
- keep compatibility only if necessary and tagged

Acceptance:

- layer API result has patch/revision data.
- root flat API remains.
- tests cover old/new behavior if compatibility remains.

### P0.3 Group Foundation

Scope:

- move group bounds/translation/sanitization logic into base-owned internals.
- remove duplicate inline logic from `Venus.ts`.
- add group tests.

Acceptance:

- group has no authored geometry after add/update.
- move translates children.
- group/ungroup preserves order and parent ids.

### P0.4 Text Foundation

Scope:

- complete text fields in Venus public model.
- map plain text and runs to engine text nodes.
- move text style conversion into a semantic module.

Acceptance:

- rich text runs preserve supported style fields.
- Vector adapter parity covers text.
- render/export/hit-test tests cover text bounds.

### P0.5 Image Foundation

Scope:

- complete image asset fields and resource loader contract.
- add asset URL/map strategy without new packages.
- move image conversion into semantic module.

Acceptance:

- image snapshot and resource behavior are deterministic.
- Vector image nodes map without field loss for supported fields.

### P0.6 Clip Foundation

Scope:

- complete clip validation.
- wire clip policy into hit-test and export.
- avoid product mask semantics in engine.

Acceptance:

- clip render/hit/export parity tests pass.

### P0.7 Vector API Migration

Scope:

- migrate layer panel and arrange commands to engine layer APIs.
- migrate selection rectangle and hit-test bridge to engine APIs.
- remove replaced Vector generic logic.

Acceptance:

- Vector no longer owns generic layer/selection/hit-test core for migrated paths.

### P0.8 UI Extraction Completion

Scope:

- verify `packages/ui/src/vector/**` exports.
- migrate Vector imports to `@venus/ui/vector` where reusable.
- remove duplicate app-local UI files after migration.

Acceptance:

- package UI tests pass.
- Vector lint/typecheck pass.

## 13. Acceptance Definition

This master requirement is complete only when:

- engine document model covers Vector common node types, accepted fields,
  defaults, derived logic, validation, and render/hit/export semantics.
- base module owns group/text/image/clip foundation logic.
- root APIs are flat and documented.
- events are typed, tested, and useful to Vector.
- Vector calls engine APIs for generic selection/layer/hit/export behavior.
- Vector duplicate generic logic is removed.
- `@venus/ui` owns reusable Vector UI/theme.
- comments and type contracts satisfy repository rules.
- no unnecessary new packages are added.
- all required tests, lint, and typecheck pass or have documented blockers.
