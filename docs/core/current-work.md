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
  Reference doc: `apps/vector-editor-web/docs/architecture.md`
  Performance track (100K scene readiness):
  - Phase 1 (spike stop): frame stats, pointermove hit throttling,
    hover gating during pan/drag, zoom-time rebuild freeze
    (cache/text/path), tiny-object LOD, text placeholder, bbox-first hit
  - Phase 2 (runtime structure): phase-based render policy,
    drag preview layer, dirty-region redraw, group collapse,
    path simplification buckets, zoom-bucket cache hysteresis
  - Phase 3 (scale hardening): tiled cache, image multi-resolution,
    incremental spatial-index update, worker precompute,
    pan framebuffer shift/edge redraw
    Status: complete as of 2026-04-24; follow-up work should use the mixed-scene
    regression gate and targeted diagnostics rather than reopening the same
    implementation queue by default.
    Active execution status (2026-04-23):
  - canvas adapter now publishes runtime render diagnostics baseline and
    render-prep dirty overlap uses previous frame candidates from engine diagnostics
  - pointermove hover resolution now uses a time+distance budget to avoid
    resolving top-hit on every high-frequency move tick
  - hover recompute is now gated for interaction modes:
    `dragging/resizing/rotating/panning/zooming/marqueeSelecting`
  - zoom interaction now uses an interactive-quality LOD freeze profile
    (reduced DPR/quality during zoom, full quality on settle)
  - render plan now skips sub-pixel tiny objects under low zoom or
    interactive quality to reduce draw-list pressure
  - WebGL now enforces low-zoom text placeholder mode and defers missing
    image texture uploads during interactive frames
  - non-precision hover hit resolution now uses `bbox_then_exact` with
    a capped exact candidate budget to reduce high-frequency geometry checks
  - tile cache zoom-level selection now uses threshold hysteresis to
    avoid zoom-boundary oscillation and cache bucket thrash
  - worker pointer selection now defaults to `bbox_then_exact` for
    selector tool while preserving `exact` hit mode for direct-selection flows
  - runtime debug diagnostics now surface hit-plan exact geometry check count
    (`Hit Exact Checks`) to verify bbox-first policy impact
  - engine render planning now applies a minimal tiny-group collapse policy
    on buffer-backed frames, pruning descendants of sub-pixel/low-screen groups
    under low zoom or interactive quality
  - runtime debug panel now surfaces `Hit Exact Ratio`
    (`hitPlanExactCheckCount / hitPlanCandidateCount`) for quick policy tuning
  - tiny-group collapse pruning now also applies to non-buffer render planning
    so fallback traversal path keeps parity with buffer-backed execution
  - runtime diagnostics now expose group-collapse counters
    (`Collapsed Groups`, `Collapse-Culled Nodes`) for collapse effectiveness checks
  - selected-node collapse protection is now wired via engine `setProtectedNodeIds`,
    and planner collapse selection skips protected groups plus ancestor groups
    to keep active selection/editing visuals stable at low zoom
  - Canvas2D renderer now has a first path-simplification bucket entry:
    low-zoom/interactive path rendering can degrade to simplified anchor
    polylines to reduce path construction pressure
  - collapse protection hints now include active editing signals
    (`pathSubSelection`, path-subselection hover, handle-drag shape id,
    and transform-preview shape ids), not just selected nodes, so live
    editing/transforming is less likely to be hidden by low-zoom group collapse
  - Canvas2D path simplification now uses adaptive projected-density sampling
    (screen-space spacing + projected-length point cap) instead of fixed
    anchor stride, reducing dense path cost more predictably across zoom levels
  - engine runtime now enables frame-plan shortlist pruning for large scenes
    (scene-size threshold + candidate-ratio gate), so renderer planning can
    skip offscreen/non-candidate work in normal execution
  - runtime shortlist candidate ids now merge `protectedNodeIds` before passing
    into render planning, keeping active/editing nodes from being incorrectly
    dropped by coarse viewport shortlisting
  - frame-plan shortlist activation now uses an enter/leave hysteresis ratio

  - transform preview is now runtime-owned and rendered as overlay preview
    instructions, so drag/resize/rotate no longer require per-frame preview
    scene mutation during active transform
  - dirty-region redraw now uses merged updated-node bounds with offscreen
    skip guards and debug diagnostics, reducing full-canvas redraw pressure on
    local transforms and scene patch bursts
  - low-zoom group collapse now ships with protected-node guarantees and
    runtime diagnostics evidence so active selection/editing remains visible
    while collapse pruning is tuned
  - path simplification buckets are now active in Canvas2D with adaptive
    projected-density sampling for lower zoom-out path construction cost
  - engine tile cache now includes zoom-bucket hysteresis, dirty tile
    tracking, cache-size caps, texture-byte accounting, and budget-driven
    texture eviction guardrails
  - image texture upload now has a multi-resolution baseline: settled frames
    can upload a zoom-appropriate downsampled raster, then promote to higher
    fidelity when zoom demand increases, with debug diagnostics for upload
    count and bytes saved
  - scene patch apply flow now maintains node map + spatial index
    incrementally via subtree remove/upsert helpers instead of rebuilding the
    coarse spatial index for every drag/move patch
  - worker-side render-hint precompute now covers text hash, line count,
    max line height, and path geometry counts in shared scene memory, and the
    engine consumes those hints in packet compilation, Canvas2D text fast
    paths, and path simplification/hit-test hot paths
  - WebGL interactive preview now completes pan-time framebuffer reuse with
    scissored edge redraw of newly exposed regions, and runtime diagnostics now
    expose `WebGL Frame Reuse Edge Redraws` for live verification of the path
  - mixed-scene perf gate now supports previous-report trend regression
    enforcement and machine-readable result output for CI/report workflows
    window in engine runtime, reducing shortlist on/off oscillation near
    threshold boundaries during minor viewport movement
  - mixed-scene regression gate is now a verified standing guardrail for the
    100K scene-readiness track: required scenes, threshold checks, trend
    regression, and machine-readable result output are all wired and should be
    treated as the default performance closeout path for future tuning slices
    Renderer correctness follow-up (2026-04-24):
  - settled full-quality WebGL frames now default to the model-complete
    composite path from engine runtime wiring; validated on the default scene
    with `Render Phase = static` and `WebGL Render Path = model-complete`
  - engine shape world bounds now use geometry-aware path/polygon/bezier
    bounds plus stroke expansion in both scene indexing and render planning,
    targeting the recent path bbox precision and stale-cull/dirty-region bugs
  - canvas adapter incremental dirty invalidation now unions previous and next
    bounds for changed nodes, targeting move-time tile ghosting and text/image
    residue at the old location after patch-driven transforms
  - engine dirty-region propagation now passes world bounds into renderer tile
    invalidation instead of pre-quantized grid cells from engine runtime,
    reducing tile-cache invalidation drift when zoom buckets or tile sizing are
    resolved inside the renderer
  - runtime-local engine scene adaptation now feeds exact bezier bounds for
    path geometry into engine snapshots, targeting the recent path bbox
    precision regressions before those bounds reach engine culling/indexing
  - runtime-local engine scene adaptation now normalizes path/polygon/star/
    line geometry from document world-space into engine-local point sets before
    engine transforms are applied, targeting the recent missing stroke / wrong
    placement regressions for transformed vector geometry
  - engine render options now expose shortlist policy tuning (`enabled`,
    `minSceneNodes`, `ratioThreshold`, `hysteresisRatio`) so behavior can be
    adjusted per host without changing engine source constants
  - shortlist diagnostics (`shortlistActive`, `shortlistCandidateRatio`) now
    flow through runtime events and are surfaced in `RuntimeDebugPanel` for
    threshold tuning and oscillation analysis
  - shortlist state transitions now require consecutive-frame confirmation
    (`stableFrameCount`) in engine runtime, so one-frame candidate-ratio
    spikes near boundaries do not immediately flip shortlist state
  - shortlist diagnostics now expose pending/apply internals (`pendingState`,
    `pendingFrameCount`, `appliedCandidateCount`) and enter/leave ratio
    thresholds through runtime events + Runtime Debug Panel, making it easier
    to explain why shortlist did or did not switch on a given frame
  - shortlist diagnostics now also expose transition counters (`toggleCount`,
    `debounceBlockedToggleCount`), and Runtime Debug Panel now surfaces
    shortlist effectiveness indicators (`Shortlist Coverage`, `Shortlist Gap`,
    `Shortlist Threshold Zone`) for faster ratio/debounce tuning
  - Runtime Debug Panel now also derives shortlist stability-rate metrics
    (`Shortlist Toggle / Min`, `Shortlist Debounce Blocked Rate`) and uses a
    color-coded threshold-zone signal (`enter`/`hysteresis`/`leave`) to speed
    up shortlist boundary diagnosis in long-running stress checks
  - Runtime Debug Panel now surfaces threshold-distance diagnostics
    (`Shortlist Distance To Enter`, `Shortlist Distance To Leave`), an explicit
    shortlist stability status (`stable`/`watch`/`unstable`), and a compact
    `Shortlist Summary` row for faster on-panel readouts during tuning
  - phase-based render policy baseline is now extracted into
    `resolveRuntimeRenderPolicy` (interactive/settled), so canvas adapter
    no longer inlines DPR+quality switching logic and future phase policy
    tuning can evolve through one service entry
  - phase-based render policy now supports explicit phase states
    (`pan`/`zoom`/`drag`/`static`/`settled`), with viewport interaction type
    feeding renderer policy resolution so phase behavior is no longer tied to
    generic local interaction timers alone
  - runtime diagnostics now include `renderPhase`, and Runtime Debug Panel
    surfaces it to verify phase-policy transitions during stress playback
  - phase resolution now prefers runtime editing-mode signals (drag/resize/
    rotate/pan/zoom modes) before viewport-velocity fallback, improving
    render-phase correctness during active manipulation flows
  - runtime diagnostics now expose `overlayMode` (`full`/`degraded`) so
    overlay degradation policy can be inspected alongside render phase
  - overlay degradation now actively gates hover-highlight and snap-guide
    instruction generation in app derived-state for motion-heavy editing
    modes, reducing overlay-side per-frame work while keeping path-edit
    overlays available
  - degraded overlay mode now keeps coarse snap guidance (one guide per axis)
    instead of suppressing guides entirely, and any active path-edit signal
    now forces full path-edit chrome visibility as an explicit whitelist
  - degraded snap-guide selection now ranks guides per axis by relevance to
    current selected/moving bounds (edge/center anchor distance), so reduced
    overlay guidance is more likely to match active manipulation intent
  - overlay policy telemetry now publishes degraded flag, guide input/kept
    counts, and path-edit whitelist activity through runtime render
    diagnostics, and Runtime Debug Panel now visualizes retention % plus
    whitelist state for quick overlay-policy verification
  - overlay diagnostics now also expose guide selection strategy
    (`full`/`axis-first`/`axis-relevance`) and dropped count/rate so
    degraded-guide behavior can be interpreted without code inspection
  - phase policy now includes a dedicated `precision` posture for
    `pathEditing` and `textEditing`, keeping full-fidelity quality/DPR and
    full overlay mode instead of routing these flows through generic drag
    degradation
  - runtime diagnostics now publish policy output
    (`renderPolicyQuality`, `renderPolicyDpr`) and viewport interaction
    classification (`pan`/`zoom`/`other`), and Runtime Debug Panel now adds
    these rows plus per-reason render-request rate metrics for scene-dirty,
    deferred-image, idle-redraw, and interactive request sources
  - transform preview rendering now uses an overlay-only path during
    `dragging`/`resizing`/`rotating` so active transform gestures do not force
    per-frame preview-scene mutation in app runtime state, reducing
    transform-time `scene-dirty` churn while preserving visual preview output
  - canvas runtime adapter now skips immediate `scene-dirty` redraw when
    incremental dirty ids are fully outside the previous frame candidate set,
    while still applying scene patch updates to engine state for correctness
  - dirty-region invalidation now always coalesces incremental upsert nodes to
    one merged bounds mark (`markDirtyBounds`) instead of gating by node-count
    threshold, improving local invalidation signal consistency for tile cache
  - offscreen-only `scene-dirty` redraw short-circuit now includes a
    consecutive-skip guardrail that forces periodic redraw after repeated
    skips, preventing long-running starvation while preserving skip benefits
  - runtime diagnostics now include offscreen-skip scheduling counters and
    dirty-mark metrics (`dirtyBoundsMarkCount`, `dirtyBoundsMarkArea`), and
    Runtime Debug Panel now surfaces skip/forced rates for redraw-policy tuning
  - runtime diagnostics now also publish the offscreen force-render threshold
    and dirty-mark area buckets (small/medium/large), so starvation-guard
    tuning and invalidation footprint distribution are visible without code reads
  - Runtime Debug Panel now includes short-window (90-frame) per-second trend
    readouts for offscreen skips, forced scene-dirty renders, and dirty-bounds
    marks, enabling faster live policy regression checks during stress playback
  - dirty-region diagnostics thresholds are now centralized under runtime
    render policy defaults and published into runtime diagnostics snapshots,
    so panel telemetry can show both current behavior and active thresholds
  - Runtime Debug Panel now adds trend-direction readouts (`up`/`down`/`flat`)
    and a coarse `Scene Dirty Risk Status` signal to speed up starvation-risk
    triage without log inspection
  - dirty-region risk defaults are now centralized in runtime policy and flow
    through runtime diagnostics (watch/high skip thresholds + high forced-rate
    threshold), so risk classification rules are no longer panel-local literals
  - runtime diagnostics now preserve max observed offscreen consecutive-skip
    streaks and panel now shows remaining frames before forced redraw, adding
    both long-horizon and immediate-pressure starvation indicators
  - first-pass 100K overview recovery tuning now raises interactive tiny-object
    culling thresholds at very low zoom in `packages/engine/src/renderer/plan.ts`
    so `2%` pan/zoom overview passes can drop more sub-perceptual nodes before
    packet replay
  - runtime diagnostics now track peak instantaneous/smoothed FPS and session
    hit flags for `60 FPS+` and `120 FPS+`, and Runtime Debug Panel surfaces
    those rows for live engine validation during stress sessions
  - WebGL packet rendering now skips imperceptibly small low-scale text
    placeholders and tiny overview image packets, including the interactive
    edge-redraw path used by preview frame reuse, to reduce `2%` overview
    packet volume in `Stress Mixed 100K`
  - packet-primary WebGL frames now capture a reusable composite snapshot, and
    vector-editor runtime policy now keeps `pan` on interactive preview mode
    with `interactionPreview` enabled; live `Stress Mixed 100K` validation at
    `2%` now shows `Frame Reuse Hit = 1` / `L0 Preview Hits = 1` on reuse-hit
    pan frames with draw time dropping to `0.06 ms`
  - pan-phase render policy now keeps DPR at `auto`, removing the hand-tool
    entry `l0-pixel-ratio-mismatch` that previously invalidated preview reuse
    before any actual viewport motion; hand-pan entry frames now hit preview
    reuse with draw time around `0.12 ms`
  - zoom-phase render policy now also keeps DPR at `auto`, eliminating the
    zoom-entry `l0-pixel-ratio-mismatch` fallback that previously broke
    low-scale preview reuse before threshold checks even ran
  - interaction preview reuse now flips only framebuffer-captured preview
    textures on the Y axis during reuse sampling, fixing the vertical mirror
    artifact seen during pan/zoom preview while preserving normal packet/image
    texture orientation; hand-pan and zoom-triggered preview frames still hit
    reuse with draw times around `0.09-0.14 ms`
  - low-scale interaction preview reuse now widens translate and scale-step
    tolerance only for overview frames, with viewport-size-aware translate
    windows applied in both WebGL and Canvas2D reuse paths; focused `2%`
    `Stress Mixed 100K` sampling now reaches `10/11` reuse-hit samples,
    `78.1` instant FPS peak, and `0.11 ms` minimum draw time, leaving only an
    initial zoom-entry `l0-scale-step-exceeded` miss in the sampled sequence
  - overview-only interaction preview `maxScaleStep` is now widened again to
    `1.75` across WebGL and Canvas2D reuse paths; repeated cold-start `2%`
    zoom-entry probes now consistently report `Cache Fallback Reason = none`
    with `Frame Reuse Hit = 1`, closing the first zoom-entry preview miss
  - low-scale interaction preview reuse now advances its cached snapshot after
    reuse-hit frames in both WebGL and Canvas2D, preventing repeated overview
    pans from accumulating translate deltas against an older settled frame;
    follow-up `2%` long-sequence sampling no longer reports
    `l0-translate-exceeded`, leaving only initial `l0-scale-step-exceeded`
    while template-apply initialization is still in flight; when the same
    sequence starts after that initialization zoom settles, the run reaches
    `11/11` reuse-hit samples with `Cache Fallback Reason = none` throughout
  - runtime diagnostics now expose actual engine frame quality alongside
    requested render-policy quality so preview-path validation can distinguish
    scheduler/policy state from renderer-applied state during 100K tuning
  - Runtime Debug Panel now derives trend pressure (`rising`/`mixed`/`easing`),
    computes a bounded risk score (0-100), and color-codes scene-dirty risk
    status for faster stress-session diagnosis
  - runtime diagnostics now also publish trend/spike/risk-score policy
    thresholds, enabling panel-side interpretation to stay aligned with
    adapter/runtime policy defaults instead of local hardcoded constants
  - Runtime Debug Panel now publishes spike signal classification
    (`none`/`skip`/`forced`/`forced+skip`), risk-score banding, and
    risk-status transition telemetry (transition count + time in state)
  - offscreen-skip diagnostics now include max observed consecutive streak,
    and panel trend history now scales with active trend-window size while
    using safe threshold fallbacks for early snapshot initialization
  - runtime policy now centralizes risk-score composition defaults
    (skip/forced/streak weights + forced-rate scale) and publishes them through
    runtime diagnostics to keep panel-side score computation policy-aligned
  - Runtime Debug Panel now decomposes scene-dirty risk score into explicit
    contribution rows and surfaces transition reasons plus transitions/min,
    making status flips diagnosable without stepping through code
  - Runtime Debug Panel now supports one-click diagnostics snapshot export to
    clipboard with short-lived export feedback state for faster triage sharing
  - risk-score composition parameters are now centralized in runtime policy and
    propagated through diagnostics snapshots, keeping panel score math aligned
    with runtime defaults and reducing hidden constants
  - Runtime Debug Panel now reports risk-score contribution percentages and a
    transition-rate status (`stable`/`watch`/`churning`) so score drivers and
    state-flip churn can be interpreted at a glance
  - Runtime Debug Panel now exposes prolonged high-risk detection and exports a
    timestamped derived-metrics payload alongside raw diagnostics for faster
    handoff/debug loops
  - vector app now includes an executable mixed-scene perf gate script
    (`scripts/perf-gate.mjs`) with baseline config/template artifacts for
    `10k`/`50k`/`100k`/`mixed(text/image/path)` threshold validation
  - engineering testing docs now include a targeted transform/hit-test overlap
    regression checklist plus the mixed-scene gate invocation path so
    performance and interaction regressions can be reproduced consistently
  - mixed-scene gate now supports trend regression checks against previous
    reports and emits optional machine-readable result payloads for CI/report
    automation (`checks`, `trendChecks`, `failures`, `trendFailures`)
  - workspace and vector package scripts now expose direct perf-gate entry
    points (`perf:gate`, `perf:gate:template`) to reduce command friction in
    iterative performance validation loops
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
  - `editorRuntimeHelpers.ts` decomposition advanced through selected-prop projection, element clone/offset helpers, and history entry projection so remaining runtime helper work can focus on pen/path geometry constructors instead of repeated snapshot/copy logic
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
  - velocity-aware LOD baseline landed across engine + vector canvas adapter:
    `resolveEngineCanvasLodProfile` now incorporates interaction velocity and
    emits render tuning hints (`targetDpr`, smoothing hint, cadence hint),
    while vector `canvasAdapter` derives viewport motion velocity and applies
    interaction-time dynamic DPR degradation with settle restore to `auto`
  - WebGL renderer now has an interaction-first fallback path:
    when runtime sets `quality=interactive`, the renderer bypasses
    model-complete Canvas2D composite and skips rich text texture generation,
    using packet-path solid text-bounds fallback to keep pan/zoom responsive
  - engine render-planning convergence continued on the WebGL-primary path:
    frame-plan candidates now prune render planning, hit planning now reuses
    coarse point candidates, instance-view and packet-plan prep are cached by
    plan identity, and WebGL packet plans now carry immutable draw metadata
    plus aggregate counters so commit loops avoid repeated prepared-node reads
    and packet rescans
  - WebGL text texture uploads now invalidate by frame signature
    (`scene.revision + pixelRatio + viewport.scale`) to avoid stale text
    rasters, and text crop uploads now reuse a scratch offscreen surface
    instead of allocating one temporary canvas per uncached text packet
  - engine-facing docs and package notes now explicitly treat WebGL as the
    only primary renderer backend, with Canvas2D retained only for
    auxiliary/offscreen/composite duties
  - WebGL settled-frame path now includes an L2 tile cache execution branch:
    runtime dirty-region tile ids invalidate cached tiles, visible tiles are
    rebuilt/reused from model-surface captures, and layered cache diagnostics
    (`L0/L1/L2` hits/misses + fallback reason) are emitted to runtime debug
    events and surfaced in `RuntimeDebugPanel`
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
  - left sidebar assets tab was rebuilt as a grid card list with per-item apply
    button placeholder shown on hover/focus; clicking apply now directly
    generates the mapped fake data preset file via
    `createFile(generateTemplateFile(...))`
  - template preset catalog expanded with additional large-scale tiers requested
    by product validation: mixed 200K/300K, image-heavy 50K, and text-dense 10K;
    assets grid cards now expose direct apply entries for mixed 10K/100K,
    images 10K/50K, text 10K, and extreme mixed tiers
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
  - runtime interaction follow-up now has a first-pass implementation slice:
    command protocol includes `group.enter-isolation`,
    `group.exit-isolation`, `mask.create`, `mask.release`,
    `mask.select-host`, `mask.select-source`, and
    `selection.cycle-hit-target`; group isolation is currently kept as
    runtime-local state with derived-state filtering rather than persisted into
    worker/document state; runtime-local cursor and selection-chrome
    contracts now feed rotation-aware cursor output and node-type/mode chrome
    behavior through the vector canvas host, and selection-bounds suppression
    now reaches the actual overlay renderer; stage UI now exposes isolation
    breadcrumb context plus an explicit exit action, overlay rendering now keeps
    dimmed non-isolated context outlines during isolation, and first-pass
    persisted `maskGroupId` / `maskRole` metadata now tracks `shape.set-clip`
    through worker history and save/load adapters while engine still only
    consumes clip semantics; selection drag, transform preview, and selection
    bounds now also consume that metadata so host/source pairs behave more like
    one product-level unit during everyday interaction; worker delete and layer
    reorder paths now also expand through linked mask members so the pair stays
    coupled during destructive and stack-order actions; worker group creation
    now expands through linked mask members before reparenting as well, so the
    pair is not split across group containers; UI group affordances now expand
    through the same linked mask members too, so command availability and
    execution stay aligned; convert-to-path and boolean now also hard-block on
    linked mask members in both UI and worker flows, avoiding silent
    host/source breakage while replacement semantics remain undefined;
    align and distribute now also expand through linked mask members so layout
    commands preserve host/source coupling instead of splitting them spatially;
    copy/cut/duplicate now also export linked mask members together so everyday
    clipboard flows stop producing half-masked duplicates; pasted and duplicated
    copies now also rebuild clip and mask-group references onto their newly
    allocated ids instead of retaining links back to the original pair; generic
    selection.set now also expands through linked mask members, with explicit
    host/source selection commands opting into exact-id behavior for targeted
    mask inspection; selection move target resolution now expands through the
    same linked members as well, closing the remaining keyboard nudge gap;
    remaining follow-up stays narrow around deeper mask-group behaviors rather
    than basic persistence, visibility, motion coupling, or simple command
    dispatch

