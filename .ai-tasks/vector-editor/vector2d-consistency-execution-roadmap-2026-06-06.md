# Vector2D Consistency Execution Roadmap (2026-06-06)

## 0. Source Of Truth

This roadmap executes:

- `.ai-tasks/vector-editor/vector2d-render-operation-hittest-consistency-contract-2026-06-06.md`

Related source documents:

- `.ai-tasks/vector-editor/vector2d-commercial-product-deep-plan-2026-06-03.md`
- `.ai-tasks/vector-editor/vector2d-canonical-authoring-model-contract-2026-06-03.md`
- `.ai-tasks/engine/engine-requirements-simplified-and-gap-check-2026-06-01.md`

## 1. Execution Goal

Make Vector2D commercially dependable by proving that every visible editable element has one coherent state across:

- authoring model;
- runtime scene memory;
- worker spatial index;
- Engine render payload;
- Engine hit-test payload;
- overlay instructions;
- browser UI behavior.

This is also an Engine validation track: every reusable fix should be promoted only as generic Engine capability.

## 2. Current State

Completed:

- Standard Engine scene affine order is `[a,b,c,d,e,f]`.
- WebGL/WebGPU rich-node composition consumes generic shadow payloads.
- Worker spatial broadphase uses runtime bounds for point and clip geometry.
- Mask source selection collapses to visible host for presentation.
- Browser QA confirmed rotated/moved `Analytics Card` can be dragged again from the new visible position.
- M1 browser replay gate is committed as `pnpm -C apps/vector-editor-web run test:consistency-replay`.
- M2 stale selected-outline geometry root cause is fixed by recomputing Engine geometry payload from the live interaction document.
- M3 phase 1 extracted shared Engine rich-node matrix/shadow composition helpers.
- M3 phase 2 extracted shared Engine rich-node clip path composition helpers.
- M3 phase 3 extracted shared Engine rich-node rounded-rect path composition helpers.
- M3 phase 3 extracted shared Engine rich-node ellipse sector composition helpers.
- M3 phase 3 extracted shared Engine rich-node point/path/bezier composition helpers.
- M3 phase 3 extracted shared Engine rich-node text-run layout fallback helpers.

Open:

- Projection mismatch diagnostics are not yet product-visible.

## 3. Milestone Plan

### M1 [P0] Commit Browser Replay Gate - DONE

Objective:

- Convert the manual browser QA flow into a deterministic script/gate.

Implemented files:

- `apps/vector-editor-web/scripts/playwright-consistency-replay.mjs`
- `apps/vector-editor-web/package.json`

Required flow:

1. Start the Vector2D app.
2. Select a representative node through the layer tree.
3. Apply inspector transform values.
4. Drag from the new visible location.
5. Assert inspector coordinates changed again.
6. Capture and summarize console errors.
7. Initial committed case:
   - rectangle with shadow: `Analytics Card`.
8. Follow-up cases:
   - rectangle with shadow;
   - line segment;
   - image with clip/mask host;
   - path or polygon;
   - text node.

Acceptance:

- The script fails on app/page errors.
- WebGL ReadPixels performance warnings are allowed but counted.
- The script fails if any element becomes non-draggable after moving.
- Screenshots are written outside the repo unless an explicit report artifact is requested.

Validation:

```bash
pnpm -C apps/vector-editor-web run test:browser-command-routing
pnpm -C apps/vector-editor-web run test:consistency-replay
```

Last verified result:

```json
{"result":"pass","target":"card-analytics","viewportScale":1.1812,"expected":{"x":274.18,"y":275.56,"rotation":30},"actual":{"x":276,"y":274,"rotation":30},"routedSources":["layer-row-select","inspector-transform-fields","canvas-post-transform-drag"]}
```

### M2 [P0] Fix Rotated Overlay Projection - DONE

Objective:

- Eliminate the large incorrect blue transform polygon seen after rotating and moving `Analytics Card`.

Root cause:

- `engineGeometryPayload` was memoized from `interactionDocument.shapes`, but `interactionDocument` was missing from the `useMemo` dependency list.
- Inspector transform edits and drag previews could update render/operation state while selected outline payload remained stale.
- This made selected overlay geometry visually diverge from the live transformed element.

Implemented files:

- `apps/vector-editor-web/src/product/useEditorRuntime/derivedState/derivedState.ts`
- `apps/vector-editor-web/src/testing/product-specs/rendering/vector-render-regressions.contract.test.ts`

Investigation path:

1. Inspect overlay generation:
   - `apps/vector-editor-web/src/product/useEditorRuntime/derivedState/derivedState.overlays.ts`
   - `apps/vector-editor-web/src/product/useEditorRuntime/derivedState/derivedState.shared.ts`
   - `apps/vector-editor-web/src/runtime/primitive/overlayControl/overlayInstructionAdapter.ts`
2. Inspect selected geometry payload:
   - `packages/engine/src/kernel/interaction/geometryPayload/geometryPayloadTransform.ts`
   - `apps/vector-editor-web/src/runtime/core/createCanvasRuntimeApi.ts`
3. Determine whether the bad polygon comes from:
   - stale detail outlines;
   - union bounds mixed with single-node rotation;
   - local/world point-space mismatch;
   - mask-linked presentation ids leaking detail outlines;
   - overlay preview geometry not using the same live interaction document.

Acceptance:

- Single rotated rectangle selection outline matches visible rectangle.
- Mask host selection shows one outer host outline.
- Line/path hover/selection overlays follow visible geometry after move/rotate.
- No overlay instruction carries mixed coordinate-space points without an explicit `geometrySpace` or equivalent policy.

Suggested tests:

- Add a product-spec test for rotated single-select overlay instructions.
- Extend `vector-render-regressions.contract.test.ts` with overlay projection cases.
- Add browser screenshot smoke for rotated selection overlay.

Validation:

```bash
pnpm -C apps/vector-editor-web exec tsx --test src/testing/product-specs/rendering/vector-render-regressions.contract.test.ts
pnpm -C apps/vector-editor-web exec tsc -p tsconfig.app.json --noEmit --pretty false
pnpm -C apps/vector-editor-web run test:consistency-replay
```

### M3 [P1] Extract Shared Engine Composition Helpers - DONE

Objective:

- Reduce WebGL/WebGPU drift by sharing generic rich-node composition logic.

Candidate helper module:

- `packages/engine/src/backend/adapters/richNodeComposition.ts`

Candidate helper responsibilities:

- standard affine matrix resolution; DONE.
- shadow application; DONE.
- clip path construction; DONE.
- rounded rectangle path construction; DONE.
- ellipse sector construction; DONE.
- point/path/bezier construction; DONE.
- text run layout fallback; DONE.

Must keep backend-specific code separate:

- WebGL texture upload/present;
- WebGPU texture copy/present;
- diagnostics publication;
- backend capability probes.

Acceptance:

- Existing `webAdapter.conformance.test.ts` remains green.
- Helper-level tests cover matrix, shadow, polygon/ellipse/rect clip, rounded-rect, ellipse-sector, point/path/bezier, and text-run layout helpers.
- No Vector2D product names appear in Engine helper APIs.

Implemented files:

- `packages/engine/src/backend/adapters/richNodeComposition.ts`
- `packages/engine/src/backend/adapters/webglBackendAdapter.ts`
- `packages/engine/src/backend/adapters/webgpuBackendAdapter.ts`
- `packages/engine/src/testing/richNodeComposition.contract.test.ts`

Validation:

```bash
pnpm -C packages/engine exec tsx --test src/testing/richNodeComposition.contract.test.ts src/testing/webAdapter.conformance.test.ts
pnpm -C packages/engine exec tsc -p tsconfig.json --noEmit --pretty false
```

### M4 [P1] Projection Mismatch Diagnostics

Objective:

- Make coordinate-space or projection drift observable before users notice broken interaction.

Phase 1 status: DONE.

Implemented:

- Added `collectProjectionDiagnostics`.
- Extended `OverlayDiagnostics` with `projectionDiagnostics`.
- Runtime derived state now compares `selectionState.selectedBounds` against Engine selected geometry payload bounds.
- Emitted diagnostics:
  - `v2d.projection.overlay-geometry.mismatch`
  - `v2d.projection.spatial-bounds.stale`
- Runtime render diagnostics now mirror projection diagnostic count/codes/nodes.
- Runtime Debug Panel now shows projection diagnostic count/codes/nodes in compact and verbose modes.
- Added release-facing regression tests for:
  - zero diagnostics when runtime and Engine selected bounds agree within tolerance;
  - mismatch diagnostic when Engine selected geometry drifts beyond tolerance;
  - stale spatial-bounds diagnostic when Engine selected geometry is missing.

Suggested diagnostic payload:

```ts
{
  code: 'v2d.projection.spatial-bounds.stale',
  nodeId: string,
  source: 'runtime.scene-memory' | 'worker.spatial-index' | 'engine.hit-geometry' | 'engine.render-payload' | 'overlay',
  expectedBounds: {minX: number; minY: number; maxX: number; maxY: number},
  actualBounds: {minX: number; minY: number; maxX: number; maxY: number},
  tolerance: number
}
```

Initial diagnostic families:

- `v2d.projection.matrix-order.invalid`
- `v2d.projection.point-space.mismatch`
- `v2d.projection.spatial-bounds.stale`
- `v2d.projection.overlay-geometry.mismatch`
- `v2d.projection.backend-effect.dropped`

Acceptance:

- Runtime Debug Panel can show the latest projection diagnostics. DONE for count/code/node summaries; full bounds detail remains follow-up.
- Diagnostics do not introduce Engine product semantics.
- Release tests can assert zero P0 projection diagnostics for the commercial fixture.

## 4. Implementation Rules

- Do not fix overlay or hit-test drift by hiding selection chrome.
- Do not add Vector2D command names to Engine.
- Do not make Engine 2D-first. Vector2D remains an explicit adapter/profile.
- Do not trust visual rendering alone; pair it with hit-test and second-drag proof.
- Do not trust hit-test alone; pair it with screenshot or render signature proof.
- Keep browser smoke deterministic and scoped to stable fixture nodes.

## 5. Recommended Next Task

Continue **M4 projection mismatch diagnostics** and Engine composition API documentation.

Reason:

- M1 now protects the exact user-facing failure mode.
- M2 now keeps selected outline geometry synchronized with the live interaction document.
- M3 phase 1 reduced matrix/shadow drift without adding Vector2D product semantics.
- M3 phase 2 reduced clip path drift without adding Vector2D product semantics.
- M3 phase 3 reduced rounded-rect and ellipse-sector drift without adding Vector2D product semantics.
- M3 phase 3 reduced point/path/bezier drift without adding Vector2D product semantics.
- M3 phase 3 reduced text-run layout drift without adding Vector2D product semantics.
- Next phase should expose projection/composition diagnostics and document the generic rich-node composition behavior.

## 6. Handoff Checklist

Before handing off:

- Update this roadmap milestone status.
- Update `.ai-tasks/vector-editor/vector2d-commercial-product-deep-plan-2026-06-03.md` if a milestone becomes DONE.
- Add or update validation commands.
- Run `git diff --check`.
- If browser validation was attempted, record Browser availability and fallback reason.
