# Changelog

## 2026-04-25

- Moved vector product-doc folder into app-local docs:
  - moved `docs/product/vector/index.md`,
    `docs/product/vector/session-development-rules.md`, and
    `docs/product/vector/doc-separation-migration-plan.md` to
    `apps/vector-editor-web/docs/product/*`
  - updated `docs/index.md` product navigation to point to the app-local vector
    product doc home

- Consolidated runtime and product-adoption docs into vector app docs:
  - moved `docs/packages/runtime.md`,
    `docs/packages/runtime-interaction.md`,
    `docs/packages/runtime-presets.md`, and `docs/packages/runtime-react.md`
    into `apps/vector-editor-web/docs/runtime/*`
  - updated `docs/index.md` and `docs/packages/README.md` so global docs no
    longer carry those runtime package notes
  - removed the cross-reference from `apps/vector-editor-web/src/ui/README.md`
    so app-level doc routing stays in `apps/vector-editor-web/docs/*`

- Re-routed documentation ownership so local docs live with local code:
  - moved vector-specific architecture and app integration notes out of `docs/`
    and into `apps/vector-editor-web/docs/architecture.md`
  - removed the duplicate global engine package note so engine-specific
    capability docs now live in `packages/engine/README.md`
  - updated `docs/index.md`, `docs/packages/README`, and
    `docs/engineering/doc-versioning.md` so global docs stay navigation- and
    governance-focused

- Slimmed and re-routed documentation ownership:
  - `docs/engineering/doc-versioning.md` and `docs/ai/project-rules.md` now
    explicitly forbid local absolute filesystem paths in repository docs
  - `docs/packages/runtime.md`, `docs/packages/runtime-interaction.md`, and
    `docs/packages/runtime-presets.md` now focus on stable package ownership
    and reusable capability instead of carrying product/app-specific adoption
    detail
  - `docs/apps-vector.md` now acts as the vector-app landing place for
    product-specific adoption notes that do not belong in package docs
  - `docs/packages/engine.md` and `packages/engine/README.md` now use more
    generic product-facing wording and lighter routing notes instead of
    package docs carrying product-specific examples

- Promoted a repository-wide comment requirement for future code changes:
  - `docs/engineering/coding-standards.md`, `docs/ai/project-rules.md`,
    `AGENTS.md`, and `CLAUDE.md` now state that all newly written or modified
    code blocks must include comments, replacing the older narrower guidance
    that limited comments to only non-obvious logic

- Added the first active unit-test baseline for pure engine geometry/math:
  - root `pnpm test` now delegates to package-local test scripts when present
  - `@venus/engine` now exposes a package-local test command using Node's
    built-in TypeScript strip-types runner
  - `packages/engine/src/math/matrix.test.ts` and
    `packages/engine/src/interaction/viewport.test.ts` now cover deterministic
    matrix application and viewport scale/pan/zoom/fit behavior
  - `packages/engine/src/interaction/hitTest.test.ts` now covers frame/group
    selection rules, strict stroke-only rectangle hits, rounded clip behavior,
    and parent-rotation-aware world-transform hit testing

- Added project-governance guidance for AI and module quality gates:
  - `docs/ai/project-rules.md` now defines project-level expectations for
    public APIs, command/history ownership, geometry/math tests, naming,
    phased quality gates, and when to skip non-owning concerns
  - `docs/decisions/ADR-003-module-boundary-and-quality-gates.md` records the
    decision to apply boundary/test/governance requirements by owning
    capability rather than forcing every package to host every test surface
  - `AI_CHANGELOG.md` now exists as a dedicated log for AI-authored structural
    and workflow changes
  - `eslint.config.js` now blocks `@venus/*/src/*` and `@venus/*/dist/*`
    imports so new code cannot couple to internal package paths through public
    namespace aliases

- Clarified the engine capability model in documentation:
  - `packages/engine/README.md` now groups engine responsibility into scene,
    render, query/hit-test, viewport/scheduling, and interaction-helper
    mechanisms, and documents what still belongs in runtime/app layers for
    hosts like a mindmap or XMind-style editor
  - `docs/packages/engine.md` now states the stable boundary more directly:
    `@venus/engine` owns pure mechanism APIs, while product semantics,
    command/history, and overlay UI stay outside the package
  - both docs now explicitly clarify that DPR is a standalone engine render
    capability that LOD policy may coordinate, rather than treating DPR and
    LOD as the same concept

- Added an engine integration and interaction requirement handoff slice:
  - `packages/engine/README.md` now reflects the current engine reality more
    accurately: WebGL-primary backend direction, `createEngine(...)` as the
    integration entry, current `group` and `clip` support, the lack of a
    formal engine-owned static/interaction layer API, and the actual
    vector-editor scene-load / incremental-patch / overlay split used today
  - `docs/task/engine-integration-interaction-requirements.md` now captures a
    cross-layer breakdown of current findings and next-step requirements for
    selection, multi-select modifiers, group nesting/isolation, masking,
    overlay/composition, handles, cursor categories, edit modes, aspect-ratio
    locking, transform ownership, and layer-icon path sampling reuse
  - `docs/index.md` now links the new task document from the task-plan section