- `playground`
  Historical pure-canvas diagnostics bench.
  Current renderer direction is WebGL-primary; keep this surface only for
  auxiliary comparison and legacy stress checks rather than as the target
  engine render path.

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

- `vector boolean + contour`
  Recent boolean/contour changes were checked against the runtime -> engine
  ownership boundary.
  Verified status: boolean command composition and history/collaboration patch
  flow remain in vector runtime-local worker code, while contour render/hit
  behavior remains engine-owned.
  Residual risk: regressions are currently more likely to be behavioral
  parity issues across history/replay/hit-test than architecture drift.

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
  Latest slice: hover-hit budget and path-subselection equality logic were
  extracted out of `useEditorRuntimeCanvasInteractions` into shared runtime
  hook helpers to reduce adjacent monolith size without changing input routing
  ownership.
  Follow-up slice: pointer-down path-subselection interpretation and marquee
  mode resolution now also live in shared helpers, leaving the hook focused
  more tightly on state transitions and command dispatch.
  Current slice: selector pointer-down hit-option resolution also moved into
  shared helpers, and the hook no longer performs a redundant hovered-shape
  map lookup just to recover the same id.
  Latest slice: selector pointer-down clear-selection and group-drag
  preservation decisions are now helper-owned as well, continuing the shift of
  branch-local policy out of the interaction hook.
  Current follow-up: resize/rotate transform-start payload assembly is now
  helper-owned too, which shortens the hook's transform-handle branch and keeps
  it closer to transition/dispatch orchestration.
  Latest follow-up: marquee-start pointer-down state assembly is now helper-
  owned as well, continuing the same reduction of inline branch setup logic.
  Current follow-up: draft-shape and insert-shape pointer-down state assembly
  also moved into shared helpers, reducing inline setup outside the
  selector/direct-selector path.
  Latest follow-up: pen pointer-down transition metadata now also lives in a
  shared helper, leaving the remaining branch body closer to pure orchestration.
  Closure: the only pointer-down logic left local is default fallback
  orchestration into existing canvas interactions; the rest of the branch-local
  setup/policy surface has been extracted behind shared helpers.
  New pass: `onPointerMove` decomposition has started as well, with direct-
  select hover state resolution and shared hover hit-test options now extracted
  into helpers.
  Latest `onPointerMove` slice: selection drag-start payload assembly and
  hover-gating decisions now also live in shared helpers, further narrowing the
  interaction hook to preview updates and dispatch/orchestration.
  Current `onPointerMove` follow-up: selection drag preview/snapping resolution
  is now helper-owned too, leaving the drag branch closer to transform-manager
  calls plus state dispatch.
  Latest `onPointerMove` follow-up: path-handle hover state construction and
  draft-primitive move updates now also live in shared helpers, reducing the
  remaining inline setup around direct-select editing and draft drawing.
  Closure: the remaining `onPointerMove` logic is local orchestration around
  drag controller, transform manager, draft updates, and pen-tool handoff;
  branch-local hover/path-hover policy has been extracted behind helpers.
  New adjacent slice: `useEditorRuntimeCoreCallbacks` now delegates
  path-handle commit bezier-point shaping to shared helpers instead of keeping
  that path-data rewrite inline inside the callback.
  Latest adjacent slice: selected-shape reorder target-index resolution also
  moved out of `useEditorRuntimeCoreCallbacks`, leaving that callback closer to
  shape lookup and command dispatch.
  Closure: the current `useEditorRuntimeCoreCallbacks` pass is now verified;
  path-handle commit and reorder flows keep local runtime lookup/dispatch only,
  while the adjacent data-shaping logic is helper-owned.
  New adjacent pass: `useEditorRuntime.ts` now delegates snapping/history
  command side-effect classification to shared helpers, reducing inline
  branching in the app-level command dispatcher.
  Latest adjacent pass: history undo/redo sequence planning also moved out of
  `useEditorRuntimeCoreCallbacks`, leaving that callback closer to target
  history selection plus command dispatch.
  Closure: the current command-routing decomposition pass is verified; the app
  layer still performs local transient-state resets and dispatch, while command
  classification/planning logic now lives in shared helpers.
  New execute-action pass: selected non-frame element snapshot resolution for
  copy/cut/duplicate now lives in shared helpers instead of being repeated
  inline in `useEditorRuntimeExecuteAction`.
  Latest execute-action pass: `switch-tool` now reuses the verified
  `setCurrentTool` callback from `useEditorRuntimeCoreCallbacks` instead of
  duplicating tool lifecycle wiring in the action executor.
  Closure: the current execute-action decomposition pass is verified; the hook
  keeps action branching local while shared helpers/core callbacks own the
  repeated selection-shaping and tool-lifecycle logic.
  New execute-action alias pass: direct-command mappings for undo/redo/delete/
  select-all now live in shared helpers instead of remaining inline in the
  action executor.
  Latest execute-action alias pass: layer reorder aliases now also resolve
  through shared helpers, further reducing repeated branch-local direction
  mapping in `useEditorRuntimeExecuteAction`.
  Closure: the current execute-action alias decomposition pass is verified;
  the hook keeps action-specific orchestration local while shared helpers own
  simple command and reorder alias resolution.
  New execute-action payload pass: element nudge delta resolution and selected
  move batch planning now live in shared helpers instead of staying inline in
  the executor.
  Latest execute-action payload pass: pasted-element payload shaping and unique
  inserted-shape id allocation also moved behind shared helpers, reducing
  inline object construction for paste and drop-image insert flows.
  Closure: the current execute-action payload decomposition pass is verified;
  the hook keeps action branching local while shared helpers own the repeated
  move/paste payload-planning details.
  New execute-action follow-up: duplicate-element payload planning now also
  lives in shared helpers instead of remaining inline in the executor.
  Latest execute-action follow-up: `selection-modify` command resolution moved
  out of `useEditorRuntimeExecuteAction`, leaving selection-set payload shaping
  helper-owned as well.
  Closure: the current execute-action follow-up pass is verified; the hook
  keeps duplicate/selection-modify branching local while shared helpers own the
  adjacent payload and command-resolution details.
  New drop-image follow-up: viewport-relative dropped-image sizing and inserted
  image element payload planning now live in shared helpers instead of staying
  inline in `useEditorRuntimeExecuteAction`.
  Closure: the current drop-image decomposition pass is verified; the hook
  keeps asset registration and insert dispatch local while shared helpers own
  the viewport-relative image sizing and payload construction details.
  New viewport follow-up: `world-shift` / `world-zoom` action parsing now also
  lives in shared helpers instead of remaining inline in
  `useEditorRuntimeExecuteAction`.
  Closure: the current viewport-action decomposition pass is verified; the
  hook keeps viewport dispatch local while shared helpers own the pan/zoom
  action parsing details.
  New mask-action follow-up: auto-mask and clear-mask command/message
  resolution now live in shared helpers instead of staying inline in
  `useEditorRuntimeMaskActions`.
  Closure: the current mask-action decomposition pass is verified; the handler
  keeps notification and dispatch local while shared helpers own mask
  candidate validation and command/message resolution.
  New element-modify follow-up: element-modify command planning now lives in
  shared helpers instead of staying inline in
  `useEditorRuntimeElementModify`.
  Closure: the current element-modify decomposition pass is verified; the
  handler keeps command dispatch local while shared helpers own property
  resolution and style-patch construction.
  New group-action follow-up: grouping target resolution now lives in shared
  helpers instead of remaining inline in `runtime/groupActions`.
  Latest group-action follow-up: ungroup selected-group resolution also moved
  out of `runtime/groupActions`, leaving the module closer to command dispatch.
  Closure: the current group-action decomposition pass is verified; the module
  keeps dispatch/notify local while shared helpers own grouping target lookup.
  New shape-action follow-up: convert-to-path and align command resolution now
  live in shared helpers instead of staying inline in `runtime/shapeActions`.
  Latest shape-action follow-up: distribute and boolean command resolution also
  moved out of `runtime/shapeActions`, leaving dispatch/notify local.
  Closure: the current shape-action decomposition pass is verified; shared
  helpers now own action-mode resolution for these shape commands.
  New layer-derivation follow-up: layer hierarchy index construction now lives
  in local helpers instead of staying inline in `deriveEditorUIState`.
  Latest layer-derivation follow-up: child-id resolution and layer item
  projection also moved behind local helpers, leaving traversal orchestration
  local while projection/indexing details are isolated.
  Closure: the current layer-derivation decomposition pass is verified; the
  module keeps cached traversal orchestration local while helper functions own
  the hierarchy indexing and layer projection details.
  New editor-runtime-helper follow-up: centered rectangle/ellipse tool element
  construction now lives in local helpers instead of staying inline in
  `editorRuntimeHelpers`.
  Latest editor-runtime-helper follow-up: line-like tool construction plus
  drag box/line-like shape construction also moved behind local helpers,
  leaving tool/drag routing local while repeated object construction is
  isolated.
  Closure: the current editor-runtime-helper decomposition pass is verified;
  the module keeps tool/drag branch routing local while helper functions own
  the repeated centered-box and line-like element construction details.

## Avoid Repeating

- Do not assume runtime snapshots are immutable.
- When optimizing viewport interactions, verify both `playground` and
  `vector-editor-web` before treating the result as stable.
- For model/geometry questions, check the owning app model runtime-scene
  contracts first (vector: `@vector/model`) and defer to its `node + feature`
  structure before inventing runtime-only terminology.
- SAB with Atomic
- offscreen render for canvas
