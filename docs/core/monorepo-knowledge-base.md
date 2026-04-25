# Venus Monorepo Knowledge Base

Use this file as the shared knowledge base for the Venus monorepo.

## Purpose

- Preserve durable monorepo knowledge that should survive context switches.
- Record recent implementation learnings after changes land.
- Help new contexts recover repo-specific facts without relying on chat history.

## Update Protocol

- After each meaningful code, architecture, or standards change, add a short
  note to `Recent Updates`.
- Keep notes concise and factual: what changed, where it lives, and why it
  matters.
- Promote repeated or durable patterns from `Recent Updates` into `Stable
Knowledge` when they become long-term guidance.

## Stable Knowledge

### Monorepo Shape

- `apps/*` contains runnable product surfaces and diagnostics apps.
- `packages/*` contains shared runtime, worker, renderer, and
  document primitives.
- `docs/*` contains project standards, handoff notes, and architecture context.
- Package-scoped knowledge notes now live under `docs/packages/*`
  and should be preferred over this file when a change is mostly contained to
  one package.

### Primary Runtime Chain

- Main interactive chain:
  `apps/*` -> `@venus/runtime` + `@venus/runtime/interaction` +
  app-local runtime bridge -> `@venus/runtime/worker` +
  `@venus/runtime/shared-memory` -> `@venus/engine` (Canvas2D renderer wired from app layer)

### File And Model Truth

- Treat persisted scene/document model truth as app-owned.
- For vector work, use the app-local alias `@vector/model` as the active
  model contract source.
- Prefer the JSON runtime scene `node + feature` structure from the owning
  app model module (vector: `@vector/model`) when reasoning about geometry,
  text, image, and serialization semantics.
- Treat vector `@vector/model` `DocumentNode` as a flattened runtime adapter,
  while runtime scene contracts remain the canonical persistence format.

### Current Renderer Direction

- WebGL is the only primary engine backend for active renderer work.
- Canvas2D remains in the stack as auxiliary/offscreen/composite support and
  as legacy app/runtime diagnostics infrastructure.
- `createEngine(...)` now defaults to `webgl`; any explicit `backend: 'canvas2d'`
  usage should be treated as helper or migration behavior, not the target
  renderer direction.

### Historical Notes

- Some older `Recent Updates` entries still reference `@venus/runtime/react` as
  migration-era context; treat those mentions as historical unless a newer note
  overrides them.

### Legacy Reference Code

- `packages/editor_old` is deprecated and reference-only.
- Agents may inspect `packages/editor_old` for legacy behavior or design
  context, but new fixes and feature work should land in the active runtime
  chain (`document-core`, `runtime*`, `runtime/worker`, renderer packages,
  and app adapters) instead of modifying `editor_old`.

### Viewport Interaction Status

- Shared canvas surfaces now use pure viewport commit + redraw instead of DOM
  preview transforms.
- Interactive pan performance is currently improved through renderer-side
  viewport bitmap caching rather than CSS transform preview.

## Recent Updates

### 2026-04-14

- Vector interaction follow-up fixed transform preview + snap visibility regressions:
  - `packages/runtime/src/interaction/snapping.ts` connector-line resolution
    now correctly skips non-matching static candidates instead of aborting the
    entire guide scan early, restoring visible snap guides during move/resize
    interactions.
  - `packages/runtime/src/interaction/transformPreview.ts` now remaps
    `lineSegment` points during preview and upgrades clip-bound image preview
    propagation from translation-only to transform-aware follow behavior
    (move/scale/rotate/flip relative to clip source).
  - `apps/vector-editor-web/src/hooks/useEditorRuntime.ts` now projects
    direct-selector path-handle drag into a live preview document so curve edits
    render immediately during pointer move before commit.
  - `apps/vector-editor-web/src/contexts/appContext/mockFile.ts` default mock
    scene was expanded with a roadmap group, milestone ellipses, and connector
    line to strengthen baseline interaction coverage.

- Vector launch polish follow-up landed for line accuracy + top controls modularity:
  - `packages/engine/src/renderer/canvas2d.ts` line rendering now prioritizes
    explicit `node.points` anchors for `line` nodes instead of always drawing
    the bounding-rect diagonal, fixing visible position drift for reverse
    diagonal segments.
  - `apps/vector-editor-web/src/components/header/shortcutBar/ShortcutBar.tsx`
    shortcut controls moved to icon-first UI (lucide/shadcn-style set), and
    stroke width quick control switched from +/- step buttons to an explicit
    width select list.
  - `apps/vector-editor-web/src/components/styleControls/ColorSwatchPicker.tsx`
    introduced as a standalone swatch-picker module so color control UI can be
    replaced independently from shortcut-bar action wiring.
  - `apps/vector-editor-web/src/contexts/appContext/mockFile.ts` default scene
    was fully regenerated with a cleaner composition and an intentional
    reverse-diagonal line sample for render-position regression checks.

- Vector launch-polish baseline expanded across runtime + app UI:
  - `packages/runtime/src/worker/protocol.ts` now supports
    `shape.distribute` (`hspace` / `vspace`) and worker history/collab wiring
    was added in `localHistoryEntry.ts`, `remotePatches.ts`, and
    `operationPayload.ts`.
  - Grouping parent/child graph updates were hardened for mixed-parent
    selections so redo/undo no longer leaves stale parent `childIds` when
    selected nodes are regrouped.
  - `apps/vector-editor-web` header surfaces now expose full align + distribute
    actions, remove shortcut-bar save action, and add quick fill/stroke/stroke
    width controls under the menu bar.
  - Path/pencil behavior was split in `usePenTool.ts` +
    `editorRuntimeHelpers.ts`: pencil keeps smoothed bezier conversion while
    path commits literal polyline anchors for node editing.
  - Masked-image selection chrome now avoids double framing in
    `InteractionOverlay.tsx` by suppressing aggregate polygon rendering for
    single clipped-image selection.

- Runtime lifecycle infrastructure was expanded and wired into active vector
  paths:
  - `packages/runtime/src/tools/registry.ts`
    (`createRuntimeToolRegistry`) now defines runtime-owned tool lifecycle
    hooks (`onEnter/onExit/pointer/key/cancel/cursor/overlay/status`).
  - `packages/runtime/src/editing-modes/controller.ts`
    (`createRuntimeEditingModeController`) now defines runtime-owned explicit
    editing modes and transition events.
  - `apps/vector-editor-web/src/hooks/useEditorRuntime.ts` now activates
    runtime tool handlers and drives editing mode transitions from pointer
    lifecycle (selecting/directSelecting/marquee/dragging/resizing/rotating/
    drawing/panning/zooming/idle).

- Engine + worker hit-test path now has multi-hit foundations:
  - `packages/engine/src/scene/hitTest.ts` adds
    `hitTestEngineSceneStateAll(...)` returning ordered hit candidates.
  - `packages/engine/src/scene/store.ts` adds `hitTestAll(...)`.
  - `packages/runtime/src/worker/scope/hitTest.ts` adds
    `hitTestDocumentCandidates(...)` with candidate metadata.
  - `packages/runtime/src/worker/scope/bindEditorWorkerScope.ts` now consumes
    candidate list and keeps top-hit selection compatibility.

- Toolbar/tooling product baseline was expanded in vector:
  - `apps/vector-editor-web/src/components/toolbar/Toolbar.tsx` now includes
    `path` and `zoomOut` tools (13 total core tools).
  - `apps/vector-editor-web/src/constants/actions.ts` tool shortcuts updated
    toward Illustrator baseline: `P` path, `N` pencil, `Shift+Z` zoom out,
    while preserving existing tool entries.
  - i18n keys updated in `apps/vector-editor-web/src/i18n/*/ui.json` for
    `toolbar.path`, `toolbar.zoomIn`, `toolbar.zoomOut`.

- Typecheck status after this batch:
  no new command/history errors introduced by these changes.

- Known type issues in
  `packages/ui/src/components/ui/modal.tsx` and
  `apps/vector-editor-web/src/components/createFile/TemplatePresetPicker.tsx`
  were resolved (missing `ReactNode` import and unused template picker symbols).

- Worker command/history baseline was advanced:
  - `packages/runtime/src/worker/scope/operations.ts` now uses
    registry-style dispatch handlers for explicit command routing.
  - `packages/runtime/src/worker/protocol.ts` adds `shape.group` /
    `shape.ungroup` command types.
  - `packages/runtime/src/worker/history.ts` adds
    `set-shape-parent` and `set-group-children` patch types.
  - `packages/runtime/src/worker/scope/localHistoryEntry.ts`,
    `packages/runtime/src/worker/scope/scenePatches.ts`, and
    `packages/runtime/src/worker/scope/remotePatches.ts` now support reversible
    group/ungroup parent-child graph updates for undo/redo and collaboration
    replay.