- Landed a first-pass vector runtime interaction slice against that handoff:
  - `apps/vector-editor-web/src/editor/runtime-local/worker/protocol.ts` now
    includes runtime-local commands for group isolation, mask create/release,
    mask host/source focus, and overlapping-hit selection cycling
  - `apps/vector-editor-web/src/editor/runtime-local/cursor/index.ts` and
    `apps/vector-editor-web/src/editor/runtime-local/chrome/index.ts` now
    define shared runtime contracts for rotation-aware cursor resolution and
    node-type/edit-mode-specific selection chrome behavior
  - `apps/vector-editor-web/src/editor/hooks/useEditorRuntime.ts` and
    `apps/vector-editor-web/src/editor/hooks/useEditorRuntimeDerivedState.ts`
    now keep group isolation as runtime-local state, filter preview and
    interaction scenes to the isolated subtree, and feed cursor/chrome state
    through the canvas runtime
  - `apps/vector-editor-web/src/editor/runtime-local/interaction/shapeHitTest.ts`
    now exposes ordered hit candidates so `selection.cycle-hit-target` can
    rotate through overlapping selectable shapes under the current pointer
  - `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx` and
    `apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx` now
    apply resolved runtime cursor output to the actual viewport host
  - `apps/vector-editor-web/src/editor/interaction/overlay/InteractionOverlay.tsx`
    now consumes `selectionChrome.hideBounds` from derived runtime state so
    selection bounds suppression is no longer limited to state derivation
  - `apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx` now
    renders a lightweight stage-level isolation affordance with the active
    group name and an explicit exit action so runtime-local group isolation is
    visible and escapable in the product UI
  - `packages/document-core/src/index.ts`,
    `apps/vector-editor-web/src/editor/runtime-local/worker/scope/maskGroupSemantics.ts`,
    and the vector file adapters now persist first-pass product-level
    `maskGroupId` / `maskRole` metadata through `shape.set-clip`, worker
    history, save/load adapters, and runtime selection helpers without pushing
    mask-group policy into engine
  - `apps/vector-editor-web/src/editor/interaction/maskGroup.ts` plus the
    selection-drag, transform-preview, and selection-bounds pipelines now use
    that metadata so mask host/source pairs move together, preview together,
    and resolve bounds through the shared mask source instead of relying only
    on image `clipPathId` lookups
  - worker local-history and remote patch generation now also treat linked
    `mask-group` members as one product unit for delete and reorder flows, so
    removing or layer-moving one member keeps the paired host/source from being
    orphaned or split in stack order
  - worker `shape.group` handling now expands linked `mask-group` members before
    assigning the new parent group, so grouping a masked image also brings its
    shared mask source along instead of splitting the pair across containers
  - UI-layer `resolveGroupableShapeIds(...)` now expands linked `mask-group`
    members before enabling group actions, keeping toolbar/menu affordances in
    sync with the worker's mask-aware group command behavior
  - `convert-to-path` and `boolean` now explicitly reject selections that touch
    linked `mask-group` members at both the UI action layer and worker patch
    generation layer, preventing replace-shape operations from silently
    breaking host/source relationships before a deeper replacement policy exists
  - `align` and `distribute` now expand through linked `mask-group` members in
    both UI action dispatch and worker patch generation, so layout commands move
    masked hosts and sources together instead of stretching them apart
  - copy, cut, and duplicate now expand through linked `mask-group` members when
    exporting selected element props, preventing clipboard and duplicate flows
    from capturing only half of a masked host/source pair
  - pasted and duplicated masked pairs now rebuild their internal `clipPathId`
    and `maskGroupId` references from freshly allocated ids, so copied hosts and
    sources stay linked to each other instead of accidentally retaining links to
    the original pair
  - generic `selection.set` now expands through linked `mask-group` members so
    click, marquee, selection-all, and other normal selection flows treat the
    pair as one unit, while explicit mask host/source jump commands keep an
    exact-id escape hatch for targeted inspection
  - selection move target resolution now expands through linked `mask-group`
    members too, so keyboard nudges and other selection-batch move commands do
    not leave masked hosts and sources behind
  - `apps/vector-editor-web/src/components/editorFrame/EditorFrame.tsx`,
    `apps/vector-editor-web/src/editor/hooks/useEditorRuntimeDerivedState.ts`,
    and `apps/vector-editor-web/src/editor/interaction/overlay/InteractionOverlay.tsx`
    now upgrade group isolation UI from a bare exit affordance to a breadcrumb
    trail plus dimmed non-isolated context outlines in the overlay layer

## 2026-04-24

