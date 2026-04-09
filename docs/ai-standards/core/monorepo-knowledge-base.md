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

### Legacy Reference Code

- `packages/editor_old` is deprecated and reference-only.
- Agents may inspect `packages/editor_old` for legacy behavior or design
  context, but new fixes and feature work should land in the active runtime
  chain (`document-core`, `canvas-base`, `editor-worker`, renderer packages,
  and app adapters) instead of modifying `editor_old`.

### Viewport Interaction Status

- `pan` preview is currently the stable interaction optimization.
- `zoom` preview experiments are paused; stable behavior remains direct commit +
  redraw.

## Recent Updates

### 2026-04-09

- `@venus/document-core` bezier path bounds now solve cubic derivative extrema
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

- Shared `canvas-base` transform resize now treats single rotated selections in
  local shape space instead of world-axis space. Corner and edge handle drags
  therefore resize rotated elements against their visual handle directions
  while preserving the element's existing rotation.

- `flipX` / `flipY` are now first-class transform state in the active vector
  runtime path. Single-shape resize crossovers toggle flip state instead of
  rebaking polygon/path geometry, and the worker, Canvas2D renderer, selection
  overlays, file adapters, clip hit-tests, and runtime-playground/vector app
  preview/commit paths all preserve those flips.

- Multi-selection and group resize now use signed batch scaling in
  `canvas-base` instead of positive-only box scaling. Crossing a group/selection
  axis toggles per-shape flip state, and group resize targets leaf descendants
  rather than the derived group container box, so reflected resize behavior
  stays consistent for grouped content too.

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
  `canvas-base` drag arming hit-test, and `vector-editor-web` pointerdown
  pre-hit test now all require pointer inclusion in `clipPathId` source shape
  before considering host geometry, reducing clipped-element selection mismatch.
  Follow-up fix: shared drag hit-test now builds a per-call `id -> shape` map
  before clip checks to avoid `O(n²)` source lookups on large playground scenes,
  restoring drag responsiveness while keeping clip-first semantics.
  Follow-up refactor: drag/transform preview commit synchronization was moved
  into shared `@venus/canvas-base` hook
  `useTransformPreviewCommitState` (pending-commit flag + doc-sync clear path),
  and both `vector-editor-web` and `runtime-playground` now consume the same
  implementation to avoid app-local bounce/stale-preview regressions.

- Runtime playground fake-data sources were flattened to exclude `group` nodes:
  stress-scene generation now skips group synthesis/parent wiring, and the
  default demo mock document no longer includes group wrappers or group
  parent-child links.

- Fixed runtime-playground transform preview rendering for point-based shapes:
  preview application now remaps `points` / `bezierPoints` alongside
  `x/y/width/height`, so `polygon/star/path` follow pointer movement immediately
  during drag instead of waiting for command commit.

- Runtime-playground selector pointer-down now relies on shared
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

- Added safe zoom de-flicker path in `canvas-base` gestures: wheel-zoom commits
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

- The root `README.md` now lists the new vector UI package surface narrowly:
  `@venus/ui`, the shadcn-style `packages/ui/components.json` setup, Radix UI
  primitives for dialog/select/scroll-area/tooltip, and Tailwind CSS 4.

- Shared `@venus/ui` tooltips now use an inline `11px / 14px` content size
  instead of Tailwind `text-xs`, because Radix Tooltip portals render outside
  the vector editor root and cannot rely on `.venus-editor` typography
  inheritance or app Tailwind scanning for package-local arbitrary classes.
