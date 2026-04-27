# Vector Editor Engine LOD / Cache / Quadtree Architecture

## 1. Background

The current engine already includes:

- Quadtree-based spatial indexing
- Render cache
- LOD-related logic

However, the current design is still incomplete in several ways:

- LOD rules are not unified across rendering, hit testing, overlay, and cache
- Quadtree is mainly used for visibility or rough filtering, but not fully integrated into the interaction pipeline
- Cache exists, but invalidation, resolution bucketing, and memory control are not fully defined
- Selected / hovered / editing elements do not have clear priority rules
- Group / frame / complex path / text / image do not yet have differentiated LOD strategies
- Rendering degradation and interaction degradation are not coordinated

This document defines a complete LOD architecture for a 2D vector editor engine targeting large scenes such as:

- 10K elements
- 50K elements
- 100K elements
- mixed image/vector scenes

---

## 2. Goals

The system should achieve the following:

1. Reduce rendering cost when zoomed out
2. Reduce hit test cost during frequent pointer movement
3. Reduce scene traversal cost
4. Keep selected / hovered / editing objects visually stable and interactive
5. Reuse cache effectively without causing memory explosion
6. Keep visual output and interaction behavior reasonably consistent
7. Allow different node types to define different LOD behavior
8. Integrate Quadtree into render and interaction pipelines instead of using it as an isolated optimization

---

## 3. Non-Goals

This architecture does not aim to:

- implement full 3D-style mesh simplification
- solve collaboration or persistence problems directly
- define document schema
- replace existing renderer abstractions

This is a runtime/view-layer optimization architecture.

---

## 4. Core Principle

LOD is not a single algorithm.

In a 2D editor, LOD is a **runtime policy system** that determines:

- how much geometry to render
- how much style detail to render
- whether to expand group internals
- whether to show overlays
- how precise hit testing should be
- whether to render from vector or cache
- whether an element is worth traversing at all

The most important rule is:

> LOD should be decided primarily in screen space, not world space.

That means the engine should not ask only:

- “How large is this object in the document?”

It should ask:

- “How large is this object on screen right now?”
- “Is the user likely to perceive or interact with its fine detail at this zoom?”
- “Is the object active, selected, hovered, or being edited?”

---

## 5. Architecture Overview

The engine should separate the following responsibilities:

- **Spatial Index Layer**
  - Quadtree or equivalent structure
  - viewport queries
  - candidate filtering for hit test and selection

- **LOD Evaluation Layer**
  - determines render/hit/overlay/cache modes per node
  - takes zoom, screen size, interaction state, node type into account

- **Render Planning Layer**
  - decides traversal depth
  - chooses vector render vs cache render
  - batches visible draw items

- **Hit Test Planning Layer**
  - determines hit precision level
  - determines whether deep traversal is allowed

- **Cache Layer**
  - stores rasterized snapshots or precomputed draw data
  - manages invalidation, LRU, zoom buckets, memory budget

- **Overlay Layer**
  - handles selection box, handles, guides, hover affordance
  - follows separate rules from main scene rendering

---

## 6. LOD Dimensions

LOD in this engine should not be represented as a single number only.  
It should be decomposed into several dimensions.

### 6.1 Geometry LOD

Controls how much geometric detail is used.

Examples:

- full bezier/path
- simplified polyline
- convex hull / rough outline
- bounding box
- dot / skip

### 6.2 Style LOD

Controls expensive visual effects.

Examples:

- shadow
- blur
- gradient
- dashed stroke
- pattern fill
- opacity compositing
- multi-stroke or effect stacks

### 6.3 Semantic LOD

Controls how much semantic detail is shown.

Examples:

- expand group children or not
- render text content or placeholder only
- show image crop/mask details or not
- show internal frame content or container only

### 6.4 Hit Test LOD

Controls interaction precision.

Examples:

- exact path fill/stroke test
- bbox + exact refinement
- bbox only
- top-level block hit only

### 6.5 Cache LOD

Controls which cache representation to use.

Examples:

- full vector draw
- medium-resolution bitmap cache
- low-resolution bitmap cache
- tiled cache
- no cache

---

## 7. Screen-Space Driven Evaluation

LOD should be based on screen-space size.

Example:

```ts
type ScreenMetrics = {
  screenWidth: number;
  screenHeight: number;
  maxScreenSize: number;
  minScreenSize: number;
  screenArea: number;
};
```

