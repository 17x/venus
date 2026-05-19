# Venus Monorepo Architecture (Deep Dive)

# 1. Core Philosophy

Venus 不是一个普通 editor。

目标是：

```txt
Cross Platform Graphics Runtime
```

而不是：

```txt
Canvas Editor
```

核心设计目标：

- Cross Platform
- Renderer Agnostic
- Headless
- AI Friendly
- Massive Scale
- Worker Friendly
- Runtime Oriented
- Plugin Driven
- Incremental Execution
- Deterministic
- Large Scene Ready
- Multi Backend
- Optional Features
- Streaming First
- Long Term Maintainability

---

# 2. Monorepo Topology

推荐：

```txt
packages/
├── lib
├── runtime
├── engine
├── editor-primitive
├── renderer-canvas2d
├── renderer-webgl
├── renderer-webgpu
├── platform-browser
├── platform-electron
├── platform-node
├── plugin-text
├── plugin-history
├── plugin-animation
├── plugin-video
├── plugin-collab
├── plugin-export
├── plugin-medical
├── plugin-gis
├── plugin-cad
├── plugin-bim
├── plugin-timeline
├── app-vector
├── app-video
├── app-medical
├── app-gis
└── app-editor-shell
```

---

# 3. Dependency Direction

严格单向依赖：

```txt
lib
 ↑
runtime
 ↑
engine
 ↑
editor-primitive
 ↑
plugins
 ↑
apps
```

禁止：

```txt
engine -> react
engine -> vue
engine -> dom
engine -> app
runtime -> engine
lib -> engine
```

否则：

- circular dependency
- bundle explosion
- platform coupling
- unstable runtime
- AI refactor corruption

---

# 4. Package Responsibilities

# 4.1 @venus/lib

纯基础层。

绝对禁止：

```txt
DOM
GPU
Window
Renderer
React
```

## Responsibilities

```txt
math
matrix
vector
quaternion
bezier
geometry
event emitter
immutable helpers
memory pools
typed array helpers
assertions
profiling utils
bitset
id allocator
hash
```

## Example

```txt
lib/
├── math
├── geometry
├── memory
├── collections
├── event
├── profiling
└── utils
```

---

# 4.2 @venus/runtime

真正的平台抽象层。

## Responsibilities

```txt
frame scheduling
worker abstraction
clock
storage
clipboard
pointer
keyboard
ime
cursor
filesystem
network
performance timing
```

## RuntimeAdapter

```ts
export interface RuntimeAdapter {
  requestFrame(cb: FrameRequestCallback): Dispose;

  createCanvas(): CanvasLike;

  createWorker(url: string): WorkerLike;

  now(): number;

  setCursor(cursor: CursorType): void;

  clipboard?: ClipboardAdapter;

  storage?: StorageAdapter;

  fs?: FileSystemAdapter;
}
```

## Important

engine 禁止直接访问：

```txt
window
document
navigator
HTMLElement
```

---

# 4.3 @venus/engine

核心 runtime。

不是 editor。

不是 UI。

不是 React integration。

是：

```txt
graphics runtime kernel
```

---

# 5. Engine Internal Architecture

推荐：

```txt
engine/src
├── animation
├── asset
├── cache
├── command
├── document
├── ecs
├── geometry
├── gpu
├── interaction
├── layout
├── material
├── math
├── memory
├── plugin
├── render
├── renderer
├── runtime
├── scene
├── scheduler
├── spatial
├── streaming
├── task
├── threading
├── timeline
├── transform
├── visibility
├── worker
└── diagnostics
```

---

# 6. Core Execution Layers

推荐：

```txt
Document Layer
 ↓
Scene Layer
 ↓
Visibility Layer
 ↓
Extraction Layer
 ↓
Render Planning Layer
 ↓
Renderer Backend Layer
 ↓
GPU Execution Layer
```

---

# 7. Renderer Architecture

不要：

```txt
node.render(ctx)
```

必须：

```txt
Document
 -> Scene Graph
 -> Display List
 -> Render Command
 -> Render Graph
 -> Backend
```

---

# 8. Multi Backend Renderer

必须 renderer agnostic。

## Backends

```txt
Canvas2D
WebGL
WebGPU
SVG
Headless
```

## Backend Selection

默认：