- Product entry wiring for group semantics was connected in vector:
  - `apps/vector-editor-web/src/hooks/useEditorRuntime.ts` now handles
    `group-nodes` / `ungroup-nodes` actions and dispatches
    `shape.group` / `shape.ungroup` commands.
  - `apps/vector-editor-web/src/constants/actions.ts` adds
    `Cmd/Ctrl+G` and `Cmd/Ctrl+Shift+G` shortcuts.
  - `apps/vector-editor-web/src/components/contextMenu/ContextMenu.tsx` and
    `apps/vector-editor-web/src/components/header/menu/menuData.ts` now expose
    group/ungroup entries.

- Worker hit-test interpretation now encodes selector-vs-dselector semantics:
  - `packages/runtime/src/worker/scope/hitTest.ts` supports
    `preferGroupSelection` and resolves selectable group ancestors.
  - `packages/runtime/src/worker/scope/bindEditorWorkerScope.ts` tracks
    `toolName` from `tool.select` and applies group-preferred selection for
    selector while preserving deep selection for dselector or cmd/ctrl
    modifiers.
  - `packages/runtime/src/worker/protocol.ts` extends `tool.select` with
    optional `toolName` to keep product interaction policy in runtime layer.

- Worker local command handling now uses a descriptor-bridged dispatcher:
  - `packages/runtime/src/worker/scope/commandDispatchRegistry.ts` reuses
    runtime command registry descriptors as a shared catalog while binding
    worker-local command handlers.
  - `packages/runtime/src/worker/scope/operations.ts` now dispatches through
    this registry-style bridge before falling back to patch-history command
    processing.

- dselector path sub-selection baseline is now available:
  - `apps/vector-editor-web/src/interaction/types.ts` adds
    `anchorPoint`, `segment`, `segmentType`, handle placeholders, and
    `pathSubSelection` data structures.
  - `apps/vector-editor-web/src/hooks/runtime/pathSubSelection.ts` resolves
    anchor/segment hits for selected path nodes.
  - `apps/vector-editor-web/src/interaction/overlay/InteractionOverlay.tsx`
    renders anchor + segment feedback for current dselector sub-selection.

- `useEditorRuntime.ts` decomposition progressed with extracted runtime modules:
  - `apps/vector-editor-web/src/hooks/runtime/groupActions.ts`
  - `apps/vector-editor-web/src/hooks/runtime/pathSubSelection.ts`

- 18.2 convert + align baseline landed across runtime and vector:
  - `packages/runtime/src/worker/protocol.ts` adds
    `shape.convert-to-path` and `shape.align` command contracts.
  - `packages/runtime/src/worker/scope/localHistoryEntry.ts` and
    `packages/runtime/src/worker/scope/remotePatches.ts` now build/apply
    reversible patches for path conversion and multi-shape alignment.
  - `packages/runtime/src/worker/scope/shapeCommandHelpers.ts` centralizes
    non-obvious geometry conversion + alignment patch generation logic.
  - `apps/vector-editor-web` now exposes convert/align entry points through
    header menu, context menu, and shortcut bar.

- Added `docs/vector-editor-architecture.md` — comprehensive vector editor
  architecture document covering layer responsibilities, module map, data flows,
  command system design, hittest design, snapping design, overlay design,
  viewport control, 50K+ performance strategy, template/test strategy, gap
  analysis with priorities, and phased migration plan.

- Added runtime command registry (`packages/runtime/src/commands/registry.ts`):
  formal `CommandRegistry` with typed `CommandHandler` / `CommandDescriptor` /
  `CommandExecutionContext` contracts. Provides extensible command registration,
  validation, and undo payload tracking. Not yet wired into active worker
  command dispatch path; integration is Phase 2 work.

- Added runtime hit-test adapter
  (`packages/runtime/src/interaction/hitTestAdapter.ts`): bridges engine-level
  hit-test results into product-consumable `RuntimeHitTestResult` with
  multi-candidate ranking, lock/hidden/isolation filtering, and product kind
  classification. Designed for future multi-hit engine API; currently wraps
  single-result API.

- Added vector tool registry (`apps/vector-editor-web/src/tools/registry.ts`):
  extensible `ToolRegistry` with `ToolHandler` lifecycle (activate/deactivate,
  pointer events, cancel, cursor). Allows new tools to register via registry
  instead of modifying monolithic `useEditorRuntime`.

- Added vector editing mode controller
  (`apps/vector-editor-web/src/state/editingMode.ts`): explicit state machine
  for editing modes (idle, selecting, marquee, dragging, resizing, rotating,
  drawing, text-editing, path-editing, group-isolation) with lifecycle
  listeners and convenience queries for shortcut suppression and pan gating.

- Template presets enriched with test metadata: `scale`, `capabilities`,
  `interactionScenarios`, `performanceNotes`, `regression`, `benchmark` flags.
  Five new test-focused presets added (text-dense, deep-groups, overlap-heavy,
  sparse-large, transform-batch). Total: 13 presets across 3 categories.

- `AGENTS.md` refined: reduced redundancy, preserved all key constraints,
  added `docs/vector-editor-architecture.md` to Load First checklist, added
  explicit three-layer rule section and package role summary.

### 2026-04-13

- Vector fake-data/template -> document adapter -> runtime scene -> engine text
  render chain now preserves rich text payload (`text` + `textRuns`) including
  per-run font metrics and optional run shadow metadata. This closes the prior
  gap where `fileFormatScene` emitted `TEXT.runs: []` and dropped mixed-run
  styling during template-driven file creation.
- Canvas2D text rendering now supports explicit newline (`\n`) multi-line
  output for both plain text and run-based text, and run-level shadow styling
  is applied during draw commit. Vector canvas adapter now uses
  capability-aware backend fallback: when rich text fidelity is required,
  requested `webgl` falls back to `canvas2d`; otherwise requested backend is
  preserved.

- `apps/vector-editor-web` now includes a built-in template generation feature
  for user onboarding and renderer/performance debugging. A new
  "Generate Template" shortcut-bar button opens a preset picker modal with
  deterministic seed support and creates full `VisionFileType` files directly
  through existing `createFile(...)` flow.
- Template generation internals are modular under
  `apps/vector-editor-web/src/features/templatePresets/*`
  (preset type/registry, seeded RNG, and separate generators for simple demos,
  mixed large scenes: 10K/50K/100K, and image-heavy scenes: 1K/10K).

- `@venus/engine` `createEngine(...)` default backend switched to `webgl`
  in `packages/engine/src/runtime/createEngine.ts`, keeping `canvas2d` as an
  explicit opt-in backend.
- `@venus/engine` WebGL path now includes engine-owned packet/resource
  preparation internals:
  `packages/engine/src/renderer/webgl.ts` compiles
  `prepareEngineRenderPlan(...)` + `prepareEngineRenderInstanceView(...)` into
  render packets via `compileEngineWebGLPacketPlan(...)`
  (`packages/engine/src/renderer/webglPackets.ts`) and tracks frame-level
  buffer/texture budgets with LRU-eviction hooks via
  `createEngineWebGLResourceBudgetTracker(...)`
  (`packages/engine/src/renderer/webglResources.ts`).
  Packet commit now runs concrete `shape` / `text` / `image` draws and hooks
  image-texture uploads through runtime loader sources.
  This moves WebGL backend direction forward without changing app-layer wiring.

- Merged shared-memory ownership into runtime subpath
  `@venus/runtime/shared-memory`
  (`packages/runtime/src/shared-memory/index.ts`) and removed standalone
  `packages/shared-memory` package/project references.
- Runtime chain docs/config now use:
  `apps/*` -> `@venus/runtime` + `@venus/runtime/interaction` ->
  `@venus/runtime/worker` + `@venus/runtime/shared-memory` -> `@venus/engine`.

- Removed `packages/file-format` after migrating runtime scene type contracts
  and `parseRuntimeSceneToEditorDocument(...)` into
  `packages/document-core/src/runtimeSceneTypes.ts` and
  `packages/document-core/src/parseRuntimeScene.ts`.
- Active app adapters now import runtime scene parser/types from
  `@vector/model`, and workspace alias/tsconfig/package references to
  `@venus/file-format` were removed.

- Added framework-agnostic runtime facade
  `createCanvasRuntimeKit(...)`
  (`packages/runtime/src/core/createCanvasRuntimeKit.ts`) to formalize the TS
  runtime layer above controller primitives:
  runtime events, gesture-to-viewport API, overlay/dynamic layer registration,
  and render-request coalescing for batch-heavy updates.
- Added app-facing shared React entry
  `useSharedCanvasRuntime(...)`
  (`packages/runtime/src/react/useSharedCanvasRuntime.ts`) and migrated
  `apps/vector-editor-web` + `apps/playground` to this single runtime wiring
  path, reducing cross-surface interaction drift.

