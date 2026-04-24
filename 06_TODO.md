# TODO

## Execution Protocol (AI-led)

- Execution order: Phase 1 -> Phase 2 -> Phase 3
- Status flow: planned -> in-progress -> verified -> done
- Done minimum: code landed + docs synced + validation command results recorded
- Validation baseline: `pnpm typecheck`, `pnpm lint`, `pnpm build`
- Reporting format per task: change summary, risk/regression notes, next task handoff

## Task ID Convention

- Format: `VT-YYYYMMDD-XX` (example: `VT-20260424-01`)
- Rule: every active execution item must have one ID; progress updates and validation evidence must reference that ID
- Rule: when an item is completed, keep the same ID in Done/Verified records for traceability

## In Progress

- Vector capability completion: `connector` then `boolean`
  - Progress 2026-04-24:
    - Implemented: added product-level `connector` tool entry (shortcut `C`) mapped to existing `lineSegment` runtime command path
    - Implemented: connector insertion defaults now create arrow-ended line segments (`strokeEndArrowhead: triangle`) for click and drag creation
    - Implemented: added `shape.boolean` command surface (`union`/`subtract`/`intersect`) and wired placeholder dispatch through runtime action -> worker command path
    - Implemented: added boolean action entrypoints in header/context shape menus with i18n labels (`en`/`cn`/`jp`)
    - Implemented: landed undoable `shape.boolean` execution baseline in worker history/patch pipeline (selected shapes replaced with one path result)
    - Implemented: wired collaboration remote patch replay for `shape.boolean` so union/subtract/intersect commands stay protocol-complete
    - Implemented: upgraded boolean geometry from bounds approximation to polygon clipping execution (`polygon-clipping`) for union/subtract/intersect path composition
    - Implemented: unified multi-hit candidate interpretation baseline by de-duplicating resolved hit targets in worker candidate generation and runtime hit adapter
    - Implemented: boolean result representation now preserves multi-contour geometry (disconnected polygons + interior rings) by emitting multi-shape inserts and contour-encoded path rings, with engine render/hit-test contour interpretation support
    - Implemented: contour-encoded path hardening for editability parity (path sub-selection now evaluates segments within contour boundaries only, and overlay path stroke generation avoids cross-contour seam bridging)
    - Implemented: added targeted contour regression checklist (`docs/core/boolean-contour-regression-checklist.md`) and linked testing entrypoint in `docs/engineering/testing.md`
    - Implemented: added executable contour regression harness (`apps/vector-editor-web/scripts/boolean-contour-regression.ts`) and package command (`pnpm --filter @venus/vector-editor-web regression:boolean-contour`)
    - Implemented: VT-20260424-01 extended harness coverage for chained boolean sequence stability and contour-anchor subselection edge cases
    - Verified 2026-04-24: VT-20260424-01 passed via regression report (`boolean-chained-union-subtract-contour`, `contour-anchor-subselection-edge-cases`) in `apps/vector-editor-web/scripts/boolean-contour-regression.result.json`
    - Verified 2026-04-24: VT-20260424-02 completed checklist promotion with scenario-by-scenario evidence mapping in `docs/core/boolean-contour-regression-checklist.md`
    - Verified 2026-04-24: contour regression harness passed (undo/backward patch parity, remote replay patch parity, contour round-trip) with report `apps/vector-editor-web/scripts/boolean-contour-regression.result.json`
    - Verified 2026-04-24: `VT-20260424-04` runtime/engine boundary audit found no layer violations across boolean command composition, contour editability, engine hit-test, and engine render ownership; remaining regression focus stays on behavioral parity rather than architecture drift
    - Verified 2026-04-24: validation baseline passed (`pnpm typecheck`, `pnpm lint`, `pnpm build`)
