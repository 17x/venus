# Venus Engine — 2D → 3D Runtime Architecture Blueprint

## Overview

Venus Engine is NOT a traditional editor engine.

It is designed as:

- Dimension-agnostic
- Retained-mode
- GPU-driven
- Multi-pass
- Real-time scene runtime

The architecture must support:

- 2D editors
- 3D editors
- CAD
- Motion graphics
- Animation tools
- Game runtime
- Visualization systems

The engine itself MUST NOT contain editor-specific logic.

---

# Core Principles

## 1. Engine Does NOT Understand Editor Concepts

The engine MUST NOT contain:

- selection
- hover
- drag
- gizmo
- marquee
- snap
- history
- inspector

Those belong to:

- editor runtime
- interaction runtime
- application layer

The engine only understands:

- scene
- transform
- geometry
- visibility
- render
- material
- gpu
- resource
- animation

---

## 2. Scene Layer != Render Layer

Scene hierarchy:

- persistent world organization

Render layer/pass:

- per-frame rendering strategy

Do NOT couple them.

Incorrect:

```txt
SceneLayer = RenderLayer
```

Correct:

```txt
Scene
→ Visibility
→ Render Graph
→ Render Passes
→ Composite
→ GPU Backend
```

---

## 3. Render Graph Based Architecture

The renderer is NOT:

```txt
single-pass immediate renderer
```

The renderer IS:

```txt
multi-pass retained renderer
```

Recommended passes:

```txt
BasePass
DepthPass
ShadowPass
LightingPass
OverlayPass
UIPass
PostProcessPass
CompositePass
```

---

## 4. Base / Active / Overlay Are Render Passes

These are NOT scene layers.

They are:

```txt
transient render composition layers
```

### BasePass

Responsibilities:

- stable scene rendering
- tile cache
- retained cache
- LOD rendering
- partial redraw

Characteristics:

- low frequency update
- aggressively cached

---

### ActivePass

Responsibilities:

- transform preview
- drag preview
- editing preview
- transient runtime state

Characteristics:

- high frequency update
- low latency
- minimal caching

---

### OverlayPass

Responsibilities:

- guides
- outlines
- grids
- debug overlays
- helper visualization

Characteristics:

- screen-space heavy
- often CPU generated

---

## 5. Render Is Backend-Agnostic

The render system MUST NOT understand:

- WebGL
- WebGPU
- Canvas2D

Render only produces:

```txt
render graph
render commands
render queues
```

GPU backend executes them.

---

## 6. Geometry Must Be World-Independent

Geometry cache MUST stay in:

```txt
object/local space
```

Never bake camera state into geometry cache.

Camera transforms happen later:

```txt
local
→ world
→ view
→ projection
→ screen
```

---

## 7. Visibility Is a First-Class System

Visibility is NOT part of render.

Visibility responsibilities:

- frustum culling
- occlusion culling
- LOD selection
- visible-set generation
- partition traversal

Visibility output:

```txt
VisibleSet
```

Render consumes VisibleSet.

---

## 8. Animation Updates Scene State

Animation MUST NOT modify GPU state directly.

Correct:

```txt
Animation
→ Scene State
→ Transform
→ Visibility
→ Render
```

Incorrect:

```txt
Animation
→ GPU
```

---

# Runtime Frame Pipeline

```txt
Input
→ Runtime Tasks
→ Animation Evaluation
→ Transform Propagation
→ Visibility Build
→ Render Graph Build
→ Render Pass Execution
→ Composite
→ GPU Submit
→ Present
```

---

# Engine Directory Structure

```txt
engine/
├── core/
├── scene/
├── transform/
├── geometry/
├── material/
├── lighting/
├── animation/
├── visibility/
├── spatial/
├── render/
├── gpu/
├── resource/
├── camera/
├── scheduler/
├── worker/
├── platform/
├── math/
├── debug/
├── tests/
├── assets/
└── types/
```

---

# Major System Responsibilities

## core/

Runtime infrastructure:

- lifecycle
- frame loop
- update scheduling
- dirty propagation
- task system
- event system
- version tracking

---

## scene/

Persistent world structure:

- node hierarchy
- traversal
- scene document
- serialization
- prefab
- scene query

---

## transform/

Spatial transform runtime:

- local transform
- world transform
- hierarchy propagation
- matrix composition
- projection
- coordinate conversion

