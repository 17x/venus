# Vector Editor Engine 100K Performance Optimization Plan

## 1. Symptoms

The editor shows significant performance degradation when the scene scale reaches around 100K elements, especially during:

- panning
- zooming
- dragging
- hover / pointer move
- selection updates
- overlay rendering
- mixed vector / text / image scenes

Common user-visible symptoms include:

- frame drops during camera movement
- delayed response during object dragging
- heavy stutter while zooming in or out
- hover lag
- unstable interaction feedback
- cache rebuild spikes
- large CPU spikes even when visual changes are small

This document describes a practical runtime optimization strategy for large-scene editing.

---

## 2. Main Principle

At 100K scale, the goal is not to preserve full fidelity at every moment.

The goal is:

- keep interaction smooth
- prioritize what is visible and relevant
- degrade quality during interaction
- restore quality after interaction settles
- avoid full-scene work for local changes
- reuse previous work aggressively

The engine should follow this rule:

> During interaction, prefer responsiveness over perfect visual fidelity. After interaction settles, restore detail progressively.

---

## 3. Root Causes

Performance degradation at 100K usually does not come from a single issue. It is usually caused by a combination of:

- too many scene nodes traversed per frame
- too many draw operations per frame
- expensive hit testing during pointer move
- cache rebuilding too often
- path/text/image rendering not being degraded at low zoom
- group internals expanding too often
- drag operations invalidating too much of the scene
- zoom changes triggering too many LOD/cache/layout recalculations
- overlay and guide systems running at full precision during interaction

The system must therefore optimize the entire runtime pipeline, not just drawing.

---

## 4. Performance Diagnosis Requirements

Before optimization work, the engine should expose per-frame runtime stats.

Recommended stats:

```ts
type FrameStats = {
  totalMs: number;
  quadtreeQueryMs: number;
  visibleCandidateCount: number;
  traversedNodeCount: number;
  renderedNodeCount: number;
  skippedNodeCount: number;
  hitTestMs: number;
  hitCandidateCount: number;
  cacheHitCount: number;
  cacheMissCount: number;
  cacheRebuildMs: number;
  overlayMs: number;
  textLayoutMs: number;
  imageDrawMs: number;
  pathBuildMs: number;
};
```

Without this instrumentation, optimization becomes guesswork.

---

## 5. Runtime Strategy

The engine should distinguish between:

- static rendering phase
- panning phase
- zooming phase
- dragging phase
- settled phase after interaction

Each phase should use a different rendering policy.

This is critical.

If the engine always uses the same fidelity and processing cost in every phase, 100K scenes will remain slow even with quadtree and cache.

---

## 6. General Optimization Rules

The engine should follow these rules globally:

1. Never traverse more nodes than necessary
2. Never draw details the user cannot perceive
3. Never use exact hit testing when coarse hit testing is sufficient
4. Never rebuild cache immediately during continuous interaction unless absolutely necessary
5. Never redraw the full scene if only a small region changed
6. Never expand deep group hierarchies when a collapsed representation is enough
7. Prefer stale-but-fast visuals during interaction over precise-but-slow rendering
8. Restore quality after interaction settles

---

## 7. Scene Traversal Optimization

At 100K scale, scene traversal itself becomes a major cost.

### 7.1 Viewport culling

Only query candidates intersecting the viewport plus a small overscan margin.

```ts
const queryViewport = expandRect(viewport, 200 / zoom);
```

Overscan prevents candidate thrashing during small continuous pans.

### 7.2 Candidate set vs traversal set

Do not deeply traverse every visible candidate.

Instead distinguish:

- visible candidates
- traversed nodes
- rendered nodes
- collapsed nodes
- skipped nodes

### 7.3 Group/frame collapse

When zoomed out, group/frame/component internals should not be expanded unless interaction requires it.

Possible collapsed representations:

- cached snapshot
- outline only
- bounding box only
- top-level block

### 7.4 Tiny object skipping

Objects that occupy only a very small screen-space area should use dot/bbox rendering or be skipped entirely.

---

## 8. Panning Optimization

Panning changes the camera, not object content.

Therefore, the engine should maximize reuse during panning.

### 8.1 Panning policy

During pan:

- disable hover hit test
- disable expensive guides if possible
- use simplified path rendering
- use text placeholders or cached text
- prefer cached group snapshots
- avoid immediate cache rebuild
- avoid exact picking work