- Runtime/engine boundary checks on new feature diffs
- Runtime monolith decomposition follow-up (`useEditorRuntime` adjacent paths)
  - Progress 2026-04-24:
    - Implemented: `VT-20260424-15` extracted hover-hit budget and path-subselection equality helpers from `useEditorRuntimeCanvasInteractions.ts` into `useEditorRuntime.helpers.ts`, reducing hook-local decision surface without changing pointer state-machine ownership
    - Implemented: `VT-20260424-15` extracted pointer-down path-subselection interpretation and marquee-mode resolution from `useEditorRuntimeCanvasInteractions.ts` into shared helpers, shrinking selector/direct-selector branch-local policy code without changing transform or selection state-machine flow
    - Implemented: `VT-20260424-15` extracted selector pointer-down hit-option resolution and removed an unnecessary hovered-shape map lookup, further narrowing `useEditorRuntimeCanvasInteractions.ts` to transition/dispatch behavior
    - Implemented: `VT-20260424-15` extracted selector pointer-down clear-selection and group-drag-preservation decisions into shared helpers, leaving the hook with less embedded selection policy logic
    - Implemented: `VT-20260424-15` extracted transform-handle start payload assembly for resize/rotate pointer-down into shared helpers, reducing inline transform session wiring inside `useEditorRuntimeCanvasInteractions.ts`
    - Implemented: `VT-20260424-15` extracted marquee-start pointer-down state assembly into shared helpers, reducing inline marquee setup inside `useEditorRuntimeCanvasInteractions.ts`
    - Implemented: `VT-20260424-15` extracted draft-shape and insert-shape pointer-down state assembly into shared helpers, shrinking non-selector pointer-down setup in `useEditorRuntimeCanvasInteractions.ts`
    - Implemented: `VT-20260424-15` extracted pen pointer-down transition metadata into shared helpers, further reducing inline branch setup in `useEditorRuntimeCanvasInteractions.ts`
    - Verified 2026-04-24: `VT-20260424-15` decomposition pass leaves only pointer/down fallback orchestration local in `useEditorRuntimeCanvasInteractions.ts`; branch-local policy/setup now lives in shared helpers and validation baseline passed (`pnpm typecheck`, `pnpm lint`, `pnpm build`)
    - Implemented: `VT-20260424-16` extracted direct-select hover state resolution and shared hover hit-test options from `useEditorRuntimeCanvasInteractions.ts` into `useEditorRuntime.helpers.ts`, starting the adjacent `onPointerMove` decomposition pass
    - Implemented: `VT-20260424-16` extracted selection drag-start payload assembly and hover-gating decisions from `useEditorRuntimeCanvasInteractions.ts` into shared helpers, reducing inline `onPointerMove` branch policy around selection drag + hover suppression
    - Implemented: `VT-20260424-16` extracted selection drag preview/snapping resolution from `useEditorRuntimeCanvasInteractions.ts` into shared helpers, further narrowing the remaining `onPointerMove` selection-drag branch to transform-manager orchestration
    - Implemented: `VT-20260424-16` extracted path-handle hover state construction and draft-primitive move updates from `useEditorRuntimeCanvasInteractions.ts` into shared helpers, shrinking remaining inline `onPointerMove` setup outside drag-controller orchestration
    - Verified 2026-04-24: `VT-20260424-16` decomposition pass leaves `onPointerMove` with local transform/drag/pen orchestration only; hover/path-hover branch-local policy now lives in shared helpers and validation baseline passed (`pnpm typecheck`, `pnpm lint`, `pnpm build`)
    - Implemented: `VT-20260424-17` extracted path-handle commit bezier-point resolution from `useEditorRuntimeCoreCallbacks.ts` into shared helpers, starting the next adjacent runtime-structure slice beyond `useEditorRuntimeCanvasInteractions`
    - Implemented: `VT-20260424-17` extracted reorder-target index resolution from `useEditorRuntimeCoreCallbacks.ts` into shared helpers, leaving the callback closer to command dispatch and selected-shape lookup only
    - Verified 2026-04-24: `VT-20260424-17` decomposition pass leaves `useEditorRuntimeCoreCallbacks.ts` with command dispatch and runtime lookup orchestration only for path-handle commit and reorder flows; shared helpers now own the adjacent data-shaping logic and validation baseline passed (`pnpm typecheck`, `pnpm lint`, `pnpm build`)
- Figma coverage mapping for vector editor pages (prompt-to-code surface alignment)
  - Progress 2026-04-24:
    - Implemented: mapped non-TBD coverage table entries in `docs/product/figma-mapping.md`
    - Implemented: added dedicated transform workflow prompt (`docs/product/figma-prompts/selection-transform-workflows.md`)
    - Implemented: added context menu and shortcuts matrix prompt (`docs/product/figma-prompts/context-shortcuts-matrix.md`)
    - Implemented: drafted acceptance parity baseline tables from runtime code anchors in both dedicated prompt docs
    - Implemented: added manual acceptance runbook (`docs/product/figma-prompts/acceptance-session-checklist.md`) with row-level status rubric and evidence fields
    - Next: execute checklist against active Figma file and promote rows to `verified`/`done` with frame evidence
