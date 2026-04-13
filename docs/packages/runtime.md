# `@venus/runtime`

Package-scoped note for the framework-agnostic Venus runtime core.

## Stable Knowledge

- Owns worker bridge, runtime lifecycle, viewport state/math, and extensibility
  contracts.
- Must remain framework-agnostic.
- Do not move React hooks, components, or opinionated presets into this
  package.

## Recent Updates

### 2026-04-13

- Shared memory transport ownership moved into runtime subpath
  `@venus/runtime/shared-memory`
  (`packages/runtime/src/shared-memory/index.ts`), and the standalone
  `packages/shared-memory` package was removed.
- Runtime/app source imports now consume shared memory types/helpers from the
  runtime subpath so the active runtime chain no longer depends on a separate
  workspace package.

- Added framework-agnostic runtime API object entrypoints:
  `createCanvasRuntimeApi(...)`
  (`packages/runtime/src/core/createCanvasRuntimeApi.ts`) and
  `createDefaultCanvasRuntimeApi(...)`
  (`packages/runtime/src/core/defaultRuntimeApi.ts`).
  Apps can now communicate with runtime through one object that bundles:
  runtime lifecycle + command/viewport methods,
  default interaction adapters,
  overlay hover state helpers,
  and presentation config getters/updates.
- Added runtime-level presentation config contracts for overlay styling:
  `CanvasPresentationConfig` + patch updates, including marquee and overlay
  style domains.
  Active app bridges now pass these configs from runtime API object state into
  app overlays:
  `apps/vector-editor-web/src/hooks/useCanvasRuntimeBridge.ts` and
  `apps/playground/src/runtime/usePlaygroundRuntimeBridge.ts`.
- Removed deprecated runtime React subpath surface from source:
  `packages/runtime/src/react/*` was deleted and runtime package export
  `@venus/runtime/react` was removed.
  Runtime package now stays framework-agnostic and app-local React integration
  remains in app-layer bridge files.

- Added framework-agnostic TS runtime entry
  `createCanvasTsRuntime(...)`
  (`packages/runtime/src/core/createCanvasTsRuntime.ts`) as an app/API-facing
  orchestrator over runtime kit and worker bridge.
  It defines:
  document/query API (`getDocument`, `getSelectedShapeIds`),
  typed event system (`ready`, `documentChanged`, `selectionChanged`,
  `outbound`, `inbound`),
  overlay/dynamic layer registration, and external communication bridge
  (`network.send` / `network.onMessage`).
- Added reusable gesture module
  `createRuntimeGestureInterpreter(...)`
  (`packages/runtime/src/gesture/createRuntimeGestureInterpreter.ts`) to keep
  panning/scrolling/zooming interpretation framework-agnostic while runtime
  converts gesture parameters into viewport/engine-facing API calls.
  Wheel pan deltas now normalize to engine viewport semantics (scroll intent
  maps to inverse viewport translation), so playground/vector interactions stay
  directionally consistent.
- Runtime interaction now re-exports canvas LOD profile helper aliases from
  engine (`resolveCanvasLodProfile(...)`), while implementation ownership lives
  in `@venus/engine` (`resolveEngineCanvasLodProfile(...)`).
  App-local duplicate LOD profile logic in playground/vector canvas adapters
  now consumes the shared runtime alias surface backed by engine.
- Added shared marquee move-time selection dispatch controller
  `createMarqueeSelectionApplyController(...)`
  (`packages/runtime/src/interaction/marqueeApplyController.ts`) to centralize
  apply-mode gating and signature-based deduplication for
  `selection.set` dispatch during pointer-move marquee workflows.
  `apps/playground` and `apps/vector-editor-web` now consume this shared
  controller instead of keeping app-local duplicate signature-ref logic.
- Runtime overlay hover mechanism is now split by module path for clearer
  ownership: `packages/runtime/src/interaction/overlay/hover.ts` and an
  app-layer hover bridge.
  Compatibility names are now mapped directly from package entry exports
  (without extra wrapper files).
- Runtime root exports now include concise aliases for the TS runtime/gesture
  API (`createTsRuntime`, `createGestureInterpreter`, `TsRuntime*` type aliases)
  while preserving existing verbose names for compatibility.
- Active app surfaces now consume pure TS runtime APIs directly and keep React
  glue in app-local files:
  `apps/vector-editor-web/src/hooks/useCanvasRuntimeBridge.ts`,
  `apps/vector-editor-web/src/hooks/useTransformPreviewCommitBridge.ts`, and
  `apps/playground/src/runtime/usePlaygroundRuntimeBridge.ts`.

- Added framework-agnostic runtime facade `createCanvasRuntimeKit(...)` in
  `packages/runtime/src/core/createCanvasRuntimeKit.ts`.
  The kit keeps runtime as TypeScript-first/non-framework orchestration with:
  event bus (`snapshot`/`viewport`/`renderRequest`),
  gesture helpers (`applyPanGesture`/`applyScrollGesture`/`applyZoomGesture`),
  overlay + dynamic layer registries,
  and coalesced render scheduling for large-batch updates.
- Earlier in-day migration work introduced a shared runtime React hook path for
  app integration; this was later retired in favor of framework-agnostic
  runtime API objects + app-local React bridges.