- Added architecture boundary contract doc
  `docs/architecture/layering.md` to define clear ownership
  between `@venus/engine`, `@venus/runtime*`, and app layers.
- The new doc locks the direction:
  mechanism in engine, interaction/runtime policy in `runtime` family, and
  product behavior in app surfaces (`vector-editor-web`, `playground`).
- `docs/architecture/overview.md` now links to this detailed boundary contract so future
  implementation/review work can use one stable source for responsibility
  checks.
- App/runtime boundary was tightened for active app surfaces:
  `apps/vector-editor-web` and `apps/playground` no longer import
  `@venus/engine` directly in active source files. Runtime-facing engine
  mechanism access now routes through runtime bridge subpath
  `@venus/runtime/engine` (`packages/runtime/src/engine.ts`).

### 2026-04-12

- `@venus/runtime/react` now exposes a shared baseline interaction hook:
  `useDefaultCanvasInteractions(...)`
  (`packages/runtime/src/react/useDefaultCanvasInteractions.ts`).
  It centralizes default pointer dispatch, hover clear on leave, viewport
  handlers, and context-menu world-coordinate mapping so app shells can reuse
  one wiring path instead of duplicating per-surface glue.
- `apps/playground` now consumes that hook for `CanvasViewport` interaction
  bindings, and `apps/vector-editor-web` reuses the same shared handlers for
  viewport/context-menu + pointerdown fallback dispatch.

- Architecture boundary wording was corrected across core docs to remove
  ambiguity: hit-testing and render-path optimization mechanisms are
  engine-owned (`@venus/engine`), while runtime/worker layers orchestrate
  protocol/command/history flow and dispatch to engine mechanisms.

- Engine backend request default in app-level API wiring is now `webgl`
  (with explicit `canvas2d` override):
  `apps/vector-editor-web/src/hooks/useEditorRuntime.ts` now treats
  `?engineBackend=canvas2d` as the opt-out path and defaults to requesting
  `webgl` when no query override is provided.
- `apps/playground/src/App.tsx` now exposes a renderer mode switch panel
  (`webgl` / `canvas2d`) wired into `Canvas2DRenderer` `backend` prop so
  diagnostics can quickly compare backend request modes without editing code.

- `apps/playground` and `apps/vector-editor-web` Canvas2D adapters now defer
  non-interacting full-quality redraw with a cancelable idle/timeout path.
  Interactive pan/zoom frames still render immediately, while full redraw can
  be skipped if a new interaction starts quickly, reducing post-pan hitch risk
  on large scenes.
- Replay tile mechanism ownership moved to `@venus/engine`:
  `buildEngineReplayTiles(...)` now provides center-first tile ordering for
  progressive bitmap replay, and app worker adapters consume this shared helper
  instead of maintaining duplicated local tile planners.
- Replay worker protocol and request orchestration are now also engine-owned
  through `createEngineReplayCoordinator(...)`, so app workers keep only
  backend-specific frame rendering while request/cancel and progressive tile
  stream control paths are shared.
- `apps/playground` and `apps/vector-editor-web` canvas adapters now actively
  consume the replay worker path for large scenes (`shapeCount >= 10_000`):
  non-interacting full redraw requests are sent to worker/offscreen rendering,
  and main thread progressively replays center-first tiles while immediate
  interactive frames still render on the main engine path.
- Canvas adapters now use a coalesced input-priority render scheduler on the
  main thread (single-flight + request merge + interactive interval throttle)
  so panning/zooming event throughput is less likely to be back-pressured by
  repeated `renderFrame` submissions during heavy scenes.

- Shape-transform interaction mechanisms previously exposed by
  `@vector/model` were migrated to `@venus/engine` interaction APIs
  (`resolveNodeTransform`, `createShapeTransformRecord`,
  `createMatrixFirstNodeTransform`, transform batch contracts, and legacy
  adapter helpers). `document-core` now keeps low-level geometry primitives and
  document model contracts.

- `@venus/file-format/base` document model contracts are now JSON-first in
  `packages/file-format/base/src/types.ts`; parser/adapter exports no longer
  depend on `base/migrations/*` type re-exports.
- Legacy FlatBuffer artifacts were cleaned from active file-format maintenance:
  `packages/file-format/base/migrations` and versioned
  `packages/file-format/*/schemas` directories were removed.
- `@venus/file-format` package surface was slimmed to base-only ownership:
  root exports now keep `./base` only, `mindmap/streamline` protocol submodules
  were removed, and base parser path dropped legacy `node.features` fallback.
- `document-core` node model comments were updated to keep persisted adapter
  metadata semantics format-agnostic instead of file-format-layer specific.

- `@venus/engine` now exposes a high-level default-first facade:
  `createEngine(...)` (`packages/engine/src/runtime/createEngine.ts`).
  This API groups optional details under `performance` / `render` /
  `resource` / `debug`, while keeping mutation ownership batch-first through
  `applyScenePatchBatch(...)` and `transaction(...)`.
- Engine render defaults now include clarity-oriented output settings:
  Canvas2D render path consumes `pixelRatio` from engine render context and
  `createEngine(...)` now sizes backing store by DPR (`auto`, capped by
  `maxPixelRatio`), while built-in WebGL renderer requests antialias context
  attributes by default.
- Engine facade now exposes runtime DPR switching via
  `engine.setDpr(number | 'auto', {maxDpr?})`, so apps can tune clarity/perf
  tradeoffs during interaction without recreating renderer instances.
- `@venus/engine` now exports `createWebGLEngineRenderer(...)`
  (`packages/engine/src/renderer/webgl.ts`) as a built-in WebGL renderer entry.
  The current implementation intentionally reuses the same
  `prepareEngineRenderPlan(...)` + `prepareEngineRenderInstanceView(...)`
  front-half optimization path as Canvas2D and keeps commit-stage behavior to
  a minimal clear skeleton while draw-program/upload wiring is still in
  progress.
- Canvas2D clip-by-node-id hot path in `@venus/engine` no longer rebuilds a
  full scene node-id map per frame. Clip target resolution now reads directly
  from prepared `worldBoundsById`, reducing duplicate traversal work before
  draw commit.
- `@venus/engine` scene contract now includes a generic shape node
  (`EngineShapeNode`, `shape: rect/ellipse/line`). Buffer/index/hit-test/render
  paths were updated so engine can directly render common geometric primitives
  in addition to text/image/group.
- Engine shape rendering coverage now also includes `polygon` and `path` via
  point/bezier geometry fields on `EngineShapeNode`, and active app adapters
  map document node geometry (`points` / `bezierPoints`) into engine scene
  nodes with computed bounds to avoid zero-size fallback rendering.
- `apps/vector-editor-web` and `apps/playground` canvas adapter renderers now
  create and drive an engine instance via `createEngine(...)`, adapting
  document/runtime snapshots into engine scene nodes. This removes duplicated
  per-app draw-loop logic and aligns both surfaces with the same engine entry.
- Engine-scene mapping in vector/playground adapters now follows document-model
  transform semantics more closely: source `DocumentNode` transforms are
  resolved via `resolveNodeTransform(...)` and applied to engine node matrices,
  while shape adapters now cover `star -> polygon` and closed-path detection for
  `points`/`bezierPoints` geometry so rendering aligns with document semantics
  instead of snapshot-only box fallbacks.

### 2026-04-11

- Added unified runtime namespace import aliases through `@venus/runtime`
  subpaths: `@venus/runtime/interaction`, `@venus/runtime/react`, and
  `@venus/runtime/presets` (including `@venus/runtime/presets/*`).

- Consolidated runtime family implementation into `packages/runtime` and
  removed `packages/runtime-interaction`, `packages/runtime-react`, and
  `packages/runtime-presets`. Logical imports remain unchanged at
  `@venus/runtime/*` subpaths.

- `apps/playground` page shell was refactored into a responsive Tailwind
  structure (`top header + left control rail + right stage surface`) so scene
  controls/diagnostics keep stable hierarchy and independent scrolling on both
  compact and desktop viewports.

- Spatial index mechanism is now owned by `@venus/engine`:
  `packages/engine/src/spatial/index.ts` exports
  `createEngineSpatialIndex(...)` and related types, and worker/runtime
  consumers (`@venus/runtime/worker`, `@venus/runtime/interaction`) were
  migrated to that API. The standalone `packages/spatial-index` package and
  its monorepo alias/project references were removed to avoid duplicate index
  implementations.

- Engine now also owns reusable interaction mechanisms that are not product
  policy:
  marquee state/bounds/selection helpers, selection-handle generation/picking,
  and move-snap solving moved to `packages/engine/src/interaction/*`.
  `@venus/runtime/interaction` now wraps these engine APIs for compatibility
  and keeps only app/runtime adapter concerns.

