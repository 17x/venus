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
  - tool registry (`apps/vector-editor-web/src/tools/registry.ts`)
  - editing mode controller (`apps/vector-editor-web/src/state/editingMode.ts`)
  - template test metadata enrichment (13 presets with regression/benchmark flags)
  - runtime tool lifecycle registry (`packages/runtime/src/tools/registry.ts`) and
    runtime editing mode controller (`packages/runtime/src/editing-modes/controller.ts`)
  - useEditorRuntime lifecycle wiring (tool activation + pointer-driven mode transitions)
  - engine multi-hit API (`hitTestEngineSceneStateAll`) and scene-store `hitTestAll`
  - worker hit-test candidate path (`hitTestDocumentCandidates`) with top-hit compatibility
  - toolbar/path/zoomOut coverage and shortcut baseline update (P path, N pencil, Shift+Z zoomOut)
  - initial useEditorRuntime decomposition via `hooks/runtime/tooling.ts`
  - worker command dispatch moved to registry-style handlers in
    `packages/runtime/src/worker/scope/operations.ts` for explicit
    command routing (`selection.set`, `history.undo`, `history.redo`)
  - local/remote group command baseline:
    `shape.group` / `shape.ungroup` protocol + history patch support,
    including reversible parent/child graph updates
  - fixed known type issues in
    `packages/ui/src/components/ui/modal.tsx` and
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
    `hooks/runtime/groupActions.ts` and `hooks/runtime/pathSubSelection.ts`
  - useEditorRuntime action decomposition advanced with
    `hooks/runtime/shapeActions.ts` so convert/align/distribute command routing
    is moved out of the monolithic executor branch
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
