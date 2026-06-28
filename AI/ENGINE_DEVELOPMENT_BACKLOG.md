# Engine Development Backlog

Status: Active execution backlog  
Owner: Engine / Engine Docs agents  
Scope: `packages/engine`, `apps/engine-docs`, root-level AI planning only  
Last updated: 2026-06-28

## 0. Execution Rule

Every implementation task in this backlog must follow the repository execution protocol:

1. Scope Definition
2. Type Definition
3. CHANGE REQUEST
4. Test Design
5. Implementation
6. Validation
7. Cleanup Check

No task should jump directly into implementation. Public API edits must update types, tests, and `apps/engine-docs` in the same delivery slice.

## 1. Product Position

Venus Engine is the document/runtime layer for vector graphics products. It should be usable independently from any editor application.

Core responsibilities:

- Document model: Own stable object contracts for shape, text, image, group, clip, mask, transform, and scene snapshot data.
- Runtime API: Expose a small, learnable public API through `new Venus(options?)`.
- Rendering: Render the same scene through backend implementations without leaking backend details into document objects.
- Interaction: Provide hit testing, hover, click, geometry payloads, viewport transforms, and selection-friendly metadata.
- Camera: Provide pan, zoom, fit, project, and unproject behavior with deterministic math.
- Events: Provide `on` and `off` for internal state transitions and user-facing runtime events.
- Performance: Provide optional culling, LOD, geometry cache, tile/cache strategies, and diagnostics.
- Documentation: Provide human-readable English docs and an interactive API site powered by real `Venus` instances.

Non-goals:

- Engine must not own editor UI policy.
- Engine must not depend on `editor-primitive`.
- Engine docs must not describe features that are not backed by public types and tests.
- `apps/engine-docs` must not fake behavior with static canvas drawings when a real `Venus` API should exist.

## 2. Current State Assessment

### 2.1 Engine Structure

Observed directories:

- `packages/engine/src/runtime`: Public-ish runtime adapters including `Venus` and legacy `createEngine`.
- `packages/engine/src/scene`: Render-facing scene contracts, scene store, patches, spatial index, and hit-related scene logic.
- `packages/engine/src/renderer`: Canvas/WebGL render planning, backend adapters, tile/cache/performance modules.
- `packages/engine/src/interaction`: Hit testing, geometry payloads, viewport helpers, snapping, shape transforms, and LOD helpers.
- `packages/engine/src/core`: Older render/camera/cache entry points and compatibility-style modules.
- `packages/engine/src/math`: Matrix utilities.
- `packages/engine/src/animation`: Current animation entry point.
- `packages/engine/docs/en`: Human-readable English package docs.
- `packages/engine/AI`: Package-level AI-facing docs.

Main risks:

- Public exports expose many internals through `packages/engine/src/index/index.ts`.
- Some modules appear as compatibility forwards or duplicated responsibility areas.
- `.d.ts` files exist inside `src`; each must be classified as source contract, generated artifact, or stale artifact.
- `dist` and `node_modules` are present under the package/workspace and need repository policy confirmation.

### 2.2 Engine Docs App

Observed categories in `apps/engine-docs/src/engineApiDocs.ts`:

- `start`
- `document-models`
- `venus-parameters`
- `methods`
- `hittest`
- `camera`
- `performance`
- `animation`
- `events`
- `debug`
- `qa`

Observed document model pages:

- Rect
- Ellipse
- Line
- Text
- Group
- Clip
- Mask
- Polygon
- Path
- Image

Main risks:

- Docs list many APIs that must be verified against actual `Venus` behavior.
- Contract tests currently check layout strings and category structure, but not full parity with exported TypeScript contracts.
- Canvas demos exist, but each page must be checked for real `new Venus()` usage and synchronized usage code.
- Editable controls exist for core models, but polygon/path/image controls need parity with the documented object model.

### 2.3 Public API Drift

Known drift requiring immediate verification:

- `VenusNodeBase` currently exposes only a partial flat transform surface in code areas inspected during planning.
- Existing tests reference richer transform behavior including `transform`, `flipX`, and `skewY`; implementation and types must be reconciled.
- Camera methods include behavior that may still be stubbed or only local-state based.
- Animation currently appears minimal and may not yet animate real scene changes.
- `measureFrame` may be a placeholder.
- `bounds` may not yet compute actual document bounds.

## 3. Agent Assignment Model