- `apps/playground` now consumes the migrated engine interaction APIs directly
  (marquee, selection handles, move snap + snap guide-line projection) while
  keeping the existing page layout and command-button behavior unchanged.

- Viewport gesture collection/dispatch ownership moved to
  `@venus/runtime/interaction` (`bindViewportGestures(...)`), and this module
  now uses engine-owned matrix projection helpers (`applyMatrixToPoint` from
  `@venus/engine`). Runtime core keeps viewport state-transition ownership.

- Viewport scroll/middle-button pan mechanics now also route through
  `@venus/engine` (`packages/engine/src/interaction/viewportPan.ts`).
  `runtime-interaction` keeps browser event collection and frame-batched
  commit scheduling, while wheel/pointer pan delta semantics are engine-owned.

- `apps/playground` command-level zoom stepping (`viewport.zoomIn` /
  `viewport.zoomOut`) now follows the same discrete preset ladder used by
  vector editor instead of runtime's default `*1.1` incremental command path,
  reducing cross-app zoom feel drift for toolbar/context-menu zoom actions.

- Zoom-sense preset policy is now centralized in
  `@venus/runtime/interaction` (`interaction/zoomPresets.ts`), and both
  `vector-editor-web` and `playground` consume
  `resolveRuntimeZoomPresetScale(...)` / `RUNTIME_ZOOM_PRESETS` so command and
  preset-driven zoom stepping stay aligned from one source.

- Wheel-zoom feel is now also routed through the shared runtime-interaction
  zoom policy: mouse-wheel zoom uses the shared discrete preset ladder, while
  trackpad zoom stays continuous. This keeps vector and playground aligned for
  both command-based zoom and wheel-based zoom.

- `apps/playground` WebGL capability probing now uses a cached one-time check
  and immediately releases the probe context via `WEBGL_lose_context` when
  available. This avoids dev-time warnings about too many active WebGL
  contexts caused by repeated support checks across remounts/HMR.

- `apps/playground` was reset from the old multi-tab diagnostics surface to a
  minimal command-driven editor harness. It now mirrors the active vector
  runtime chain more directly (`createCanvasEditorInstance` +
  `createDefaultEditorModules` + `CanvasViewport` + `Canvas2DRenderer` +
  `CanvasSelectionOverlay`) while intentionally omitting product UI layers.

- Removed legacy renderer package coupling from active app/runtime paths:
  `vector-editor-web`, `playground`, and `mindmap-editor` now consume
  `Canvas2DRenderer` from `@venus/runtime/react` directly, while
  `runtime-react` hosts the Canvas2D renderer + LOD/diagnostics module that was
  previously in `@venus/renderer-canvas`.

- `CanvasViewport` no longer uses a DOM/CSS preview layer. Shared canvas
  surfaces now stay on the pure viewport commit + redraw path, and
  `runtime-interaction` batches pan deltas with `requestAnimationFrame` so
  viewport motion no longer depends on CSS transform preview.

- `runtime-react` `Canvas2DRenderer` now keeps an overscanned viewport bitmap
  cache for the `commit-redraw` path. Interactive same-scale pan can reuse
  that bitmap directly on canvas, and both `vector-editor-web` status bar and
  `playground` diagnostics now expose renderer cache hit/miss counters so the
  no-CSS-preview path can be evaluated on `10k / 50k / 100k` scenes.

- `@venus/engine` scene mutation now has a batch-first execution direction:
  mutable scene state keeps an incrementally maintained `nodeMap` and coarse
  `spatialIndex`, `applyEngineScenePatchBatch(...)` returns dirty summaries
  (`structure/geometry/transform/style/resource`), and engine worker bridge
  now exposes `applyScenePatchBatch(...)` plus `transaction(...)` so future
  Canvas2D/WebGL backends can consume merged scene updates instead of
  high-frequency single-node writes.
- `@venus/engine` now also exposes `createEngineSceneStore(...)` as the
  runtime-facing scene-state entry point. The intended ownership split is now:
  runtime provides full-scene initialization and later batch patches, while
  engine owns the render-facing scene state, node lookup, coarse spatial index,
  hit-test surface, and later buffer-backed storage evolution.
- The engine scene-store path is now wired through the worker and renderer
  stack as well: worker bridge and worker scope both use
  `createEngineSceneStore(...)`, scene snapshots carry metadata versions
  (`planVersion`, `bufferVersion`, dirty/removed ids), render-plan caching now
  keys off `planVersion`, and engine owns a first-pass node buffer layout
  skeleton (`ids`, `kind`, `parent`, `dirty`, `bounds`, `transform`, `order`)
  that future Canvas2D/WebGL backends can share.
- That buffer layout is no longer rewritten blindly on every patch: scene store
  now attempts dirty-node incremental buffer sync for non-structural updates,
  and shared scene snapshots expose the typed `bufferLayout` reference through
  `scene.metadata` so renderers can progressively consume engine-owned buffer
  data instead of relying only on raw scene revision.
- Engine render planning now actually consumes those scene-store buffers:
  `prepareEngineRenderPlan(...)` prefers `bufferLayout` fields
  (`parentIndices`/`transform`/`bounds`/`order`) for prepared-node traversal,
  culling, and draw ordering, while keeping an object-tree fallback for
  mismatch safety. This keeps Canvas2D stable and gives WebGL a shared,
  backend-agnostic planning input surface.
- Canvas2D renderer now also consumes `bufferLayout.bounds` for local text/image
  draw geometry where available, and engine now exposes
  `prepareEngineRenderInstanceView(...)` as a typed-array instance bridge
  (indices/transforms/bounds/batches) to align upcoming WebGL work with the
  same scene-store buffers.

- `apps/mindmap-editor` is currently intentionally cleared to a minimal
  placeholder page and should not be treated as an active runtime integration
  surface until that product line resumes.

- Removed monorepo config/runtime references to `@venus/renderer-canvas` and
  `@venus/renderer-skia` (`tsconfig` references, alias wiring, scaffold app
  deps, and shared product renderer metadata), and aligned shared stack
  metadata to `renderer: '@venus/engine'`.

### 2026-04-10

- Engine standalone usage path now has a first-class diagnostics surface in
  `apps/playground`: the `Engine` tab includes an independent engine demo that
  runs `@venus/engine` clock + animation + loop + scene contracts directly
  (without `@venus/runtime/react`) and exposes backend selection entry
  (`canvas2d` active, `webgl` reserved).

- `@venus/engine` `createEngineLoop` now exposes a `beforeRender(frame)` hook,
  enabling frame-tick integration for animation controllers while keeping one
  loop ownership boundary in engine.

- Standardized team skill ownership and docs navigation for monorepo use:
  team-shared Codex skills now live in repo-local `.codex/skills` (including
  `doc`), with global docs entry at `docs/index.md`. Codex docs now
  point to `.codex/skills` instead of carrying duplicated skill assets.
  Legacy duplicated skill copies under the previous docs path were removed to
  keep a single source of truth.

- Added a global docs entrypoint for one shared Obsidian workflow:
  `docs/index.md`, plus key context at `docs/core/important-context.md`.

- Removed the `packages/canvas-base` compatibility package after migrating app,
  renderer, manifest, alias, and TypeScript project references to the
  `runtime-*` family. `@venus/canvas-base` should now be treated as historical
  naming only in old notes, not as a live package target.

- Active app and renderer imports now consume the new runtime family directly:
  `vector-editor-web`, `playground`, `mindmap-editor`,
  `renderer-canvas`, and `renderer-skia` now import from `@venus/runtime`,
  `@venus/runtime/interaction`, `@venus/runtime/react`, and
  `@venus/runtime/presets` as appropriate. Their package manifests and
  TypeScript project references were updated accordingly.

- Historical note: runtime was briefly split into
  `packages/runtime`, `packages/runtime-interaction`,
  `packages/runtime-react`, and `packages/runtime-presets` during migration.
  This layout was later consolidated back into `packages/runtime` with
  `@venus/runtime/*` subpath exports.

- Added runtime package-boundary guidance to the shared standards in
  `docs/core/project-context.md`,
  `docs/core/engineering-standards.md`, and
  `docs/core/current-work.md`. New guidance standardizes on a
  future `runtime-*` family: `@venus/runtime` for framework-agnostic runtime
  core, `@venus/runtime/interaction` for shared interaction algorithms,
  `@venus/runtime/react` for React adapters, and `@venus/runtime/presets` for
  opinionated default behavior packs. The standards also now explicitly prefer
  smaller, easier-to-scan files with short factual comments at non-obvious
  boundaries.

### 2026-04-09

- `playground` now supports runtime mode tabs (`Editor` vs `Viewer`)
  in `apps/playground/src/App.tsx`. The app is wired through the new
  runtime-core instance APIs (`createCanvasEditorInstance`,
  `createCanvasViewerInstance`) from `@venus/runtime`, so mode switching can
  validate both the worker-backed editing path and renderer-only viewer path in
  one surface.

- `playground` editor transform move now includes first-pass bounds
  snapping with visual guide lines in `apps/playground/src/App.tsx`.
  Snapping logic/hints were then extracted into shared
  `runtime-interaction` package surfaces (`interaction/snapping.ts` with
  pure-TS guide projection) so
  playground now only orchestrates package APIs. Current scope remains
  move-session snapping only (`min/center/max` x/y against non-selected shape
  bounds); resize/rotate snapping remains unchanged.

- `vector-editor-web` now consumes the same shared move-snapping package APIs
  (`resolveMoveSnapPreview` + `resolveSnapGuideLines`) in
  `apps/vector-editor-web/src/hooks/useEditorRuntime.ts` and
  `apps/vector-editor-web/src/interaction/overlay/InteractionOverlay.tsx`,
  aligning vector editor move snapping behavior with playground.

- `@vector/model` bezier path bounds now solve cubic derivative extrema
  in `packages/document-core/src/geometry.ts` instead of relying on fixed-step
  sampling. Path MBRs therefore include true between-sample peaks/valleys,
  which keeps worker hit bounds, runtime mock path sizing, and vector/file
  adapters aligned for strongly curved segments.

- Path bounds precedence now prefers `bezierPoints` over raw `points` in the
  worker runtime and vector element-to-document adapter. This prevents authored
  bezier paths from snapping back to anchor-list bounds after move/resize or
  other operation commits that re-derive runtime `x/y/width/height`.

- Vector selection overlay now hides the full selection chrome during active
  transform drags, including resize, rotate, and move. The MBR, resize handles,
  and rotation handle disappear until the gesture ends so direct manipulation
  feedback stays less noisy.

- Shared `runtime-interaction` transform resize now treats single rotated selections in
  local shape space instead of world-axis space. Corner and edge handle drags
  therefore resize rotated elements against their visual handle directions
  while preserving the element's existing rotation.

- `flipX` / `flipY` are now first-class transform state in the active vector
  runtime path. Single-shape resize crossovers toggle flip state instead of
  rebaking polygon/path geometry, and the worker, Canvas2D renderer, selection
  overlays, file adapters, clip hit-tests, and playground/vector app
  preview/commit paths all preserve those flips.

- Viewport point projection now routes through shared `@venus/runtime`
  `applyMatrixToPoint` exports in both shared/app selection overlays and vector
  runtime pointer projection paths (plus playground marquee projection),
  reducing duplicated world/screen matrix math while matrix-internals migration
  continues.

- Playground rotated selection handle placement and rotated selection-box
  interior hit checks now also use shared `document-core` affine helpers
  (`createAffineMatrixAroundPoint` + inverse projection) instead of local
  trig-based rotation helpers.

- Rotated selection-box interior containment is now shared via
  `document-core` `isPointInsideRotatedBounds`, and both vector and
  playground interaction paths now consume that shared helper.

- Selection handle layout + hit-pick math is now shared in
  `runtime-interaction` (`interaction/selectionHandles.ts`), and active vector app,
  playground, and shared overlay paths no longer maintain separate
  duplicated rotate-handle layout helpers.

- Group-aware resize target collection is now shared in `runtime-interaction`
  (`interaction/transformTargets.ts`), aligning vector and playground
  multi/group resize target expansion behavior on one helper.

- Group-aware transform preview expansion and preview geometry remap are now
  shared in `runtime-interaction` (`interaction/transformPreview.ts`),
  reducing another duplicated transform-preview code path across vector and
  playground.

- Clip-bound image preview propagation during transform sessions is now also
  centralized in `runtime-interaction` preview-map helpers (optional
  `includeClipBoundImagePreview` path), so vector no longer maintains a
  separate app-local clip preview extension.

- Vector mask/image overlap checks now normalize shape bounds via
  `document-core` `getNormalizedBoundsFromBox`, so negative-width/height
  compatibility stays consistent when clip candidate overlap is evaluated.

- SVG/CSS transform-string composition for resolved rotate/flip state is now
  shared in `document-core` (`toResolvedNodeSvgTransform`,
  `toResolvedNodeCssTransform`), reducing duplicated transform attribute
  formatting logic across vector and shared overlay/render paths.

- Added cross-package matrix compatibility invariant documentation in
  `docs/core/matrix-compatibility-invariants.md` to lock shared
  transform ownership and migration boundaries while runtime storage remains
  decomposed.

- Added a shared matrix regression runbook in
  `docs/core/matrix-regression-scenarios.md` covering rotated
  resize, multi/group signed-scale crossover, rotated selection clear, path
  fill/hit consistency, and clip preview/commit consistency checks.

- Worker runtime bounds resolution now normalizes path/bezier derived bounds
  through the shared normalized-box helper before scene/spatial writes, reducing
  one more indexing drift risk under transform-sign edge cases.

- Vector and playground preview document/runtime-shape derivation now
  route through shared `runtime-interaction`
  `resolveTransformPreviewRuntimeState`, reducing duplicated transform-preview
  computation and keeping preview map semantics aligned across app surfaces.

- Added runnable one-command matrix regression gate:
  `pnpm matrix:check` (implemented by
  `tooling/matrix-regression-check/scripts/run-check.mjs`) for repeated
  migration verification across active packages/apps.

- Normalized bounds overlap/intersection semantics are now shared in
  `document-core` (`doNormalizedBoundsOverlap`, `intersectNormalizedBounds`) and
  consumed by vector overlap checks plus worker clip/runtime intersection paths.

- Group/parent-child transform edge hardening now includes ancestor-aware
  resize target filtering in `runtime-interaction` and per-cycle hierarchy map
  reuse in worker moved-group ancestor checks.

- Added Phase-5 matrix-first runtime RFC draft at
  `docs/core/matrix-first-runtime-rfc.md` plus initial
  `document-core` scaffold adapters (`MatrixFirstNodeTransform`,
  `createMatrixFirstNodeTransform`, `toLegacyShapeTransformRecord`).

- Added file-format transform compatibility flow in base parser/export adapters:
  runtime-scene parsing resolves transform from metadata + node matrix, and
  export adapters serialize canonical transform metadata keys for compatibility.

- Vector file export (`apps/vector-editor-web/src/adapters/fileFormatScene.ts`)
  emits canonical transform metadata keys through shared adapter logic instead
  of app-local ad-hoc transform key assembly, tightening persisted/runtime
  transform boundary consistency.

- `renderer-skia` now derives scene revision keys from a pure scene hash
  (`computeSceneRevision`) instead of mutating refs during render. This keeps
  tile/prewarm cache revisioning deterministic while satisfying current React
  hooks lint constraints.

- Multi-selection and group resize now use signed batch scaling in
  `runtime-interaction` instead of positive-only box scaling. Crossing a
  group/selection axis toggles per-shape flip state, and group resize targets
  leaf descendants rather than the derived group container box, so reflected
  resize behavior stays consistent for grouped content too.

- Shared hit-testing now targets actual stroke/fill geometry instead of falling
  back to selection/document bounds for picking. `document-core` owns the
  stroke/fill hit rules, worker and runtime-interaction hover/drag hit-tests
  consume that same helper, and the vector/playground selection box now only
  starts transforms through explicit handles rather than by clicking empty MBR
  space.

- Clicking empty interior space inside the current selection box now clears the
  selection in both the vector app and playground. The clear path only
  triggers when the pointer is inside the current selection box, misses all
  transform handles, and also misses the selected shapes' actual stroke/fill
  hit geometry.

- File-format path parsing/export now preserves explicit `CLOSE` commands for
  vector paths. `parseRuntimeScene` rehydrates closed subpaths back into the
  runtime point/bezier lists, and the vector scene adapter emits `CLOSE` for
  closed polyline/bezier paths, which keeps Canvas2D path fill rendering
  aligned across import/export cycles.

- Canvas2D fill rendering now depends on the fill toggle plus the fill color's
  effective alpha. Explicit fill styles render unless `fill.enabled === false`,
  and fully transparent fill colors no longer paint even when a fill color
  string is present. This keeps closed paths with authored fill colors visible
  without requiring a separately persisted `fill.enabled = true`.

- Phase 1 of the matrix-internals migration has started in `document-core`.
  Shared affine helpers now live in `packages/document-core/src/geometry.ts`,
  `hitTest.ts` resolves shape-local pointers through inverse affine transforms,
  and the Canvas2D renderer applies shape rotation/flip through the same shared
  affine composition. The runtime node model is still decomposed
  (`x/y/width/height/rotation/flipX/flipY`), but transform-sensitive code
  should prefer the shared affine helpers over hand-rolled rotate/flip math.