```txt
auto detect
```

流程：

```txt
WebGPU available?
  YES -> WebGPU
  NO  -> WebGL
  NO  -> Canvas2D
```

## API

```ts
createEngine({
  backend: "auto",
});
```

或者：

```ts
createEngine({
  backend: "webgpu",
});
```

---

# 9. Render Command Architecture

不要直接 draw。

必须 command 化。

## Command Flow

```txt
Document
 -> extraction
 -> render command
 -> batching
 -> gpu packet
 -> backend execution
```

---

# 10. Render Layers

你当前设计里的：

```txt
base
active
overlay
```

是正确的。

必须保留。

但要升级为 runtime layer system。

---

# 11. Layer Runtime Architecture

推荐：

```txt
layers/
├── base
├── active
├── overlay
├── debug
├── interaction
├── transient
├── composition
└── presentation
```

---

# 12. Layer Responsibilities

# Base Layer

稳定缓存层。

## Responsibilities

```txt
static scene
stable tiles
background geometry
heavy cache
```

---

# Active Layer

高频交互层。

## Responsibilities

```txt
dragging
transform
hover
preview
selection transform
```

必须：

```txt
zero cache rebuild
```

---

# Overlay Layer

UI overlay。

## Responsibilities

```txt
guides
snap lines
selection bounds
anchors
rulers
marquee
```

---

# Interaction Layer

```txt
cursor
hover hints
hit preview
interaction visualization
```

---

# Debug Layer

```txt
fps
quadtree
overdraw
lod
visibility
```

---

# 13. Scene Graph

Scene Graph 不是 document tree。

必须区分：

```txt
Document Tree
Scene Graph
Render Graph
Spatial Graph
```

---

# 14. Document Layer

只负责：

```txt
persistent state
serialization
history
crdt
```

不要放：

```txt
gpu state
cache
hover
selection
```

---

# 15. Runtime State Separation

推荐：

```txt
Document State
Render State
Interaction State
Spatial State
Derived State
Computed State
Streaming State
```

避免：

```txt
node 上挂所有状态
```

---

# 16. Spatial System

工业级必须独立 spatial layer。

## Structures

```txt
Quadtree
RTree
BVH
Spatial Hash
Uniform Grid
```

---

# 17. Spatial Responsibilities

```txt
visibility
culling
hitTest
selection
snap
streaming
lod
```

---

# 18. HitTest Architecture

必须：

```txt
coarse phase
fine phase
```

---

# 19. Coarse HitTest

使用：

```txt
AABB
Quadtree
BVH
```

快速过滤。

---

# 20. Fine HitTest

使用：

```txt
bezier flattening
stroke expansion
outline cache
distance threshold
mesh raycast
```

---

# 21. Penetration HitTest

必须支持：

```txt
all hits
```

而不是只返回 top hit。

## API

```ts
hitTest({
  mode: "all",
});
```

---

# 22. Visibility Runtime

不要每帧全遍历。

必须：

```txt
incremental visibility
```

---

# 23. Visibility Pipeline

```txt
viewport
 -> frustum
 -> spatial query
 -> lod resolve
 -> visibility set
```

---

# 24. Tile Runtime

大场景核心。

## Tile Responsibilities

```txt
cache
lod
partial redraw
streaming
```

---

# 25. Overscan

必须：

```txt
viewport + overscan
```

否则拖动白边。

---

# 26. Scheduler Architecture

不要所有任务同步执行。

---

# 27. Scheduler Priorities

```txt
Immediate
High
Normal
Idle
Background
```

---

# 28. Task Examples

| task             | priority   |
| ---------------- | ---------- |
| cursor           | immediate  |
| hover            | immediate  |
| selection        | high       |
| render           | high       |
| tile rebuild     | normal     |
| quadtree rebuild | idle       |
| thumbnail export | background |

---

# 29. Frame Pipeline

推荐：

```txt
input
 -> interaction
 -> document patch
 -> invalidation
 -> visibility
 -> extraction
 -> batching
 -> render graph
 -> backend
 -> gpu submit
 -> presentation
```

---

# 30. Invalidation System

不要全量重建。

必须：

```txt
dirty propagation
```

---

# 31. Dirty Flag Types

```txt
geometry dirty
paint dirty
transform dirty
layout dirty
visibility dirty
cache dirty
```