- Fixed a renderer correctness slice for settled frames and incremental redraw:
  - `packages/engine/src/runtime/createEngine.ts` now defaults
    `modelCompleteComposite` on, and browser validation on the default scene
    now shows `Render Phase = static`, `Engine Frame Quality = full`, and
    `WebGL Render Path = model-complete` instead of routing settled full-
    quality frames through the packet path
  - `packages/engine/src/scene/worldBounds.ts` adds geometry-aware world-bounds
    helpers for shape/image/text nodes, including exact cubic bezier extrema
    bounds plus stroke expansion for shape dirty/cull coverage
  - `packages/engine/src/scene/indexing.ts` and
    `packages/engine/src/renderer/plan.ts` now reuse those geometry-aware
    world bounds so spatial indexing and render culling no longer fall back to
    coarse shape `x/y/width/height` rectangles for paths/polygons/stroked
    geometry
  - `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx` now merges
    both previous and next bounds when marking incremental dirty regions so
    moved nodes invalidate the tiles they vacated as well as the tiles they
    now occupy, reducing move-time ghosting/residue
  - `packages/engine/src/runtime/createEngine.ts`,
    `packages/engine/src/renderer/types.ts`, and
    `packages/engine/src/renderer/webgl.ts` now carry dirty-region world
    bounds through the render context and let the tile cache invalidate
    intersecting tiles via `invalidateTilesInBounds(...)`, removing the older
    create-engine-side grid approximation from incremental tile invalidation
  - `apps/vector-editor-web/src/editor/runtime-local/presets/engineSceneAdapter.ts`
    now uses exact bezier extrema bounds when adapting path geometry into the
    engine scene snapshot, replacing the previous control-point envelope
    approximation that could misstate path bounding boxes
  - `apps/vector-editor-web/src/editor/runtime-local/presets/engineSceneAdapter.ts`
    now converts world-space path/polygon/star/line geometry into shape-local
    coordinates before handing it to the engine, aligning those point sets
    with engine world-matrix application so transformed vector strokes do not
    get effectively double-transformed during rendering
- Fixed a toolbar hydration warning:
  - `apps/vector-editor-web/src/components/toolbelt/Toolbelt.tsx` now renders
    the text-tool tooltip trigger with `asChild`, avoiding a nested
    `TooltipTrigger <button>` wrapping the existing `Button` element during
    hydration
- Started the next 100K frame-rate recovery queue:
  - `packages/engine/src/renderer/plan.ts` now raises the interactive
    tiny-object culling threshold at very low overview scales so 100K `2%`
    pan/zoom passes can reject more sub-perceptual nodes before they enter the
    packet draw list (`VT-20260424-49` first pass)
  - `packages/engine/src/renderer/webgl.ts` now skips imperceptibly small
    low-scale text placeholders and tiny overview image packets in both the
    main packet loop and interactive edge-redraw path; live `Stress Mixed
100K` validation dropped initial `2%` overview packet load to `19031`
    draw calls with `6263` text fallbacks and `3916` deferred images
  - `apps/vector-editor-web/src/runtime/events/index.ts` now tracks peak
    instantaneous and smoothed FPS plus `60 FPS+` / `120 FPS+` hit flags, and
    `apps/vector-editor-web/src/components/shell/RuntimeDebugPanel.tsx` now
    surfaces those rows for live engine validation (`VT-20260424-50` first
    pass)
  - `packages/engine/src/renderer/webgl.ts` now captures reusable composite
    snapshots after packet renders, and now exposes explicit preview miss
    reasons plus actual engine frame quality in render stats so overview
    preview-reuse failures can be diagnosed without conflating policy and
    renderer state
  - `packages/engine/src/interaction/lodProfile.ts`,
    `apps/vector-editor-web/src/editor/runtime/renderPolicy.ts`, and
    `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx` now keep
    `pan` on interactive preview posture and enable runtime `interactionPreview`
    in `interaction` mode, allowing 100K overview pan frames to reuse the
    cached framebuffer instead of replaying the full packet path
  - `apps/vector-editor-web/src/editor/runtime/renderPolicy.ts` now keeps
    pan-phase DPR at `auto`, preventing hand-tool pan entry from invalidating
    the current preview snapshot with a `pixelRatio` mismatch before viewport
    movement begins
  - `apps/vector-editor-web/src/editor/runtime/renderPolicy.ts` now keeps
    zoom-phase DPR at `auto`, removing the zoom-entry `pixelRatio` mismatch
    that previously blocked low-scale preview reuse before any threshold-based
    reuse checks could pass
  - `packages/engine/src/renderer/webgl.ts` now flips framebuffer-captured
    preview textures vertically only for interaction-preview reuse sampling,
    fixing the pan/zoom-time vertical mirror artifact without changing normal
    packet/image/text texture orientation
  - `packages/engine/src/renderer/webgl.ts` and
    `packages/engine/src/renderer/canvas2d.ts` now widen low-scale interaction
    preview translate/scale-step tolerance only for overview frames, including
    viewport-size-aware translate windows so large-screen `2%` navigation no
    longer falls out of preview reuse on modest pan deltas
  - `packages/engine/src/renderer/webgl.ts` and
    `packages/engine/src/renderer/canvas2d.ts` now raise the overview-only
    interaction preview `maxScaleStep` ceiling to `1.75`, and repeated
    cold-start `2%` zoom-entry probes now hit preview reuse with
    `Cache Fallback Reason = none` instead of `l0-scale-step-exceeded`
  - `packages/engine/src/renderer/webgl.ts` and
    `packages/engine/src/renderer/canvas2d.ts` now advance low-scale preview
    snapshots after reuse-hit frames so repeated overview pans do not keep
    measuring translate distance against an older settled snapshot; follow-up
    `2%` long-sequence validation no longer reports `l0-translate-exceeded`
  - follow-up validation also showed the last sampled
    `l0-scale-step-exceeded` was coming from template-apply initialization
    zoom being sampled before it fully settled; when the same `2%`
    long-sequence probe starts after that initialization completes, it now
    runs at `11/11` reuse-hit samples with `Cache Fallback Reason = none`
  - `apps/vector-editor-web/src/runtime/events/index.ts` and
    `apps/vector-editor-web/src/components/shell/RuntimeDebugPanel.tsx` now
    surface `Engine Frame Quality`, and live `Stress Mixed 100K` validation at
    `2%` now records `Frame Reuse Hit = 1`, `L0 Preview Hits = 1`, wheel-pan
    reuse-hit frames as low as `0.06 ms`, and hand-pan entry reuse-hit frames
    around `0.12 ms`; after the preview-texture flip fix, hand-pan and zoom
    preview frames still hit reuse with `Cache Fallback Reason = none` and
    sub-millisecond draw time; after the low-scale overview threshold tuning,
    focused `2%` browser sampling reached `10/11` reuse-hit samples,
    `78.1` instant FPS peak, and `0.11 ms` minimum draw time while reducing
    the sampled residual fallback set to a single initial
    `l0-scale-step-exceeded` (`VT-20260424-49` follow-up)