- 100K performance optimization Phase 1 (stop worst spikes, AI execution queue):
  - Progress 2026-04-23:
    - Implemented: diagnostics publishing baseline in canvas adapter
    - Implemented: pointermove hover-hit throttle (time + distance budget)
    - Implemented: hover gating for `dragging/resizing/rotating/panning/zooming/marqueeSelecting`
    - Implemented: zoom-time quality freeze via LOD (`zoom -> interactive` + lower DPR)
    - Implemented: tiny-object render skip in engine render plan (screen-space threshold)
    - Implemented: low-zoom text placeholder LOD in WebGL packet path
    - Implemented: interactive image upload freeze (defer texture uploads until settled)
    - Implemented: non-precision hover hit path defaults to `bbox_then_exact` with capped exact refinement budget
    - Implemented: tile cache zoom-bucket hysteresis wiring (reuse previous bucket near threshold)
    - Implemented: worker selection hit path defaults to `bbox_then_exact` for selector, preserving `exact` for direct selection
    - Implemented: hit-plan exact-check diagnostics surfaced to runtime debug panel (`Hit Exact Checks`)
    - Implemented: minimal tiny-group collapse policy in engine render planning (buffer-path subtree pruning under low zoom/interactive quality)
    - Implemented: hit exact/candidate ratio visualization in runtime debug panel (`Hit Exact Ratio`)
    - Implemented: tiny-group collapse policy extended to non-buffer render-plan path for traversal consistency
    - Implemented: group-collapse diagnostics surfaced (`Collapsed Groups`, `Collapse-Culled Nodes`)
    - Implemented: collapse protection hints for selected nodes/groups via engine `protectedNodeIds`, preventing selected/ancestor groups from low-zoom collapse
    - Implemented: Canvas2D path-simplification bucket entry (low-zoom/interactive path fallback to simplified anchor polyline)
    - Implemented: collapse protection coverage expanded from selection-only to active editing signals (`pathSubSelection` / `pathSubSelectionHover` / handle-drag shape / transform-preview shape ids)
    - Implemented: Canvas2D path simplification upgraded to adaptive projected-density sampling (screen-space step + projected-length cap), replacing fixed-stride fallback
    - Implemented: frame-plan shortlist pruning is now enabled in engine runtime for large scenes (scene-size threshold + ratio gate)
    - Implemented: runtime shortlist candidate ids now merge `protectedNodeIds`, preventing active/editing nodes from being accidentally pruned by coarse viewport shortlist
    - Implemented: frame-plan shortlist activation now uses hysteresis (enter/leave ratio window) to reduce threshold-edge toggling and planner churn during subtle viewport motion
    - Implemented: engine render options now expose shortlist tuning knobs (`enabled`, `minSceneNodes`, `ratioThreshold`, `hysteresisRatio`)
    - Implemented: shortlist diagnostics (`shortlistActive`, `shortlistCandidateRatio`) now flow from engine runtime diagnostics into vector runtime debug panel
    - Implemented: shortlist state switching now uses consecutive-frame debounce (`stableFrameCount`) on top of hysteresis, reducing single-frame boundary noise toggles
    - Implemented: shortlist diagnostics expanded with pending/apply internals (`appliedCandidateCount`, `pendingState`, `pendingFrameCount`) plus enter/leave threshold visibility
    - Implemented: expanded shortlist diagnostics now flow through runtime events and are surfaced in Runtime Debug Panel for real-time toggle-cause inspection
    - Implemented: shortlist diagnostics now track transition stability counters (`toggleCount`, `debounceBlockedToggleCount`) to quantify confirmed flips vs debounce-cancelled flips
    - Implemented: Runtime Debug Panel now shows shortlist effectiveness indicators (`Shortlist Coverage`, `Shortlist Gap`, `Shortlist Threshold Zone`) to correlate shortlist pruning with frame-plan candidate volume
    - Implemented: Runtime Debug Panel now adds derived shortlist stability metrics (`Shortlist Toggle / Min`, `Shortlist Debounce Blocked Rate`) for quick boundary-oscillation diagnosis without extending engine protocol
    - Implemented: shortlist threshold zone is now color-coded in Runtime Debug Panel (`enter`/`hysteresis`/`leave`) for faster scan during stress sessions
    - Implemented: Runtime Debug Panel now adds threshold-distance diagnostics (`Shortlist Distance To Enter`, `Shortlist Distance To Leave`) plus stability status (`stable`/`watch`/`unstable`)
    - Implemented: Runtime Debug Panel now includes a compact `Shortlist Summary` row to reduce scan time during long-running perf verification
    - Implemented: phase-based render policy baseline extracted into runtime service (`resolveRuntimeRenderPolicy`), centralizing interactive/settled DPR+quality decisions for canvas adapter
    - Implemented: phase-based render policy expanded to explicit phases (`pan`/`zoom`/`drag`/`static`/`settled`) and wired from viewport interaction classification into canvas renderer
    - Implemented: runtime diagnostics now publish current `renderPhase`, and Runtime Debug Panel now shows phase state to correlate interaction policy with frame behavior
    - Implemented: `renderPhase` now prefers real runtime editing-mode signals (`dragging`/`resizing`/`rotating`/`panning`/`zooming`) before velocity fallback, reducing false `drag` classification in camera interactions
    - Implemented: runtime diagnostics now publish `overlayMode` (`full`/`degraded`) from phase policy output, with Runtime Debug Panel visibility for overlay degradation tracking
    - Implemented: overlay degradation now has effect at app layer: `useEditorRuntimeDerivedState` gates hover highlight and snap-guide overlay instructions during motion-heavy editing modes (`panning`/`zooming`/`dragging`/`resizing`/`rotating`/`drawing*`)
    - Implemented: overlay guide degradation now keeps coarse guidance instead of full suppression (max one snap guide per axis in degraded mode), reducing visual churn while preserving alignment affordance
    - Implemented: path-edit activity (`pathSubSelection` / hover / handle-drag) now whitelists overlay chrome to remain full-fidelity even when global overlay degradation would otherwise apply
    - Implemented: degraded-mode snap guide selection is now relevance-prioritized per axis using current selected/moving bounds anchor distance (edge/center aware), replacing first-seen guide fallback
    - Implemented: overlay degradation telemetry now flows end-to-end (`overlayDegraded`, guide input/kept counts, path-edit whitelist flag) from derived-state into runtime render diagnostics
    - Implemented: Runtime Debug Panel now surfaces overlay degradation observability (`Overlay Degraded`, guide input/kept counts, retention %, path-edit whitelist active)
    - Implemented: overlay telemetry now includes degraded-guide selection strategy (`full`/`axis-first`/`axis-relevance`) and guide dropped count/rate to explain why guides are reduced in degraded mode
    - Implemented: phase policy now includes a precision-edit phase (`precision`) so `pathEditing` / `textEditing` avoid interaction degradation and keep full-fidelity overlay/render posture
    - Implemented: runtime diagnostics now include policy output telemetry (`renderPolicyQuality`, `renderPolicyDpr`) plus viewport motion classification (`viewportInteractionType`)
    - Implemented: Runtime Debug Panel now exposes render policy telemetry and per-reason render-request rates (scene-dirty/deferred-image/idle-redraw/interactive)
    - Implemented: active transform preview (`dragging`/`resizing`/`rotating`) now defers to overlay preview instructions instead of mutating runtime preview scene shapes every frame, reducing transform-time scene-dirty churn
    - Implemented: scene-dirty redraw now short-circuits for offscreen-only dirty updates (`dirtyCandidateCount === 0` with prior candidate set), while still applying scene patch state
    - Implemented: dirty-region invalidation now always uses merged updated-node bounds for a single `markDirtyBounds(...)` call, improving local tile invalidation consistency
    - Implemented: offscreen-only scene-dirty short-circuit now has starvation guard (`SCENE_DIRTY_SKIP_FORCE_RENDER_FRAMES`) to force periodic redraw after consecutive skips
    - Implemented: runtime diagnostics now expose offscreen-skip scheduling counters (`offscreenSceneDirtySkipConsecutiveCount`, skip/forced request counts) for redraw-policy tuning
    - Implemented: runtime diagnostics now expose dirty-mark metrics (`dirtyBoundsMarkCount`, `dirtyBoundsMarkArea`) to validate local invalidation behavior
    - Implemented: Runtime Debug Panel now surfaces offscreen skip/force rates and dirty-mark metrics for dirty-region redraw inspection
    - Implemented: runtime diagnostics now publish offscreen forced-render threshold (`offscreenSceneDirtyForceRenderFrameThreshold`) so configured starvation guard is visible in panel telemetry
    - Implemented: dirty-mark telemetry now includes cumulative area-bucket counters (small/medium/large) to classify invalidation footprint distribution
    - Implemented: Runtime Debug Panel now derives recent-window per-second trends (skip/forced/dirty-mark over last 90 frames) for short-horizon policy tuning
    - Implemented: dirty-region diagnostics thresholds are now centralized in runtime render policy (`DEFAULT_RUNTIME_DIRTY_REGION_DIAGNOSTICS_POLICY`) so starvation/bucket tuning no longer requires touching adapter-local literals
    - Implemented: runtime diagnostics now publish active dirty area thresholds (`dirtyBoundsSmallAreaThreshold`, `dirtyBoundsMediumAreaThreshold`) for panel-side parameter verification
    - Implemented: Runtime Debug Panel now adds trend direction rows (`up/down/flat`) for offscreen skip, forced scene-dirty, and dirty-mark rates
    - Implemented: Runtime Debug Panel now surfaces `Scene Dirty Risk Status` (`stable/watch/high/forcing`) based on skip ratio, forced rate, and consecutive-skip pressure
    - Implemented: centralized dirty-region risk policy defaults (`DEFAULT_RUNTIME_DIRTY_REGION_RISK_POLICY`) now define watch/high skip thresholds and high-risk forced-rate threshold in runtime policy module
    - Implemented: runtime diagnostics now publish risk-policy thresholds and max consecutive offscreen-skip streak (`offscreenSceneDirtySkipConsecutiveMaxCount`) for long-horizon starvation analysis
    - Implemented: Runtime Debug Panel now surfaces force-window remaining frames to quickly show distance-to-forced-redraw during skip streaks
    - Implemented: Runtime Debug Panel now derives `Scene Dirty Trend Pressure` (`rising`/`mixed`/`easing`) from skip/forced direction signals
    - Implemented: Runtime Debug Panel now publishes a bounded `Scene Dirty Risk Score` (0-100) combining skip ratio, forced-rate pressure, and streak pressure
    - Implemented: Runtime Debug Panel now color-codes `Scene Dirty Risk Status` row (`stable/watch/high/forcing`) for faster live triage
    - Implemented: runtime diagnostics now publish trend/spike/risk-score policy snapshots (`sceneDirtyTrendWindowFrames`, spike thresholds, risk-score high threshold) so panel logic can be policy-driven
    - Implemented: Runtime Debug Panel trend-window calculation now uses diagnostics-provided frame window instead of a hardcoded local constant
    - Implemented: runtime adapter now tracks and publishes max consecutive offscreen-skip streak (`offscreenSceneDirtySkipConsecutiveMaxCount`) for long-session starvation pressure visibility
    - Implemented: Runtime Debug Panel now derives `Scene Dirty Spike Signal` (`none`/`skip`/`forced`/`forced+skip`) from recent per-second skip/forced rates
    - Implemented: Runtime Debug Panel now derives `Scene Dirty Risk Score Band` (`low`/`medium`/`high`) and risk-status transition telemetry (transition count + seconds in current state)
    - Implemented: Runtime Debug Panel now uses safe fallback thresholds when diagnostics snapshot values are zero and scales trend-history buffer with the active trend-window size
    - Implemented: runtime render policy now defines risk-score composition defaults (`DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY`) so scoring math is centralized and tunable
    - Implemented: runtime diagnostics now publish risk-score composition parameters (skip/forced/streak weights + forced-rate scale) to keep panel scoring aligned with runtime policy
    - Implemented: Runtime Debug Panel now decomposes risk score into visible contribution rows (skip/forced/streak) for explainable tuning
    - Implemented: Runtime Debug Panel now tracks and surfaces risk-status transition reason labels (`streak-force-threshold`, `skip-and-forced-threshold`, `skip-watch-threshold`, `cooling`, `recovered`)
    - Implemented: Runtime Debug Panel now surfaces risk-status transition frequency (`Scene Dirty Risk Transitions / Min`) in addition to cumulative count
    - Implemented: Runtime Debug Panel now provides one-click diagnostics snapshot export (`Copy JSON`) via clipboard for quick perf triage sharing
    - Implemented: diagnostics export feedback state now auto-resets to idle after a short timeout to avoid stale copied/failed indicators
    - Implemented: runtime render policy now defines risk-score composition parameters (`skipWeight`, `forcedWeight`, `streakWeight`, `forcedRateScale`) in `DEFAULT_RUNTIME_DIRTY_REGION_RISK_SCORE_POLICY`
    - Implemented: runtime diagnostics now publish risk-score composition policy parameters so panel score calculation stays policy-aligned
    - Implemented: Runtime Debug Panel now surfaces risk-score contribution percentages for skip/forced/streak components in addition to absolute contribution values
    - Implemented: Runtime Debug Panel now classifies transition-rate status (`stable`/`watch`/`churning`) from transitions/min against policy threshold
    - Implemented: Runtime Debug Panel now surfaces a prolonged high-risk signal (`Scene Dirty High Risk Sustained`) based on risk status and in-state duration threshold
    - Implemented: diagnostics snapshot export now includes a derived-metrics section (risk status/score/trend/transition/contributions) with timestamp for richer triage sharing
    - Implemented: panel-side threshold handling now includes safe fallbacks for prolonged-high-risk and transition-rate thresholds to avoid startup zero-threshold artifacts
    - Implemented: mixed-scene perf gate now supports previous-report regression checks (`--previous-report`) with metric direction policy (`lower-better` / `higher-better`)
    - Implemented: mixed-scene perf gate config now includes trend-regression defaults (`defaultMaxRegressionPercent`, `metricDirections`) to enforce CI-friendly drift bounds
    - Implemented: mixed-scene perf gate now supports machine-readable output (`--output`) containing checks/trendChecks/failures for CI/report ingestion
    - Implemented: vector app scripts now include `perf:gate:template` for quick baseline smoke execution
    - Implemented: root workspace scripts now expose `perf:gate` to run gate from monorepo root without manual filter typing
    - Implemented: added executable mixed-scene regression gate script (`apps/vector-editor-web/scripts/perf-gate.mjs`) with baseline config and report template
    - Implemented: mixed-scene gate now enforces scene coverage (`10k`, `50k`, `100k`, `mixed(text/image/path)`) plus metric thresholds (frame p95, hit-test p95, cache hit-rate, visible candidates)
    - Implemented: vector app package scripts now expose `perf:gate` command for direct perf gate execution
    - Implemented: added targeted transform/hit-test overlap regression checklist (`docs/core/transform-hit-test-regression-checklist.md`) with required scenarios, expected outcomes, and diagnostics capture points
    - Implemented: engineering testing docs now include mixed-scene gate usage and checklist entrypoints for repeatable validation
    - Verified 2026-04-24: validation baseline passed (`pnpm typecheck`, `pnpm lint`, `pnpm build`)
  - Progress 2026-04-24 (Phase 2 kickoff):
    - Verified 2026-04-24: mixed-scene perf gate executed with trend check output (`16 checks`, `16 trend checks`, `PASS`) via `pnpm --filter @venus/vector-editor-web perf:gate --report ./scripts/perf-gate.report.template.json --previous-report ./scripts/perf-gate.report.template.json --output ./scripts/perf-gate.result.json`
    - Implemented: `VT-20260424-05` precision-edit routing fix so `pathEditing` / `textEditing` now resolve to `precision` phase instead of falling through `drag` degradation in `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx`
    - Implemented: `VT-20260424-05` transition diagnostics evidence now records phase/policy switch counts plus latest transition summaries and surfaces them in Runtime Debug Panel
    - Verified 2026-04-24: `VT-20260424-05` phase-based render policy service now owns explicit `static` / `pan` / `zoom` / `drag` / `precision` / `settled` routing, publishes policy transition telemetry, and passed validation baseline (`pnpm typecheck`, `pnpm lint`, `pnpm build`)
    - Verified 2026-04-24: `VT-20260424-06` drag preview layer is runtime-owned and rendered through preview instructions instead of per-frame preview-scene mutation (`src/runtime/preview/index.ts`, `src/editor/runtime-local/interaction/transformSessionManager.ts`)
    - Verified 2026-04-24: `VT-20260424-07` dirty-region redraw pipeline uses merged dirty bounds, offscreen skip guards, and diagnostics rows for local redraw evidence (`src/editor/runtime/canvasAdapter.tsx`, `src/components/shell/RuntimeDebugPanel.tsx`)
    - Verified 2026-04-24: `VT-20260424-08` group collapse policy ships with protected-node guarantees plus debug counters for regression checks (`packages/engine/src/runtime/createEngine.ts`, `src/components/shell/RuntimeDebugPanel.tsx`)
    - Verified 2026-04-24: `VT-20260424-09` path simplification buckets are active with adaptive projected-density sampling for low-zoom path cost reduction (`packages/engine/src/renderer/canvas2d.ts`)
    - Verified 2026-04-24: `VT-20260424-10` cache zoom bucket hysteresis is implemented in engine tile zoom selection and shortlist tuning (`packages/engine/src/renderer/tileManager.ts`, `packages/engine/src/runtime/createEngine.ts`)
    - Verified 2026-04-24: `VT-20260424-11` tiled bitmap cache prototype ships with tile cache size caps, dirty-tile tracking, texture-byte accounting, and WebGL resource budget guardrails (`packages/engine/src/renderer/tileManager.ts`, `packages/engine/src/renderer/webglResources.ts`, `packages/engine/src/renderer/webgl.ts`)
    - Verified 2026-04-24: `VT-20260424-12` multi-resolution image baseline now downscales uploads to zoom-appropriate raster size, re-uploads higher fidelity on demand, and surfaces saved-byte diagnostics in Runtime Debug Panel (`packages/engine/src/renderer/webgl.ts`, `src/components/shell/RuntimeDebugPanel.tsx`)
    - Verified 2026-04-24: `VT-20260424-13` incremental spatial-index update path is active in scene patch apply flow via subtree upsert/remove helpers instead of full rebuilds (`packages/engine/src/scene/patch.ts`, `packages/engine/src/scene/indexing.ts`, `packages/engine/src/spatial/index.ts`)
    - Verified 2026-04-24: `VT-20260424-14` mixed-scene perf gate CI/report integration supports `--previous-report`, machine-readable `--output`, and trend regression enforcement (`apps/vector-editor-web/scripts/perf-gate.mjs`)
  - `VT-20260423-P1-01` [verified]: Runtime diagnostics baseline (owner: engine + app)
    - Deliverable: frame/hit/cache counters wired from engine stats to debug panel
    - Acceptance: panel shows `totalMs`, `hitTestMs`, `cacheHit/Miss`, `rendered/skipped`
  - `VT-20260423-P1-02` [verified]: Pointer-move hit-test throttle (owner: runtime)
    - Deliverable: pointermove hit dispatch with frame-budget or interval throttling
    - Acceptance: hover movement no longer triggers exact hit on every raw event
  - `VT-20260423-P1-03` [verified]: Hover gating during pan/drag (owner: runtime + app)
    - Deliverable: interaction-phase switch disables normal hover path during pan/drag
    - Acceptance: pan/drag stage has no continuous hover recompute
  - `VT-20260423-P1-04` [verified]: Zoom-time rebuild freeze (owner: engine)
    - Deliverable: text/path/cache heavy rebuild deferred during zoom interaction
    - Acceptance: continuous zoom avoids repeated rebuild spikes; settle phase restores quality
  - `VT-20260423-P1-05` [verified]: Tiny-object degradation (owner: engine)
    - Deliverable: low screen-space nodes rendered as dot/bbox/skip
    - Acceptance: low zoom rendered node count drops with no major interaction regression
  - `VT-20260423-P1-06` [verified]: Text placeholder LOD (owner: engine)
    - Deliverable: low zoom text uses placeholder block instead of full shaping
    - Acceptance: text-heavy scene pan/zoom frame jitter reduced
  - `VT-20260423-P1-07` [verified]: Bbox-first hit policy (owner: engine + runtime)
    - Deliverable: `bbox_then_exact` default for non-precision interactions
    - Acceptance: exact-hit count decreases while top-hit correctness stays stable