---

# 32. GPU Architecture

推荐：

```txt
gpu/
├── buffer
├── texture
├── upload
├── bindgroup
├── pipeline
├── command
├── synchronization
└── memory
```

---

# 33. GPU Upload Management

必须：

```txt
upload throttling
```

否则：

```txt
upload pressure spike
```

---

# 34. Runtime Budget System

必须 runtime budget 化。

---

# 35. Budget Categories

```txt
cpu budget
gpu budget
memory budget
upload budget
visibility budget
worker budget
```

---

# 36. Runtime Pressure System

必须监控：

```txt
memory pressure
gpu pressure
upload pressure
visibility pressure
thermal pressure
```

---

# 37. Streaming System

未来大型场景必须 streaming first。

---

# 38. Streaming Responsibilities

```txt
asset loading
texture loading
geometry loading
virtual texture
scene streaming
background loading
```

---

# 39. Worker Architecture

推荐：

```txt
main thread
 -> scheduler
 -> worker pool
```

---

# 40. Worker Tasks

```txt
path flatten
boolean ops
tile raster
image decode
mesh processing
layout
export
```

---

# 41. ECS Usage

ECS 不要强行全覆盖。

推荐：

```txt
runtime state use ECS
persistent document not use ECS
```

---

# 42. Plugin Architecture

必须插件化。

## Plugin Interface

```ts
interface EnginePlugin {
  name: string;

  setup(engine): void;

  dispose(): void;
}
```

---

# 43. Plugin Lifecycle

```txt
onInit
onMount
onFrame
onPointerDown
onPointerMove
onPointerUp
onDispose
```

---

# 44. Optional Features

必须模块可选。

## Example

```ts
createEditor({
  text: false,
  animation: false,
  video: false,
  collab: false,
});
```

---

# 45. Bundle Size Strategy

## Must

```json
{
  "sideEffects": false
}
```

---

# 46. Deep Import

不要：

```ts
import * as Engine from "@venus/engine";
```

必须：

```ts
import { Quadtree } from "@venus/engine/spatial";
```

---

# 47. Dynamic Feature Loading

```ts
await import("@venus/plugin-text");
```

---

# 48. Headless Runtime

必须支持：

```txt
SSR
Node
Worker
thumbnail generation
server export
AI rendering
```

---

# 49. Headless Requirements

```txt
No DOM
No Browser API
No React
```

---

# 50. React Integration

React 不能驱动 engine。

---

# 51. Correct Model

```txt
Engine owns runtime
React subscribes snapshots
```

---

# 52. React Responsibilities

```txt
toolbar
panel
menu
settings
forms
```

---

# 53. Diagnostics System

必须内建。

## Diagnostics

```txt
frame profiler
gpu profiler
memory profiler
overdraw
visibility
lod
upload heatmap
runtime inspector
```

---

# 54. AI Friendly Design

AI 最怕：

```txt
huge files
implicit mutation
hidden lifecycle
circular dependencies
unstable contracts
```

---

# 55. AI Friendly Requirements

## Small Modules

```txt
single responsibility
```

---

## Stable Contracts

```ts
RenderCommand;
HitTestResult;
FrameContext;
```

---

## Explicit Lifecycle

```txt
setup
update
dispose
```

---

## Layer README

每层必须：

```txt
responsibility
input
output
dependencies
thread boundary
forbidden usage
```

---

# 56. Multi Scenario Design

目标场景：

```txt
2D vector editor
video editor
medical imaging
BIM/CAD
GIS
molecular rendering
digital twin
3D commerce
game level editor
```

---

# 57. Common Core Principle

不要按业务写 engine。

必须：

```txt
generic runtime primitives
```

例如：

```txt
scene
camera
visibility
streaming
scheduler
layer
render graph
```

而不是：

```txt
medical renderer
vector renderer
```

---

# 58. Final Engine Positioning

最终目标：

```txt
Document Runtime
+
Scene Runtime
+
Interaction Runtime
+
Render Runtime
+
GPU Runtime
+
Scheduler
+
Plugin System
+
Streaming System
+
Headless Runtime
+
Cross Platform Runtime
```

---

# 59. Final Direction

不是：

```txt
canvas editor
```

而是：

```txt
graphics operating runtime
```
