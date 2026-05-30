# Vector Editor Commercial MVP Document Model Plan (2026-05-29)

## 0. Scope Definition

This document plans the vector 2D editor path toward first commercial MVP release. It focuses on the document model, runtime-to-engine adapter boundary, fake-data completeness, and Adobe Illustrator/Figma benchmark gaps.

Mutation radius for this planning slice:

- Affected domain: planning documents only.
- Authorized modules: `.ai-tasks/vector-editor`.
- Forbidden modules: vector runtime source, engine source, tests, package metadata.
- Capability tier: Tier A for repository read/write; validation is repository inspection and planning only.

Product boundary rules:

- Vector editor owns 2D product semantics: pages, artboards, layers, components, masks, rich text, styles, export/import, collaboration.
- Runtime adapts vector document data into engine-readable generic graph/resources.
- Engine must not gain Illustrator/Figma/product naming or 2D-only default APIs.
- The vector adapter may request explicit engine 2D opt-in and generic hit/render/query primitives.

## 1. Type Definition

### 1.1 Status

- DONE: implemented and evidenced by docs/tests in current repo.
- PARTIAL: type/model exists but fixture, adapter, UI, tests, or persistence are incomplete.
- TODO: required for commercial MVP and not represented enough in inspected files.
- BLOCKED: needs product/API decision before implementation.

### 1.2 Priority

- P0: commercial MVP blocker.
- P1: first paid version quality and professional workflow baseline.
- P2: competitive depth against Adobe Illustrator/Figma.
- P3: ecosystem/collaboration expansion.

## 2. CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module: `.ai-tasks/vector-editor/*` planning documents.

Goal:

- Problem being solved: continue document-model planning and make the next implementation slices explicit, especially fake-data coverage and runtime-engine boundary completeness.

Change Type:

- Add docs.

Impact:

- Affected modules: task planning only.

Cleanup:

- Old logic to remove: none in planning. Future implementation should retire legacy compatibility fields only after migration tests pass.

Tests:

- Tests to add/update in future code slices:
  - document model fixture completeness contract
  - EditorFileDocument to EditorDocument normalization contract
  - runtime scene parse/serialize round-trip contract
  - engine bridge no-private-import contract
  - commercial MVP smoke/e2e checks

## 3. Test Design

Inspection performed:

- Read vector product requirement docs: document-model governance and modules 01-04.
- Inspected model files: `documentModel.ts`, `editorElement.ts`, `editorFile.ts`, normalized document runtime, parse runtime scene, mock file fixtures, engine bridge.
- Observed 28 product requirement files under vector docs.
- Compared 25 expanded document model fields against current `MOCK_FILE`; only `createdAt`, `updatedAt`, and `blur` appeared directly in the fixture text.

Future validation commands:

1. `pnpm --filter @venus/vector-editor-web typecheck`
2. Existing app test command after confirming package scripts.
3. `pnpm -C apps/vector-editor-web exec tsx --test src/runtime/model/document-runtime/tests/*.test.ts`
4. Add product-spec fixture coverage test and include it in M2/MVP runner.

## 4. Current Model Inventory

### 4.1 Canonical `EditorDocument` / `DocumentNode`

The inspected canonical model already includes many professional fields:

- document: `id`, `name`, `schema`, `createdAt`, `updatedAt`, `width`, `height`, `pages`, `activePageId`, `lifecycle`, `styleReferences`, `extensions`, `shapes`.
- node identity and hierarchy: `id`, `type`, `name`, `parentId`, `childIds`.
- transform: `x`, `y`, `width`, `height`, `rotation`, `flipX`, `flipY`.
- visibility/editing: `opacity`, `blendMode`, `locked`, `visible`.
- text: `text`, `textRuns`, `textAutoHeight`, `textTruncation`, `textMaxLines`, paragraph/run styling.
- image: `assetId`, `assetUrl`, `clipPathId`, `clipRule`.
- geometry: `points`, `bezierPoints`, `cornerRadius`, `cornerRadii`, `ellipseStartAngle`, `ellipseEndAngle`.
- paint/effects: `fills`, deprecated `fill`, `strokes`, deprecated `stroke`, `shadow`, `blur`, gradients, image fills, blend modes, stroke alignment/caps/joins/dashes.
- vector composition: `booleanOperation`.
- component/evolution: `componentId`, `componentProperties`, `schema`, `styleRefs`, `extensions`.

### 4.2 Persisted `EditorFileDocument`

The persisted file contract has:

- file metadata: `id`, `name`, `version`, `createdAt`, `updatedAt`, `schema`.
- pages: `pages`, `activePageId`, `config.page`.
- lifecycle: `lifecycle`, `config.editor.readOnly`, migration diagnostics, crash-recovery replay.
- styles: `styleReferences`.
- extension namespace: `extensions`.
- content: `elements`, `assets`.

### 4.3 Current Fixture Gap

Current `MOCK_FILE` covers useful visual primitives but does not cover all current document model properties. Missing or under-covered fields from a 25-field spot check:

- document/file metadata: `schema`, `pages`, `activePageId`, `lifecycle`, `styleReferences`, `extensions`.
- modern paint/effects: `fills`, `strokes`, `blendMode`, `styleRefs`.
- editing state: `locked`, `visible`.
- text behavior: `textAutoHeight`, `textTruncation`, `textMaxLines`.
- asset naming consistency: `assetId`, `assetUrl` while persisted fixture still uses `asset` in elements.
- stroke details: `strokeStartArrowhead`, `strokeEndArrowhead`.
- vector composition: `booleanOperation`.
- component model: `componentId`, `componentProperties`.