- Completed mixed-scene regression gate closeout for the 100K performance
  track:
  - `apps/vector-editor-web/scripts/perf-gate.mjs` is now treated as the
    verified app/runtime regression gate for `10k`, `50k`, `100k`, and
    `mixed(text/image/path)` scene coverage
  - root and vector package scripts plus testing docs now provide the baseline,
    trend-regression, and machine-readable output flow used for performance
    signoff (`VT-20260424-14`)
- Completed Phase 3 closeout for the 100K scene-readiness track:
  - `packages/engine/src/renderer/webgl.ts` now extends interactive composite
    preview reuse with pan-time edge redraw, replaying packet draws only into
    newly exposed scissored edge regions after framebuffer shift instead of
    waiting for the next full redraw
  - `packages/engine/src/renderer/types.ts`,
    `apps/vector-editor-web/src/runtime/events/index.ts`,
    `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx`, and
    `apps/vector-editor-web/src/components/shell/RuntimeDebugPanel.tsx` now
    expose `WebGL Frame Reuse Edge Redraws` so the new pan edge-redraw path can
    be verified live in runtime diagnostics
  - `VT-20260424-47` worker-side render precompute work is now considered
    complete after full baseline validation and mixed-scene perf gate coverage
- Started `VT-20260424-47` worker-side render-precompute wiring for
  text/path-heavy scenes:
  - `apps/vector-editor-web/src/editor/runtime-local/shared-memory/index.ts`
    now stores stable text render hashes plus path/bezier point counts in
    shared scene memory so worker writes can precompute render hints once per
    shape update instead of leaving all hint derivation to frame-time readers
  - `apps/vector-editor-web/src/editor/runtime-local/presets/engineSceneAdapter.ts`
    now forwards the worker text hash as an engine text `cacheKey` and exposes
    path geometry count hints on shape nodes for follow-up path-prep work
  - `packages/engine/src/renderer/webglPackets.ts` now prefers the precomputed
    engine text `cacheKey` before falling back to packet-time cache-key
    synthesis
  - `packages/engine/src/renderer/webglPackets.ts`,
    `packages/engine/src/renderer/webgl.ts`,
    `apps/vector-editor-web/src/runtime/events/index.ts`, and
    `apps/vector-editor-web/src/components/shell/RuntimeDebugPanel.tsx` now
    expose precomputed-text-key vs fallback-text-key counters so the new
    worker-side path can be verified live in the debug surface
  - `packages/engine/src/renderer/canvas2d.ts` now consumes worker-provided
    path point/bezier counts to skip simplification on trivial paths and avoid
    allocating temporary bezier-anchor arrays when resolving line/path
    arrowhead endpoint segments
  - `packages/engine/src/renderer/canvas2d.ts`,
    `apps/vector-editor-web/src/runtime/events/index.ts`,
    `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx`, and
    `apps/vector-editor-web/src/components/shell/RuntimeDebugPanel.tsx` now
    surface a `Canvas2D Trivial Path Fast Path` counter for live verification
    of low-complexity path bypass hits
  - `packages/engine/src/renderer/canvas2d.ts` and
    `packages/engine/src/interaction/hitTest.ts` now skip multi-contour point
    parsing for open point-only paths, leaving contour resolution to closed-path
    candidates where it can actually affect render or hit behavior
  - `packages/engine/src/renderer/canvas2d.ts`,
    `apps/vector-editor-web/src/runtime/events/index.ts`,
    `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx`, and
    `apps/vector-editor-web/src/components/shell/RuntimeDebugPanel.tsx` now
    surface a `Canvas2D Contour Parses` counter for live visibility into
    remaining closed-path contour work
  - `packages/engine/src/interaction/hitTest.ts` now resolves closed-path state
    once per path hit-test branch, reuses it across fill/stroke checks, gates
    contour parsing behind a dedicated multi-contour candidate helper, and
    accepts an optional `closed` hint on hit-test nodes for future callers
  - `apps/vector-editor-web/src/editor/runtime-local/shared-memory/index.ts`,
    `apps/vector-editor-web/src/editor/runtime-local/presets/engineSceneAdapter.ts`,
    `packages/engine/src/scene/types.ts`, and
    `packages/engine/src/renderer/canvas2d.ts` now precompute and consume text
    line counts so single-line text can bypass generic newline-splitting work,
    with a `Canvas2D Single-Line Text Fast Path` counter exposed in runtime
    diagnostics
  - vector-editor path hit-test callers now forward precomputed `closed` hints
    into engine shape/clip hit testing across runtime-local controller,
    runtime-local worker hit-test scope, runtime-local interaction helpers, and
    mirrored `editor/interaction/runtime/*` modules so the engine can reuse the
    new closed-path fast path at product call sites
  - `apps/vector-editor-web/src/editor/interaction/pathHitTestHints.ts` now
    centralizes closed-path normalization for vector-editor hit-test call sites,
    replacing duplicated helper implementations across runtime-local and
    mirrored interaction modules
  - shared scene-memory render hints now precompute single-line rich-text max
    line height and thread it through engine text nodes into Canvas2D so the
    single-line text fast path can skip per-frame rich-text line-height scans;
    runtime diagnostics now expose `Canvas2D Precomputed Text Line Height`
  - worker-side text render hint preparation in shared scene memory now uses a
    single text metadata pass to derive hash, line count, and max line height,
    reducing duplicate text traversal during precompute
  - Canvas2D multiline text layout now uses a shared manual newline scanner for
    both rich-text runs and plain text, removing `split('\n')` temporary array
    allocation from hot multiline text render paths
  - Canvas2D single-line rich-text layout now reuses `EngineTextRun[]`
    directly instead of cloning runs into a duplicate segment array on each
    frame of the fast path