Use small, independent agents with explicit ownership. One agent should not rewrite another lane without a task note.

### Agent A: Architecture and Cleanup

Responsibility:

- Make the engine folder structure understandable and remove dead compatibility paths safely.

Tasks:

- A-001: Create a source ownership map for every `packages/engine/src` top-level folder.
- A-002: Mark each exported symbol as public, internal, compatibility, or test-only.
- A-003: Build an import graph for `core`, `renderer`, `scene`, `interaction`, and `runtime`.
- A-004: Identify duplicated module responsibilities:
  - `core/cache` vs `renderer/cache`
  - `core/camera` vs `renderer/camera`
  - `interaction/hitTest` vs `scene/hitTest` vs `renderer/hit`
  - `renderer/webglComposite` vs newer WebGL preview/composite paths
- A-005: For every compatibility forwarder, write a removal checklist with importing files.
- A-006: Decide whether `src/**/*.d.ts` files are hand-written source or stale generated output.
- A-007: Decide whether package-local `dist` should be committed or generated.
- A-008: Add or update ignore policy only after confirming generated artifact ownership.
- A-009: Remove stale files only after import graph and tests prove they are unused.

Acceptance criteria:

- A human can answer “where does hit testing live?” without reading five folders.
- Public exports are smaller and intentional.
- No deleted file has a remaining import.
- Typecheck and package tests pass.

### Agent B: Venus Public API

Responsibility:

- Make `new Venus()` the stable public runtime API.

Tasks:

- B-001: Define `VenusOptions` as the constructor parameter contract.
- B-002: Keep advanced features off by default unless explicitly enabled:
  - `culling`
  - `lod`
  - backend render options
  - debug overlays
  - performance diagnostics
- B-003: Verify `venus.add(node)` is the primary document insertion API.
- B-004: Remove or hide docs references that make `document.add` look public.
- B-005: Ensure `venus.children()` returns root document nodes.
- B-006: Ensure `venus.getNodeById(id)` works for root and nested children.
- B-007: Ensure `venus.getParentId(id)` works for nested group/clip/mask trees.
- B-008: Ensure `venus.snapshot()` returns an engine-facing immutable scene snapshot.
- B-009: Implement real `venus.bounds()` from document geometry instead of returning fixed canvas bounds.
- B-010: Audit methods in docs:
  - `add`
  - `bounds`
  - `children`
  - `getNodeById`
  - `getParentId`
  - `snapshot`
  - `fitBounds`
  - `zoomTo`
  - `panBy`
  - `project`
  - `unproject`
  - `enableDebug`
  - `inspect`
  - `measureFrame`
  - `mount`
  - `resize`
  - `render`
  - `hitTest`
  - `on`
  - `off`
  - `animate`
  - `destroy`
- B-011: For any documented method that is still a stub, either implement it or downgrade the docs.

Acceptance criteria:

- A user can draw a rectangle with only:
  - import
  - `new Venus()`
  - `mount`
  - `add`
  - `render`
- Every documented method has a direct runtime test.
- No docs page describes a non-existent public method.

### Agent C: Document Model Objects

Responsibility:

- Complete every public model object before expanding demos.

Tasks:

- C-001: Define a shared `VenusNodeBase` contract:
  - `id`
  - `name`
  - `visible`
  - `locked`
  - `opacity`
  - `blendMode`
  - `transform`
  - compatibility flat transform fields only if explicitly retained
- C-002: Define `VenusTransform2D`:
  - `x`
  - `y`
  - `rotation`
  - `scaleX`
  - `scaleY`
  - `skewX`
  - `skewY`
  - `flipX`
  - `flipY`
  - `origin`
- C-003: Define `VenusTransformOrigin`:
  - `x`
  - `y`
  - `unit`
- C-004: Rect API:
  - `x`
  - `y`
  - `width`
  - `height`
  - `fill`
  - `stroke`
  - `strokeWidth`
  - `cornerRadius`
  - `cornerRadii`
  - `shadow`
  - base properties
- C-005: Ellipse API:
  - `x`
  - `y`
  - `width`
  - `height`
  - `fill`
  - `stroke`
  - `strokeWidth`
  - `ellipseStartAngle`
  - `ellipseEndAngle`
  - `shadow`
  - base properties
- C-006: Line API:
  - `x`
  - `y`
  - `width`
  - `height`
  - start/end point alias decision
  - `stroke`
  - `strokeWidth`
  - line cap/join/dash if engine supports them
  - `shadow`
  - base properties