A basic metric:

```ts
function getScreenMetrics(bounds: Rect, zoom: number): ScreenMetrics {
  const screenWidth = bounds.width * zoom;
  const screenHeight = bounds.height * zoom;
  return {
    screenWidth,
    screenHeight,
    maxScreenSize: Math.max(screenWidth, screenHeight),
    minScreenSize: Math.min(screenWidth, screenHeight),
    screenArea: screenWidth * screenHeight,
  };
}
```

This evaluation should then be adjusted by interaction state.

---

## 8. Interaction Priority Rules

Interaction state must override normal LOD degradation.

Priority order:

1. actively editing
2. actively transforming
3. selected
4. hovered
5. normal visible
6. offscreen / nearly invisible

Rules:

- selected nodes should usually be promoted by at least one LOD level
- hovered nodes should usually be promoted by at least one LOD level
- editing nodes may be forced to full detail
- descendants of editing containers may also need promotion
- hidden / locked / non-interactive nodes may stay degraded even if large

Without this rule, the engine may produce bad UX where selected objects become too coarse to manipulate.

---

## 9. Recommended LOD Tiers

Use discrete buckets first.  
Do not start with fully continuous LOD logic.

### LOD 0 — Full Detail

Typical condition:

- max screen size > 32 px
- or selected / hovered / editing

Behavior:

- full geometry
- full style
- full text rendering
- exact hit test allowed
- overlays visible
- group expansion allowed

### LOD 1 — Simplified Detail

Typical condition:

- 12 px < max screen size <= 32 px

Behavior:

- simplified path sampling
- disable expensive style effects
- text may use simplified shaping or coarse rendering
- hit test = bbox candidate + exact refinement when needed
- reduced overlay detail

### LOD 2 — Outline / Block Mode

Typical condition:

- 4 px < max screen size <= 12 px

Behavior:

- outline only, simplified fill, or bbox
- shadows/blur/dash off
- text becomes block placeholder
- internal group traversal reduced or collapsed
- hit test mostly bbox-based
- handles hidden

### LOD 3 — Dot / Skip Mode

Typical condition:

- max screen size <= 4 px

Behavior:

- draw point, tiny rect, cluster marker, or skip entirely
- no expensive hit testing
- not individually interactive except through box selection / zoom-in
- group internals never expanded

---

## 10. LOD Hysteresis

LOD thresholds must not be symmetric.

Otherwise, zooming near threshold causes flicker and constant switching.

Example:

```ts
type LodThresholds = {
  enterLod1: number;
  leaveLod1: number;
  enterLod2: number;
  leaveLod2: number;
  enterLod3: number;
  leaveLod3: number;
};
```

Example threshold logic:

- enter simplified mode below 30 px
- leave simplified mode above 36 px

This applies to:

- render mode
- cache bucket switching
- text placeholder switching
- group collapse/expand

---

## 11. Node-Type Specific LOD Strategy

Different node types must not share exactly the same LOD rules.

Define a per-node-type strategy interface.

```ts
type LodContext = {
  zoom: number;
  metrics: ScreenMetrics;
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  isTransforming: boolean;
};

type LodDecision = {
  lodLevel: 0 | 1 | 2 | 3;
  renderMode: "full" | "simplified" | "outline" | "bbox" | "dot" | "skip";
  hitMode: "exact" | "bbox_then_exact" | "bbox" | "top_block" | "none";
  overlayMode: "full" | "minimal" | "bbox_only" | "none";
  cacheMode:
    | "none"
    | "vector_precompute"
    | "bitmap_low"
    | "bitmap_medium"
    | "bitmap_high"
    | "tile";
  expandChildren: boolean;
};
```

```ts
interface LodStrategy {
  evaluate(node: SceneNode, ctx: LodContext): LodDecision;
}
```

### 11.1 Rect / Ellipse

- geometry simplification is minimal
- style degradation matters more than geometry degradation
- hit testing can stay cheap

Recommended focus:

- disable expensive style first
- bbox hit at low zoom
- keep vector drawing until style cost becomes dominant

### 11.2 Path / Pen / Brush

This is the most important target for geometry LOD.

Recommended actions:

- adaptive flatten tolerance based on zoom
- point reduction
- stroke detail degradation
- exact hit only when sufficiently large or active

