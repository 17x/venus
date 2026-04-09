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

- `vector-editor-web`
  Focus on product-facing editor functionality first.
  Current direction: prefer stable behavior over aggressive render-pipeline
  optimization.
  Tracking checklist:
  - `docs/ai-standards/core/matrix-migration-checklist.md` (phase/status
    tracker for matrix-internals migration)
  - `docs/ai-standards/core/matrix-compatibility-invariants.md`
    (cross-package transform compatibility invariants)
  - `docs/ai-standards/core/matrix-regression-scenarios.md`
    (shared matrix-sensitive regression runbook)
  - `docs/ai-standards/core/matrix-first-runtime-rfc.md`
    (Phase-5 matrix-first runtime contract draft)
  - `packages/file-format/base/src/transformAdapters.ts`
    (matrix-first <-> file-format transform compatibility adapter layer)
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
  - marquee core logic moved into shared canvas-base interaction module
  - runtime-playground now enables marquee selection via shared marquee module
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
  - `canvas-base` now exposes shared transform session/preview shape builders,
    shifting the migration from helper cleanup toward package-boundary
    contracts for transform-sensitive app/runtime integration

- `runtime-playground`
  Use as the main render diagnostics bench for `Canvas2D`.
  Current direction: keep the stable zoom baseline (`direct commit + redraw`)
  while using the new LOD scheduler to probe how far `Canvas2D` can be pushed
  on `10k / 50k / 100k / Img+` scenes.

## Paused

- `canvas-base`
  Zoom preview experiments are paused.
  Reason: both DOM-transform preview and bitmap-preview attempts introduced
  regressions such as flicker, offset drift, unstable pan behavior, or
  continuous-wheel flashing.
  Current stable baseline: keep `pan` preview, keep `zoom` on direct commit +
  redraw.

- `canvas-base`
  Broad runtime selector migration is paused.
  Reason: the runtime snapshot is mutable, so selector caching needs to be
  introduced carefully and incrementally.
  Safe status: selector helpers exist, but the core `useCanvasRuntime` and
  `useCanvasViewer` hooks remain on the stable subscription path.

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

- `canvas-base`
  Continue pushing the numeric LOD path before trying another zoom-preview
  experiment. The current scheduler + skip-small-shapes path is in place and
  should be tuned/measured first.

- `canvas-base`
  If `50k+` and `100k` scenes remain too heavy after LOD tuning, prefer
  evaluating layer caching / tile caching / GPU-backed rendering over another
  quick preview experiment.

- `canvas-base`
  Revisit selector-based subscriptions only in isolated app surfaces first,
  then expand after behavior is verified.

## Avoid Repeating

- Do not assume runtime snapshots are immutable.
- Do not land zoom preview changes directly on the default interaction path
  without a stable fallback.
- Do not reintroduce bitmap zoom preview as the default path without proving
  continuous-wheel behavior is stable.
- When optimizing viewport interactions, verify both `runtime-playground` and
  `vector-editor-web` before treating the result as stable.
- For model/geometry questions, check `packages/file-format` first and defer to
  its `node + feature` structure before inventing runtime-only terminology.
- SAB with Atomic
- offscreen render for canvas