- Verification:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm --filter @venus/vector-editor-web perf:gate --report ./scripts/perf-gate.report.template.json --previous-report ./scripts/perf-gate.report.template.json --output ./scripts/perf-gate.result.json`

## 2026-04-23

- Continued engine-side WebGL-primary render-path convergence in
  `packages/engine/src/runtime/createEngine.ts`,
  `packages/engine/src/scene/framePlan.ts`,
  `packages/engine/src/scene/hitPlan.ts`,
  `packages/engine/src/scene/hitTest.ts`, and
  `packages/engine/src/renderer/plan.ts`:
  - engine now exposes explicit frame-plan and hit-plan read models
  - render planning now consumes frame-plan shortlist candidates
  - hit execution now narrows precise checks through coarse point candidates
  - top-hit resolution now reuses shared `hitTestAll(...)` results for
    diagnostics instead of recomputing them
- Reduced repeated WebGL frame organization work in
  `packages/engine/src/renderer/instances.ts`,
  `packages/engine/src/renderer/webglPackets.ts`, and
  `packages/engine/src/renderer/webgl.ts`:
  - instance views are cached by render-plan identity
  - packet plans are cached by `plan + instanceView` identity
  - packet plans now precompute image/rich-text aggregates and immutable draw
    metadata (`worldBounds`, color, image asset id)
  - WebGL commit loops no longer rescan packets for image/rich-text decisions
    or re-read prepared-node state for every draw
- Tightened WebGL text texture behavior in
  `packages/engine/src/renderer/webgl.ts`:
  - text texture cache now invalidates by frame signature
    (`scene.revision + pixelRatio + viewport.scale`)
  - text crop uploads now reuse a scratch offscreen surface instead of
    allocating one temporary canvas per uncached text packet
  - text cache usage tracking now marks only actually used textures each frame
- Expanded engine/vector diagnostics surfacing for planner visibility:
  - engine runtime diagnostics now track latest frame plan and hit plan
  - vector runtime events and debug UI now surface frame-plan/hit-plan counts
    plus render-prep dirty candidate overlap metrics
- Landed layered cache execution and diagnostics wiring for WebGL settled
  frames:
  - `packages/engine/src/renderer/tileManager.ts` now supports tile upsert,
    explicit tile invalidation, and visible-tile queries
  - `packages/engine/src/renderer/webgl.ts` now runs an L2 tile reuse/rebuild
    branch in model-complete rendering, driven by dirty tile region messages,
    with fallback to full composite when tile source/upload fails
  - layered cache counters (`L0/L1/L2` hit/miss + fallback reason) now flow
    through engine render stats, vector runtime events, and
    `RuntimeDebugPanel.tsx`
- Updated engine-facing documentation to reflect the current renderer
  direction:
  - WebGL is the only primary engine backend
  - Canvas2D in engine is auxiliary/offscreen/composite support, not a peer
    production backend

- Upgraded engine LOD policy in
  `packages/engine/src/interaction/lodProfile.ts` from static
  scene-size thresholds to a velocity-aware profile that now considers:
  - scene pressure (`shapeCount`, `imageCount`)
  - zoom scale (`scale`)
  - previous LOD level hysteresis (`previousLodLevel`)
- Extended LOD profile output with runtime tuning hints:
  - `targetDpr`
  - `interactiveIntervalMs`
- Wired vector canvas runtime to use the new LOD signals in
  `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx`:
  - derives viewport motion velocity from pan + zoom deltas
  - feeds velocity + previous LOD into `resolveCanvasLodProfile`
  - applies dynamic interaction-time DPR via `engine.setDpr(...)`
  - forwards `targetDpr` into renderer props for explicit LOD->render bridge
- Added WebGL interaction-time degradation path in
  `packages/engine/src/renderer/webgl.ts`:
  - skip model-complete Canvas2D composite while `quality=interactive`
    interacting, falling back to solid text bounds quads for motion stability
- Expanded WebGL diagnostics propagation:
  - engine render stats now expose optional WebGL counters
    (`webglRenderPath`, text fallback/upload/cache metrics,
    composite upload bytes)
  - vector runtime diagnostics/event snapshot schema now includes these fields
  - debug panel now renders WebGL path/fallback/upload counters for live tuning

## 2026-04-18

- Mirrored runtime source into vector app at
  `apps/vector-editor-web/src/editor/runtime-local/*`.
- Remapped vector runtime imports to app-local mirror in
  `apps/vector-editor-web/tsconfig.app.json` and
  `apps/vector-editor-web/vite.config.ts` for:
  - `@venus/runtime`
  - `@venus/runtime/engine`
  - `@venus/runtime/interaction`
  - `@venus/runtime/worker`
  - `@venus/runtime/shared-memory`
  - `@venus/runtime/presets`
- Updated vector package dependencies:
  - removed `@venus/runtime`
  - added direct `@venus/engine`
- Updated vector TS project references:
  - removed `../../packages/runtime/tsconfig.json`
  - added `../../packages/engine/tsconfig.json`
- Verification:
  - `pnpm install`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm --filter @venus/vector-editor-web build`
- Continued cleanup:
  - migrated vector runtime namespace from `@venus/runtime*` to
    `@vector/runtime*` (including `runtime-local` internals and app imports)
  - removed root TS graph references to deleted runtime package and ignored
    playground in root project references
  - deleted `packages/runtime`
  - removed playground workspace dependency/reference to deleted runtime package
    (`apps/playground/package.json`, `apps/playground/tsconfig.app.json`)
- Menu fixes:
  - fixed context menu nested submenu hover reliability in
    `apps/vector-editor-web/src/components/contextMenu/ContextMenu.tsx`
    with explicit submenu open-state + relatedTarget leave guards
  - aligned left-sidebar main menu popup placement/visual container to context
    menu behavior in
    `apps/vector-editor-web/src/components/shell/LeftSidebar.tsx`
- Vector editor UI semantic migration and regression fixes:
  - normalized language switching to `zh-CN` with resilient language-code
    resolution in `apps/vector-editor-web/src/i18n/ui.ts`
  - migrated header/left/context menu item styling to semantic
    `venus-ui-menu-item` classes and restored open-state trigger visuals
  - removed left sidebar Find tab and aligned shell tab unions/state
    (`shellCommandRegistry.ts`, `shellState.ts`, `LeftSidebar.tsx`)
  - removed synthetic `page-frame` scene injection and page-frame-only
    save filtering so frame behaves as a normal document node
    (`fileFormatScene.ts`, `fileDocument.ts`)
  - added default tooltip behavior to shared `Button`/`IconButton` with
    explicit `noTooltip` opt-out for wrapped Tooltip call-sites
  - refactored template preset picker into option/details layout with
    fixed action footer and tokenized shell surfaces
  - blocked inspector text-content patching (`text`/`textRuns`) to preserve
    canvas-side partial text editing behavior
  - left sidebar and layer-list behavior refinements:
    - minimized left panel now keeps fixed width with file name and explicit
      restore controls instead of collapsing to a floating chip
    - minimized left panel mode now uses a fixed 48px header strip with
      file icon + file name + restore icon button only
    - minimized left rail Menu icon now opens the main dropdown menu directly
      without requiring panel restore first
    - layer list now supports horizontal scrolling with non-truncated layer names
    - layer header count removed and section trigger expanded to full-width
    - layer section title trigger is left-aligned; layer rows now align by
      collapse/icon indent anchors
    - layer row lock/hide controls now follow hover/persistent visibility rules
      (locked rows keep lock + hidden-eye indicators visible)
    - layer row hover controls are now sticky to the right edge and do not
      drift with horizontal scrolling
    - left tab rail rhythm normalized (button sizing/spacing + rail divider and
      inner padding), and active tab emphasis aligned to shell active color token
      with explicit active border/background treatment
    - IconInput field behavior refinements:
      - text is left-aligned
      - unit suffix is rendered inline with value text (for example `100°`)
      - numeric spinner arrows are removed from this input path
    - right-side inspector no longer shows `px` suffix tags in numeric fields
    - selection/property section blocks now share consistent padding and
      divider treatment, with redundant standalone separators removed
    - toolbelt group controls now use explicit button-group visuals:
      primary tool button + select trigger button
    - hidden layer rows now render muted gray label text
    - layer-tree first-level subitem text now aligns to parent label baseline
      (no longer aligned to parent icon anchor)
    - layer list interaction completion:
      - horizontal scrolling disabled (`overflow-x-hidden`) for stable row layout
      - row-level lock/visibility toggles now dispatch real `element.modify`
        updates instead of local-only visual state
      - new layer batch action bar (lock/unlock, show/hide selected)
        dispatches bulk per-selection `element.modify` updates
    - assets panel interaction completion:
      - card hover/focus visual feedback enhanced (lift, ring, hover hint strip)
      - card quick actions split into `New` and `Template`
      - double-click and Enter/Space on cards now route to new-file flow
      - details panel action area now includes a dedicated `New file` action
    - shell state cleanup: removed stale `pagesCollapsed` from
      `variantBSections` persistence model
  - toolbelt grouped controls now support direct one-click quick select on
    the currently displayed group icon, with submenu kept on chevron trigger
    - projected node-level visibility/lock metadata into derived `LayerItem`
      values (`deriveEditorUIState.ts`, `useEditorRuntime.types.ts`)
    - closure sweep for tooltip/type/token consistency:
      - tokenized remaining border/text gray hardcodes in high-traffic surfaces
        (`statusBar/ZoomSelect.tsx`, `styleControls/ColorSwatchPicker.tsx`,
        `layerPanel/LayerPanel.tsx`, `print/print.tsx`)
      - completed native button tooltip backfill in print action surface
      - fixed UI-kit type mismatches with current Base UI APIs:
        - removed unsupported `onOpenAutoFocus` pass-through in modal wrapper
        - guarded nullable select values before value coercion callback
        - removed unsupported `nativeButton` props from tooltip trigger wrapper
    - text typography controls:
      - added a dedicated font picker popover in inspector (search + preview list)
        for text elements in `apps/vector-editor-web/src/components/propPanel/PropPanel.tsx`
      - enabled style-only `textRuns` patching from inspector so font-family
        updates flow to runtime text rendering while still blocking direct text
        content mutation
    - keyboard interaction conflict fix:
      - hardened global shortcut handling in
        `apps/vector-editor-web/src/lib/shortcut/shortcut.ts` to skip
        editable/interactive UI targets (`input`, `textarea`, `select`,
        `button`, contenteditable, and menu-like role surfaces)
      - added composition/IME safety guard (`event.isComposing` / `Process` key)
        so global hotkeys do not interrupt in-progress text input composition
      - wired editor-focus gating into shortcut registration in
        `apps/vector-editor-web/src/editor/hooks/useShortcut.tsx` so
        browser/UI default key behavior is not blocked when editor is unfocused
      - added focus-loss fallback in `useShortcut` to restore the previous tool
        when temporary `space` panning is active and focus leaves editor before keyup
    - packages/ui migration verification:
      - audited vector app import/dependency surface and confirmed no residual
        `@venus/ui` or workspace `packages/ui` runtime dependency usage remains
  - verification:
    - `pnpm typecheck`
    - `pnpm --filter @venus/vector-editor-web lint`
    - `pnpm --filter @venus/vector-editor-web build`

## 2026-04-16

- Added vector-local interaction runtime entry at
  `apps/vector-editor-web/src/editor/interaction/runtime/index.ts`.
- Added vector-local zoom policy module at
  `apps/vector-editor-web/src/editor/interaction/runtime/zoomPresets.ts`
  and switched zoom preset UI usage to this local entry.
- Rewired vector app interaction imports from direct
  `@venus/runtime/interaction` usage to the local runtime-interaction entry
  across editor hooks/runtime adapters/overlay/status bar.
- Added migration-safe local passthrough wrappers for
  `selectionHandles`, `snapping`, and `viewportGestures` to keep boundary-safe
  behavior while preparing deeper Phase-1 localization.
- Localized additional interaction strategy modules into vector app:
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionResolve.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/transformTargets.ts`
- Updated local interaction runtime barrel to export the localized
  `selectionResolve`/`transformTargets` implementations instead of passthrough.
- Localized additional interaction resolve modules into vector app:
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionHandleResolve.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/transformPreviewResolve.ts`
- Updated local interaction runtime barrel to use the localized resolve exports
  (`resolveSelectionHandleHitAtPoint`, `resolveDragStartTransformPayload`,
  `resolveSnappedTransformPreview`).
- Localized pointer-up resolve policy module into vector app:
  - `apps/vector-editor-web/src/editor/interaction/runtime/pointerUpResolve.ts`
- Updated local interaction runtime barrel to use localized pointer-up exports
  (`resolvePointerUpTransformCommit`, `resolvePointerUpMarqueeSelection`).
- Added additional vector-local interaction modules:
  - `apps/vector-editor-web/src/editor/interaction/runtime/marqueeApplyController.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionDragController.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionHierarchy.ts`
- Normalized blocked interaction chain through local wrapper entry files
  (`marqueeSelection`, `shapeHitTest`, `selectionPointerPolicy`, `selectionHandles`)
  so vector app imports stay app-local while preserving compile stability.
- Expanded `packages/runtime/src/engine.ts` facade export surface for future
  deeper localization, with follow-up required after existing runtime
  `commands/registry.ts` connector build errors are resolved.
- Removed incomplete connector prototype branch from
  `packages/runtime/src/commands/registry.ts` to restore runtime declaration
  build stability.
- Verified runtime package declaration build passes:
  `pnpm exec tsc -b packages/runtime/tsconfig.json`.
- Re-promoted previously wrapped interaction modules to vector-local
  implementations:
  - `apps/vector-editor-web/src/editor/interaction/runtime/marqueeSelection.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/shapeHitTest.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionPointerPolicy.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/selectionHandles.ts`
- Verified vector app compile after re-promotion:
  `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`.

## 2026-04-17

- Localized remaining interaction wrappers into vector app implementations:
  - `apps/vector-editor-web/src/editor/interaction/runtime/snapping.ts`
  - `apps/vector-editor-web/src/editor/interaction/runtime/viewportGestures.ts`
- Expanded `packages/runtime/src/engine.ts` facade to expose snapping and
  viewport gesture helpers required by vector-local interaction modules.
- Rebuilt runtime package declarations after facade extension:
  `pnpm exec tsc -b packages/runtime/tsconfig.json`.
- Added Phase-2 render-prep skeleton files in vector app:
  - `apps/vector-editor-web/src/editor/render-prep/types.ts`
  - `apps/vector-editor-web/src/editor/render-prep/prepareScenePass.ts`
  - `apps/vector-editor-web/src/editor/render-prep/prepareOverlayPass.ts`
  - `apps/vector-editor-web/src/editor/render-prep/prepareFrame.ts`
- Verified vector app compile remains green:
  `pnpm exec tsc -p apps/vector-editor-web/tsconfig.app.json --noEmit`.
- Integrated render-prep into runtime render entry:
  - `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx` now builds
    prepared frames via `prepareRenderFrame(...)` and gates `engine.loadScene`
    by `preparedFrame.scene.dirty`.
- Added phase-3 baseline dirty/partial-update data flow:
  - `apps/vector-editor-web/src/editor/render-prep/types.ts` adds
    `PreparedDirtyState`.
  - `apps/vector-editor-web/src/editor/render-prep/prepareScenePass.ts`
    now accepts previous-frame context, performs shape-level scene diffs, and
    emits `instanceUpdates` for single-shape changes or full-range updates for
    structure changes.
  - `apps/vector-editor-web/src/editor/render-prep/prepareFrame.ts` now
    summarizes dirty state (`sceneInstanceIds`, `overlayDirty`, `pickingDirty`,
    `cameraDirty`) for downstream render policy.
- Extended dirty summary with `sceneStructureDirty` and wired runtime
  consumption in `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx`:
  - structural scene changes still use `engine.loadScene(...)`
  - non-structural scene changes now use `engine.applyScenePatchBatch(...)`
    with upserted changed nodes only.
- Verified workspace-wide build-time types after integration:
  `pnpm typecheck`.

## 2026-04-15

- Added root documentation governance files:
  - `00_README.md`
  - `STATE.md`
  - `04_DECISIONS.md`
  - `05_CHANGELOG.md`
  - `06_TODO.md`
- Introduced canonical docs map at `docs/index.md`.
- Created new documentation domains:
  - `docs/product/*`
  - `docs/architecture/*`
  - `docs/engineering/*`
  - `docs/ai/*`
  - `docs/decisions/*`
- Renamed and relocated old docs:
  - `docs/00-Docs-Home.md` -> `docs/index.md`
  - `docs/architecture.md` -> `docs/architecture/overview.md`
  - `docs/runtime-engine-responsibility-split.md` -> `docs/architecture/layering.md`
  - `docs/runtime-mindmap-guide.md` -> `docs/architecture/runtime.md`
- Added ADR records for architecture boundary and documentation governance.
- Normalized `docs/task/plan-2.md` from mixed mega-plan into execution-plan scope.
- Normalized `docs/task/plan-1.md` from mixed mega-plan into execution-plan scope.
- Synced plan routing deltas into `STATE.md` and `06_TODO.md`.
- Added task-plan navigation entries in `docs/index.md`.
- Added workflow `Workflow E: Large Plan Normalization` in `docs/ai/workflows.md`.
- Started runtime decomposition development by extracting shape action dispatch
  from `useEditorRuntime.ts` into
  `apps/vector-editor-web/src/hooks/runtime/shapeActions.ts`.
- Migrated vector app UI dependency from workspace package to local app-owned
  source by vendoring `packages/ui` primitives into
  `apps/vector-editor-web/src/ui/kit/*` and switching imports to `@vector/ui`.
- Restructured vector app source layout to reduce top-level noise:
  - moved runtime-facing modules to `apps/vector-editor-web/src/editor/*`
  - moved shared constants/types/utilities to
    `apps/vector-editor-web/src/shared/*`
- Updated vector app build configuration (`tsconfig.app.json`, `vite.config.ts`,
  and `package.json`) to use local UI aliasing and local UI dependencies.