### 8.2 Reuse previous frame

If using Canvas 2D or a similar raster pipeline, small pan deltas can reuse the previous frame:

- shift the old frame buffer
- redraw only the newly exposed edge region

This is often one of the highest-value pan optimizations.

### 8.3 Overscan query

Use viewport + overscan for candidate querying to reduce flicker and candidate churn.

### 8.4 Settled pan phase

Once panning stops:

- restore text quality
- rebuild higher-quality cache if needed
- restore hover
- restore fine detail progressively

---

## 9. Zooming Optimization

Zoom is expensive because it tends to trigger multiple subsystems at once:

- LOD changes
- cache bucket changes
- text layout changes
- path simplification changes
- group collapse/expand changes
- image resolution changes

### 9.1 Zoom interaction policy

During zoom:

- reuse old cache/snapshot and scale it temporarily
- avoid immediate high-quality cache regeneration
- avoid full text layout
- avoid rebuilding complex paths every frame
- prefer collapsed group representations

### 9.2 Zoom settle policy

After zoom settles:

- reevaluate LOD more accurately
- rebuild needed cache lazily
- restore full text/path detail where relevant
- update image resolution if needed

### 9.3 Cache bucket hysteresis

Do not switch cache buckets too aggressively during continuous zoom.

Use discrete zoom buckets and hysteresis to prevent cache thrashing.

Example:

```ts
const ZOOM_BUCKETS = [0.125, 0.25, 0.5, 1, 2, 4];
```

### 9.4 Text/path freeze during zoom

Text shaping and path rebuild should usually be delayed until zoom settles unless the active edited object requires precision.

---

## 10. Dragging Optimization

Dragging changes one or a few active objects, not the whole scene.

The engine should avoid paying full-scene cost during dragging.

### 10.1 Drag preview layer

Selected content should be moved into a dedicated drag preview layer during interaction.

Recommended flow:

1. pointer down
2. create drag preview representation
3. move preview during drag
4. commit actual scene data on drag end

This avoids invalidating and recomputing the full scene every frame.

### 10.2 Dirty-region redraw

Dragging should redraw only the union of:

- old bounds
- new bounds
- overlay bounds
- guide/snap visual bounds if needed

```ts
const dirty = unionRect(oldBounds, newBounds);
```

### 10.3 Interaction-time simplification

During drag:

- disable hover
- simplify hit testing
- throttle snapping/guides if necessary
- avoid heavy cache invalidation
- avoid rebuilding unrelated static content

### 10.4 Incremental spatial index update

Do not rebuild the full quadtree during every drag move.

Use one of the following:

- incremental remove/insert
- deferred index update during drag
- separate active-selection overlay index

---

## 11. Hit Test Optimization

At 100K scale, pointer move and hover handling are often one of the biggest hidden costs.

### 11.1 Throttle pointermove hit testing

Do not run full hit testing for every raw pointer event.

Use:

- frame-based throttling
- distance thresholds
- interaction-mode gating

### 11.2 Coarse-first hit testing

Recommended modes:

- exact
- bbox_then_exact
- bbox
- top_block
- none

Most pointer-move interactions should use bbox-first candidate filtering.

### 11.3 Interaction phase gating

During drag or pan:

- disable normal hover hit testing
- avoid deep exact picking
- restrict picking to active targets or overlay targets only

### 11.4 Multi-hit optimization

If overlap disambiguation is needed:

- query candidates with quadtree
- sort by z-order
- bbox filter first
- exact-test only a shortlist

Do not exact-test every candidate.

---

## 12. Path Optimization

Path-heavy scenes are one of the biggest risks at 100K scale.

### 12.1 Canonical geometry vs simplified geometry

Keep original geometry untouched.

Build simplified geometry representations per zoom bucket.

### 12.2 Reusable simplified buckets

Example simplification buckets:

- full geometry
- medium flatten tolerance
- coarse flatten tolerance
- outline/bbox only

### 12.3 Path cache

Cache one or more of the following:

- flattened path data
- Path2D objects
- tessellated geometry
- raster snapshots for complex static groups

### 12.4 Stroke hit degradation

Avoid exact stroke hit testing at low zoom whenever possible.

---

## 13. Text Optimization

Text can dominate runtime in UI-heavy or document-heavy scenes.

### 13.1 Text LOD

Recommended levels:

- full shaping/layout
- cached text surface
- line block placeholder
- bbox only