## Next

- `VT-20260424-01` [verified]: extend boolean contour regression harness to chained boolean sequences and contour-anchor edit edge cases
- `VT-20260424-02` [verified]: execute contour checklist scenarios and promote rows from planned to verified with command/report evidence
- `VT-20260424-03` [verified]: normalize package-level README responsibilities (`apps/*`, `packages/*`)
- `VT-20260424-04` [verified]: runtime/engine boundary checks on recent boolean and contour-related diffs
- `VT-20260424-05` [verified]: phase-based render policy service hardening for `static/pan/zoom/drag/precision/settled` with policy-switch diagnostics evidence
- `VT-20260424-06` [verified]: drag preview layer rollout so active drag avoids per-frame full-scene invalidation
- `VT-20260424-07` [verified]: dirty-region redraw pipeline implementation using merged old/new/overlay bounds
- `VT-20260424-08` [verified]: group collapse policy stabilization with protected-node guarantees and regression checks
- `VT-20260424-09` [verified]: path simplification bucket tuning for low-zoom cost reduction without edit hit drift
- `VT-20260424-10` [verified]: cache zoom buckets + hysteresis calibration to reduce threshold-edge cache thrash
- `VT-20260424-11` [verified]: tiled bitmap cache prototype for large static regions with memory budget guardrails
- `VT-20260424-12` [verified]: multi-resolution image path baseline for zoom-dependent image decode/upload cost control
- `VT-20260424-13` [verified]: incremental spatial-index update path for drag/move to avoid full index rebuild pressure
- `VT-20260424-14` [verified]: mixed-scene perf gate CI/report integration with previous-report trend regression enforcement
- `VT-20260424-15` [verified]: decompose `useEditorRuntime` adjacent hover/path-subselection helper logic out of `useEditorRuntimeCanvasInteractions`
- `VT-20260424-16` [verified]: decompose `useEditorRuntime` adjacent `onPointerMove` hover/path-hover helper logic out of `useEditorRuntimeCanvasInteractions`
- `VT-20260424-17` [verified]: decompose `useEditorRuntimeCoreCallbacks` path-handle commit and reorder index data shaping out of inline callback logic
- 100K performance optimization Phase 2 (runtime structure, next execution queue):
  1. Phase-based render policy service (owner: runtime)
  - Deliverable: explicit policy for `static/pan/zoom/drag/settled`
  - Acceptance: render/hit/cache/overlay mode can switch by phase
  2. Drag preview layer (owner: engine + runtime)
  - Deliverable: selection drag rendered from interaction preview layer
  - Acceptance: drag does not force full-scene invalidation each frame
  3. Dirty-region redraw pipeline (owner: engine)
  - Deliverable: redraw limited to union of old/new/overlay bounds
  - Acceptance: local transforms no longer trigger full canvas redraw path
  4. Group collapse policy (owner: engine)
  - Deliverable: low zoom group/frame internals can collapse to proxy representation
  - Acceptance: traversal node count decreases on deep hierarchy scenes
  5. Path simplification buckets (owner: engine)
  - Deliverable: per-zoom simplified path representations
  - Acceptance: path build cost scales down when zoomed out
  6. Cache zoom buckets + hysteresis (owner: engine)
  - Deliverable: discrete bucketed cache selection with threshold hysteresis
  - Acceptance: zoom oscillation no longer causes cache thrash
- 100K performance optimization Phase 3 (scale hardening, queued):
  1. Tiled bitmap cache for large static regions (owner: engine)
  2. Multi-resolution image path (owner: engine)
  3. Incremental spatial-index update for drag/move (owner: engine)
  4. Worker precompute for path/text heavy prep (owner: engine + runtime)
  5. Pan frame reuse path (framebuffer shift + edge redraw) (owner: engine)
- Add 100K mixed-scene regression gate (owner: app + runtime):
  1. Baseline scenes: `10k`, `50k`, `100k`, `mixed(text/image/path)`
  2. Metrics gate: frame time, hit-test time, cache hit-rate, visible candidate count
  3. CI/report rule: record trend and flag regression above agreed threshold

## Blocked

- None

## Done

- Established root-level project governance documents
- Introduced domain-based docs structure and routing rules
- Normalized `docs/task/plan-2.md` to execution-plan scope with routing protocol
- Migrated vector app UI usage from `@venus/ui` to in-app `@vector/ui`
  (`apps/vector-editor-web/src/ui/kit/*`)
- Grouped vector app source by domain via `src/editor/*` and `src/shared/*`
  and rewired imports
