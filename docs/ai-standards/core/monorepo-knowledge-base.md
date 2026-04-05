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
- `packages/*` contains shared runtime, worker, renderer, file-format, and
  document primitives.
- `docs/*` contains project standards, handoff notes, and architecture context.

### Primary Runtime Chain

- Main interactive chain:
  `apps/*` -> `@venus/canvas-base` -> `@venus/editor-worker` +
  `@venus/shared-memory` -> renderer packages

### File And Model Truth

- Treat `packages/file-format` as the canonical persisted scene/document model.
- Prefer the file-format `node + feature` structure when reasoning about
  geometry, text, image, and serialization semantics.
- Treat `@venus/document-core` `DocumentNode` as a flattened runtime adapter,
  not the only source of truth.

### Current Renderer Direction

- `Canvas2D` is the current default/stable development renderer for active app
  work.
- `Skia` remains available but is not the current default path for vector and
  playground iteration.

### Viewport Interaction Status

- `pan` preview is currently the stable interaction optimization.
- `zoom` preview experiments are paused; stable behavior remains direct commit +
  redraw.

## Recent Updates

### 2026-04-05

- Added first-class shape appearance editing for vector primitives:
  `shape.patch` now supports `fill/stroke/shadow`, rectangle
  `cornerRadius/cornerRadii`, and ellipse `start/end` angles across worker
  history + collaboration payloads. Vector property panel emits these patches,
  file-format metadata parse/serialize paths persist them, and `Canvas2D`
  now renders per-corner rounded rectangles, arc/sector ellipses, and shape
  shadows/colors using `DocumentNode` style fields.

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
  `@venus/canvas-base` now exports `createSelectionDragController`, and both
  `vector-editor-web` and `runtime-playground` use the same
  `pointerdown -> pending -> thresholded move -> drag session -> commit` flow
  instead of maintaining duplicated app-local drag state machines.

- Extracted clip-shape point-inclusion logic into `@venus/document-core`
  (`isPointInsideClipShape`) and switched both worker hit-test and
  canvas-base drag-start hit-test to use the same helper. This keeps clipped
  image interaction semantics aligned across selection, hover, and drag entry.

- Added a reusable selection-overlay assembly point in `@venus/canvas-base`:
  `CanvasViewport` now accepts an optional `overlayRenderer`, and
  `CanvasSelectionOverlay` is exported as a shared default overlay. Both
  `vector-editor-web` and `runtime-playground` now mount the same overlay path,
  so selection UI can be reused across app surfaces (including future xmind
  integration) without coupling it to a single app renderer.

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
  `@venus/canvas-base/interaction/marqueeSelection` and exported it via package
  entry. `vector-editor-web` now uses shared helpers for marquee state updates,
  bounds resolution, and selected-id computation to keep future app surfaces
  aligned on the same baseline behavior.

- Enabled marquee selection in `runtime-playground` using the same shared
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

- Added `docs/ai-standards/core/current-work.md` and linked it into the Venus
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

- Temporarily removed `Skia` from `apps/runtime-playground` and stripped the
  remaining vector type-level dependency so active development bundles no longer
  pull `canvaskit` into the default playground/vector build path.

- Updated `createEditorViteConfig()` to build editor apps with `base: './'` so
  generated `index.html` and emitted bundles reference `./assets/...` relative
  paths instead of root-absolute `/assets/...`.

- Added a no-SAB runtime fallback in `createCanvasRuntimeController()` so built
  app surfaces opened without `crossOriginIsolated` can still hover and select
  shapes locally even though worker-backed editing features remain unavailable.

- Added the published runtime playground URL to the repo root `README.md` and
  updated the README runtime chain text to reflect the current Canvas2D-first
  active renderer path.

- Refactored `renderer-canvas` LOD config to use numeric levels (`0..3`) as the
  primary abstraction; current runtime still maps `full -> 0` and
  `interactive -> 2` so behavior stays compatible while future LOD scheduling
  becomes easier to extend.

- Added a shared `canvas-base` LOD scheduler and threaded `lodLevel` through
  `CanvasRendererProps`; playground now shows the live computed level and mode
  produced by viewport interaction state plus scene size heuristics.

- Removed manual LOD preset switching from `runtime-playground`; the sidebar now
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

- Fixed a `runtime-playground` startup render loop caused by the
  `CanvasViewport -> onRenderLodChange -> React state` bridge emitting a fresh
  LOD object every render; the callback now only reports when effective LOD
  fields actually change.

- `runtime-playground` should lazily generate stress scenes based on the active
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
  runtime fields used by authored pencil paths. `runtime-playground`
  demo/stress scenes, the playground `Insert Mock` action, and the default
  `vector-editor-web` mock file all generate `path.points +
  path.bezierPoints` from sampled anchors via
  `convertDrawPointsToBezierPoints(...)` so render, hit-test, and clip behavior
  can be verified without relying on hand-written bezier fixtures only.

- The default mock `path` examples in `runtime-playground` and
  `vector-editor-web` now use mixed segments: some adjacent anchors are linked
  as straight lines (`cp1/cp2 = null`), while the middle segments keep bezier
  handles. This gives the renderer and hit-test path a stable mixed line/curve
  fixture without requiring interactive path editing first.

- The default demo/mock surfaces now include multiple mixed paths instead of a
  single sample, so overlap, z-order, and repeated hit-test behavior can be
  checked without switching to stress scenes.

- `runtime-playground` stress generation now mixes two path variants: some
  generated `path` nodes are still smooth bezier waves, while a subset now
  alternates straight joints and bezier handles. Large-scene render and
  hit-test checks therefore cover both pure-curve and mixed-segment path data.