- C-007: Text API:
  - `x`
  - `y`
  - `width`
  - `height`
  - `text`
  - `runs`
  - `fill`
  - `fontFamily`
  - `fontSize`
  - `fontWeight`
  - `fontStyle`
  - `lineHeight`
  - `letterSpacing`
  - `align`
  - `verticalAlign`
  - `wrap`
  - `shadow`
  - base properties
- C-008: Group API:
  - `children`
  - local transform
  - opacity inheritance rule
  - bounds rule
  - hitTest rule
- C-009: Clip API:
  - `clipPath`
  - `children`
  - supported clip path kinds
  - transform rule
  - hitTest rule
- C-010: Mask API:
  - `maskPath` or shared `clipPath` decision
  - alpha/luminance support decision
  - children transform rule
  - hitTest rule
  - whether clip and mask should remain separate public types
- C-011: Polygon API:
  - `points`
  - `closed`
  - `fill`
  - `stroke`
  - `strokeWidth`
  - base properties
- C-012: Path API:
  - `points`
  - `bezierPoints`
  - `closed`
  - `fill`
  - `stroke`
  - `strokeWidth`
  - arrowheads
  - base properties
- C-013: Image API:
  - `assetId`
  - `sourceRect`
  - `naturalSize`
  - `imageSmoothing`
  - opacity
  - transform
  - loading/error event plan

Acceptance criteria:

- Every public model has complete type comments.
- Every public model has conversion tests to `EngineRenderableNode`.
- Every model page in engine docs matches the type.

### Agent D: Transform, Group, Clip, and Mask Semantics

Responsibility:

- Make transform composition predictable.

Tasks:

- D-001: Confirm local transform is stored on each node, not as baked world matrices.
- D-002: Confirm group stores child node objects, not only IDs.
- D-003: Maintain an internal id index for lookup without replacing the tree.
- D-004: Define matrix order:
  - translate
  - origin shift
  - rotation
  - scale
  - skew
  - flip
  - origin restore
- D-005: Define how `transform.x/y` interacts with geometry `x/y`.
- D-006: Decide whether flat `rotation` remains compatibility-only or fully public.
- D-007: Group world transform = parent world transform multiplied by local transform.
- D-008: Child geometry remains local to its parent.
- D-009: Clip path transform participates in the same local/world transform pipeline.
- D-010: Mask transform follows clip transform unless mask semantics diverge.
- D-011: Add nested group tests:
  - group inside group
  - clip inside group
  - group inside clip
  - mask inside group
  - rotated parent with rotated child

Acceptance criteria:

- Group, clip, and mask behavior can be explained in one docs page each.
- Matrix tests prove local-to-world behavior.
- Docs controls can edit parent and each child independently.

### Agent E: Hit Testing

Responsibility:

- Make hover and click reliable for every object type.

Tasks:

- E-001: Split runtime result concepts into hover and clicked.
- E-002: Define hit result payload:
  - `nodeId`
  - `nodeType`
  - `shape`
  - `worldPoint`
  - `localPoint`
  - `bounds`
  - `distance`
  - `area`
  - `targetKind`
  - `reason`
- E-003: Rect hit:
  - fill area
  - stroke area
  - rounded corners
  - zero stroke
  - transparent fill
- E-004: Ellipse hit:
  - full ellipse
  - arc start/end angle
  - stroke band
  - transformed ellipse
- E-005: Line hit:
  - start/end
  - tolerance
  - stroke width
  - transformed line
- E-006: Text hit:
  - text bounds
  - multiline bounds
  - transformed text
  - optional per-run hit payload later
- E-007: Polygon hit:
  - closed fill
  - open stroke
  - winding/fill rule if supported
- E-008: Path hit:
  - straight segments
  - bezier segments
  - open/closed
  - stroke/fill distinction
- E-009: Image hit:
  - image bounds
  - source crop does not change world bounds unless explicitly designed
- E-010: Group hit:
  - child-first order
  - optional group bounds fallback
  - locked/visible policy
- E-011: Clip hit:
  - clipped-out children cannot be hit
  - clip path itself is targetable only if public policy says so
- E-012: Mask hit:
  - masked-out area policy
  - mask object targetability policy
- E-013: engine-docs hit panel:
  - hover block
  - clicked block
  - raw payload
  - readable summary

Acceptance criteria:

- Every document model has at least one hitTest test.
- Transformed hit tests exist for rotate, scale, skew, and flip.
- Demo page visibly updates hover and clicked panels.

### Agent F: Geometry Cache

Responsibility:

- Make geometry calculations fast and backend-independent.

Tasks:

- F-001: Define geometry cache key:
  - node id
  - node revision
  - transform revision
  - style revision
  - text revision
  - asset revision
- F-002: Cache local AABB.
- F-003: Cache world AABB.
- F-004: Cache stroke bounds.
- F-005: Cache path approximation data.
- F-006: Cache text measurement only through a backend-neutral measurement interface.
- F-007: Invalidate parent group bounds when any child geometry changes.
- F-008: Invalidate clip/mask result when path or child changes.
- F-009: Add diagnostics for cache hits/misses.

Acceptance criteria:

- Renderer backend does not own document geometry truth.
- HitTest and renderer can share geometry payloads without backend coupling.
- Benchmarks show stable behavior under many-node scenes.

### Agent G: Renderer Backend Isolation

Responsibility:

- Keep renderer backends implementation-specific and document-model agnostic.

Tasks:

- G-001: Define render plan input contract.
- G-002: Ensure Canvas2D consumes render plan only.
- G-003: Ensure WebGL consumes render plan only.
- G-004: Remove backend logic from document model conversion.
- G-005: Verify zero stroke renders no stroke.
- G-006: Verify undefined stroke renders no stroke unless default is explicitly documented.
- G-007: Verify undefined fill behavior per shape type.
- G-008: Support opacity, blendMode, shadow, stroke style, and transform consistently.
- G-009: Add backend parity smoke tests for rect, ellipse, line, text, polygon, path, image, group, clip, mask.

Acceptance criteria:

- Backend swap does not change public document API.
- Renderer tests do not require app/editor code.
- Visual regressions are captured by deterministic fixtures.

### Agent H: Camera

Responsibility:

- Make viewport math real and documented.

Tasks:

- H-001: Implement `fitBounds(bounds, padding?)`.
- H-002: Implement `zoomTo(scale, anchor?)`.
- H-003: Implement `panBy(delta)`.
- H-004: Implement `project(point)`.
- H-005: Implement `unproject(point)`.
- H-006: Sync camera state with engine viewport.
- H-007: Add tests for project/unproject inverse behavior.
- H-008: Add docs demo with buttons for fit, zoom, pan, reset.

Acceptance criteria:

- `project(unproject(point))` returns the original point within tolerance.
- Camera docs demo uses a real `Venus` canvas.

### Agent I: Events

Responsibility:

- Make engine events complete and useful.

Tasks:

- I-001: Define `VenusEventMap` field comments.
- I-002: Keep `on(event, handler)` returning unsubscribe.
- I-003: Keep `off(event, handler)` idempotent.
- I-004: Add document events:
  - `document:changed`
  - `node:added`
  - `node:removed`
  - `node:updated`
- I-005: Add render events:
  - `render:before`
  - `render:after`
  - `render:error`
- I-006: Add interaction events:
  - `hit:hover`
  - `hit:click`
- I-007: Add camera events:
  - `camera:changed`
- I-008: Add asset events if image loading enters engine:
  - `asset:loaded`
  - `asset:error`
- I-009: Update engine-docs events page with buttons that trigger real events.

Acceptance criteria:

- Every event has type tests and runtime tests.
- Events docs show payloads from live interactions.

### Agent J: Animation

Responsibility:

- Make animation useful without creating editor policy.

Tasks:

- J-001: Define `venus.animate(target, keyframes, options)` contract.
- J-002: Support transform animation.
- J-003: Support opacity animation.
- J-004: Support fill/stroke animation only if renderer interpolation is defined.
- J-005: Return a controller with:
  - `cancel`
  - `pause`
  - `play`
  - `finished`
- J-006: Emit animation events.
- J-007: Update docs demo with start/cancel buttons.

Acceptance criteria:

- Animation changes the real scene.
- Animation can be canceled deterministically.
- Tests can run with fake time.

### Agent K: Engine Docs App

Responsibility:

- Keep docs readable, accurate, and demo-driven.

Tasks:

- K-001: Keep traditional docs layout:
  - left navigation
  - main content
  - no right “On this page”