### 13.2 Avoid continuous relayout

During pan/zoom:

- reuse cached text surface
- avoid full shaping
- restore precision after interaction settles

### 13.3 Editing exception

If text is actively being edited, that node may remain high-fidelity while surrounding content degrades.

---

## 14. Image Optimization

Large images and many images require their own optimization path.

### 14.1 Multi-resolution images

Use different representations depending on screen-space size.

### 14.2 Tiled image cache

Large images should prefer tiled cache so that:

- only visible tiles are drawn
- only needed resolutions are loaded
- partial updates are possible

### 14.3 Decode/pool management

Use ImageBitmap and pooling/LRU strategies where possible.

### 14.4 Interaction-time downgrade

During pan/zoom:

- use lower-resolution previews if necessary
- avoid expensive reprocessing

---

## 15. Cache Strategy

Cache is necessary, but uncontrolled cache can make performance worse.

### 15.1 Cache only high-value content

Good cache candidates:

- complex groups
- effect-heavy content
- static text blocks
- image-heavy compositions
- repeated static subtrees

Poor cache candidates:

- frequently mutating nodes
- actively edited content
- content whose cache invalidates every frame

### 15.2 Zoom bucket cache

Caches should be created per zoom bucket, not per exact zoom.

### 15.3 Delayed rebuild during interaction

During pan/zoom/drag:

- prefer stale cache if visually acceptable
- schedule rebuild after interaction settles

### 15.4 Tiled cache for large content

Large groups or frames should use tiled bitmap cache instead of one monolithic cache surface.

### 15.5 Memory budget

Cache system should enforce:

- max total memory usage
- max single cache size
- LRU eviction
- visibility-aware retention priority

---

## 16. Dirty Region Strategy

Without dirty-region control, local edits still cause full-scene redraw costs.

### 16.1 Dirty-region sources

Dirty regions may come from:

- dragging
- resize/transform
- selection change
- overlay update
- text cursor change
- animation
- cache invalidation

### 16.2 Dirty-region union

Merge related dirty regions before redraw.

### 16.3 Tile-aware redraw

If tiled cache or tiled rendering is used, dirty updates should invalidate only touched tiles.

### 16.4 Interaction layer separation

If selection/drag/guide overlays are separated from the main scene, many dirty updates remain localized.

---

## 17. Overlay Optimization

Overlay systems often remain full-fidelity when the scene degrades, which wastes time.

### 17.1 Separate overlay layers

Use separate rendering paths for:

- selection bounds
- handles
- guide lines
- snap markers
- drag previews

### 17.2 Overlay LOD

Overlay should also degrade.

Examples:

- small selected objects may show bbox only
- handles may disappear below minimum screen size
- hover affordances may simplify at low zoom

### 17.3 During interaction

During pan/zoom/drag:

- disable or throttle expensive guide computations
- avoid deep hover visuals

---

## 18. Recommended Runtime Services

The runtime should separate major optimization responsibilities.

```ts
type RuntimeServices = {
  spatialIndex: SpatialIndex;
  lodService: LodService;
  renderPlanner: RenderPlanner;
  hitTestPlanner: HitTestPlanner;
  cacheManager: CacheManager;
  interactionRenderer: InteractionRenderer;
  dirtyRegionManager: DirtyRegionManager;
};
```

### 18.1 SpatialIndex

Responsible for:

- viewport candidate queries
- hit candidate queries
- selection box queries
- optional density estimation

### 18.2 LodService

Responsible for:

- render mode
- hit mode
- cache mode
- overlay mode
- group expand/collapse decision

### 18.3 RenderPlanner

Responsible for building a frame plan instead of making ad hoc decisions inside draw calls.

### 18.4 HitTestPlanner

Responsible for coarse-to-fine picking logic.

### 18.5 CacheManager

Responsible for:

- zoom buckets
- invalidation
- delayed rebuild
- tiled cache
- memory control

### 18.6 InteractionRenderer

Responsible for:

- drag preview
- selection/handles
- guide rendering
- interaction-only visual layers

### 18.7 DirtyRegionManager

Responsible for:

- dirty tracking
- dirty merge
- partial redraw planning

---

## 19. Phase-Based Render Policy

The engine should define explicit policies per interaction phase.

### 19.1 Static phase

- higher quality rendering
- full text where needed
- full cache quality where justified
- normal hover enabled