Optional simplification methods:

- Douglas-Peucker
- Visvalingam-Whyatt
- custom flatten tolerance per zoom bucket

### 11.3 Text

Text should use semantic LOD more than geometric LOD.

Recommended actions:

- high zoom: full text layout
- medium zoom: cached glyph/text block
- low zoom: line blocks or text placeholder rects
- very low zoom: container only

Important:

Do not waste time shaping text that occupies only a few pixels on screen.

### 11.4 Image

Image LOD should be cache/resolution driven.

Recommended actions:

- high zoom: use full image or high-res tile
- medium zoom: use lower resolution mip-like representation
- low zoom: use low-res preview bitmap
- very low zoom: container/bbox only

### 11.5 Group / Frame / Component

Group nodes need semantic LOD and traversal LOD.

Recommended actions:

- high zoom: expand children
- medium zoom: expand visible important children only
- low zoom: collapse to cached group snapshot or group bounds
- very low zoom: top-level block only

This can drastically reduce traversal cost in deep scenes.

---

## 12. Quadtree Responsibilities

Quadtree must be treated as a core runtime index, not only as a visibility helper.

It should support at least:

1. viewport query
2. hit test candidate query
3. selection box query
4. dirty region query
5. optional density estimation for clustering / collapse heuristics

### 12.1 What Quadtree Should Index

At minimum:

- world bounds of visible/renderable nodes
- optional interaction bounds
- optional cache bounds
- z-order handle or stable scene ordering reference

Optional extra indexing:

- node flags
  - locked
  - hidden
  - interactive
  - cacheable
  - hasComplexGeometry

### 12.2 What Quadtree Should Not Do

Quadtree should not:

- own LOD policy
- own rendering decisions directly
- replace z-order sorting logic
- be the only source of truth for hierarchy

It is a candidate filter, not the full scene model.

---

## 13. Render Pipeline with Quadtree + LOD

Recommended render flow:

### Step 1 — Query visible candidates

Use viewport bounds to retrieve candidates from quadtree.

### Step 2 — Apply coarse filtering

Remove:

- hidden
- zero-opacity if fully skippable
- out-of-clip
- non-renderable nodes

### Step 3 — Sort by scene order / z-order

Quadtree output is not enough for correct draw order.

### Step 4 — Evaluate LOD per node

Use:

- zoom
- screen-space size
- interaction state
- node type
- parent context

### Step 5 — Decide traversal depth

For groups/frames/components:

- expand children
- render cached group snapshot
- render collapsed representation

### Step 6 — Select render source

For each node choose:

- full vector render
- simplified vector render
- cache bitmap render
- bbox/dot render
- skip

### Step 7 — Submit draw commands

Renderer consumes a planned display list rather than letting every node decide ad hoc during draw.

This is important because ad hoc draw-time decision logic becomes hard to optimize and reason about.

---

## 14. Hit Test Pipeline with Quadtree + LOD

Hit testing should have its own pipeline, not reuse render logic blindly.

### Step 1 — Query candidates from quadtree

Use pointer position or small hit tolerance area.

### Step 2 — Filter by interactivity

Remove:

- locked if not selectable
- hidden
- clipped out
- non-pickable overlays

### Step 3 — Sort by reverse paint order

Topmost first.

### Step 4 — Evaluate hit LOD

Based on:

- zoom
- node type
- interaction state
- current tool mode

### Step 5 — Apply precision policy

Possible modes:

- exact path/stroke
- bbox then exact refinement
- bbox only
- top-block only
- no hit

### Step 6 — Optional multi-hit / penetrate hit test

For overlap disambiguation or alt-select:

- continue traversal after first hit
- collect N best hits
- use exact refinement only on shortlist

This is much cheaper than exact-testing everything.

---

## 15. Hit Modes

Recommended hit modes:

```ts
type HitMode = "exact" | "bbox_then_exact" | "bbox" | "top_block" | "none";
```

### exact

Used for:

- editing active path
- handle dragging
- high zoom
- selected object precision interaction

### bbox_then_exact

Default for medium detail:

- bbox candidate filter
- only exact-test shortlisted items

### bbox

Used for low zoom or coarse objects.

### top_block

Used for collapsed groups / clusters / tiny objects.

### none

