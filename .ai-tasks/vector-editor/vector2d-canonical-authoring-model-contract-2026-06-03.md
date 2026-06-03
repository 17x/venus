# Vector2D Canonical Authoring Model Contract (2026-06-03)

## 0. Decision

`EditorDocument` is the canonical in-memory authoring model for Vector2D product editing.

`EditorFileDocument` is the persisted file/container format. It is not the live authoring model.

`NormalizedRuntimeDocument` is a runtime structural projection used for graph invariants, parent/child operations, group bounds, and command helpers. It is not a persistence format.

`RuntimeSceneLatest` is an import/interchange scene projection used by file adapters and legacy scene parsing. It is not allowed to be the commercial product source of truth.

Engine graph/resource/runtime payloads are render/runtime projections emitted by the vector adapter. They are not authoring or persistence models.

## 1. Current Code Evidence

Authoring model:

- `apps/vector-editor-web/src/runtime/model/documentModel.ts`
- Types: `EditorDocument`, `DocumentNode`, `EditorDocumentPage`, `EditorDocumentLifecycleState`, `EditorDocumentStyleReferences`

Persistence model:

- `apps/vector-editor-web/src/runtime/types/editorFile.ts`
- Types: `EditorFileDocument`, `EditorFileAsset`, `EditorFilePageSpec`, lifecycle/recovery payloads

File to authoring conversion:

- `apps/vector-editor-web/src/runtime/adapters/fileDocument/fileDocument.ts`
- `createEditorDocumentFromFile(file)` converts persisted file data into normalized `EditorDocument`.
- `createFileElementsFromDocument(document)` converts authoring nodes back into file `elements`.

Legacy/interchange scene projection:

- `apps/vector-editor-web/src/runtime/adapters/fileFormatScene.ts`
- `createRuntimeSceneFromVisionFile(file)` converts file elements into `RuntimeSceneLatest`.
- `apps/vector-editor-web/src/runtime/model/parseRuntimeScene/parseRuntimeScene.ts`
- `parseRuntimeSceneToEditorDocument(scene)` parses runtime scene data into baseline `EditorDocument` shape data.

Runtime structural projection:

- `apps/vector-editor-web/src/runtime/model/document-runtime/normalizedDocumentRuntime.ts`
- `createNormalizedRuntimeDocument(document)` builds node table/root id projection from `EditorDocument`.
- Runtime helpers may derive group bounds or apply structure changes, then write back into `EditorDocument` nodes.

Document governance:

- `apps/vector-editor-web/src/runtime/model/document-runtime/documentGovernance.ts`
- `normalizeEditorDocumentContract(document)` fills canonical defaults.
- `collectDocumentInvariantViolations(document)` checks id, parent/child, cycles, and active page invariants.

Engine render projection:

- `apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.ts`
- `createEngineSceneFromRuntimeSnapshot(...)` converts product/runtime snapshots into generic renderable nodes for engine submission.

Product file lifecycle:

- `apps/vector-editor-web/src/product/useEditorDocument.ts`
- Product state stores `EditorFileDocument | null`, derives `EditorDocument`, and saves by converting `EditorDocument` back to file elements.

## 2. Ownership Rules

### 2.1 `EditorDocument` Owns Product Editing Semantics

`EditorDocument` owns:

- document identity visible to product editing surfaces: `id`, `name`
- schema metadata and migration version
- created/updated timestamps after persistence normalization
- page/artboard list and `activePageId`
- lifecycle state as projected into the authoring session
- style references
- extension namespaces
- ordered `DocumentNode[]`

`DocumentNode` owns:

- product shape type: frame, group, rectangle, ellipse, polygon, star, lineSegment, path, text, image
- hierarchy: `parentId`, `childIds`
- geometry and transform: `x`, `y`, `width`, `height`, `rotation`, flips
- visibility/editing: opacity, blend mode, locked, visible
- text content, runs, paragraph/run styling
- image references: `assetId`, `assetUrl`, clip data
- path/vector geometry: points, bezier points, ellipse arcs, boolean operation
- style/effects: fills, strokes, shadows, blur, corner radii, arrows
- component/style refs and extension metadata

### 2.2 `EditorFileDocument` Owns Persistence And Import/Export Containers

`EditorFileDocument` owns:

- file-level id/name/version/schema
- file lifecycle and recovery replay payloads
- persisted page specs and config
- persisted `elements` payloads
- persisted `assets`
- save/load and import/export compatibility data

The file layer may keep compatibility fields that do not belong in the long-term authoring model, but each compatibility field must have a documented conversion rule.

### 2.3 Runtime Owns Projections, Not Source Data

Runtime projections own:

- normalized node table and root ordering
- command/session projections
- hit, overlay, selection, and transform session state
- derived group bounds and transient preview state
- replay and diagnostics payloads

Runtime projections must be rebuildable from `EditorDocument` plus runtime state. They must not become independent document truth.

### 2.4 Engine Owns Generic Render/Runtime Projections

Engine receives:

- generic graph/resource/runtime payloads
- explicit 2D opt-in profile and adapter diagnostics
- generic render, hit, overlay, and frame diagnostics

Engine must not receive Vector2D product semantics as API names. Terms such as artboard, layer panel, pen tool, pathfinder, direct selection, Figma, and Illustrator stay in vector product/runtime.

## 3. Conversion Graph

Canonical flow:

```text
EditorFileDocument
  -> createRuntimeSceneFromVisionFile
  -> parseRuntimeSceneToEditorDocument
  -> normalizeEditorDocumentContract
  -> EditorDocument
  -> createNormalizedRuntimeDocument
  -> runtime command/session projections
  -> createEngineSceneFromRuntimeSnapshot
  -> generic engine graph/resources/runtime payloads
```

Save flow:

```text
EditorDocument
  -> createFileElementsFromDocument
  -> EditorFileDocument.elements
  -> saveFileHelper / import-export surface
```

Commercial target flow:

```text
EditorFileDocument
  -> direct file-to-EditorDocument normalization
  -> EditorDocument as live source
  -> runtime/engine projections rebuilt from EditorDocument
  -> EditorFileDocument save/export with explicit compatibility mapping
```

The current code still routes through `RuntimeSceneLatest` during file import. That is acceptable as a compatibility bridge, but the commercial target should make `EditorDocument` the explicit product source and treat `RuntimeSceneLatest` as import/interchange only.

## 4. Field Preservation Policy

### 4.1 Must Preserve Across File Round Trip

- document schema, createdAt, updatedAt
- pages and activePageId
- lifecycle state and recovery metadata where applicable
- styleReferences
- extensions at document and node level
- all supported `DocumentNode` identity, hierarchy, geometry, transform, style, text, image, mask, boolean, component, and extension fields
- assets and asset references

### 4.2 May Be Derived

- group bounds from children
- runtime root ids from parent/child links
- selection bounds from selected nodes
- renderable shape payloads from `DocumentNode` style and geometry
- engine material/render data from vector product styles

### 4.3 Must Not Be Silently Dropped

- modern `fills` / `strokes` when legacy `fill` / `stroke` exists
- textRuns and paragraph style
- image asset references and URLs
- styleRefs
- blendMode, opacity, blur, inner/drop shadow distinctions
- stroke align/cap/join/dash/arrowhead values
- mask/clip metadata
- boolean operation metadata
- component metadata
- unknown extension namespaces

### 4.4 Allowed Loss Must Be Explicit

If an import/export format cannot preserve a field, the adapter must emit a stable diagnostic with:

- source format
- field path
- loss kind: unsupported, approximated, dropped, flattened, rasterized
- affected node ids or document scope
- suggested recovery or compatibility fallback

## 5. Naming And Compatibility Rules

### 5.1 Asset Naming

Current code bridges persisted `element.asset` to authoring `DocumentNode.assetId` and resolves `assetUrl` from `EditorFileAsset.objectUrl`.

Commercial rule:

- `EditorFileDocument.assets[].id` is the persisted asset id.
- persisted element compatibility may use `asset` until migration.
- `DocumentNode.assetId` is the canonical authoring reference.
- `DocumentNode.assetUrl` is a session/render convenience and should be reconstructable from assets where possible.
- missing asset resolution must produce diagnostics, not blank silent rendering.

### 5.2 Legacy Fill/Stroke

Current model supports both legacy `fill`/`stroke` and canonical `fills`/`strokes`.

Commercial rule:

- `fills` and `strokes` are canonical for new product features.
- `fill` and `stroke` remain compatibility fields until migration gates prove safe retirement.
- adapters must define precedence when both exist.

Recommended precedence:

1. `fills` / `strokes` if present and non-empty.
2. legacy `fill` / `stroke` as fallback.
3. default visual style only when neither is present.

### 5.3 Hierarchy

Commercial rule:

- `parentId` and `childIds` are both canonical and must stay bidirectionally consistent.
- `NormalizedRuntimeDocument` may repair or project structure, but persistence must fail or emit diagnostics if invariants remain unsafe.

## 6. Product And Runtime Implications

### 6.1 UI And Inspector

All inspector fields must read/write `EditorDocument` / `DocumentNode` fields through commands. Inspector must not edit engine scene payloads directly.

### 6.2 Commands

Commands are authoring mutations. They patch `EditorDocument`, not engine graph payloads. Runtime then rebuilds projections.

### 6.3 Overlays

Overlays are runtime/product projections derived from `EditorDocument`, selection state, hover state, and tool sessions. They are not document nodes unless the user commits a drawing/editing command.

### 6.4 File CRUD

File CRUD changes `EditorFileDocument` containers and lifecycle. Live editing always happens through `EditorDocument` after open/create.

### 6.5 Element CRUD

Element CRUD changes `DocumentNode` records through product commands. The same command path must serve canvas, layer panel, inspector, menu, shortcut, and API triggers.

## 7. Immediate Gaps

### V2D-CAM-001 [P0] Direct file-to-authoring contract

Status: PARTIAL

