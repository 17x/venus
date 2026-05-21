# Engine Request: Helper Import Surface Correction (2026-05-21)

Status: Request
Owner: engine team
Requester: vector-editor-web integration
Date: 2026-05-21

## Background

Vector editor currently imports several helper-style methods from @venus/engine through runtime bridge.
This creates API-surface coupling to low-level helpers and conflicts with current API governance direction (runtime/capability contracts first).

This document requests engine-side correction and replacement API design.

## Problem Statement

Current app-side usage depends on helper-style exports instead of stable capability/runtime APIs.
These imports are centralized in vector bridge and then consumed by interaction/render pipelines.

Requested outcome:

- Replace helper-style public dependencies with formal engine API entries.
- Keep migration path deterministic and backward-safe during transition.

## Helper Import Inventory

### 1) resolveEngineGeometryPayload

- Current bridge import:
  - apps/vector-editor-web/src/runtime/engine-bridge/engine.ts
- Main usage:
  - apps/vector-editor-web/src/runtime/core/createCanvasRuntimeApi.ts
  - apps/vector-editor-web/src/runtime/interaction/selectionDragController.ts
- Current role:
  - Build geometry/hit payload from nodes + pointer + tolerance options.
- Why correction is needed:
  - This is a low-level compute helper directly consumed by app policy layer.

### 2) resolveEngineAdaptiveHitTolerance

- Current bridge import:
  - apps/vector-editor-web/src/runtime/engine-bridge/engine.ts
- Main usage:
  - apps/vector-editor-web/src/product/runtime/createEditorRuntimeCommandController.ts
  - apps/vector-editor-web/src/product/runtime/canvasInteractionController/canvasInteractionController.pointerDown.ts
  - apps/vector-editor-web/src/product/runtime/canvasInteractionController/canvasInteractionController.pointerMove.ts
  - apps/vector-editor-web/src/product/runtime/canvasInteractionController/canvasInteractionController.pointerRelease.ts
- Current role:
  - Derive world/screen hit tolerance from viewport state.
- Why correction is needed:
  - Interaction policy currently calls internal strategy helper directly.

### 3) resolveNodeTransform

- Current bridge import:
  - apps/vector-editor-web/src/runtime/engine-bridge/engine.ts
- Main usage:
  - apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.ts
- Current role:
  - Resolve node transform matrix/bounds for scene conversion.
- Why correction is needed:
  - App-side adapter directly depends on transform helper internals.

### 4) toResolvedNodeSvgTransform

- Current bridge import:
  - apps/vector-editor-web/src/runtime/engine-bridge/engine.ts
- Main usage:
  - Present in compile-time bridge export contract, no active runtime call path in vector app.
- Current role:
  - Convert resolved transform into SVG transform string.
- Why correction is needed:
  - Formatter helper should not be required as stable public dependency without explicit contract.

### 5) createEngineRenderScheduler

- Current bridge import:
  - apps/vector-editor-web/src/runtime/engine-bridge/engine.ts
- Main usage:
  - apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx
- Current role:
  - Create render scheduler used by renderer lifecycle.
- Why correction is needed:
  - Runtime scheduling control is currently exposed as factory helper, not formal runtime API surface.

## Requested Engine Actions

1. Contract decision

- For each helper above, explicitly decide one of:
  - promote to formal public API (runtime/capability namespace), or
  - keep internal and provide official replacement API.

2. API proposal and naming

- Provide replacement APIs aligned with engine.runtime._ / engine.capability._ policy.
- Define input/output/error contracts before implementation.

3. Migration plan

- Publish migration mapping table:
  - old helper import -> new formal API
- Define deprecation window and removal milestone.

4. Runtime/type parity gate

- Ensure runtime exports and type declarations remain consistent for every released symbol.

5. Validation requirements

- Add contract tests for new APIs.
- Add one integration test proving vector-editor bridge can run without helper-style public imports.

## Suggested Target API Shapes (Draft, engine to finalize)