Used for decorative or too-small content at extreme zoom-out.

---

## 16. Multi-Hit Strategy

A mature editor should support multi-hit in dense overlaps.

Recommended approach:

1. query candidate set via quadtree
2. sort by z-order
3. coarse test with bbox
4. exact test only on top few or within tolerance shortlist
5. return ordered hit stack

Example result:

```ts
type HitResult = {
  primary: SceneNode | null;
  stack: SceneNode[];
};
```

This avoids the common bad design where hit test returns only one object too early.

---

## 17. Cache Architecture

Cache should not be a single generic map.

Use a structured cache key.

```ts
type CacheKey = {
  nodeId: string;
  cacheKind: "bitmap" | "vector_precompute" | "tile";
  zoomBucket: number;
  styleVersion: number;
  geometryVersion: number;
  contentVersion: number;
};
```

### 17.1 Cache Kinds

#### bitmap

Rasterized node/group snapshot

Good for:

- groups
- complex paths
- masked content
- text blocks
- effect-heavy nodes

#### vector_precompute

Pre-flattened path data or prepared draw commands

Good for:

- repeated vector drawing
- complex path simplification reuse

#### tile

Large content split into tiles

Good for:

- huge images
- huge frames
- giant groups

---

## 18. Cache Zoom Buckets

Do not generate cache for arbitrary zoom values.

Use discrete zoom buckets.

Example:

```ts
const ZOOM_BUCKETS = [0.125, 0.25, 0.5, 1, 2, 4];
```

Rule:

- map current zoom to nearest bucket
- reuse same cache inside the bucket range
- regenerate only when crossing bucket with hysteresis

This prevents cache thrashing during minor zoom changes.

---

## 19. Cache Invalidation

Cache invalidation must be explicit and version-based.

### Invalidate on:

- geometry change
- style change
- text content change
- image source change
- transform change if cache is transform-dependent
- child changes for group cache
- clip/mask changes
- effect chain changes

### Prefer versioning over ad hoc booleans

Use versions like:

- geometryVersion
- styleVersion
- contentVersion
- childrenVersion

This is easier to reason about than many loose dirty flags.

---

## 20. Cache Memory Control

Without memory budget, cache becomes a liability.

Recommended controls:

- total memory budget
- max cache texture size
- LRU eviction
- per-node cache size cap
- optional cache priority weights

Priority for retention:

1. currently visible
2. recently visible
3. selected / hovered / editing
4. expensive to rebuild
5. large but rarely used caches should be evicted sooner unless critical

---

## 21. Group Cache Rules

Group cache is often the most valuable optimization, but only under the right conditions.

Good candidates:

- large static groups
- effect-heavy groups
- text-rich groups
- masked compositions
- repeated subtree render

Bad candidates:

- frequently mutating groups
- groups whose children constantly animate independently
- groups under active editing
- groups where fine-grained hit feedback is required

When group cache is used, hit testing must still follow a logical model.  
Do not confuse “render from cache” with “interact as bitmap.”

---

## 22. Visual/Interaction Consistency Rule

A low-LOD visual must not imply a high-precision hidden interaction model unless intentionally designed.

Bad example:

- user sees only a rough bbox
- engine still exact-hits some invisible internal stroke detail

This feels broken.

Recommended rule:

- render model and hit model should stay close at low LOD
- if render is collapsed, hit should usually also be collapsed
- exceptions should be limited to selected / editing objects

---

## 23. Overlay Rules

Overlay should be treated separately from scene rendering.

Overlay includes:

- selection bounds
- resize handles
- rotate handle
- control points
- guides
- snap visuals
- hover affordance

Recommended rules:

- selected object overlay may remain visible even when scene content is simplified
- handles should disappear when screen size is too small
- collapsed objects should use bbox overlay only
- hover highlight should not trigger deep expensive overlay logic at low zoom

Example:

```ts
type OverlayMode = "full" | "minimal" | "bbox_only" | "none";
```

---

## 24. Parent-Child LOD Coordination

Parent context matters.

Examples:

- a collapsed group should usually suppress child render and child hit
- an editing text node inside a group may force parent expansion
- a selected child may require parent partial expansion
- clipped children outside parent viewport may still be skipped regardless of their own size

This means node LOD evaluation should optionally receive parent context.