### 2026-04-08

- Started the shared `@venus/ui` shadcn-aligned surface in `packages/ui` with
  local component/lib subpath aliases, a shared `Button`, a `cn` helper, and
  compatibility wrappers for the vector app's former `@lite-u/ui` surfaces.
  `apps/vector-editor-web` now imports UI primitives from `@venus/ui` and no
  longer declares `@lite-u/ui` as an app dependency. The shared `Select`,
  `Modal`, and `Tooltip` wrappers now delegate to Radix primitives.

- Added right-inspector panel minimize behavior in `apps/vector-editor-web`:
  `EditorFrame` owns minimized state for Properties, Layer, and History panels,
  each panel header exposes a minimize action, and a fixed narrow rail on the
  far right shows all panel icons with active styling for opened panels and
  click-to-restore behavior for hidden panels.

- Updated shared UI affordances so enabled interactive primitives advertise
  clickability: `@venus/ui` buttons and select triggers now use a pointer cursor
  when enabled and a not-allowed cursor when disabled, while clickable vector
  layer rows and modal backdrops follow the same interaction cue.

- Added vector UI i18n helpers and resources under `apps/vector-editor-web/src/i18n`:
  the language switcher now derives its selected language from i18next instead
  of local state, uses shared language-code helpers, and the editor frame no
  longer renders the filename in the top language bar.

- Replaced remaining vector select composition with the shared shadcn/Radix
  `@venus/ui` select style: the unused hand-rolled app-local select component
  was removed, create-file select options no longer nest menu items, and the
  shared select trigger/content/items now use shadcn-like focus, indicator, and
  checked-item styling.

- Rebuilt the vector language switcher as direct app markup over the shared
  `@venus/ui` Select instead of legacy `Con`/`Row` layout wrappers, keeping the
  i18next-derived language state while making the header control simpler.

- Changed the vector language switcher from a select-style control into a
  top-bar menu: the header button now opens an editor-chrome dropdown with
  language menu rows and a current-language marker.

- Unified vector editor chrome styling across the top menu, shortcut icon bar,
  left toolbar, and language menu with shadcn-like rounded buttons, neutral
  hover states, bordered dropdown surfaces, and stronger black active tool
  states.

- Finished i18n coverage for the unified editor chrome: sidebar toolbar
  tooltips now use `ui.toolbar.*` translations, and the shortcut bar now uses
  `useTranslation` plus explicit menu translation keys so language changes
  update icon titles consistently.

- Updated the vector left toolbar to behave as a rail rather than button stack:
  tool items no longer render as button elements, keyboard activation is kept
  via `role="button"`/`tabIndex`, and active state is shown by a light active
  tile.

- Matched the vector right inspector shortcut rail to the left toolbar style:
  inspector icons no longer render as button elements, keep keyboard activation
  through `role="button"`/`tabIndex`, and show open panels with light active
  tiles.

- Synced the vector toolbar rail, inspector rail, and shortcut icon bar through
  shared editor-chrome icon style constants so static, active, focus, hover,
  and disabled states do not drift across the three icon surfaces.

- Removed rail-side active bars from vector chrome icons and unified toolbar,
  inspector rail, and shortcut icon sizes through the shared `CHROME_ICON_SIZE`
  constant.

- Added vector editor typography tokens in
  `apps/vector-editor-web/src/components/editorChrome/editorTypography.ts` and
  app-level CSS classes in `src/index.css`: editor chrome now uses shared body,
  label, meta, heading, menu, control, panel, and status text sizes instead of
  scattered Tailwind font-size utilities.

- Reduced the vector right inspector content wrapper from `w-72` to `w-64` in
  `EditorFrame`, keeping the shortcut rail width unchanged while giving more
  canvas space back to the editor.

- Reduced the vector right inspector shortcut dock from `w-12` to `w-10` in
  `EditorFrame` so the restored/minimized panel rail reads slimmer.

- Softened the shared vector chrome active icon tile in
  `editorChrome/chromeIconStyles.ts`: active toolbar, inspector dock, and
  shortcut icon states now use a quieter gray background/ring without inset
  shadow.

- Strengthened the shared vector chrome active icon border from `ring-gray-200`
  to `ring-gray-400` while keeping the softer active background.

- Replaced layer panel type-name text with fixed-size type icons in
  `LayerPanel`: known vector layer types resolve to shape/text/image/group
  icons, while unknown types use a common placeholder icon with the type kept
  in the title/accessible label.

- Redesigned the vector bottom status bar zoom control into a compact
  Illustrator-style combo: the status bar now uses a slimmer neutral shell, the
  zoom field edits percentage values correctly (`100%` -> scale `1`), and zoom
  presets open upward from a single bordered control instead of rendering a
  separate select plus input.

- Tightened the vector zoom combo so the current scale appears only in the
  input field; the select affordance is now a tiny chevron button embedded at
  the right edge of the same input surface.

- Refined the vector zoom combo focus model: the chevron now shares the input
  surface without a separate divider, menu clicks no longer force a blur/commit
  flicker, and the menu is linked to the input/button with ARIA controls.

- Rebuilt the vector zoom combo as a single custom status-bar control with an
  editable percent field, an embedded chevron-only preset trigger, ArrowDown
  menu open support, focus-to-select editing, and listbox/option semantics for
  the preset menu.

### 2026-04-05

- Updated selection-visual ownership split: selected/hovered visual feedback was
  removed from `renderer-canvas` draw paths and moved to selection overlay
  layers. The overlay now draws both selected bounds and a thin selected-shape
  geometry stroke (`rect/ellipse/polygon/star/path/line`) so element chrome is
  centralized in interaction UI rather than render primitives.

- Hit-test now treats clip mask as the first gate for clipped elements instead
  of image-only post checks. `editor-worker` candidate filtering, shared
  `runtime-interaction` drag arming hit-test, and `vector-editor-web` pointerdown
  pre-hit test now all require pointer inclusion in `clipPathId` source shape
  before considering host geometry, reducing clipped-element selection mismatch.
  Follow-up fix: shared drag hit-test now builds a per-call `id -> shape` map
  before clip checks to avoid `O(n²)` source lookups on large playground scenes,
  restoring drag responsiveness while keeping clip-first semantics.
  Follow-up refactor: drag/transform preview commit synchronization was moved
  into shared `@venus/runtime/react` hook `useTransformPreviewCommitState`
  (pending-commit flag + doc-sync clear path), and both
  `vector-editor-web` and `playground` now consume the same
  implementation to avoid app-local bounce/stale-preview regressions.

- Playground fake-data sources were flattened to exclude `group` nodes:
  stress-scene generation now skips group synthesis/parent wiring, and the
  default demo mock document no longer includes group wrappers or group
  parent-child links.

- Fixed playground transform preview rendering for point-based shapes:
  preview application now remaps `points` / `bezierPoints` alongside
  `x/y/width/height`, so `polygon/star/path` follow pointer movement immediately
  during drag instead of waiting for command commit.

- Playground selector pointer-down now relies on shared
  `createSelectionDragController` hit results (exact shape filtering) instead
  of app-local coarse bbox pre-hit checks, reducing dense-scene mis-picks and
  drag jitter for `10k+` documents.

- Fixed vector multi-select rotate undo granularity: introduced
  `shape.rotate.batch` command path so rotating multiple selected elements is
  recorded as one history transaction (`editor-worker` builds one history entry
  with multi `rotate-shape` patches), and one undo restores the full rotated
  set instead of only the last shape.

- Extended transform commit batching to cover move/resize/rotate together:
  `shape.transform.batch` now commits multi-shape transform previews as a single
  worker history transaction (multi `move/resize/rotate` patches in one entry),
  so one undo restores the complete multi-select transform instead of stepping
  shape-by-shape.

- `shape.transform.batch` collaboration/runtime payloads are now matrix-first:
  `fromMatrix/toMatrix` is the canonical wire contract for transform batches,
  and worker ingest resolves legacy patch derivation from matrix payloads
  instead of relying on decomposed `from/to` transport fields.

- Added safe zoom de-flicker path in `runtime` gestures: wheel-zoom commits
  are now coalesced with `requestAnimationFrame` into per-frame viewport
  updates, reducing transient redraw flicker without re-enabling unstable
  preview-transform offset behavior.

- Synced group drag preview behavior across vector and playground: when a group
  is transform-preview moved, non-explicitly-previewed descendants now inherit
  the same delta immediately in preview maps so children visually move with the
  group before commit.

- Added first-class shape appearance editing for vector primitives:
  `shape.patch` now supports `fill/stroke/shadow`, rectangle
  `cornerRadius/cornerRadii`, and ellipse `start/end` angles across worker
  history + collaboration payloads. Vector property panel emits these patches,
  file-format metadata parse/serialize paths persist them, and `Canvas2D`
  now renders per-corner rounded rectangles, arc/sector ellipses, and shape
  shadows/colors using `DocumentNode` style fields.

- Unified layer-operation UI wiring in `vector-editor-web`: top menu `layer`
  entries, context-menu layer submenu, shortcut-bar layer buttons, and layer
  panel action icons now all dispatch the same `element-layer` action with
  explicit direction payload (`up/down/top/bottom`) to keep behavior
  consistent across entry points.

- Landed true multi-select selection semantics across runtime and worker
  protocol. `selection.set` now supports `shapeIds + mode`
  (`replace/add/remove/toggle/clear`), pointer-down messages forward modifier
  keys, shared-memory selection is now flag-set based (with `selectedIndex`
  kept as primary compatibility index), and `selection.delete` can remove all
  currently selected shapes in one action.

- `vector-editor-web` selector interaction now supports marquee (box) selection
  in world space with modifier-aware behavior (`replace/add/toggle`) and
  renders marquee feedback via `InteractionOverlay`.

- Transform sessions were upgraded from single-shape to multi-shape previews:
  moving/scaling/rotating selection handles now preview and commit batched
  per-shape geometry updates (`shape.move`/`shape.resize`/`shape.rotate`) for
  the full selected set.

- Layer panel selection behavior now supports range selection: `Shift+click`
  selects a contiguous layer range from the last anchor, while `Cmd/Ctrl+click`
  toggles individual items and `Shift+Cmd/Ctrl` appends ranges.

- Extracted pointer-drag arming logic into a shared composable controller:
  `@venus/runtime/interaction` now exports `createSelectionDragController`, and both
  `vector-editor-web` and `playground` use the same
  `pointerdown -> pending -> thresholded move -> drag session -> commit` flow
  instead of maintaining duplicated app-local drag state machines.

- Extracted clip-shape point-inclusion logic into `@vector/model`
  (`isPointInsideClipShape`) and switched both worker hit-test and
  runtime-interaction drag-start hit-test to use the same helper. This keeps clipped
  image interaction semantics aligned across selection, hover, and drag entry.

- Added a reusable selection-overlay assembly point in `@venus/runtime/react`:
  the shared React runtime adapter now provides `CanvasViewport` optional
  `overlayRenderer` support, and `CanvasSelectionOverlay` is exported as a
  shared default overlay. Both `vector-editor-web` and `playground`
  now mount the same overlay path, so selection UI can be reused across app
  surfaces (including future xmind integration) without coupling it to a
  single app renderer.

- Added first usable rotate flow: `shape.rotate` is now a worker command with
  history/collaboration patch support, selector rotate-handle preview commits
  rotation on pointer-up, rotation metadata is persisted through vector
  file-format adapters/parsing, and renderer paths (Canvas2D shapes plus the
  vector editor's HTML image layer) now honor `DocumentNode.rotation`.

- Wired the first transform-session loop into `useEditorRuntime` for selector
  mode: pointer-down on selection handles starts a transform preview session,
  pointer-move updates transient preview bounds, and pointer-up commits
  `shape.move` / `shape.resize` commands to the worker.

- Added an interaction-layer skeleton in `vector-editor-web` and mounted it on
  top of the renderer. The new `interaction/*` modules separate
  `selectionManager`, `handleManager`, `transformSessionManager`, `draftManager`,
  and `InteractionOverlay`, so future selection/transform/draft logic can evolve
  without mixing into base scene rendering.

- Added first-pass click-to-insert drawing tools in `vector-editor-web` for
  `rectangle`, `ellipse`, `lineSegment`, `polygon`, `star`, and `text`. Toolbar
  entries and shortcuts now switch into these tools, and pointer-down creates
  a default shape payload immediately at cursor position.

- Group bounds are now derived from children in both parse-time and worker
  runtime mutation flow. `group` `x/y/width/height` is recalculated from child
  bounds (including nested groups) after scene parse and after geometry-changing
  patches (move/resize/insert/reorder/remove), so selection/hit-test/render
  boxes stay aligned with actual child geometry.

- Fixed clipped image hit-testing in `editor-worker`: when an image carries
  `clipPathId`, hit-tests now validate pointer inclusion against the resolved
  clip source geometry (rect/frame/group/ellipse/polygon/star/path) instead of
  accepting any point inside the image rectangle.

- Fixed polygon/star hit-testing stability in `editor-worker`: hit-tests now use
  normalized bounds (safe for negative width/height) and accept near-edge
  clicks via segment-distance tolerance instead of requiring strictly interior
  points only.

- Added a first-pass arrowhead path for pure vector primitives: `lineSegment`
  and `path` now carry optional `strokeStartArrowhead/strokeEndArrowhead`
  metadata (`none|triangle|diamond|circle|bar`) through
  `vector-editor-web` adapters, file-format parsing/serialization metadata, and
  worker shape-insert normalization.

- `renderer-canvas` now draws start/end arrowheads for line segments and open
  paths using path tangent direction, so the current Canvas2D route can express
  directional vector semantics before connector-specific node modeling lands.

- Selection overlay now follows shape rotation for single-element selection in
  both app-level and shared overlay paths (`InteractionOverlay` and
  `CanvasSelectionOverlay`), so post-rotate selection chrome no longer appears
  as an axis-aligned box.
  Handle positions and handle hit-picking in vector selector flow were aligned
  to the same rotated frame, avoiding visual-vs-interaction mismatch after
  element rotation.

- Extracted marquee (box-select) core logic into
  `@venus/runtime/interaction/interaction/marqueeSelection` and exported it via
  package entry. `vector-editor-web` now uses shared helpers for marquee state
  updates, bounds resolution, and selected-id computation to keep future app
  surfaces aligned on the same baseline behavior.

- Enabled marquee selection in `playground` using the same shared
  marquee helpers (`createMarqueeState`, `updateMarqueeState`,
  `resolveMarqueeBounds`, `resolveMarqueeSelection`) and added marquee overlay
  visualization on top of `CanvasSelectionOverlay` so playground and vector can
  validate the same box-select baseline behavior.

- Selection chrome (selection border, handle size, rotate-handle offset, and
  marquee border) now uses screen-space constant sizing by scaling UI values
  with `1 / viewport.scale`, so chrome no longer visually expands/shrinks when
  zooming canvas content.

- Updated selection chrome sizing policy: hover frame, handles, and marquee are
  now decoupled from `viewport.scale` (fixed world-space sizing), while the
  selected bounding box border keeps its scale-compensated stroke behavior.

- Gesture layer now suppresses pointer selection events for a short window
  after wheel/pinch input (`POINTER_SUPPRESS_AFTER_WHEEL_MS`) and only emits
  `onPointerUp` when a real pointer interaction was active. This prevents zoom
  gestures from accidentally triggering selection commits.

### 2026-04-04

- Added `docs/core/current-work.md` and linked it into the Venus
  skill loading workflow so interrupted work can be resumed from repo state.

- Added a repo rule that scene/document modeling questions should defer to
  `packages/file-format` and its `node + feature` model before inventing
  runtime-only terminology.

- Extended `DocumentNode` with `schema` metadata that preserves file-format
  provenance such as source node type, node kind, and feature kinds.

- Threaded schema provenance through parser, worker clone/rehydration, vector
  adapters, and the vector property panel so file-format semantics remain
  visible in runtime interaction surfaces.

- Added image resource metadata to the vector property panel so selected image
  elements can display linked asset info and natural dimensions.

- Temporarily removed `Skia` from `apps/playground` and stripped the
  remaining vector type-level dependency so active development bundles no longer
  pull `canvaskit` into the default playground/vector build path.

- Updated `createEditorViteConfig()` to build editor apps with `base: './'` so
  generated `index.html` and emitted bundles reference `./assets/...` relative
  paths instead of root-absolute `/assets/...`.

- Added a no-SAB runtime fallback in `createCanvasRuntimeController()` so built
  app surfaces opened without `crossOriginIsolated` can still hover and select
  shapes locally even though worker-backed editing features remain unavailable.

- Added the published playground URL to the repo root `README.md` and
  updated the README runtime chain text to reflect the current Canvas2D-first
  active renderer path.

- Refactored `renderer-canvas` LOD config to use numeric levels (`0..3`) as the
  primary abstraction; current runtime still maps `full -> 0` and
  `interactive -> 2` so behavior stays compatible while future LOD scheduling
  becomes easier to extend.

- Added a shared runtime-react LOD scheduler and threaded `lodLevel` through
  `CanvasRendererProps`; playground now shows the live computed level and mode
  produced by viewport interaction state plus scene size heuristics.

- Removed manual LOD preset switching from `playground`; the sidebar now
  treats LOD as runtime diagnostics (`profile/level/mode/images`) instead of a
  user-controlled tuning panel.

- Strengthened Canvas2D LOD for large scenes: interactive mode now reaches
  `level 3` earlier, and high LOD levels skip drawing shapes/images/paths whose
  rendered on-screen extent is below configurable thresholds.

- Tried a bitmap-based zoom preview experiment and rolled it back after
  continuous-wheel flashing regressions. Current stable baseline remains:
  `pan` preview on, `zoom` direct commit + redraw, LOD scheduler retained.

- Added a first-class `group` concept to the flattened runtime adapter layer:
  `GROUP` nodes in file-format now parse to `DocumentNode.type = 'group'`, and
  `parentId / childIds` are preserved through vector file adapters so hierarchy
  semantics are no longer dropped even before full group/ungroup UI exists.

- The vector layer panel now derives a flattened tree view from
  `parentId / childIds`, so nested groups render as indented structure instead
  of being flattened into a single-level layer list.

- Fixed a `playground` startup render loop caused by the
  `CanvasViewport -> onRenderLodChange -> React state` bridge emitting a fresh
  LOD object every render; the callback now only reports when effective LOD
  fields actually change.

- `playground` should lazily generate stress scenes based on the active
  mode instead of eagerly `useMemo`-building every `10k/50k/100k/1000k/Img+`
  document on app mount; eager generation can make the default demo surface
  appear stuck behind an infinite loading spinner.

- The default `vector-editor-web` mock file now includes nested `group`
  containers plus grouped child elements, so the layer panel and runtime
  adapter can validate hierarchy behavior without switching to playground.

- Image trimming by closed shapes is now wired end-to-end through the
  file-format path with a minimal `CLIP` feature on image nodes. The current
  chain is `file-format feature -> parser -> DocumentNode.clipPathId/clipRule ->
vector adapter -> Canvas2DRenderer clip draw`, and the default vector mock
  file includes a masked image example for direct verification.

- `vector-editor-web` now exposes a first usable mask command on top of the
  clip chain: `image-mask-with-shape` and `image-clear-mask` are wired through
  the worker protocol (`shape.set-clip`), undo/redo history, context menu, and
  image property panel. The current command is single-selection friendly and
  auto-resolves a unique overlapping image/closed-shape pair instead of
  depending on full multi-select infrastructure.

- `polygon` is now a first-class runtime/vector element instead of being forced
  through generic `path` semantics. The current chain is
  `ShapeType/shared-memory -> file-format adapters -> worker hit-test ->
Canvas2D render/clip -> vector/playground mock data`, and polygons are
  represented as closed point lists backed by the existing `VECTOR` geometry
  feature.

- `star` now follows the same first-class closed-point primitive path as
  `polygon`, including shared-memory kind mapping, file-format adapters, worker
  inside-shape hit-testing, Canvas2D rendering/clip support, and vector /
  playground mock data. Star point generation is centralized in local helpers
  so future parametric closed-shape primitives can reuse the same pattern.

- Freehand `pencil/path` drawing in `vector-editor-web` still lands as `path`,
  but the generation path is now smoother: raw pointer samples are simplified
  before `convertDrawPointsToBezierPoints(...)`, and very short accidental
  drafts are dropped on pointer-up instead of creating tiny noisy paths. The
  relevant logic lives in `usePenTool.ts` and `editorRuntimeHelpers.ts`.

- Mock scene generation now feeds real bezier path data through the same
  runtime fields used by authored pencil paths. `playground`
  demo/stress scenes, the playground `Insert Mock` action, and the default
  `vector-editor-web` mock file all generate `path.points +
path.bezierPoints` from sampled anchors via
  `convertDrawPointsToBezierPoints(...)` so render, hit-test, and clip behavior
  can be verified without relying on hand-written bezier fixtures only.

- The default mock `path` examples in `playground` and
  `vector-editor-web` now use mixed segments: some adjacent anchors are linked
  as straight lines (`cp1/cp2 = null`), while the middle segments keep bezier
  handles. This gives the renderer and hit-test path a stable mixed line/curve
  fixture without requiring interactive path editing first.

- The default demo/mock surfaces now include multiple mixed paths instead of a
  single sample, so overlap, z-order, and repeated hit-test behavior can be
  checked without switching to stress scenes.

- `playground` stress generation now mixes two path variants: some
  generated `path` nodes are still smooth bezier waves, while a subset now
  alternates straight joints and bezier handles. Large-scene render and
  hit-test checks therefore cover both pure-curve and mixed-segment path data.

- The root `README.md` now lists the new vector UI package surface narrowly:
  `@venus/ui`, the shadcn-style `packages/ui/components.json` setup, Radix UI
  primitives for dialog/select/scroll-area/tooltip, and Tailwind CSS 4.

- Shared `@venus/ui` tooltips now use an inline `11px / 14px` content size
  instead of Tailwind `text-xs`, because Radix Tooltip portals render outside
  the vector editor root and cannot rely on `.venus-editor` typography
  inheritance or app Tailwind scanning for package-local arbitrary classes.

- Snapping candidate lookup now uses `@venus/engine` spatial index APIs in
  `@venus/runtime/interaction` (`interaction/snapping.ts`) to query nearby bounds by
  tolerance window around moving shapes, so snap priority is effectively
  nearest-match among local neighbors rather than global full-scene scans.

- Runtime command contracts now include `snapping.pause` and
  `snapping.resume` in `@venus/runtime/worker` protocol types. App runtimes
  (`playground` and `vector-editor-web`) intercept these commands at
  the runtime shell layer to toggle optional snapping behavior without
  mutating worker document state.

- Marquee (selection-box) commit behavior in `playground` and
  `vector-editor-web` now uses `matchMode: 'contain'` explicitly when calling
  `resolveMarqueeSelection(...)`, so drag-box selection only includes shapes
  fully contained by the marquee bounds.

- Marquee selection now supports explicit apply timing via
  `runtime-interaction` `MarqueeApplyMode`; both `playground` and
  `vector-editor-web` currently use `while-pointer-move`, so selection is
  applied live during drag. After mouse-up, each app also emits a readable
  selection name summary from selected shape names.

- Selection modifier handling is now consistent across gesture/runtime/worker:
  `alt` is passed through pointer modifiers and maps to subtract (`remove`)
  selection mode, `shift` maps to add, and `meta|ctrl` maps to toggle.
  `selectionDragController` no longer blocks modifier hit-testing; it only
  disables drag-pending arming for modifier clicks.

- Live marquee apply mode now still commits a final `selection.set` on
  pointer-up in both `playground` and `vector-editor-web`, fixing
  blank-click clear behavior when no drag delta occurs. Group move drag
  targeting in `selectionDragController` now follows the selected set when a
  selected ancestor (group) contains the hit child.

- Worker acceleration capability policy is centralized in `@venus/engine`
  (`detectEngineWorkerCapabilities` + `resolveEngineWorkerMode`). Runtime now
  consumes this policy instead of hand-rolling SAB checks, so fallback behavior
  (`main-thread` -> `worker-postmessage` -> `worker-shared-memory`) is
  centralized for future engine/runtime surfaces.

- `@venus/engine` now includes a concrete worker bridge + protocol layer
  internally (not part of the root public API). Runtime/app integration should
  consume the stable fallback policy entry (`resolveEngineWorkerMode`) while
  bridge/protocol implementation details stay package-internal.

- Engine scene-core mechanisms were consolidated to reduce cross-package
  duplication: scene patch types/helpers and scene point hit-test helpers now
  live in `@venus/engine`, alongside internal worker transport logic.

- Editor/runtime hit-testing now routes through `@venus/engine` interaction
  helpers (`isPointInsideEngineShapeHitArea`,
  `isPointInsideEngineClipShape`) with optional shape-map context for
  parent-transform-aware hit checks. `@vector/model` no longer exports
  the old hit-test helpers from its root index.

- `@venus/runtime/presets` now supports modular policy imports beyond snapping
  and selection: added `history` and `protocol` preset modules plus subpath
  exports (`/selection`, `/snapping`, `/history`, `/protocol`, `/default`).
  The package still keeps `createDefaultEditorModules(...)` as compatibility
  alias while `createDefaultRuntimeModules(...)` is the clearer new default
  bundle entry.

- Engine matrix-first hot-path baseline was extended for interaction/render
  correctness under transforms: `hitTestEngineSceneState(...)` now resolves
  point checks in composed local space (parent + node transforms), and Canvas2D
  culling now computes world-space AABB from transformed node bounds.
- Engine renderer pipeline now has a shared backend-agnostic preparation stage:
  `prepareEngineRenderPlan(...)` (`packages/engine/src/renderer/plan.ts`)
  provides matrix-aware prepared nodes, culling output, draw-list ordering, and
  batch buckets so backends can diverge only at final commit.