- `apps/playground` now also consumes the shared interaction policy modules for
  drag + marquee orchestration (`createSelectionDragController`,
  `createMarqueeState` / `updateMarqueeState` /
  `resolvePointerUpMarqueeSelection`) so drag/select-box behavior aligns with
  vector-editor's shared runtime-interaction path.
- `apps/playground` viewport pan/zoom/pointer gesture wiring now uses the same
  shared binder (`bindViewportGestures(...)`) as `apps/vector-editor-web`,
  replacing app-local interpreter wiring in canvas adapter code to avoid
  cross-surface gesture drift.
  The shared binder now supports an optional `coalescePointerMove` flag
  (default `true`); playground disables coalescing to keep transform-preview
  drag updates immediate and avoid drag-start flicker.

- Worker command/collaboration apply path now uses a dedicated helper module
  `packages/runtime/src/worker/scope/patchBatch.ts`
  (`applyPatchBatch(...)`, `resolvePatchBatchUpdateKind(...)`) to reduce
  `bindEditorWorkerScope.ts` coupling and local duplication.
- Worker pointer selection mode and hit-test execution were extracted from
  `bindEditorWorkerScope.ts` into dedicated modules:
  `packages/runtime/src/worker/scope/pointerSelection.ts` and
  `packages/runtime/src/worker/scope/hitTest.ts`.
  This keeps worker entry orchestration focused on message flow while
  interaction mechanism details live in smaller modules.
- Worker scope was further split into focused submodules so the entry file is
  now orchestration-only and stays small:
  `operationPayload.ts`, `localHistoryEntry.ts`, `remotePatches.ts`,
  `scenePatches.ts`, `sceneSpatial.ts`, `sceneGroupBounds.ts`,
  `serdePrimitives.ts`, and `transformBatch.ts`.
  `transformSerde.ts` now acts as a compatibility barrel over the new serde
  modules.
- Viewer-mode hit-test now reuses shared runtime interaction resolver
  `resolveTopHitShapeId(...)` from
  `packages/runtime/src/interaction/shapeHitTest.ts` so viewer/controller and
  interaction overlays share one hit-test policy path.
- `packages/runtime/src/interaction/marqueeSelection.ts` and
  `packages/runtime/src/interaction/selectionHandles.ts` were simplified to
  direct engine re-exports for pure passthrough APIs, reducing duplicate
  wrapper definitions.
- `scene-update` notification kind now tracks actual patch scope instead of
  defaulting to `full` for all command/collaboration messages:
  selection-only or metadata-only transitions publish `flags`, while
  document-mutating patch batches publish `full`.
- `selection.set` command now emits `scene-update` only when selection actually
  changes, reducing no-op update churn.
- Added an explicit app-facing engine bridge subpath
  `@venus/runtime/engine` (`packages/runtime/src/engine.ts`) so app layers can
  consume render/runtime mechanism contracts through runtime instead of
  importing `@venus/engine` directly.
- `apps/vector-editor-web` and `apps/playground` runtime-facing files were
  migrated to that bridge path (`@venus/runtime`), removing direct app-level
  `@venus/engine` imports from active source files.

### 2026-04-12

- Added optional strict stroke-only shape hit testing across runtime worker and
  main-thread fallback paths. New runtime option
  `strictStrokeHitTest` flows through init interaction config to worker hit
  filtering and `@venus/engine` shape hit-area checks.
- Hover ownership moved out of runtime scene flags and into overlay/app-layer
  state. Pointer-move hover updates now avoid worker/main-thread scene flag
  mutation paths so hover does not trigger scene-update invalidations.
- Runtime/viewer/interaction/app hit-test callsites now consume
  `@venus/engine` interaction helpers (`isPointInsideEngineShapeHitArea`,
  `isPointInsideEngineClipShape`), keeping geometric hit rules centralized in
  engine.

### 2026-04-10

- Added the initial `packages/runtime` split from the old shared runtime
  implementation and made it the new home for shared runtime core code.
- Runtime time and animation exports now forward to `@venus/engine`
  (`createSystemRuntimeClock`, `createAnimationController`) so runtime remains
  a stable bridge surface while engine mechanism ownership moves into the new
  dedicated engine package.

### 2026-04-11

- Consolidated worker contracts/entrypoints into the runtime package at
  `packages/runtime/src/worker` and added `@venus/runtime/worker` as the
  public worker subpath. The standalone `packages/editor-worker` package was
  removed.

- Added unified runtime namespace alias entries for `@venus/runtime`
  subpaths: `@venus/runtime/interaction`, `@venus/runtime/react`, and
  `@venus/runtime/presets` (plus `@venus/runtime/presets/*`).
  This keeps physical package boundaries (`runtime-*`) while giving app code a
  single logical import namespace.

- Moved viewport gesture collection/dispatch ownership out of runtime core into
  `@venus/runtime/interaction` (`bindViewportGestures(...)`), keeping runtime
  focused on viewport state transitions (`zoomViewportState`, `panViewportState`)
  and controller orchestration.
- Runtime viewport matrix helper now forwards `Mat3`/`Point2D`/`applyMatrixToPoint`
  from `@venus/engine` so matrix primitives have one mechanism owner.
- Runtime viewport controller (`viewport/controller.ts`) and zoom core
  (`zoom/index.ts`) now forward to engine-owned interaction mechanisms
  (`@venus/engine` viewport + zoom modules) as compatibility bridges, so
  existing runtime import surfaces stay stable while ownership moves to engine.
