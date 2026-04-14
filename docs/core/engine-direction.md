# Engine Internal Rendering Architecture

## Scope

The external document model already exists and is out of scope.

The engine must **not** own, define, or constrain business document schemas.  
Its responsibility starts only after upstream data is adapted into engine-facing render input.

Target pipeline:

**External Document Model -> Adapter / Compiler -> Engine Input -> Engine Scene Model -> Render Packets / Commands -> WebGL Pipeline -> Overlay Pipeline**

The engine is a **GPU-first large-scene rendering system**, not a business object system.

---

## Primary Decision

For a target involving:

- **50K–100K elements**
- potentially **many images**
- large zoomable/pannable scenes
- high-frequency interactions

the engine should use **WebGL as the only primary rendering backend**.

Canvas should **not** remain as a full production renderer.

Canvas may still exist only as a **thin utility layer** for:

- debug/reference output
- text rasterization
- temporary offscreen raster work
- export helpers
- isolated fallback utilities

Canvas must not shape the main engine API.

---

## Non-Goals

The engine should not directly own:

- external document/business node definitions
- final business-semantic hit testing
- app-specific interaction meaning
- business command systems
- domain-level layout semantics
- product-specific editor logic

The engine should expose rendering and interaction infrastructure, not business meaning.

---

## Engine Responsibilities

The engine should own these responsibilities:

1. accept adapted upstream render input
2. normalize it into internal scene primitives
3. compute geometry/layout/render metadata
4. build scalable indices and visibility state
5. compile scene data into optimized render packets
6. manage GPU resources and caches
7. execute through a WebGL-first rendering pipeline
8. provide low-level render hit / picking support
9. provide overlay rendering infrastructure

The engine is a **scene compilation, resource management, and GPU rendering system**.

---

## Core Design Principle

Do **not** design the engine around business element categories like:

- drawRect
- drawCircle
- drawTable
- drawMindMapNode
- drawFlowBlock
- drawConnector

Instead design around reusable rendering capabilities:

- **geometry**
- **paint**
- **text**
- **image**
- **composition**
- **clipping**
- **effects**
- **batching**
- **resource management**
- **visibility**
- **interaction infrastructure**
- **overlay rendering**

Any upstream business node should be expressible as a combination of these capabilities.

---

## Architecture Overview

The engine should be split into these internal layers:

### 1. Adapter Boundary

A boundary layer converts external/business nodes into engine-readable render input.

The engine should not depend on upstream types like:

- table
- mindmap node
- connector
- form block
- custom app node

Upstream systems must adapt them into engine-facing render fragments.

---

### 2. Engine Input Layer

This is the compact input format accepted by the engine after adaptation.

It should contain only the minimum data needed to build render state.

Typical contents:

- primitive descriptor
- transform
- style/paint descriptor
- ordering metadata
- clip/effect references
- binding metadata
- visibility/interactivity flags

The engine input should stay compact and stable.

---

### 3. Engine Scene Model

The engine should define a small set of renderer-agnostic scene primitives.

Recommended internal primitive categories:

- `Shape`
- `Text`
- `Image`
- `Group`
- `Clip`
- `Mask`
- `Effect`
- `OverlayItem`
- optional `BatchItem` / `InstanceBatch`

The engine should understand **rendering primitives**, not business semantics.

Examples:

- a mindmap node becomes shape + text + optional icon + binding metadata
- a table becomes cell backgrounds + borders + text fragments
- a connector becomes path + markers + label
- a business widget becomes one or more shapes/text/images plus overlay descriptors

---

### 4. Geometry / Layout / Computed State

The engine should own computed render state such as:

- local bounds
- world bounds
- transforms
- path geometry
- stroke geometry
- text layout results
- image fit results
- clip geometry
- hit regions
- culling metadata
- batching metadata

This is internal rendering state, not business document state.

---

### 5. Spatial / Visibility Layer

The engine should maintain indices and visibility data for scalable rendering and interaction.

Used for:

- viewport culling
- hit candidate lookup
- region queries
- selection assistance
- overlay lookup
- incremental invalidation

---

### 6. Render Packet / Command Layer

The engine should compile scene nodes into lower-level execution units, such as:

- draw shape
- draw image
- draw text run
- push clip
- pop clip
- begin pass
- apply effect
- composite pass
- draw overlay item

Ideal flow:

**SceneNode -> RenderPacket -> Batched GPU Commands**

The renderer should execute packets, not interpret business objects directly.

---

### 7. GPU Resource Layer

The engine should explicitly manage:

- textures
- glyph atlases
- image caches
- vertex/index buffers
- framebuffers / render targets
- pass resources
- upload queues

All large resources must be budgeted and evictable.

---

### 8. Overlay Pipeline

The engine should provide a dedicated overlay rendering mechanism.

This does **not** mean the engine owns all overlay semantics.

It means the engine owns:

- overlay render pass
- overlay coordinates/transforms
- overlay redraw strategy
- overlay z-layering
- optional overlay hit infrastructure

Business systems may generate overlay items, but the engine renders them efficiently.

---

## Internal Engine Model

The engine should clearly separate these internal domains.

### Scene Content

What should be rendered.

### Computed Geometry

Where and how it should be rendered.

### Visibility / Index State

What is visible and searchable.

### Render Packets

How submission is organized.

### GPU Resources

Textures, buffers, atlases, framebuffers, pass resources.

### Interaction Metadata

Render hit data, binding info, overlay references.

These should not be collapsed into one giant mutable node object.

---

## Recommended Internal Concepts

### SceneNode

A render-facing unit with common fields like:

- id
- visibility
- opacity
- transform
- z order
- clip reference
- effect reference
- batch metadata
- binding reference

Then specialized internally as:

- shape node
- text node
- image node
- group node
- clip node
- effect node
- overlay node

---

### Geometry Objects

Reusable computed geometry such as:

- rect geometry
- rounded rect geometry
- ellipse geometry
- path geometry
- polyline geometry
- tessellated fill
- stroke mesh

---

### Paint Objects

Reusable paint/material definitions such as:

- solid fill
- gradient fill
- image fill
- stroke style
- pattern fill

---

### Text Layout Objects

Text should use precomputed renderable layout data:

- glyph runs
- line boxes
- alignment results
- bounds
- atlas/texture references

---

### Image Resource Objects

Images should resolve to engine-managed handles:

- source metadata
- decoded state if needed
- texture handle
- upload state
- cache state
- size estimate
- last-used data
- zoom/downsample metadata

---

### Effect / Pass Objects

Effects should be explicit compositing descriptions:

- opacity
- shadow
- blur
- color adjustment
- mask
- blend/composite pass

---

## External Model to Engine Communication

The engine should not receive the full business document tree every time.

It should receive **compiled engine input fragments** through a stable boundary.

Recommended direction:

**External Model -> Adapter / Compiler -> Incremental Engine Patches**

The external system remains the owner of business state.  
The engine remains the owner of render state.

---

## Mapping Between External Model and Engine

A single external business node may compile into many render items.

Examples:

- one mindmap node -> background shape + title text + icon + ports
- one table -> many cell backgrounds + borders + text fragments
- one connector -> stroke + arrowhead + label + optional control visuals

So the mapping must support:

- **1 -> many**
- **many -> 1**
- **1 -> semantic subparts**

This mapping must be explicit and stable.

---

## Binding Layer

The engine should carry only minimal binding metadata, not business objects.

Recommended minimal binding contents:

- owner id
- owner type
- role
- semantic path
- selectable/interactable flags
- hit priority

The engine does not need to understand what these mean.

It only stores and returns them.

This lets upstream resolve render hits into business semantics without forcing engine knowledge of business structure.

---

## Recommended Patch-Based Communication

The external layer should communicate with the engine using incremental patch operations, not full scene replacement.

Typical patch categories:

- add items
- update items
- remove items
- reorder items
- update overlay items
- resource hint changes

The engine should update only affected:

- scene fragments
- geometry
- indices
- bindings
- render packets
- GPU resources

This is required for large scenes and high-frequency interaction.

---

## Stable Identity Requirement

Render item ids must be as stable as possible.

If ids are recreated constantly, then all of these become more expensive:

- binding lookup
- cache reuse
- spatial index maintenance
- diffing
- render packet reuse
- GPU resource reuse

Stable ids are mandatory for scalable incremental updates.

---

## Large-Scale Scene Optimization Requirements

This section is mandatory.

### 1. Viewport Culling

The engine must never assume the whole scene is renderable every frame.

Required:

- viewport-based visibility checks
- world-bounds culling
- hierarchical culling where useful
- skip render packet generation for invisible content where possible

