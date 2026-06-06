# Vector2D Render / Operation / Hit-Test Consistency Contract (2026-06-06)

## 0. Purpose

This contract turns the recent Vector2D regressions into a durable commercial release gate.

The product symptom set was:

- rotated elements disappeared or jumped away from the visible canvas;
- shadows existed in the document model and adapter payload but were not visible;
- after moving an element, render state changed while hit-test and drag sometimes still behaved as if the element stayed in the old position;
- masked elements could display more selection chrome than the visible outer element;
- line and point-based geometry could render but fail hover or drag.

The goal is not to patch one Vector2D screen. The goal is to keep three projections coherent:

1. authoring and operation state;
2. engine render payload and backend composition;
3. hit-test, spatial broadphase, and overlay geometry.

## 1. Ownership Boundary

Vector2D owns:

- `EditorDocument` and `DocumentNode` authoring semantics;
- product selection presentation rules such as mask host/source collapse;
- command, history, inspector, layer tree, and tool behavior;
- adapter conversion from Vector2D authoring data into generic Engine payloads.

Runtime owns:

- transient pointer, transform, drag, style-handle, and overlay state;
- live interaction snapshots;
- worker spatial index updates and scene-memory writeback;
- command patch application and history merge policy.

Engine owns:

- generic matrix, geometry, clip, shadow, and overlay payload consumption;
- generic hit geometry payloads and hit-test primitives;
- WebGL/WebGPU model-complete composition;
- backend diagnostics.

Engine must not own:

- Vector2D layers, artboards, masks as product UI, Illustrator/Figma concepts, inspector semantics, or Vector2D command names.

## 2. Canonical Coordinate Contract

### 2.1 Affine Matrix Order

Generic Engine scene payloads use standard Canvas/SVG affine order:

```text
[a, b, c, d, e, f]
```

This order maps to Canvas `context.transform(a, b, c, d, e, f)`.

Rules:

- Vector2D adapter must emit `[a,b,c,d,e,f]`.
- Engine WebGL/WebGPU model-complete composition must consume `[a,b,c,d,e,f]` directly.
- Backend code must not infer legacy matrix order from value heuristics.
- Contract tests must fail if translation appears in `c/d` slots for rotated nodes.

### 2.2 Point Geometry Space

Vector2D authoring currently stores line/path/polygon/star points in world-space coordinates.

Rules:

- Runtime and Engine hit-test payloads must declare point geometry space explicitly.
- Render projection may convert world-space points into local geometry only when paired with the matching node transform.
- Hit-test must use the same effective geometry that render uses.
- Worker movement patches must keep point geometry and box geometry synchronized when both are present.

### 2.3 Scene And Spatial Bounds

Scene-memory bounds and worker spatial index bounds must be derived from one runtime bounds resolver.

Rules:

- Point-based geometry uses point or bezier bounds, not only `x/y/width/height`.
- Clip-bound images use intersection bounds between image host and clip source when available.
- Spatial broadphase updates must happen whenever committed render geometry changes.
- Rebuild and incremental update paths must use the same bounds resolver.

## 3. Projection Consistency Gates

### 3.1 Render Projection

Render projection must prove:

- rotated nodes remain visible under standard matrix order;
- groups do not translate absolute-positioned children twice;
- image clip hosts remain visible and clip sources do not paint over the host;
- generic `clipPathId` / `clipRule` is emitted instead of product-specific clip payloads;
- generic `shadow` payloads are emitted for shapes, images, and text where applicable.

Current gates:

- `apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.test.ts`
- `apps/vector-editor-web/src/testing/product-specs/integration-contract/runtime-engine-adapter.contract.test.ts`
- `apps/vector-editor-web/src/testing/product-specs/integration-contract/product-runtime-engine-full-chain.contract.test.ts`

### 3.2 Operation Projection

Operation projection must prove:

- inspector numeric edits, canvas drag, layer selection, and command API all commit through the same command pipeline;
- transform commits update authoring nodes, scene-memory slots, spatial index, and history entries;
- controller recreation does not reset command or transaction ids;
- repeated semantic operation ids remain distinct in history.

Current gates:

- `apps/vector-editor-web/src/testing/product-specs/integration-contract/runtime-command-boundary.contract.test.ts`
- `apps/vector-editor-web/src/testing/product-specs/history/history-stack-and-transaction.contract.test.ts`
- `apps/vector-editor-web/src/runtime/worker/scope/scenePatches/scenePatches.normalizedApply.test.ts`

### 3.3 Hit-Test Projection

Hit-test projection must prove:

- selected and hovered geometry comes from the live interaction document when a preview is active;
- line/path/polygon/star point geometry hit-test matches rendered geometry;
- clip-bound hosts are hit only where clip geometry allows it;
- mask source candidates collapse to the visible host for presentation, while mutation commands expand linked members only at the mutation boundary;
- moving an element updates the location from which it can be dragged again.

Current gates:

- `apps/vector-editor-web/src/testing/product-specs/rendering/vector-render-regressions.contract.test.ts`
- `apps/vector-editor-web/src/product/runtime/__tests__/runtimeSelectionFilterPolicyBehavior.test.ts`
- `apps/vector-editor-web/src/testing/product-specs/interaction/selection-bounds-state.contract.test.ts`
- browser QA: select `Analytics Card`, rotate to `30deg`, move to `X=220/Y=240`, then drag from the new visible position and verify inspector changes to a new coordinate.

### 3.4 Backend Composition Projection

Backend composition must prove:

- WebGL and WebGPU rich-node composition apply standard affine transforms;
- generic shadow payloads set `shadowColor`, `shadowOffsetX`, `shadowOffsetY`, and `shadowBlur`;
- generic clip payloads call Canvas clip with the requested rule;
- backend capability gates still classify unsupported fast-path cases with stable reasons.

Current gate:

- `packages/engine/src/testing/webAdapter.conformance.test.ts`

## 4. Commercial Release Invariants

For every supported element type, the release flow must preserve these invariants:

- if an element is visible, its outer selectable geometry must be explainable;
- if an element can be selected, dragging from its visible body or active handles must affect that same element;
- if an inspector transform value changes, render, hit-test, selection outline, and history must converge after commit;
- if a style/effect is shown as enabled, either it visibly renders or the UI shows an explicit degraded/unsupported state;
- if an element is masked or clipped, visual selection presents the visible outer host once.

## 5. Remaining Follow-Up Items

### V2D-COORD-001 [P0] Browser-level render/operation/hit-test replay

Status: TODO

Build a deterministic Playwright replay that:

- selects representative rectangle, ellipse, line, path, image, text, group, and mask host nodes;
- applies inspector and canvas transforms;
- verifies after each commit that a second drag from the new visible location changes the same selected node;
- captures screenshots and runtime diagnostics for release reports.

### V2D-COORD-002 [P0] Overlay projection QA

Status: TODO

The committed state is now aligned, but rotated transform overlay can still draw a large blue polygon crossing nearby content.

Required work:

- isolate whether the overlay uses union bounds, stale detail outlines, or mixed local/world points;
- define overlay geometry space per instruction;
- add a visual/regression gate for rotated single-select and masked host selection;
- keep overlay instructions generic before submission to Engine.

### V2D-COORD-003 [P1] Shared Engine backend composition helpers

Status: TODO

The WebGL and WebGPU model-complete composition paths now share behavior but still duplicate implementation.

Required work:

- extract matrix, shadow, clip, rounded-rect, ellipse-sector, path, and text-run composition helpers;
- keep backend-specific presentation/upload code separate;
- add EN/CN Engine docs for generic scene node transform, clip, shadow, and rich-node composition behavior.

### V2D-COORD-004 [P1] Diagnostics for projection mismatch

Status: TODO

Add product-visible diagnostics when render, hit-test, scene-memory bounds, and spatial index bounds disagree beyond tolerance.

Suggested diagnostic families:

- `v2d.projection.matrix-order.invalid`
- `v2d.projection.point-space.mismatch`
- `v2d.projection.spatial-bounds.stale`
- `v2d.projection.overlay-geometry.mismatch`
- `v2d.projection.backend-effect.dropped`

## 6. Validation Commands

Targeted:

```bash
pnpm -C apps/vector-editor-web exec tsx --test src/runtime/presets/engineSceneAdapter/engineSceneAdapter.test.ts src/runtime/worker/scope/scenePatches/scenePatches.normalizedApply.test.ts src/testing/product-specs/rendering/vector-render-regressions.contract.test.ts
pnpm -C packages/engine exec tsx --test src/testing/webAdapter.conformance.test.ts
pnpm -C apps/vector-editor-web exec tsc -p tsconfig.app.json --noEmit
pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit
git diff --check
```

Full Vector2D product specs:

```bash
rg --files apps/vector-editor-web/src/testing/product-specs -g '*.test.ts' | sed 's#apps/vector-editor-web/##' | xargs pnpm -C apps/vector-editor-web exec tsx --test
```

Browser replay:

```bash
pnpm -C apps/vector-editor-web run test:consistency-replay
```

The committed replay starts the editor, selects `Analytics Card`, sets `X=220`, `Y=240`, `Rotation=30deg`, drags from the transformed visible center, and asserts Inspector X/Y update while rotation and selection remain stable.

## 7. Handoff Notes

- Start from this document when working on render/operation/hit-test drift, rotated disappearance, shadow rendering, line dragging, mask selection chrome, or overlay projection bugs.
- Use `.ai-tasks/vector-editor/vector2d-consistency-execution-roadmap-2026-06-06.md` for milestone order and implementation handoff.
- Do not solve these bugs by adding product semantics to Engine.
- Promote only generic primitives into Engine: affine transform, clip, shadow, geometry-space, spatial query, hit-test, overlay draw instructions.
- Keep Vector2D presentation policy in Vector2D runtime: mask host/source collapse, layer panel behavior, inspector controls, and command taxonomy.