### 19.2 Panning phase

- hover disabled
- text downgraded
- path simplified
- cache reused aggressively
- overlays simplified

### 19.3 Zooming phase

- reuse stale snapshot/cache
- avoid immediate relayout/rebuild
- collapse groups more aggressively
- delay precise redraw until settle

### 19.4 Dragging phase

- drag preview layer active
- dirty region redraw only
- hover disabled
- snapping/guides throttled
- unrelated content remains static

### 19.5 Settled phase

- rebuild needed cache
- restore text/path detail progressively
- restore hover and normal precision

### 19.6 Current implementation status (2026-04-23)

- Runtime phase policy entry (`resolveRuntimeRenderPolicy`) is now wired in
  app adapter flow with explicit phase inputs (`pan`/`zoom`/`drag`/`static`/`settled`).
- Current renderer wiring uses viewport interaction classification to drive
  phase selection for camera motion paths.
- Runtime diagnostics now publish `renderPhase`, enabling direct correlation
  between phase transitions and shortlist/cache/frame-plan telemetry in
  Runtime Debug Panel.
- Phase selection now also consumes runtime editing-mode signals
  (`dragging`/`resizing`/`rotating`/`panning`/`zooming`) so manipulation
  phases are not inferred only from viewport velocity.
- Runtime diagnostics now publish `overlayMode` (`full`/`degraded`) to
  track overlay-side interaction degradation policy.
- App derived-state now applies overlay degradation by suppressing hover
  highlight and snap-guide instructions in motion-heavy modes, while keeping
  path-edit overlays active for editing correctness.

---

## 20. Immediate High-Value Fixes

If the current engine is already struggling at 100K, the following fixes usually provide the best short-term gains:

1. Add frame stats instrumentation
2. Throttle pointermove hit testing
3. Disable hover during drag/pan
4. Freeze expensive cache rebuild during zoom
5. Add tiny-object skip / dot rendering
6. Add text placeholder mode at low zoom
7. Add path simplification buckets
8. Add group collapse at low zoom
9. Move drag rendering into a preview layer
10. Add dirty-region redraw

These are usually more important than exotic algorithm changes.

---

## 21. Longer-Term Improvements

After the immediate fixes, the following improvements are recommended:

- tiled bitmap cache for large groups/frames
- worker-based simplification/precompute
- better cache invalidation/versioning
- pan frame reuse / framebuffer shifting
- image multi-resolution system
- deeper overlay simplification
- incremental spatial index updates
- richer debug visualization for LOD/cache/quadtree

---

## 22. Failure Patterns to Avoid

### 22.1 Full-scene redraw during every interaction step

This is usually fatal at 100K.

### 22.2 Full-quality rendering during drag/pan/zoom

This wastes time on detail the user cannot inspect during motion.

### 22.3 Exact hover hit testing all the time

This is a common hidden CPU killer.

### 22.4 Cache without bucket/invalidation policy

This creates thrash instead of reuse.

### 22.5 No distinction between static and dynamic layers

This causes unrelated content to be redrawn too often.

### 22.6 Group internals always expanded

This destroys traversal scalability.

---

## 23. Implementation Roadmap

### Phase 1 — Stop the worst spikes

- add runtime stats
- throttle pointermove hit testing
- disable hover during drag/pan
- freeze text/path/cache rebuild during zoom
- add tiny-object skip
- add text placeholder mode
- add bbox-first hit test

### Phase 2 — Improve runtime structure

- add drag preview layer
- add dirty-region redraw
- add group collapse
- add path simplification buckets
- add cache zoom buckets with hysteresis

### Phase 3 — Scale further

- add tiled bitmap cache
- add image multi-resolution loading
- add worker precompute for heavy path/text preparation
- add incremental spatial-index updates
- add better debug tooling

---

## 24. Conclusion

At 100K scale, good performance does not come from one optimization.

It comes from combining:

- viewport-aware traversal
- screen-space LOD
- coarse-first hit testing
- interaction-phase degradation
- cache reuse with delayed rebuild
- dirty-region redraw
- hierarchy collapse
- separate interaction layers

The engine should stop trying to render and interact with everything at full fidelity all the time.

Instead it should behave like a large-scene editor runtime:

- fast during motion
- precise after settling
- local when possible
- approximate when acceptable
- aggressive about skipping unnecessary work

That is the practical path to making 100K scenes usable.