At 50K–100K elements, culling is not optional.

---

### 2. Spatial Index

The engine should maintain a spatial index for:

- visibility queries
- hit candidate queries
- selection region queries
- invalidation region queries
- overlay lookup

Possible implementations:

- R-tree
- Quadtree
- uniform grid / spatial hash
- subtree bounds hierarchy

Do not linearly scan the full scene every frame.

---

### 3. Dirty Update Pipeline

The engine must avoid full rebuilds for small edits.

Track dirty changes separately:

- structure changes
- style changes
- transform changes
- geometry changes
- text changes
- resource changes
- overlay changes

Incrementally rebuild only affected:

- scene fragments
- geometry buffers
- text layouts
- visibility data
- render packets
- GPU uploads

Goal:

**small edits should trigger small rebuilds**

---

### 4. Batching

The engine must batch aggressively.

Batch keys may include:

- primitive type
- paint/material type
- texture/page
- shader program
- blend/composite mode
- clip/effect compatibility
- fill/stroke mode

The engine should group compatible draw items to reduce:

- draw calls
- state switches
- texture binds
- shader swaps

At this scale, batching is a primary design concern.

---

### 5. Instancing

Where repeated visual structures exist, the engine should support instancing or instance-like submission.

Useful for:

- repeated shells
- repeated icons
- repeated handles
- repeated ports
- repeated simple decorations
- large sets of similar shapes

Do not force every repeated item through a totally unique draw path.

---

### 6. GPU Resource Management

The engine needs explicit resource budgeting.

Manage:

- textures
- atlases
- buffers
- framebuffers
- offscreen targets
- glyph pages

Each large resource should track:

- estimated size
- usage state
- last-used frame/time
- eviction eligibility

No unbounded caches.

---

### 7. Texture Cache / Image Strategy

For image-heavy scenes, use a layered strategy:

- source metadata cache
- decoded cache if needed
- texture cache
- texture LRU
- small image atlas/page strategy where useful
- dedicated textures for large images

Also support:

- deferred upload
- upload throttling
- zoom-aware downsample strategy
- offscreen discard policy
- visibility-driven retention

Do not upload every image at full resolution immediately.

---

### 8. Text Rendering Strategy

Text must not be naive per-frame redraw logic.

Use:

- text layout cache
- glyph atlas or text texture cache
- text block cache where appropriate
- separate editing overlay strategy for complex editable text
- zoom-aware raster policy if needed

Static display text and live editing text do not have to use the same pipeline.

---

### 9. Render Pass Control

Effects, masks, clips, and filters can become very expensive.

The engine needs explicit pass policy:

- create offscreen passes only when required
- merge compatible passes where possible
- cap or simplify nested effects
- cache reusable pass results when stable
- prefer inline/simple paths when possible

Do not let every node freely spawn expensive offscreen rendering.

---

### 10. Partial Rendering / Region Awareness

The engine should distinguish between:

- full scene redraw
- overlay redraw
- partial scene rebuild
- partial packet update

Useful especially for:

- hover updates
- selection visuals
- drag handles
- blinking caret
- local edits
- overlay-only changes

---

### 11. Level of Detail / Simplification

For zoomed-out dense scenes, the engine should support simplification.

Examples:

- hide tiny decorations
- collapse detailed text
- simplify strokes
- use lower-resolution textures
- skip expensive effects below thresholds

Not everything should render identically at all zoom levels.

---

### 12. Async / Staged Preparation

The engine should separate:

- scene updates
- geometry compilation
- text shaping/layout
- resource upload
- final draw submission

Some work can be staged across frames to reduce stalls.

Important for:

- initial load
- image-heavy documents
- mass insertions
- zoom jumps into dense areas

---

### 13. Memory Budgeting

The engine should define explicit soft/hard budgets for:

- texture memory
- atlas pages
- glyph cache
- geometry buffers
- offscreen targets

When over budget, degrade predictably:

- evict unused textures
- drop cached text blocks
- release pass resources
- lazily rebuild later

Without budgets, large scenes eventually become unstable.

---

## Hit Testing and Picking

### Key Principle

The engine should **not** own final business-semantic hit testing.

Because external document structure is variable, the engine cannot decide:

- what business object should be returned
- whether a sub-fragment should map to a cell, node, edge, port, or parent
- how app-specific hit priority should behave

That belongs outside the engine.

---

### What the Engine Should Own