Interpretation:

- The type model is ahead of initial fake data.
- The fixture still exercises legacy and visual smoke paths but is not a document-model completeness oracle.
- Commercial MVP needs one canonical sample document that intentionally covers every supported property.

## 5. Adapter Boundary Findings

### 5.1 Runtime To Engine

Current vector engine bridge builds engine scene payloads from runtime snapshots and uses generic engine APIs such as `createEngine`, graph submission, render, diagnostics, backend info, and viewport operations. This is the correct direction.

Risks:

- Engine renderer contains many product-runtime scheduling details; keep those in vector runtime and avoid moving them into engine.
- `parseRuntimeSceneToEditorDocument` currently returns only baseline `id/name/width/height/shapes` and maps many node visual fields, but does not reconstruct document-level schema/pages/lifecycle/style references/extensions.
- Asset naming differs across layers (`asset` in persisted element, `assetId` in canonical node), so normalization needs a single documented conversion rule.

### 5.2 Engine API Requests From Vector

Vector should request only generic engine APIs:

1. explicit 2D opt-in runtime profile
2. graph set/update/normalize/validate
3. layered invalidation and partial redraw
4. hit geometry payload and adaptive tolerance
5. point/rect/lasso picking
6. overlay instructions for selection, handles, guides, snapping
7. image registry and resource residency
8. diagnostics for render-stage failures
9. deterministic replay and frame capture

Vector must not request engine APIs named after Figma, Illustrator, artboard, layer panel, mask UI, or product workflow terms.

## 6. MVP Backlog

### VEC-MVP-001 [P0] Document model single source of truth

- Status: PARTIAL
- Scope: decide whether `EditorDocument` or `EditorFileDocument` is the canonical authoring model and document conversion boundaries.
- Acceptance:
  - One authoritative model doc exists.
  - File/persisted model, runtime model, and engine graph projection have explicit ownership.
  - No field has two undocumented names across layers.

### VEC-MVP-002 [P0] Fixture complete sample document

- Status: TODO
- Scope: update initial fake data or add a canonical MVP fixture that covers every supported document/file/node property.
- Acceptance:
  - All `EditorFileDocument`, `EditorDocument`, and `DocumentNode` supported fields are represented at least once.
  - Deprecated compatibility fields are covered separately from canonical fields.
  - Test fails when a new public model field lacks fixture coverage decision.

### VEC-MVP-003 [P0] Normalization and round-trip contracts

- Status: PARTIAL
- Scope: cover file -> runtime document -> engine graph -> runtime scene parse -> document round-trip.
- Acceptance:
  - Schema/pages/lifecycle/styleReferences/extensions survive supported round trips.
  - Unknown extension namespaces are preserved.
  - Asset ids and URLs normalize deterministically.

### VEC-MVP-004 [P0] Commercial editing core hardening

- Status: PARTIAL
- Scope: selection state machine, pointer lifecycle, keyboard command mapping, transform preview/commit/cancel, undo/redo.
- Acceptance:
  - No dirty preview state after cancel/interruption.
  - All high-frequency operations are replayable.
  - Mis-hit and overlay precedence cases have regression tests.

### VEC-MVP-005 [P0] Shape/path/text/style production baseline

- Status: PARTIAL
- Scope: rectangle, ellipse, polygon, star, line, path, text, image; multi-fill/stroke; gradients; shadows; blur; rich text runs.
- Acceptance:
  - Canvas display, hit testing, property editing, history, and serialization agree.
  - Text run and paragraph fields are not silently dropped.
  - Legacy `fill/stroke` compatibility has a retirement plan.

### VEC-MVP-006 [P1] Layers, groups, masks, booleans

- Status: PARTIAL
- Scope: layer tree, nested groups, isolation, masks, boolean operations, stable reordering.
- Acceptance:
  - Parent-child invariants pass after every structure command.
  - Mask and boolean operations are undoable and serializable.
  - Boolean result can re-enter path editing.

### VEC-MVP-007 [P1] Style and asset libraries

- Status: TODO
- Scope: fill/stroke/text/effect style references, color variables, image assets, font references.
- Acceptance:
  - Inline styles and references coexist.
  - Missing asset/font/style references show recoverable diagnostics.
  - Export/import keeps references stable.

### VEC-MVP-008 [P1] Engine bridge release gate

- Status: PARTIAL
- Scope: vector app consumes engine only through public API and explicit 2D opt-in profile.
- Acceptance:
  - No private engine deep imports from vector app.
  - Render diagnostics surface degraded backend/present states in product UI.
  - Engine graph payload stays generic and product-neutral.

### VEC-MVP-009 [P1] MVP commercial acceptance suite

- Status: TODO
- Scope: e2e smoke for create/open/edit/save/recover/export/import across representative documents.
- Acceptance:
  - Covers small, medium, large, image-heavy, text-heavy, group/mask/boolean-heavy documents.
  - Includes performance thresholds for pan/zoom/drag/selection.
  - Generates release report artifacts.

## 7. Release Readiness Opinion

Vector editor has a strong foundation for an MVP, but the document model and fixture coverage are not yet commercial-release complete. The highest-leverage next slice is not adding more UI; it is making the document model executable as a contract through complete fixtures and round-trip tests. Once that is stable, UI and engine-bridge work can harden against a real model instead of drifting around partial samples.