- Geometry/hit payload
  - engine.runtime.plan.createHitGeometryPayload(request)
  - or engine.capability.spatial.queryViewportCandidates(query)

- Adaptive tolerance policy
  - engine.runtime.plan.resolveHitTolerance(viewport, options)
  - or engine.capability.picking.getAdaptiveTolerance(input)

- Node transform query
  - engine.runtime.world.queryNodeTransform(nodeId | node)
  - or engine.capability.geometry.computeNodeTransform(input)

- SVG transform formatting
  - keep internal, or expose only as explicit formatter API with contract.

- Render scheduler control
  - engine.runtime.plan.requestFrame(mode)
  - engine.runtime.plan.cancelFrame(requestId)
  - engine.runtime.plan.setInteractiveInterval(ms)

## Acceptance Criteria

- Vector app no longer depends on helper-style @venus/engine public imports for the five items listed.
- Replacement APIs are documented under engine runtime/capability naming policy.
- Runtime exports and typings are parity-checked in CI.
- Existing vector interaction and render paths remain behaviorally stable.

## Engine Response (Implemented 2026-05-21)

Status: Done (engine-side API surface)

Decision policy applied:

1. Helper compute logic remains internal implementation detail.
2. Public usage path is upgraded to formal `engine.runtime.*` / `engine.capability.*` APIs.
3. Existing helper exports remain temporary compatibility surface during migration window.

### Ownership Decision (Engine vs Vector vs Lib)

| Capability | Final ownership decision | Rationale |
| --- | --- | --- |
| Geometry payload orchestration | Vector policy layer + engine runtime primitive API | Selection/hover/marquee policy belongs to app/runtime policy; engine provides formal primitive API entry. |
| Adaptive hit tolerance | Lib-level numeric strategy (consumed by vector policy) + engine formal API parity path | Pure viewport/scale numeric strategy is reusable and not engine-runtime-specific. |
| Node transform resolve | Lib/editor-primitive style geometry primitive + engine formal API parity path | Matrix/bounds transform math is generic geometry capability. |
| SVG transform formatting | Vector/lib formatter layer + engine formal API parity path | Output formatting is presentation-adjacent and not core runtime orchestration. |
| Render scheduler | Lib scheduler core + vector bridge wrapper | Scheduling is cross-domain infrastructure; not a product/runtime helper surface. |

### Migration Status (This Batch)

1. Vector bridge no longer imports helper-style APIs directly from `@venus/engine`.
2. Bridge helper entrypoints are now wrappers over formal `engine.runtime.*` / `engine.capability.*` APIs.
3. Render scheduler bridge implementation now uses `@venus/lib/scheduler` directly.
4. Existing vector call sites keep stable bridge API names for backward-safe migration.

### Governance Status (Engine + Lib, Playground Ignored)

1. Engine top-level helper exports were removed from `packages/engine/src/index.ts`:
  - `createEngineRenderScheduler`
  - `resolveEngineGeometryPayload`
  - `resolveEngineAdaptiveHitTolerance`
  - `resolveNodeTransform`
  - `toResolvedNodeSvgTransform`
2. Engine formal surface remains runtime/capability-first (`engine.runtime.*` / `engine.capability.*`).
3. Scheduler ownership is governed by lib (`@venus/lib/scheduler`) with vector bridge local wrapper.
4. Playground was not touched in this governance batch by request.

### Vector Usage Audit (Direct Search + Ownership Refactor)

| Item | Vector usage status | Ownership decision | Action |
| --- | --- | --- | --- |
| `resolveEngineGeometryPayload` | Used (`createCanvasRuntimeApi`, `selectionDragController`) | Engine primitive API + vector policy orchestration | Kept bridge API name; implemented via formal runtime API wrapper |
| `resolveEngineAdaptiveHitTolerance` | Used (`createEditorRuntimeCommandController`, pointer down/move/release controllers) | Vector/lib numeric strategy | Replaced with vector-local implementation in bridge |
| `resolveNodeTransform` | Used (`engineSceneAdapter`) | Vector/lib geometry primitive | Replaced with vector-local implementation in bridge |
| `createEngineRenderScheduler` | Used (`engineRenderer`) | Lib scheduler core + vector wrapper | Kept bridge API name; implemented with `@venus/lib/scheduler` |
| `toResolvedNodeSvgTransform` | Unused in runtime call paths (only bridge compile-time contract) | Vector/lib formatter (non-runtime-critical) | Deleted from bridge exports and compile-time contract |

### 1:1 Mapping (Old Helper -> New Formal API)

| Old helper import | New runtime API | New capability API | Decision |
| --- | --- | --- | --- |
| `resolveEngineGeometryPayload` | `engine.runtime.plan.createHitGeometryPayload(request)` | `engine.capability.spatial.createHitGeometryPayload(request)` | Promote to formal API |
| `resolveEngineAdaptiveHitTolerance` | `engine.runtime.plan.resolveHitTolerance(options)` | `engine.capability.picking.getAdaptiveTolerance(options)` | Promote to formal API |
| `resolveNodeTransform` | `engine.runtime.world.queryNodeTransform(source)` | `engine.capability.geometry.computeNodeTransform(source)` | Promote to formal API |
| `toResolvedNodeSvgTransform` | `engine.runtime.world.formatNodeSvgTransform(transform)` | `engine.capability.geometry.formatNodeSvgTransform(transform)` | Promote to formal API |
| `createEngineRenderScheduler` | `engine.runtime.plan.requestFrame(mode)` / `engine.runtime.plan.cancelFrame(requestId)` / `engine.runtime.plan.setInteractiveInterval(intervalMs)` / `engine.runtime.plan.getSchedulerDiagnostics()` | N/A | Replace helper factory with runtime scheduler control APIs |

### Replacement API Usage

#### A. Geometry payload

```ts
const payload = engine.runtime.plan.createHitGeometryPayload({
  nodes,
  pointer: { x, y },
  selectedNodeIds,
  outlineLevel: "low",
})
```

#### B. Adaptive tolerance

```ts
const tolerance = engine.runtime.plan.resolveHitTolerance({
  viewportScale,
  viewportWidth,
  viewportHeight,
})
// tolerance.screenPx / tolerance.worldPx
```

#### C. Node transform + SVG transform

```ts
const resolved = engine.runtime.world.queryNodeTransform({
  x: node.x,
  y: node.y,
  width: node.width,
  height: node.height,
  rotation: node.rotation,
  flipX: node.flipX,
  flipY: node.flipY,
})

const svgTransform = engine.runtime.world.formatNodeSvgTransform(resolved)
```

#### D. Render scheduler control

```ts
const req = engine.runtime.plan.requestFrame("interactive")
// later when needed
engine.runtime.plan.cancelFrame(req.requestId)
engine.runtime.plan.setInteractiveInterval(4)
const diag = engine.runtime.plan.getSchedulerDiagnostics()
```

### Deprecation Window

1. Phase-1 (current): new formal APIs available; helper exports retained for compatibility.
2. Phase-2 (next migration batch): vector bridge switches to formal APIs only.
3. Phase-3 (removal milestone): helper-style exports removed after bridge migration + parity test lock.

### Runtime/Type Parity and Validation

Engine-side validation completed for this request:

1. Type parity: `public-types.ts` and `createEngine.ts` synchronized.
2. Contract coverage: `createEngine.hard-cut.test.ts` extended with new runtime/capability assertions.
3. Gate status:
   - `pnpm --filter @venus/engine exec tsc --noEmit`: pass
   - `pnpm --filter @venus/engine test`: pass
   - `pnpm --filter @venus/engine run cr:check`: pass
   - `pnpm --filter @venus/vector-editor-web exec tsc --noEmit`: pass

## Notes

This request is intentionally implementation-agnostic.
No app-side code changes are required in this request document.