```ts
type ParentLodContext = {
  parentCollapsed: boolean;
  parentClipActive: boolean;
  parentPromotedByInteraction: boolean;
};
```

---

## 25. Recommended Runtime Interfaces

```ts
type LodEvalInput = {
  node: SceneNode;
  zoom: number;
  viewport: Rect;
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  isTransforming: boolean;
  parentContext?: ParentLodContext;
};
```

```ts
type LodEvalOutput = {
  lodLevel: 0 | 1 | 2 | 3;
  renderMode: "full" | "simplified" | "outline" | "bbox" | "dot" | "skip";
  hitMode: "exact" | "bbox_then_exact" | "bbox" | "top_block" | "none";
  overlayMode: "full" | "minimal" | "bbox_only" | "none";
  cacheMode:
    | "none"
    | "vector_precompute"
    | "bitmap_low"
    | "bitmap_medium"
    | "bitmap_high"
    | "tile";
  expandChildren: boolean;
  useCache: boolean;
};
```

```ts
interface LodService {
  evaluate(input: LodEvalInput): LodEvalOutput;
}
```

---

## 26. Suggested Render Planner

```ts
interface RenderPlanner {
  buildFramePlan(params: {
    viewport: Rect;
    zoom: number;
    scene: SceneGraph;
    quadtree: SpatialIndex;
    interactionState: InteractionState;
  }): FramePlan;
}
```

`FramePlan` should contain:

- draw items
- cache requests
- skipped nodes
- expanded/collapsed groups
- optional debug metadata

This is better than burying all decisions directly in node draw methods.

---

## 27. Suggested Hit Test Planner

```ts
interface HitTestPlanner {
  hitTest(params: {
    worldPoint: Point;
    zoom: number;
    toolMode: ToolMode;
    scene: SceneGraph;
    quadtree: SpatialIndex;
    interactionState: InteractionState;
    multi?: boolean;
  }): HitResult;
}
```

This should reuse the same LOD service, but with hit-focused evaluation.

---

## 28. Path Simplification Strategy

For path-heavy editors, simplification should be bucketed and reusable.

Recommended:

- keep original canonical geometry untouched
- build simplified representations per zoom bucket
- reuse simplified geometry until geometryVersion changes

Example levels:

- bucket A: full bezier/path
- bucket B: moderate flatten tolerance
- bucket C: stronger simplification
- bucket D: outline/bbox only

This is usually better than recomputing simplification every frame.

---

## 29. Text LOD Strategy

Text is often expensive for the wrong reasons.

Recommended policy:

### High zoom

- full shaping/layout
- cursor/selection support if editing

### Medium zoom

- cached text surface
- no fine caret metrics unless active

### Low zoom

- line block placeholder
- no actual glyph rendering

### Very low zoom

- text container only

This can produce a major performance win in document-like or UI-heavy scenes.

---

## 30. Image LOD Strategy

Recommended:

- decode once if possible
- use multiple resolution representations
- treat image draw resolution separately from world size

At low zoom:

- use low-res source or preview bitmap

At medium zoom:

- use medium cached resolution

At high zoom:

- use full image or tile-based resolution

Large images should prefer tiling if zooming/panning is frequent.

---

## 31. Group Collapse Strategy

Groups/frames/components should support multiple collapse modes.

```ts
type GroupRenderMode =
  | "expanded"
  | "cached_snapshot"
  | "outline_only"
  | "bbox_only";
```

Suggested rule:

- if group screen size is large and active -> expanded
- if group is visible but static -> cached snapshot
- if group is small -> outline or bbox
- if tiny -> top-level block only

This is often where the biggest scene traversal savings come from.

---

## 32. Performance Targets by Scene Size

### 10K elements

Should be achievable with:

- viewport culling
- quadtree query
- discrete LOD tiers
- bbox-first hit test

No need for aggressive cache everywhere.

### 50K elements

Should add:

- group collapse
- path simplification buckets
- text placeholder mode
- bitmap cache for complex groups
- stronger hit LOD

### 100K elements

Usually requires:

- disciplined traversal planning
- aggressive collapse of tiny content
- strict cache memory budgeting
- image resolution LOD
- optional clustering for dense small objects
- possibly worker-assisted simplification/precompute

---

## 33. Debug / Instrumentation Requirements

A mature LOD system must be observable.

Recommended debug outputs:

- current LOD tier per node
- why a node was promoted/demoted
- cache hit/miss stats
- quadtree candidate count
- rendered node count
- exact-hit count vs bbox-hit count
- group expanded count vs collapsed count
- cache memory usage

Without debug visualization, LOD systems become impossible to tune.

Example debug flags:

- show screen-space bounds
- color nodes by LOD tier
- show cache source
- show quadtree cells
- show hit-test candidate counts

---

## 34. Common Failure Modes

### 34.1 Overusing Cache

Problem:

- too many bitmap caches
- memory spikes
- cache invalidates too often to be useful

Fix:

- only cache nodes with high rebuild cost and low mutation frequency
- use zoom buckets
- use LRU and memory budget

### 34.2 LOD Only in Render

Problem:

- draw is simplified, hit test remains expensive

Fix:

- hit LOD must be first-class

### 34.3 Quadtree Used Only for Visibility

Problem:

- hover and hit test still scan too much

Fix:

- reuse quadtree for interaction candidate generation

### 34.4 Selected Objects Degrade Too Much

Problem:

- selected content becomes hard to manipulate

Fix:

- promotion rule for selection/editing

### 34.5 Group Collapse Breaks UX

Problem:

- collapsed visuals but children still behave unexpectedly

Fix:

- synchronize render collapse and hit collapse

### 34.6 Threshold Flicker

Problem:

- mode constantly switches near threshold

Fix:

- hysteresis

---

## 35. Recommended Implementation Order

Do not implement everything at once.

### Phase 1

- unify LOD evaluation service
- screen-space thresholds
- quadtree-based viewport/hit candidate query
- selected/hovered promotion rules
- bbox-first hit pipeline

### Phase 2

- per-node-type LOD strategies
- path simplification buckets
- text placeholder mode
- overlay degradation

### Phase 3

- group collapse modes
- bitmap cache zoom buckets
- explicit cache invalidation versions
- memory budget + LRU

### Phase 4

- tiled cache for large content
- worker precompute for heavy simplification
- dense-scene clustering
- deeper instrumentation

---

## 36. Minimal Pseudocode

```ts
function evaluateNodeLod(node: SceneNode, ctx: LodContext): LodDecision {
  const promoted =
    ctx.isEditing || ctx.isTransforming
      ? 2
      : ctx.isSelected || ctx.isHovered
        ? 1
        : 0;

  const size = ctx.metrics.maxScreenSize;

  let baseLevel: 0 | 1 | 2 | 3;

  if (size > 32) baseLevel = 0;
  else if (size > 12) baseLevel = 1;
  else if (size > 4) baseLevel = 2;
  else baseLevel = 3;

  const lodLevel = Math.max(0, baseLevel - promoted) as 0 | 1 | 2 | 3;

  return getStrategyForNodeType(node.type).evaluate(node, {
    ...ctx,
    metrics: ctx.metrics,
    forcedLevel: lodLevel,
  } as any);
}
```

---

## 37. Recommended Final Rule Set

The engine should follow these rules:

1. Use quadtree to reduce candidate sets, not to decide final draw/hit behavior
2. Decide LOD in screen space, not only document space
3. Separate geometry/style/semantic/hit/cache LOD dimensions
4. Let node type define specialized LOD strategy
5. Promote selected/hovered/editing content
6. Collapse groups aggressively when zoomed out
7. Degrade hit test as aggressively as rendering when appropriate
8. Use cache with zoom buckets, versioned invalidation, and memory budget
9. Keep low-LOD visuals and low-LOD interaction behavior consistent
10. Add debug tooling early, or tuning will become blind

---

## 38. Conclusion

The purpose of this architecture is not merely to “have LOD,” but to make the entire engine behave consistently under scale.

A mature editor engine should not think of LOD as:

- one render trick
- one cache map
- one simplification pass

Instead, it should treat LOD as a **system-wide decision layer** connected to:

- spatial index
- rendering
- hit testing
- overlays
- cache
- hierarchy traversal
- interaction state

For a vector editor, the most practical and scalable approach is:

- **Quadtree for candidate reduction**
- **screen-space LOD for decision making**
- **node-type-specific strategies**
- **interaction-aware promotion**
- **cache with explicit policy**
- **hierarchy collapse for deep scenes**

That combination is far more useful than chasing isolated optimization tricks.