- K-002: Default to light theme; dark theme optional.
- K-003: Keep canvas demos 400 by 300 unless a page explicitly needs a larger interactive area.
- K-004: Ensure H2/H3 anchors show `#` before heading on hover.
- K-005: Render each API in this order:
  - heading
  - short description
  - demo
  - usage
  - parameters/properties/methods
- K-006: Usage code:
  - max height
  - collapse by default where appropriate
  - copy button
  - synchronized with the actual demo node/options
- K-007: Parameters:
  - table only
  - weak table lines
  - include default values
  - include type and description
- K-008: Properties:
  - list or light table
  - no fake section when no properties exist
- K-009: Methods:
  - independent method blocks
  - each method has its own parameters table only when needed
- K-010: Document Model controls:
  - Transform group
  - Appearance group
  - Effects group
  - Object-specific group
- K-011: Use compact three-part inputs for numeric and percentage fields:
  - name
  - input
  - unit
- K-012: Group/Clip/Mask controls:
  - tabs for parent and every child
  - no legacy duplicate form sections
  - all child controls update the same live Venus canvas
- K-013: Add polygon controls.
- K-014: Add path controls.
- K-015: Add image controls with a safe built-in demo asset strategy.

Acceptance criteria:

- Docs feel like a serious API reference, not a generated checklist.
- Every canvas is powered by real engine code.
- Contract tests fail when docs claim unsupported APIs.

### Agent L: Test Infrastructure

Responsibility:

- Make regression visible and cheap.

Tasks:

- L-001: Keep package typecheck runnable.
- L-002: Keep package unit tests runnable.
- L-003: Add API parity tests between `VenusNode` and engine docs model pages.
- L-004: Add method parity tests between `Venus` prototype and docs Methods pages.
- L-005: Add render smoke tests for each model.
- L-006: Add hitTest tests for each model.
- L-007: Add transform matrix tests.
- L-008: Add docs app smoke test for canvas presence.
- L-009: Add visual screenshot tests only after deterministic fixtures are stable.

Acceptance criteria:

- CI or local validation catches API/docs drift.
- Render regressions have a clear reproduction fixture.

## 4. P0 Work Queue

Execute these first, in order:

1. P0-001: Reconcile `VenusNodeBase` transform type with tests and docs.
2. P0-002: Implement real document bounds for `venus.bounds()`.
3. P0-003: Verify zero stroke renders no stroke across all shapes.
4. P0-004: Add docs contract test that every Document Models page maps to a public `VenusNode` kind.
5. P0-005: Add docs contract test that every Methods page maps to a real `Venus` prototype method.
6. P0-006: Add polygon/path/image demos and controls or remove them from docs until ready.
7. P0-007: Split hitTest result display into hover and clicked payloads in the docs app.
8. P0-008: Replace camera stubs with real viewport math or clearly mark them experimental outside main docs.
9. P0-009: Replace animation stub with a real minimal animation or remove it from main Methods docs.
10. P0-010: Audit and remove mechanical docs text from engine-docs pages.

## 5. CHANGE REQUEST: P0-001

Target:

- File / Module: `packages/engine/src/runtime/venus/Venus.ts`
- File / Module: `packages/engine/src/runtime/venus/Venus.test.ts`
- File / Module: `apps/engine-docs/src/engineApiDocs.ts`

Goal:

- Problem being solved: Transform API is currently inconsistent across docs, tests, and runtime implementation.

Change Type:

- Modify

Impact:

- Affected modules: Venus public node types, document-to-engine node conversion, docs model property descriptions, transform tests.

Cleanup:

- Old logic to remove: transform handling that only checks flat `rotation` and ignores `transform`, `scale`, `skew`, and `flip` fields.

Tests:

- Tests to add/update:
  - transform object with origin
  - flat compatibility transform fields
  - group translation via transform object
  - flip/skew matrix is non-identity

## 6. Validation Commands

Run targeted validation before handing off:

```bash
pnpm -C packages/engine exec tsc --noEmit --pretty false
pnpm -C packages/engine exec node --experimental-strip-types --test src/runtime/venus/Venus.test.ts
pnpm -C apps/engine-docs exec tsc -b ./tsconfig.app.json --pretty false
pnpm -C apps/engine-docs exec node --experimental-strip-types --test src/testing/engine-docs.contract.test.ts
```

## 7. Handoff Template

Each agent handoff should include:

- Task id:
- Files changed:
- Public API changed:
- Tests added:
- Tests run:
- Docs updated:
- Cleanup completed:
- Remaining risk:

