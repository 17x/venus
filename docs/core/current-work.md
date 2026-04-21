# Current Work

Use this file as the first handoff note when a task was interrupted, a new
context starts, or work needs to resume after switching topics.

## How To Use

- Read this after `project-context.md` and `engineering-standards.md` when the
  user is continuing active implementation work.
- Treat `In Progress` as the current priority queue.
- Treat `Paused` as known branches that should not be resumed implicitly unless
  the user asks or the current task clearly depends on them.
- Update this file when a major workstream changes direction, is paused, or is
  replaced by a new priority.

## In Progress

- `vector editor architecture buildout`
  Focus on filling structural gaps in the vector/runtime/engine stack.
  Reference doc: `docs/vector-editor-architecture.md`
  Recently landed:
  - command registry (`packages/runtime/src/commands/registry.ts`)
  - hit-test adapter (`packages/runtime/src/interaction/hitTestAdapter.ts`)
  - tool registry (`apps/vector-editor-web/src/editor/tools/registry.ts`)
  - editing mode controller (`apps/vector-editor-web/src/editor/state/editingMode.ts`)
  - template test metadata enrichment (13 presets with regression/benchmark flags)
  - runtime tool lifecycle registry (`packages/runtime/src/tools/registry.ts`) and
    runtime editing mode controller (`packages/runtime/src/editing-modes/controller.ts`)
  - useEditorRuntime lifecycle wiring (tool activation + pointer-driven mode transitions)
  - engine multi-hit API (`hitTestEngineSceneStateAll`) and scene-store `hitTestAll`
  - worker hit-test candidate path (`hitTestDocumentCandidates`) with top-hit compatibility
  - toolbar/path/zoomOut coverage and shortcut baseline update (P path, N pencil, Shift+Z zoomOut)
  - initial useEditorRuntime decomposition via `editor/hooks/runtime/tooling.ts`
  - worker command dispatch moved to registry-style handlers in
    `packages/runtime/src/worker/scope/operations.ts` for explicit
    command routing (`selection.set`, `history.undo`, `history.redo`)
  - local/remote group command baseline:
    `shape.group` / `shape.ungroup` protocol + history patch support,
    including reversible parent/child graph updates
  - fixed known type issues in
    `apps/vector-editor-web/src/ui/kit/components/ui/modal.tsx` and
    `apps/vector-editor-web/src/components/createFile/TemplatePresetPicker.tsx`
  - vector action wiring now includes group/ungroup product entry points:
    top menu, context menu, and shortcuts (`Cmd/Ctrl+G`, `Cmd/Ctrl+Shift+G`)
  - selector vs dselector hit semantics are now explicitly separated in worker:
    selector prefers group-level hit targets, while cmd/ctrl modifier supports
    deep hit-through and dselector keeps deep selection semantics
  - worker `tool.select` protocol now accepts optional `toolName` for
    product-level interaction semantics without leaking UI behavior into engine
  - worker command dispatch now bridges runtime command descriptors through
    `createWorkerLocalCommandDispatcher` (`commandDispatchRegistry.ts`),
    replacing direct ad-hoc map execution for handled commands
  - dselector path sub-selection baseline landed:
    `PathSubSelection` types + point hit resolution for anchor/segment +
    overlay feedback in `InteractionOverlay`
  - useEditorRuntime decomposition advanced with extracted runtime modules:
    `editor/hooks/runtime/groupActions.ts` and
    `editor/hooks/runtime/pathSubSelection.ts`
  - useEditorRuntime action decomposition advanced with
    `editor/hooks/runtime/shapeActions.ts` so convert/align/distribute
    command routing
    is moved out of the monolithic executor branch
  - vector app now vendors shared UI primitives locally under
    `apps/vector-editor-web/src/ui/kit/*` and resolves UI imports via
    `@vector/ui` to keep product UI iteration in-app
  - vector app now mirrors runtime source locally under
    `apps/vector-editor-web/src/editor/runtime-local/*` and remaps
    `@venus/runtime*` imports to app-local paths via
    `apps/vector-editor-web/tsconfig.app.json` and
    `apps/vector-editor-web/vite.config.ts`, so vector no longer depends on
    runtime package distribution wiring for dev/build
  - vector app source structure was grouped by domain to reduce top-level noise:
    `src/editor/*` (runtime-facing editor modules) and
    `src/shared/*` (constants/types/utilities)
  - shape convert/align baseline landed end-to-end for 18.2 workstream:
    `shape.convert-to-path` and `shape.align` now flow through
    protocol -> local history -> scene patch apply -> collaboration replay,
    with vector menu/context/shortcut-bar entry wiring
    Next steps:
  - bridge runtime command registry descriptors into worker handler registration
    for the full command surface (current dispatcher bridge covers handled
    local commands and descriptor cataloging)
  - continue splitting useEditorRuntime into action/pointer/history modules
  - introduce path sub-selection data model (anchor/segment/handle) for dselector
  - map candidate-level hit semantics into runtime hit-test adapter and product rules

- `runtime-engine responsibility hardening`
  Focus on keeping mechanism/policy/product boundaries stable during active
  feature work.
  Current direction:
  - use `docs/architecture/layering.md` as the ownership checklist
    before landing runtime/engine/app changes
  - keep engine as mechanism owner (render/hit-test/math/index/scheduler)
  - keep runtime family as policy/orchestration owner
  - keep app surfaces as product behavior/UI owner
  - route new large-scene updates through shared batch patch/transaction paths
    before adding app-local performance branches

- `runtime` package direction
  Focus on stabilizing the consolidated runtime namespace and boundaries.
  Current direction:
  - runtime family is physically consolidated in `packages/runtime` with
    subpath exports (`@venus/runtime/interaction`,
    `@venus/runtime/presets`, `@venus/runtime/worker`)
  - standalone `editor-worker` package has been merged into
    `packages/runtime/src/worker`
  - keep `@venus/runtime` framework-agnostic and API-object-first; app-level
    React glue stays in app-local bridge files
  - keep worker acceleration policy in `@venus/engine` with explicit fallback
    modes (`main-thread` / `worker-postmessage` / `worker-shared-memory`)
    so runtime/app layers do not duplicate SAB checks
  - keep `@venus/engine` root exports intentionally small; treat worker
    bridge/protocol internals as non-public unless a new cross-package
    contract is explicitly required
  - document-core runtime scene model direction is now JSON-first; avoid reintroducing
    FlatBuffer schema/migration ownership into active runtime iteration paths