The engine should provide **render-level hit infrastructure**:

- spatial candidate lookup
- coarse bounds hit testing
- optional geometry-level hit testing
- optional text hit support
- overlay hit support if needed
- render hit result reporting

The engine returns **render hits**, not final business-semantic hits.

---

### Recommended Hit Pipeline

#### Step 1: Engine Render Hit

The engine finds candidate render items and returns low-level hit results.

Possible returned information:

- render item id
- fragment or part
- local point
- world point
- distance / priority hints

#### Step 2: Binding Lookup

The external or adapter layer looks up minimal binding metadata by render item id.

#### Step 3: Semantic Resolution

The external layer decides what the hit means in business terms.

This is where rules like these belong:

- cell vs table
- label vs node body
- connector handle vs connector edge
- child part vs parent object
- app-specific hit priority

---

### Performance Notes for Hit Testing

The main bottleneck is usually **not mapping itself**, but bad synchronization strategy.

Avoid these mistakes:

- full scene recompilation on pointer move
- unstable render item ids
- business tree scans after every render hit
- heavy precise hit testing for all candidates
- duplicating full business data into engine nodes

Correct approach:

- stable render ids
- direct renderItemId -> binding lookup
- spatial pruning first
- precise refinement only for a small candidate set
- semantic resolution outside engine

---

## Overlay System

### Important Distinction

Overlay **rendering infrastructure** can belong to the engine.  
Overlay **business meaning** usually belongs to the external/business layer.

This distinction matters.

---

### Engine-Owned Overlay Responsibilities

The engine may own:

- overlay render pass
- overlay coordinate transforms
- overlay z-ordering
- overlay redraw strategy
- overlay primitive rendering
- optional overlay hit infrastructure

These are rendering/editor infrastructure concerns.

---

### Business-Owned Overlay Responsibilities

The business layer should decide:

- which overlay items exist
- what they mean
- what actions they trigger
- how business-specific handles behave

Examples of business-owned semantics:

- mindmap expand/collapse button
- table column resize control
- connector control point meaning
- domain-specific operation buttons
- app-specific ports

The engine can render them, but should not define their meaning.

---

### Neutral Rule

The engine owns the **overlay mechanism**.  
The external/business layer owns the **overlay semantics**.

---

## Recommended Responsibility Split

### External / Business Layer Owns

- business document model
- semantic node hierarchy
- domain-specific interaction meaning
- semantic hit resolution
- overlay semantics
- business commands and transactions

### Adapter / Compiler Owns

- converting business nodes into engine input
- generating bindings
- producing overlay descriptors
- incremental patch generation

### Engine Owns

- scene model
- computed geometry
- visibility/index state
- render packets
- GPU resources
- render-level hit infrastructure
- overlay rendering pipeline
- WebGL execution

---

## WebGL-First Requirements

Since WebGL is the only primary backend, the engine should be designed around:

- batch-friendly command generation
- instance-friendly data structures
- texture atlas management
- texture LRU
- glyph/text caches
- culling
- dirty propagation
- staged uploads
- offscreen target reuse
- pass graph control
- predictable memory budgeting
- scalable picking
- overlay separation

These are first-class design requirements, not later optimizations.

---

## Recommended Final Pipeline

**External Model**  
-> adapted into  
**Engine Input Fragments**  
-> normalized into  
**Engine Scene Nodes**  
-> indexed into  
**Visibility / Spatial Structures**  
-> compiled into  
**Render Packets / Batches**  
-> resolved through  
**GPU Resource Manager / Pass System**  
-> executed by  
**WebGL Renderer**  
-> combined with  
**Overlay Renderer**  
-> queried through  
**Render Hit Infrastructure**  
-> interpreted by  
**External Semantic Hit Resolver**

Canvas remains only as a support utility outside the main render path.

---

## Final Conclusion

The engine should ignore upstream business document modeling and define only its own internal render architecture:

- compact scene primitives
- computed geometry
- visibility/index systems
- render packets
- GPU resource systems
- overlay rendering infrastructure
- render-level hit infrastructure
- large-scene optimization mechanisms

For your target scale, optimization is not optional.  
Culling, batching, dirty propagation, texture budgeting, staged uploads, stable ids, patch-based synchronization, overlay separation, and scalable render-level hit testing must be part of the architecture from the start.

The engine should own **mechanism**, not **business meaning**.