Must be fully 3D-ready.

---

## geometry/

Pure geometry system.

Responsibilities:

- mesh
- path
- bezier
- tessellation
- topology
- procedural geometry
- bounds
- geometry cache
- flatten cache

Must stay independent from:

- camera
- visibility
- render passes

---

## material/

Surface description layer.

Responsibilities:

- material properties
- render states
- texture bindings
- shader bindings

---

## lighting/

Lighting runtime.

Responsibilities:

- light sources
- shadows
- environment lighting
- probes

---

## animation/

Time-based scene evaluation runtime.

Responsibilities:

- timeline
- keyframe
- interpolation
- curve evaluation
- blending
- state machine
- procedural animation
- skeletal animation

---

## visibility/

Visibility determination system.

Responsibilities:

- frustum culling
- occlusion culling
- LOD
- visible set generation
- partition traversal

---

## spatial/

Spatial indexing.

Responsibilities:

- quadtree
- octree
- BVH
- spatial hash
- grid
- spatial query

Must support both:

- 2D
- 3D

---

## render/

Render orchestration layer.

Responsibilities:

- render graph
- render passes
- batching
- render queues
- composition
- invalidation

Render MUST NOT directly depend on:

- WebGL
- WebGPU

---

## gpu/

GPU abstraction backend.

Backends:

```txt
webgl/
webgpu/
canvas/
```

Responsibilities:

- buffers
- textures
- pipelines
- command encoders
- synchronization
- GPU resources

Canvas backend is:

- fallback
- debug renderer
- snapshot renderer

NOT the primary renderer.

---

## resource/

Runtime resource management.

Responsibilities:

- cache
- pooling
- memory management
- streaming
- lifetime
- loading

---

## camera/

Camera runtime.

Responsibilities:

- perspective camera
- orthographic camera
- frustum
- viewport
- inertia
- interpolation
- projection

---

## scheduler/

Global runtime scheduler.

Responsibilities:

- frame scheduling
- task prioritization
- batching
- async update
- streaming update
- idle processing

---

## worker/

Background processing.

Responsibilities:

- tessellation
- geometry processing
- texture decode
- culling
- rasterization
- mesh optimization

---

## platform/

Platform abstraction.

Responsibilities:

- browser APIs
- OffscreenCanvas
- input bridge
- filesystem abstraction
- platform capability detection

---

## math/

Mathematics layer.

Responsibilities:

- vectors
- matrices
- quaternions
- frustum
- intersections
- easing
- projections
- noise

---

## debug/

Debug and tooling runtime.

Responsibilities:

- overlays
- runtime stats
- GPU profiler
- visualization
- render capture
- inspectors

---

## tests/

Engine verification.

Responsibilities:

- unit tests
- integration tests
- render snapshot tests
- stress tests
- regression tests
- visibility tests
- animation tests

---

# Camera Rendering Model

Camera movement should NOT rebuild the entire world.

Correct runtime flow:

```txt
Camera Motion
→ View Matrix Update
→ Visibility Re-evaluation
→ Render Pass Rebuild
→ Composite
```

NOT:

```txt
Camera Motion
→ Rebuild Geometry
```

---

# Geometry Cache Strategy

Recommended cache layers:

```txt
Raw Geometry Cache
→ Flatten Cache
→ Tessellation Cache
→ GPU Upload Cache
→ Render Batch Cache
```

Never mix:

- world transform
- camera transform
- projection transform

into geometry cache.

---

# Retained Rendering Model

The engine should operate as:

```txt
retained-mode renderer
```

NOT:

```txt
immediate-mode renderer
```

Meaning:

- scene persists
- render state persists
- GPU resources persist
- visibility persists
- caches persist

Only invalidated regions update.

---

# Recommended Long-Term Direction

The architecture should eventually support:

- WebGPU
- GPU-driven rendering
- compute culling
- GPU visibility
- GPU animation
- async streaming
- partial scene evaluation
- virtualized rendering
- massive scene rendering

---

# Final Architectural Goal

The final architecture is NOT:

```txt
2D editor engine
```

The final architecture IS:

```txt
Dimension-agnostic
Retained GPU Scene Runtime
```

Where:

- editor
- game
- CAD
- animation tool
- visualization system

are all:

```txt
runtime specializations
```

built on top of the same engine.