- `vector-editor-web`
  Focus on product-facing editor functionality first.
  Current direction: prefer stable behavior over aggressive render-pipeline
  optimization.
  Tracking checklist:
  - `docs/core/matrix-migration-checklist.md` (phase/status
    tracker for matrix-internals migration)
  - `docs/core/matrix-compatibility-invariants.md`
    (cross-package transform compatibility invariants)
  - `docs/core/matrix-regression-scenarios.md`
    (shared matrix-sensitive regression runbook)
  - `docs/core/matrix-first-runtime-rfc.md`
    (Phase-5 matrix-first runtime contract draft)
  - `packages/document-core/src/parseRuntimeScene.ts`
    (transform compatibility parse path from metadata + node matrix)
  - `apps/vector-editor-web/src/adapters/fileFormatScene.ts`
    (vector export now emits transform metadata through shared transform
    adapters instead of app-local key assembly)
  - `pnpm matrix:check`
    (one-command matrix migration regression gate)
    Recent landed baseline:
  - true multi-select selection semantics (`replace/add/toggle/clear`)
  - marquee (box) selection in canvas space
  - multi-shape move/scale/rotate transform preview + commit
  - layer panel range select (`Shift`) and toggle select (`Cmd/Ctrl`)
  - single-select chrome now follows element rotation (shared + app overlay)
  - rotated single-select handle positions and handle pick path are aligned
  - marquee core logic moved into shared runtime-interaction module
  - playground now enables marquee selection via shared marquee module
  - selection chrome now keeps constant screen-size across viewport zoom
  - hover/handles/marquee are now no-scale; selected border remains compensated
  - shape appearance baseline extended: rectangle per-corner radii, ellipse
    start/end angles, and style plumbing (`fill`/`stroke`/`shadow`) are now
    threaded through panel -> runtime command -> worker -> renderer
  - shell semantic UI migration advanced:
    - dropdown/context/header/left menu surfaces now use semantic menu item
      styling hooks (`vector-ui-menu-item`) with shadcn submenu structure
    - left sidebar entry was decomposed into focused menu/file/assets modules
      to keep shell view files within the 300-400 line file-size target and
      make tab-specific behavior easier to maintain
    - editor frame shell orchestration was split into stage-side panel chrome
      and a dedicated shell command/menu hook so the main frame module stays
      within the file-size rule while preserving runtime wiring behavior
    - left sidebar Find tab removed and shell tab unions normalized to
      `file | assets | history | debug`
    - left sidebar minimized state now preserves fixed panel width and
      file-name header with explicit restore affordance
    - layer list now supports horizontal scroll for full-name visibility, with
      lock/hide icon behavior aligned to hover and locked-row persistence rules
    - template preset picker restructured to option/details/fixed-footer model
      with shell tokenized surface/border usage
    - inspector text-content mutation guard added to keep text editing focused
      on canvas-side partial selection workflow
    - inspector typography controls now include a searchable font picker popover
      for text elements, with style-only `textRuns` updates allowed for
      font-family changes while keeping direct text-content mutation blocked
    - global shortcut handling now skips editable/interactive UI surfaces and
      honors editor focus gating, reducing conflicts between inspector/form
      keyboard input and canvas-level hotkeys
    - keyboard interaction baseline hardened for edge cases:
      - IME/composition input no longer triggers canvas/global hotkeys
      - temporary `space` pan mode now restores previous tool on editor focus-loss
        to avoid sticky tool state when keyup is missed
  - matrix-internals migration has started in the active stack: prefer shared
    affine helpers in `document-core` for shape transform math before changing
    persisted/runtime node contracts
  - `document-core` now exposes a shared decomposed-box compatibility layer
    (`resolveNodeTransform`) for normalized bounds, center, matrix, and inverse
    matrix derivation; route new transform-sensitive runtime code through that
    contract before introducing a matrix-first node model
  - `runtime-interaction` now exposes shared transform session/preview shape builders,
    shifting the migration from helper cleanup toward package-boundary
    contracts for transform-sensitive app/runtime integration
  - phase-1 vector-first localization now routes app interaction imports through
    `apps/vector-editor-web/src/editor/interaction/runtime/index.ts`
    instead of direct `@venus/runtime/interaction` imports at call sites
  - runtime folder migration kickoff started in app source:
    new pure-TS runtime skeleton now exists under
    `apps/vector-editor-web/src/runtime/*` (core/model/commands/events/
    interaction/hittest/overlay/preview/subscriptions/protocol/types), and
    `useEditorRuntimeCanvasInteractions.ts` now imports the interaction barrel
    through `src/runtime/interaction` to establish the forward path while
    preserving current behavior
  - app runtime root alias now points to
    `apps/vector-editor-web/src/runtime/index.ts` (with compatibility re-export
    from `editor/runtime-local/index.ts`), and `useEditorRuntime` pointer
    callbacks now flow through `createRuntimeInputRouter` +
    `createRuntimeCanvasInputBridge` before reaching interaction handlers
  - runtime interaction alias is now promoted to
    `apps/vector-editor-web/src/runtime/interaction/index.ts` in both
    TypeScript and Vite config, and editor hooks/runtime adapters no longer
    import `editor/interaction/runtime/index.ts` directly
  - phase-4 overlay/preview contract baseline landed:
    runtime now exposes `buildRuntimeOverlayInstructions` and
    `buildRuntimePreviewInstructions`, and `useEditorRuntime` canvas state
    publishes `overlayInstructions` / `previewInstructions` so engine-side
    overlay rendering can consume runtime-owned instruction streams
  - phase-5 document style model extended with gradient support:
    `document-core` shape `fill` / `stroke` now accept optional gradient
    payloads (`linear` / `radial`, stops, angle/center/radius) and
    `parseRuntimeScene` now reads optional
    `fillGradient*` / `strokeGradient*` metadata fields
  - phase-6 cleanup/hardening updated:
    `useEditorRuntime` restored explicit `ElementProps` type import and runtime
    model barrel now re-exports gradient style types for app/runtime boundaries
  - runtime instruction consumption moved from definition-only to render path:
    `InteractionOverlay` now renders runtime-owned overlay/preview instruction
    streams (line/polyline/polygon/handle), and migration mode avoids duplicate
    legacy marquee/snap/selection-box drawing when instruction streams exist
  - runtime overlay `hitRegion` semantics are now protocolized in
    `src/runtime/overlay/index.ts` via typed constants and `snap:*` namespace,
    and path-chrome fallback in `InteractionOverlay` now uses runtime helper
    `isPathOverlayHitRegion` instead of local string matching
  - vector app now includes a local compatibility declaration for
    `@lite-u/editor/types` at
    `apps/vector-editor-web/src/types/lite-u-editor-compat.d.ts`, which
    unblocks app-level TypeScript checking during migration and keeps
    legacy type imports compile-safe while runtime/document boundaries are
    being hardened
  - `editorRuntimeHelpers` bezier offset narrowing was hardened to avoid
    object-property access on untyped points, and
    `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`
    is now clean
  - viewport interaction rerender hardening landed in editor shell:
    `useEditorFrameShell` now memoizes dispatch/props callbacks, and
    `EditorFrame` removed per-render logging while limiting debug render-count
    churn so panning/zooming no longer forces unrelated menu/shell subtrees
    to recalculate each frame
  - `EditorFrame` now isolates high-frequency canvas stage updates from
    low-frequency shell overlays through memoized stage composition
    (`StageCanvasLayer` + memoized `CanvasViewport`), while side-panel restore
    handlers are stabilized to avoid prop-churn-driven rerenders during pan
  - runtime diagnostics event pipeline is now available under
    `src/runtime/events/index.ts` (`publish/subscribe/get snapshot` for render
    diagnostics), and canvas adapter forwards engine `debug.onStats` cache/frame
    reuse metrics through this channel so `EditorFrame` debug info no longer
    depends on local RAF sampling or scene-stability heuristics
  - debug observability expanded with UI render probes wired into shell debug:
    `EditorFrame`, `StageCanvasLayer`, `EditorFrameSidePanels`, and
    `RightSidebar` render counts are now surfaced alongside engine draw/cache
    metrics for direct hotspot attribution during pan/zoom sessions
  - debug diagnostics consumption is now extracted from `EditorFrame` into an
    independent subscriber component (`components/shell/RuntimeDebugPanel.tsx`)
    using `useSyncExternalStore` on runtime events, so debug metric refresh no
    longer participates in top-level frame orchestration rerenders
  - viewport scale consumers are now detached from `EditorFrame` prop threading:
    runtime viewport snapshot pub/sub was added in `runtime/events`, with
    `RuntimeZoomControls` and `RuntimeGridOverlay` independently subscribing via
    `useSyncExternalStore`; zoom and grid refresh no longer require
    `EditorFrame -> useEditorFrameShell -> RightSidebar/SidePanels` propagation
  - right sidebar metadata (layers/selection counters) now consumes an
    independent runtime shell snapshot (`publishRuntimeShellSnapshot`) via
    `RuntimeSidebarMeta`, removing `selectedCount/layerCount` prop threading
    from `useEditorFrameShell` and reducing shell-level invalidation fanout
  - `LeftSidebar` and `RightSidebar` are now exported as memoized components to
    isolate subtree rerenders when sibling panel props mutate
  - debug FPS reporting no longer uses `1000 / drawMs`; runtime diagnostics now
    compute a smoothed FPS estimate from draw-count/time deltas with a bounded
    clamp, eliminating frequent unrealistic 3-4 digit spikes
  - debug tab now exposes both `FPS (Smooth)` and `FPS (Instant)` to separate
    sustained frame cadence from short-lived render burst jitter
  - global UI/perf cleanup pass removed active and stale debug logging across
    editor frame, save pipeline, context menu, print, layer panel, and zoom
    utility modules to reduce console overhead/noise during interaction traces
  - `useEditorFrameShell` no longer computes unused top-menu action models;
    dead derivation paths (`createHeaderMenuData` + top menu dispatcher in this
    hook) were removed to shrink per-render work on shell recomposition
  - `deriveEditorUIState` now caches layer tree flattening by `document.shapes`
    array identity, avoiding redundant layer item rebuilds under high-frequency
    runtime snapshot updates when document structure is unchanged
  - `EditorFrame` callback plumbing was normalized to `useCallback` and noisy
    render logging was removed
  - `EditorFrame` shell layout bootstrap now memoizes local storage
    deserialization (`initialLayoutState`) instead of recomputing it on every
    render
  - `useEditorRuntimeDerivedState` now stabilizes `selectedShapeIds` identity
    across equivalent snapshots, reducing downstream sidebar/shell prop churn
    when selection membership is unchanged
  - `useEditorFrameShell` options and dependency list were trimmed to remove
    now-unused mode/file-name pathways after earlier menu-path deletion
  - `EditorFrame` was split into a lightweight themed shell plus
    `EditorFrameRuntime` inner container so `useEditorRuntime` high-frequency
    pointer/pan/zoom updates no longer directly re-execute the outer frame
    component body
  - runtime event snapshots now support explicit reset via
    `resetRuntimeEventSnapshots`, and `useEditorRuntime` resets diagnostics /
    viewport / shell snapshots on active file change to keep initialization data
    deterministic
  - sustained paste upper bound was traced to initialization capacity headroom;
    runtime scene capacity baseline increased from `256` to `8192`, and
    duplicate/paste/image insert paths now generate collision-resistant unique
    shape ids against current document ids
  - right sidebar heavy inspector body is memoized as a dedicated subtree
    (`InspectorPanelBody`) so high-frequency zoom chip updates no longer force
    full panel content rerender on every viewport-scale change
  - gradient write-back chain advanced in adapters:
    file-format scene serialization now writes
    `fillGradient*` / `strokeGradient*` metadata keys from element styles, and
    document adapter keeps gradient payloads on `fill`/`stroke` conversion
  - zoom preset policy has a first app-local module at
    `apps/vector-editor-web/src/editor/interaction/runtime/zoomPresets.ts`
  - migration-safe passthrough wrappers are in place for
    `selectionHandles`, `snapping`, and `viewportGestures` while planning
    deeper local extraction without breaking runtime-engine boundaries
  - runtime hook file-size cleanup advanced again:
    `useEditorRuntimeExecuteAction.ts`,
    `useEditorRuntimeCoreCallbacks.ts`, and
    `useEditorRuntimePointerRelease.ts` now hold the extracted action,
    core callback, and pointer-release lifecycle logic, while
    `useEditorRuntimeCanvasInteractions.ts` is reduced below the hard
    `>500` split threshold and build/lint remain green after the refactor

