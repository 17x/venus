# Vector2D Commercial Product Deep Plan (2026-06-03)

## 0. Purpose

This is the deep commercial execution plan for `@venus/vector-editor-web`.

The prior Vector2D plans correctly focused on document-model coverage and engine adapter boundaries. This plan expands the scope to the actual product that a paying user experiences: UI, property panels, tools, overlays, interaction handlers, product/runtime contracts, document lifecycle, file CRUD, and element CRUD.

This document is product-owned. Engine remains a generic rendering/runtime dependency. Vector2D converts product document data into engine-readable graph/resources/runtime payloads through an explicit 2D opt-in adapter.

Canonical authoring model decision:

- `.ai-tasks/vector-editor/vector2d-canonical-authoring-model-contract-2026-06-03.md`

## 1. Product Benchmark Frame

### 1.1 Products To Benchmark

- Figma: interaction smoothness, selection model, panels, collaboration-shaped document mental model, components, constraints, auto layout, export ergonomics.
- Adobe Illustrator: path editing depth, pen/pencil workflows, boolean/pathfinder, advanced stroke/fill, typography, isolation, precision transform, asset/export depth.
- Sketch/Affinity Designer: artboard/page ergonomics, inspector organization, style reuse, symbols/assets, professional local-file workflow.
- Inkscape: SVG fidelity, open document interchange, path/text/vector operation breadth.

### 1.2 First Commercial Positioning

The first paid Vector2D release does not need to beat all benchmark products. It must feel coherent and dependable in the core loop:

1. create/open file
2. create elements
3. select one or many elements
4. transform and edit properties
5. edit paths/text/images/styles
6. group/mask/boolean/reorder
7. save/recover/export
8. render through engine with deterministic diagnostics

### 1.3 Commercial Bar

- No hidden demo-only states: every visible UI control either works or is absent.
- No dead-end tool modes: every tool has Enter, Move, Commit, Cancel, Escape, and tool-switch cleanup semantics.
- No silent document loss: file and element CRUD must round-trip through persistence/history.
- No product semantics in engine: Figma/Illustrator/artboard/layer/tool naming stays in vector product/runtime, not engine APIs.

## 2. Architecture Ownership

### 2.1 Layer Responsibilities

Product owns:

- document semantics: pages, artboards, layers, groups, masks, components, styles, assets
- tool semantics: selection, direct selection, pen, shape, text, hand, zoom, crop/mask, boolean/path operations
- command policy: undo/redo, transaction merge, dirty state, shortcuts, context menus
- UI: toolbar, inspector, layer panel, pages/artboards panel, asset/style panels, dialogs, toasts, diagnostics

Runtime owns:

- pointer lifecycle, keyboard routing, tool-state dispatch, drag sessions, transform sessions
- hit-test policy inputs/outputs, selection filters, marquee/lasso resolution, snapping/guides
- overlay model and overlay instruction generation
- runtime document snapshots, command application, replay, diagnostics
- engine adapter orchestration and render scheduling policy

Engine owns:

- generic graph/resource/runtime submission
- explicit 2D opt-in rendering profile
- generic hit geometry payload, point/rect/lasso query primitives if promoted
- generic overlay/render diagnostics and frame capture/replay primitives

Engine must not own:

- artboard, layer panel, Figma, Illustrator, pen tool, direct selection, pathfinder, mask UI, or commercial workflow naming.

## 3. UI Product Surface

### V2D-UI-001 [P0] App shell and navigation baseline

Status: TODO

Scope:

- File menu: New, Open, Save, Save As, Import, Export, Recent, Close.
- Main toolbar: select, direct select, frame/artboard, shape tools, pen/path, text, image/place, hand, zoom.
- Left panel: pages/artboards/layers tree with search/filter and lock/visibility toggles.
- Right inspector: selection-sensitive property panels.
- Bottom/status: zoom, selection count, document dirty state, render/backend diagnostics.

Acceptance:

- Every shell control has a documented command id and enabled/disabled policy.
- Empty, loading, failed-open, recovery, read-only, and dirty-save states are visible.
- Product smoke covers create/open/select/edit/save/export happy path.

### V2D-UI-002 [P0] Property inspector matrix

Status: TODO

Scope:

- No selection: document/page/artboard properties.
- Single shape: identity, position, size, rotation, constraints, fill, stroke, effects, export.
- Single text: text content, runs, paragraph, font, layout, auto-height/truncation.
- Single image: asset source, fill mode, crop/clip, opacity/effects.
- Single path: path geometry, stroke caps/joins/dashes, boolean role.
- Group: group identity, bounds, child count, isolation, transform, opacity, blend.
- Multi-select: mixed values, batch edits, align/distribute, group, boolean, transform.

Acceptance:

- Inspector never shows stale values after selection changes.
- Mixed-value editing is explicit and deterministic.
- Every editable property maps to a command, history entry, and document patch.
- Unsupported properties show a recoverable disabled state, not a fake control.

### V2D-UI-003 [P1] Professional panels

Status: TODO

Scope:

- Layers/artboards/pages panel with reorder, nesting, isolation, lock/visible.
- Assets panel for images, reusable components, local style assets.
- Styles panel for fill/stroke/text/effect style references.
- History panel with transaction groups and replay diagnostics.
- Diagnostics panel for render/backend/adapter/document invariants.

Acceptance:

- Canvas and panel selection stay mirrored.
- Panel operations use the same command path as canvas/menu/shortcut operations.
- Diagnostics include stable codes suitable for support and regression tests.

## 4. Document Model And File Lifecycle

### V2D-DOC-001 [P0] Canonical authoring model decision

Status: DONE

Scope:

- Decide and document the canonical authoring model among `EditorFileDocument`, `EditorDocument`, runtime snapshot, and engine graph projection.
- Define conversion ownership and loss policy at every boundary.

Acceptance:

- No field has two undocumented names across file/runtime/product layers.
- `asset` vs `assetId` / `assetUrl` conversion is documented, with enforcement tests assigned to follow-up gates.
- Schema version, lifecycle, pages, style references, extensions, and assets have explicit preservation policy and follow-up round-trip gates.

Progress:

- Added `.ai-tasks/vector-editor/vector2d-canonical-authoring-model-contract-2026-06-03.md`.
- Decision: `EditorDocument` is the canonical in-memory authoring model; `EditorFileDocument` is persistence; `NormalizedRuntimeDocument`, `RuntimeSceneLatest`, and engine payloads are projections or compatibility surfaces.
- Documented ownership, conversion graph, field preservation policy, asset naming, legacy fill/stroke precedence, hierarchy invariants, and implementation follow-up gates.
- Follow-up implementation started for `V2D-CAM-001/002`: direct `EditorFileDocument -> EditorDocument` mapping now preserves high-risk commercial node fields and authoring-to-file save now emits the same modern fields for the canonical fixture round-trip.
- Added integration coverage in `file-runtime-roundtrip.contract.test.ts` for modern fills/strokes, angular gradients, blur/shadow, rich text runs, mask fields, boolean operation, component metadata, style refs, extensions, and asset URL resolution.

### V2D-DOC-002 [P0] File CRUD full chain

Status: TODO

Scope:

- Create new document from template.
- Open existing local file.
- Save current document.
- Save As new identity/path.
- Duplicate file/document.
- Close with dirty-state confirmation.
- Recover crash/autosave snapshot.
- Delete/remove from recent or workspace collection.

Acceptance:

- Each file operation emits lifecycle state, command source, dirty source, and diagnostics.
- Round-trip preserves document/file/node/style/asset data.
- Interrupted save/open/recovery has a deterministic rollback or recovery path.

### V2D-DOC-003 [P0] Element CRUD full chain

Status: TODO

Scope:

- Create element from toolbar, shortcut, paste, duplicate, import, and draw tool.
- Read/query element from canvas, layer panel, inspector, command API, and runtime snapshot.
- Update element by transform, inspector edit, path edit, text edit, style edit, reorder, group, mask, boolean.
- Delete element from canvas shortcut, menu, layer panel, context menu, and API.

Acceptance:

- Single-select and multi-select CRUD use the same command pipeline.
- Deleting/restoring preserves hierarchy, style refs, assets, and selection recovery.
- Every element CRUD operation is undoable, redoable, serializable, and replayable.

### V2D-DOC-004 [P0] Canonical commercial fixture suite

Status: DONE

Scope:

- Small, medium, large, text-heavy, image-heavy, group/mask/boolean-heavy, path-heavy, and style-heavy documents.
- Each fixture covers pages/artboards/layers/groups/masks/text/images/styles/assets/extensions/lifecycle.

Acceptance:

- A drift gate fails when a public model field has no fixture coverage decision.
- Fixtures are usable by product tests, runtime tests, engine adapter tests, and visual smoke.

Progress:

- Added `createCommercialDocumentFixtureSuite()` in `apps/vector-editor-web/src/testing/product-specs/document-structure/canonicalDocumentFixture.ts`.
- Commercial suite now exposes small, medium, large, text-heavy, image-heavy, group/mask/boolean-heavy, path-heavy, and style-heavy profiles.
- Strengthened `document-fixture-coverage.contract.test.ts` so the suite must expose all Phase A profiles, remain structurally safe, and provide reusable product/runtime/adapter samples.
- Fixed the canonical fixture hierarchy by listing `fixture-styled` under `fixture-group.childIds`.

## 5. Product Runtime Contract

### V2D-RT-001 [P0] Product/runtime command boundary

Status: PARTIAL

Scope:

- Stable command id taxonomy for file, selection, transform, style, path, text, layer, group, mask, boolean, viewport, export.
- Command envelope includes source, transaction id, target ids, before/after policy, merge policy, and diagnostics.

Acceptance:

- Menu, shortcut, toolbar, canvas, inspector, layer panel, and API trigger equivalent command results.
- History merge/rollback/replay behavior is deterministic.

Progress:

- Added `apps/vector-editor-web/src/product/runtime/commandContract.ts`.
- Runtime command contract now resolves commercial command family, target ids, before/after policy, merge policy, and stable diagnostic codes.
- Command taxonomy covers file, history, selection, transform, style, path, text, layer, shape, group, mask, boolean, viewport, tool, snapping, and export families.
- `createEditorRuntimeCommandController` now mirrors `commandFamily`, `beforeAfterPolicy`, and `mergePolicy` into `lastCommandMeta` and `runtime.command.dispatched` events.
- Added `runtime-command-boundary.contract.test.ts` covering taxonomy, representative command policies, root/derived source policy, and controller dispatch metadata.
- Fixed the command-boundary contract fixture to use canonical matrix-first transform payloads and real runtime controller refs, so `tsc -p tsconfig.app.json --noEmit` now validates this gate.

Remaining gate:

- Prove menu, shortcut, toolbar, canvas, inspector, layer panel, and API sources route equivalent commands/results through the same boundary.
- Extend history merge/rollback/replay assertions from representative metadata to full command-family flows.

### V2D-RT-002 [P0] State machines

Status: TODO

Scope:

- Document lifecycle: created/opened/dirty/saving/saved/recovery/closed/read-only/error.
- Tool lifecycle: idle/hover/press/drag/precision/commit/cancel/interrupted.
- Selection lifecycle: none/single/multi/sub-selection/isolation/text-focus.
- Transform lifecycle: preview/commit-pending/committed/rolled-back/cancelled.

Acceptance:

- Every transition has a reason code and owner.
- Pointer capture loss, Escape, tab switch, tool switch, and modal open clean up safely.

### V2D-RT-003 [P0] Engine adapter contract

Status: DONE

Scope:

- Explicit 2D opt-in runtime profile.
- Product document to generic engine graph/resources/runtime payload conversion.
- Adapter version, diagnostics, degradation policy, render-stage failure codes.
- No private engine imports.

Acceptance:

- Source contract proves all engine imports are from public `@venus/engine` surface.
- Adapter output contains no Figma/Illustrator/artboard/layer-panel/tool-specific engine API names.
- Render diagnostics surface in product UI and test snapshots.

Progress:

- `createEngineSceneFromRuntimeSnapshot(...)` now emits adapter metadata with stable version `vector2d.engine-scene-adapter.v1` and explicit `dimensionMode` (`2d` by default, `hybrid-2d3d` opt-in).
- Adapter snapshots now include stable degradation diagnostics for commercial fields that are currently approximated, dropped, or handled by fallback before engine submission: fill gradients, image fills, stroke gradients, blur, boolean operation, component metadata, shadow spread, and missing image source.
- Added `runtime-engine-adapter.contract.test.ts` coverage proving explicit 2D opt-in metadata, degradation diagnostics, and product/competitor/tool semantic key neutrality.
- Strengthened `scripts/runtime-governance-check.mjs` and `engine-bridge-release-gate.contract.test.ts` so production source cannot import private engine source paths and runtime code can only touch `@venus/engine` through `src/runtime/engine-bridge/`.
- Added `ENGINE_SCENE_ADAPTER_RENDER_SUPPORT_MATRIX` covering image, rich text, fills, strokes, effects, masks, groups, components, and booleans with support status, engine payload fields, diagnostic codes, and projection policy.
- Added runtime-engine adapter contract coverage proving render support matrix completeness and alignment between emitted diagnostics and declared matrix rows.
- Added `createEngineSceneAdapterDiagnosticsReport(...)` so adapter diagnostics can be summarized for release reports with schema version, adapter version, severity counts, code counts, affected node ids, and the support matrix snapshot.
- Added contract coverage proving the release-facing adapter diagnostics report summarizes commercial degradation in a stable shape.
- Runtime renderer scene sync now publishes the latest adapter diagnostics report into shared `RuntimeRenderDiagnostics.engineSceneAdapterReport`, preserving the vector product boundary while keeping engine payloads generic.
- Product `RuntimeDebugPanel` now includes a `Vector Adapter` diagnostics section in compact and verbose modes, surfacing adapter version, report schema, total diagnostics, severity counts, affected nodes, diagnostic code counts, and support-matrix summary.
- Validation passed: `pnpm -C apps/vector-editor-web exec tsc -p tsconfig.app.json --noEmit --pretty false`.
- Validation passed: `pnpm -C apps/vector-editor-web exec tsx --test src/runtime/events/index/index.test.ts`.
- Validation passed: `pnpm -C apps/vector-editor-web exec tsx --test src/testing/product-specs/integration-contract/runtime-engine-adapter.contract.test.ts`.
- Validation passed: `node apps/vector-editor-web/scripts/runtime-governance-check.mjs`.

## 6. Interaction And Selection

### V2D-INT-001 [P0] Selection model

Status: TODO

Scope:

- Click select, shift-add, cmd-toggle, cycle-hit, double-click enter group, Escape exit mode.
- Hidden/locked/clip/mask/group filtering.
- Canvas, layer panel, inspector, and history selection sync.

Acceptance:

- Selection is explainable through stable diagnostics.
- Single-select and multi-select never disagree across canvas and layer panel.

### V2D-INT-002 [P0] Marquee and lasso

Status: TODO

Scope:

- Marquee select intersects/contains modes.
- Lasso path selection for freeform selection.
- Add/subtract/toggle modifiers.
- Group/isolation/mask/clip filtering.

Acceptance:

- Marquee overlay owns pointer move during marquee.
- Candidate ids, resolved ids, rejected ids, and rejection reasons are observable.
- Rotated/grouped/clipped nodes have deterministic inclusion behavior.

### V2D-INT-003 [P0] Keyboard, shortcut, clipboard

Status: TODO

Scope:

- Context-aware shortcut routing: text focus beats canvas commands.
- Copy/cut/paste/duplicate/delete with style, hierarchy, assets, and selection recovery.
- Nudge, large nudge, align/distribute shortcuts.

Acceptance:

- Clipboard round-trip works across documents.
- Delete and duplicate are fully undoable for single and multi-select.

## 7. Overlay System

### V2D-OVL-001 [P0] Overlay taxonomy

Status: TODO

Overlay types:

- selection bounds
- hover outline
- resize handles: corners and edges
- rotation handles and rotation center/pivot
- transform preview ghost
- path anchors
- path tangent handles
- path segment hover
- text caret and text selection ranges
- marquee rectangle
- lasso path
- smart guides
- grid and rulers
- snap points
- measurement labels
- alignment/distribution guides
- mask/clip boundary
- boolean result preview
- group isolation boundary and breadcrumb overlay
- locked/hidden/read-only indicators
- drop target insertion indicators in layer tree and canvas

Acceptance:

- Each overlay has an owner, hit priority, visual state, interaction state, and degradation policy.
- Overlay instructions are generated from runtime/product state and submitted to engine through generic overlay/render payloads.
- Overlay drawing cannot mutate document state directly.

### V2D-OVL-002 [P0] Overlay hit priority

Status: TODO

Scope:

- Control handles over object body.
- Active drag overlay over hover/object hits.
- Marquee/lasso exclusive pointer-move routing.
- Text caret/range over shape selection while editing text.
- Path anchors/segments over whole-path selection in direct-select mode.

Acceptance:

- Hit priority is a single policy table with tests.
- Every rejection emits a stable reason for debugging mis-hit cases.

## 8. Handlers And Tooling

### V2D-HDL-001 [P0] Basic handlers

Status: TODO

Handlers:

- pointer down/move/up/cancel
- hover enter/move/leave
- wheel/pinch zoom
- pan/space-drag
- key down/up
- drag session start/update/end
- text input/composition
- clipboard events
- focus/blur/window visibility

Acceptance:

- Every handler is idempotent across duplicate browser events where possible.
- Lost pointer capture, pointer cancel, and window blur cannot leave stale preview state.

### V2D-HDL-002 [P0] Special handlers

Status: TODO

Handlers:

- pen anchor add/remove/convert
- bezier tangent drag with symmetry modes
- direct selection anchor/segment/subpath selection
- shape resize with constraints
- rotate around pivot
- scale from center/opposite corner
- group isolation enter/exit
- mask edit enter/exit
- boolean preview/commit
- image crop/clip adjust
- text range edit and IME composition
- layer tree reorder/drop target

Acceptance:

- Special handlers share the same command/transaction pipeline.
- Every special handler has cancel/rollback behavior and diagnostics.

### V2D-TOOL-001 [P0] Drawing tools baseline

Status: TODO

Tools:

- frame/artboard
- rectangle
- ellipse
- line
- polygon
- star
- pen
- pencil/freehand path
- text box
- image/place
- hand/pan
- zoom

Acceptance:

- Each tool creates canonical document nodes, not ad hoc runtime-only shapes.
- Drag-create, click-create, shift constraint, alt/option center-create, Escape cancel, and Enter commit are defined per tool.
- Newly created elements become selected and are immediately editable through inspector/history.

### V2D-TOOL-002 [P1] Advanced vector tools

Status: TODO

Scope:

- scissors/split path
- join path
- simplify path
- outline stroke
- expand appearance
- boolean/pathfinder panel
- text to path
- image trace placeholder planning

Acceptance:

- Advanced operations preserve undo/redo and serialization.
- Result nodes can re-enter path editing.

## 9. Transform, Group, Mask, Boolean

### V2D-XFORM-001 [P0] Transform full lifecycle

Status: TODO

Scope:

- Move, resize, rotate, scale, flip.
- Single-select and multi-select.
- Group-local and page-global coordinate modes.
- Pivot and bounding-box strategy.
- Snapping, constraints, aspect lock, center transform.

Acceptance:

- Preview, commit, history patch, render invalidation, and selection bounds update in one deterministic chain.
- Repeated transforms do not accumulate unbounded drift.

### V2D-XFORM-002 [P0] Group transform and nested structure

Status: TODO

Scope:

- Transform group as one unit.
- Transform children while preserving group invariants.
- Nested group bounds, isolation, child reorder, reparent.
- Masked and boolean children within groups.

Acceptance:

- Parent/child ids and sibling order remain valid after every group transform.
- Bounds are derived consistently across canvas, layer panel, inspector, and engine graph.

### V2D-XFORM-003 [P1] Alignment and distribution

Status: TODO

Scope:

- Align left/center/right/top/middle/bottom.
- Distribute horizontal/vertical spacing.
- Align to selection, artboard/page, key object, group-local scope.

Acceptance:

- Commands work for rotated, grouped, and mixed-size selections with documented bounds policy.

### V2D-STRUCT-001 [P0] Group/mask/boolean CRUD

Status: TODO

Scope:

- Group, ungroup, reparent, reorder.
- Create mask, release mask, edit mask content, edit masked content.
- Boolean union/subtract/intersect/exclude and release/expand result.

Acceptance:

- All structure operations are undoable, redoable, serializable, and replayable.
- Boolean/mask outputs can re-enter path edit or inspector edit according to declared support.

## 10. Style, Text, Image, Assets

### V2D-STYLE-001 [P0] Style editing baseline

Status: TODO

Scope:

- Multi-fill, multi-stroke, opacity, blend mode, gradients, image fills.
- Stroke align, caps, joins, dash patterns, arrowheads.
- Shadows, inner shadows, blur, effects.

Acceptance:

- Inspector edit, document model, engine graph, render output, and save/load agree.
- Mixed multi-select style edits have deterministic merge semantics.

### V2D-TEXT-001 [P0] Text editing baseline

Status: TODO

Scope:

- Text creation, range selection, caret, IME composition, runs, paragraph style.
- Auto-height, truncation, max lines, text box resize.
- Font fallback and missing font diagnostics.

Acceptance:

- Text focus blocks conflicting canvas shortcuts.
- Rich text runs survive save/load and render through adapter/engine path without silent collapse.

### V2D-ASSET-001 [P1] Asset and style libraries

Status: TODO

Scope:

- Image asset registry.
- Fill/stroke/text/effect styles.
- Local reusable components/symbols first, plugin/shared library later.

Acceptance:

- Missing assets/styles/fonts show recoverable diagnostics.
- References remain stable across duplicate, paste, save, load, import, export.

## 11. End-To-End Commercial Flows

### V2D-E2E-001 [P0] File CRUD release flow

Status: TODO

Flow:

1. New file from template.
2. Add artboard/page.
3. Draw shape, path, text, image.
4. Save.
5. Close.
6. Reopen.
7. Verify document equality and render equality within tolerance.
8. Export SVG/PNG or documented MVP format.

Acceptance:

- Flow passes in product smoke and produces release artifacts.

### V2D-E2E-002 [P0] Single element CRUD release flow

Status: TODO

Flow:

1. Create each supported element type.
2. Select from canvas and layer panel.
3. Edit geometry and style from inspector.
4. Transform by handles and numeric inputs.
5. Duplicate, hide, lock, delete, undo, redo.
6. Save/load and verify equality.

Acceptance:

- Each element type has a stable CRUD signature and visual smoke.

### V2D-E2E-003 [P0] Multi-select CRUD release flow

Status: TODO

Flow:

1. Marquee/lasso select mixed elements.
2. Batch transform.
3. Batch style edit.
4. Align/distribute.
5. Group and ungroup.
6. Delete and undo.
7. Save/load and verify structure/style equality.

Acceptance:

- Multi-select commands preserve hierarchy and selection recovery.

### V2D-E2E-004 [P0] Product-runtime-engine full-chain flow

Status: TODO

Flow:

1. Product command creates/updates document patch.
2. Runtime snapshot updates.
3. Adapter emits generic engine graph/resources/runtime payload.
4. Engine renders and returns diagnostics.
5. Product UI displays state and diagnostics.
6. Replay reproduces document, selection, viewport, and render signature.

Acceptance:

- Full chain has one deterministic signature per fixture and interaction script.
- Adapter version/degradation diagnostics are visible in release reports.

## 12. Execution Order

### Phase A [P0] Commercial skeleton

1. `V2D-DOC-001` canonical authoring model decision. DONE.
2. `V2D-DOC-004` commercial fixture suite. DONE.
3. `V2D-RT-001` command boundary. PARTIAL.
4. `V2D-RT-003` engine adapter contract.
5. `V2D-E2E-004` full-chain signature smoke.

### Phase B [P0] Core editing loop

1. `V2D-UI-001` shell baseline.
2. `V2D-UI-002` inspector matrix.
3. `V2D-INT-001` selection model.
4. `V2D-INT-002` marquee/lasso.
5. `V2D-XFORM-001` transform lifecycle.
6. `V2D-E2E-002` and `V2D-E2E-003` CRUD release flows.

### Phase C [P0/P1] Professional vector depth

1. `V2D-TOOL-001` drawing tools baseline.
2. `V2D-HDL-002` special handlers.
3. `V2D-STYLE-001` style baseline.
4. `V2D-TEXT-001` text baseline.
5. `V2D-STRUCT-001` group/mask/boolean CRUD.

### Phase D [P1] Commercial polish and scale

1. `V2D-UI-003` professional panels.
2. `V2D-XFORM-003` alignment/distribution.
3. `V2D-ASSET-001` asset/style libraries.
4. Large document performance gates and release report automation.

## 13. Validation Commands

Use the current commands as baseline and add targeted specs as tasks land:

```bash
pnpm -C apps/vector-editor-web exec tsc -p tsconfig.app.json --noEmit
pnpm -C apps/vector-editor-web m2:run-all
pnpm -C apps/vector-editor-web exec tsx --test src/testing/product-specs/**/*.test.ts
pnpm -C apps/vector-editor-web exec tsx --test src/testing/product-specs/integration-contract/runtime-engine-adapter.contract.test.ts
pnpm -C apps/vector-editor-web exec tsx --test src/testing/product-specs/document-structure/document-governance.contract.test.ts
git diff --check
```

Future release gate should add browser-level product smoke for the file CRUD, single-select CRUD, multi-select CRUD, and product-runtime-engine full-chain flows.

## 14. Handoff Rules

- Do not continue Vector2D work from playground `PG-S12` alone. Start from this document when the user says Vector2D commercialization is the priority.
- Keep product semantics in `apps/vector-editor-web` and `.ai-tasks/vector-editor/*`.
- Promote only reusable, generic rendering/runtime needs into `packages/engine`.
- Every implementation slice must include a product spec, runtime/adapter contract when relevant, diagnostics, and a validation command.