Add or document a direct `EditorFileDocument -> EditorDocument` mapping that does not rely on lossy runtime scene fields for commercial-only fields.

Acceptance:

- schema/pages/lifecycle/styleReferences/extensions survive file open.
- modern fills/strokes/text/image/component fields survive when fixture contains them.
- unsupported fields emit diagnostics.

Progress:

- `createEditorDocumentFromFile(file)` now maps `file.elements` directly into `DocumentNode[]` and uses the runtime scene compatibility bridge only for canvas sizing compatibility.
- Direct mapping now preserves modern authoring fields: `fills`, `strokes`, gradient variants including angular/diamond metadata, image fills, opacity, blend mode, locked/visible, blur, shadow kind/spread/blend, rich text runs, text layout fields, mask fields, boolean operation, component metadata, style refs, extensions, and asset URL resolution from `EditorFileDocument.assets`.
- Added `file authoring round trip preserves modern node style, text, mask, component, and extension fields` in `apps/vector-editor-web/src/testing/product-specs/integration-contract/file-runtime-roundtrip.contract.test.ts`.

Remaining:

- Add stable unsupported-field diagnostics instead of only preserving supported fields.
- Add explicit coverage matrix for fields that are compatibility-mapped or intentionally dropped.

### V2D-CAM-002 [P0] Authoring-to-file field coverage gate

Status: PARTIAL

Add a field coverage contract for `createFileElementsFromDocument` and save snapshots.

Acceptance:

- every public `DocumentNode` field has a save policy: preserve, derive, compatibility-map, or explicitly drop with diagnostic.

Progress:

- `createFileElementsFromDocument(document)` now emits modern authoring fields needed by the commercial fixture round-trip, including `fills`, `strokes`, `blur`, layer visibility/editing/compositing fields, text layout fields, boolean operation, component metadata, and deep-cloned style payloads.
- Existing integration contract now proves the canonical commercial `fixture-styled` node survives authoring-to-file-to-authoring for high-risk style/text/mask/component fields.

Remaining:

- Replace representative fixture assertions with a generated public-field save-policy matrix.
- Emit explicit diagnostics for fields whose save policy is `derive`, `compatibility-map`, or `drop`.

### V2D-CAM-003 [P0] Runtime scene compatibility boundary

Status: TODO

Keep `RuntimeSceneLatest` as import/interchange compatibility and test the fields it cannot represent.

Acceptance:

- round-trip tests distinguish full commercial file round trip from runtime-scene compatibility round trip.

### V2D-CAM-004 [P0] Engine adapter projection contract

Status: DONE

Document and test `EditorDocument -> engine payload` projection.

Acceptance:

- adapter output is generic and product-neutral.
- image, rich text, fills/strokes/effects, masks, groups, and booleans have explicit render support or diagnostics.

Progress:

- `createEngineSceneFromRuntimeSnapshot(...)` emits stable adapter metadata, explicit `2d` / `hybrid-2d3d` dimension opt-in, generic render nodes, and projection diagnostics.
- `ENGINE_SCENE_ADAPTER_RENDER_SUPPORT_MATRIX` documents image, rich text, fills, strokes, effects, masks, groups, components, and booleans with projected/degraded/fallback status.
- `createEngineSceneAdapterDiagnosticsReport(...)` summarizes adapter diagnostics for release tooling and product diagnostics UI.
- `RuntimeRenderDiagnostics.engineSceneAdapterReport` now surfaces the latest adapter report through the shared runtime diagnostics store, and `RuntimeDebugPanel` renders it as a product-visible `Vector Adapter` section.
- `runtime-engine-adapter.contract.test.ts` proves product-neutral payload keys, support-matrix coverage, diagnostics alignment, and report shape.
- `product-runtime-engine-full-chain.contract.test.ts` proves a deterministic Product -> Runtime -> Engine -> Product diagnostics signature.

## 8. Task Status Updates

This document completes the planning decision for:

- `V2D-DOC-001 [P0] Canonical authoring model decision`
- `VEC-MVP-001 [P0] Document model single source of truth`

The baseline commercial fixture suite is now implemented. The command boundary now has a runtime taxonomy/envelope baseline, and the engine adapter projection gate is closed. UI source equivalence, full round-trip preservation diagnostics, runtime-scene compatibility boundaries, and browser-level full-chain replay remain explicit follow-up work.

Implementation gates remain open under:

- `V2D-RT-001` command boundary
- `V2D-E2E-004` product-runtime-engine full-chain flow browser replay
- `V2D-CAM-001` through `V2D-CAM-003` above

## 9. Validation Commands

For this planning slice:

```bash
git diff --check
```

For implementation follow-up:

```bash
pnpm -C apps/vector-editor-web exec tsc -p tsconfig.app.json --noEmit
pnpm -C apps/vector-editor-web m2:run-all
pnpm -C apps/vector-editor-web exec tsx --test src/testing/product-specs/document-structure/document-governance.contract.test.ts
pnpm -C apps/vector-editor-web exec tsx --test src/testing/product-specs/integration-contract/runtime-engine-adapter.contract.test.ts
```