- `playground`
  Use as the main render diagnostics bench for `Canvas2D`.
  Current direction: use the pure canvas viewport path (`commit + redraw`)
  plus viewport bitmap caching to probe how far `Canvas2D` can be pushed on
  `10k / 50k / 100k / Img+` scenes.

## Paused

- `mindmap-editor`
  App is intentionally cleared to a minimal placeholder shell and is not an
  active maintenance target right now.
  Reason: current priority is the vector editor and shared engine/runtime work.

- `runtime-react`
  Legacy runtime-react hook surface has been retired from `packages/runtime`.
  Reason: active apps now integrate through framework-agnostic runtime API
  objects + app-local React bridges.
  Safe status: no active app source path depends on `@venus/runtime/react`.

- `vector-editor-web`
  Deeper freehand drawing workflow work is paused.
  Reason: the drawing interaction may move to a different overlay/layer, so the
  current path tool should stay on the stable bezier-generation baseline until
  that direction is decided.

## Next Up

- `vector`
  Continue core editor capability work before returning to render-pipeline
  optimization.
  Element todo priority:
  `connector` -> `boolean`.
  Notes:
  - prefer professional vector-editor primitives over low-value novelty shapes
  - keep `arrow` as line/path style capability (already on baseline), avoid
    introducing a heavyweight separate arrow node unless required
  - `point` remains lower priority as a document element; editor control-point
    behavior matters more than a standalone point shape right now

- `vector-editor-web`
  Build on the new multi-select baseline:
  - align context menu/property panel actions with multi-select behavior
  - add explicit marquee UX affordances (cancel, additive hints, optional
    containment/intersection mode)
  - add targeted interaction regression checks for mixed rotate/scale/move
    batches

- `runtime`
  Continue pushing numeric LOD and viewport bitmap cache paths through app-local
  renderer adapters and framework-agnostic runtime APIs before larger renderer
  architecture changes.

## Avoid Repeating

- Do not assume runtime snapshots are immutable.
- When optimizing viewport interactions, verify both `playground` and
  `vector-editor-web` before treating the result as stable.
- For model/geometry questions, check `@venus/document-core` runtime scene
  contracts first and defer to its `node + feature` structure before inventing
  runtime-only terminology.
- SAB with Atomic
- offscreen render for canvas
