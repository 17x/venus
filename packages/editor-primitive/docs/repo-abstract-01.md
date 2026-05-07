

# packages/editor-interaction 抽象设计

## 1. 最终决定

不把 interaction / overlay / cursor 合并进 engine。

单独做一个通用包：

```txt
packages/editor-interaction
```

定位：

```txt
editor-interaction 是编辑器交互运行时抽象层。

它负责：
  pointer / keyboard / modifier runtime
  tool runtime
  active operation lifecycle
  drag / gesture runtime
  hover runtime
  cursor intent / cursor manager / cursor applier
  dynamic overlay primitives
  overlay hit test helpers
  overlay action passthrough

它不负责：
  WebGL 渲染
  tile cache
  snapshot cache
  quadtree
  vector document model
  vector history / collaboration
  vector path / text / image / frame 产品语义
```

一句话：

```txt
editor-interaction 抽象“用户怎么操作”，不抽象“文档是什么”。
```

---

## 2. 为什么不放进 engine

Engine 虽然是面向编辑器应用优化的，但它仍然应该保持渲染引擎边界。

Engine 可以负责：

```txt
Static Base Layer
Active Element Layer
Dynamic Overlay Layer 的 WebGL 渲染
WebGL renderer
tile cache
snapshot cache
LOD
quadtree / spatial index
scene hit test
overlay hit test 执行
render scheduler
camera / viewport
```

但 engine 不应该负责：

```txt
Space 临时 pan 是什么产品规则
Alt/Cmd 如何切 zoom-in / zoom-out
path anchor point 的编辑语义
image crop 的业务行为
auto layout spacing drag 的业务行为
text editing 的 history commit 规则
vector selection policy
xmind topic selection policy
```

如果把 interaction 放进 engine，engine 会逐渐变成产品编辑器。

所以原则是：

```txt
Engine 负责渲染和命中。
editor-interaction 负责通用交互状态和反馈。
Vector/XMind 等产品负责产品语义。
```

---

## 3. 包职责边界

### 3.1 editor-interaction 负责

```txt
PointerRuntime
KeyboardRuntime
ModifierKeys
ToolRuntime
EffectiveTool resolver
ActiveOperation lifecycle
DragRuntime
GestureRuntime
HoverRuntime
OverlayRuntime
CursorIntent
CursorManager
CursorApplier
Overlay primitives types
Overlay hit test helper types
OverlayAction passthrough
zIndex sorting
screen-space hit tolerance helpers
resize cursor rotation mapping
```

### 3.2 editor-interaction 不负责

```txt
VectorDocument
SceneNode
PathNode
TextNode
GroupNode
worldMatrix 计算
worldBounds 计算
text layout
path command parsing
auto layout calculation
quadtree internal structure
tile cache
snapshot cache
history operation
collaboration operation
WebGL shader / draw call
```

### 3.3 vector-core 负责

```txt
vector document model
vector runtime cache
worldMatrix / bounds / layout / text layout
vector commands
history
collaboration operation
vector -> engine adapter
vector overlay builders
selection policy
path / text / image / frame 产品语义
```

### 3.4 editor-engine 负责

```txt
EngineRenderNode
EngineScenePatch
Static Base Layer
Active Element Layer
Dynamic Overlay Layer rendering
WebGL overlay renderer
scene hit test
overlay hit test execution
quadtree / spatial index
tile / snapshot / LOD
scheduler
```

---

## 4. 推荐依赖方向

健康依赖图：

```txt
                ┌────────────────────────┐
                │ packages/editor-        │
                │ interaction             │
                │ pointer / keyboard      │
                │ cursor / overlay types  │
                └───────────▲────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
┌─────────┴──────────┐              ┌─────────┴──────────┐
│ packages/editor-   │              │ packages/vector-   │
│ engine             │              │ core               │
│ WebGL/render/cache │              │ doc/runtime/cmd    │
│ hit test           │              │ overlay builders   │
└─────────▲──────────┘              └─────────▲──────────┘
          │                                   │
          └─────────────────┬─────────────────┘
                            │
                    ┌───────┴───────┐
                    │ apps/vector    │
                    │ React UI       │
                    └───────────────┘
```

依赖规则：

```txt
editor-engine 可以依赖 editor-interaction 的 overlay/cursor 类型。
vector-core 可以依赖 editor-interaction 的 runtime/overlay/cursor 类型。
apps/vector 组合 vector-core + editor-engine。

editor-interaction 不依赖 editor-engine。
editor-interaction 不依赖 vector-core。
editor-engine 不依赖 vector-core。
```

核心原则：

```txt
editor-interaction 是底层通用交互抽象。
engine 和 vector 都可以使用它。
它不能反过来知道 engine 或 vector 的具体实现。
```

---

## 5. 推荐目录结构

```txt
packages/editor-interaction/
  src/
    pointer/
      PointerRuntime.ts
      pointerEvents.ts
      dragThreshold.ts

    keyboard/
      KeyboardRuntime.ts
      ModifierKeys.ts
      keyUtils.ts

    tool/
      ToolRuntime.ts
      effectiveTool.ts

    operation/
      ActiveOperation.ts
      OperationLifecycle.ts
      DragRuntime.ts
      GestureRuntime.ts

    hover/
      HoverRuntime.ts

    overlay/
      OverlayNode.ts
      OverlayPrimitives.ts
      OverlayAction.ts
      OverlayLayer.ts
      OverlayHit.ts
      overlaySort.ts
      overlayHitHelpers.ts

    cursor/
      CursorIntent.ts
      CursorManager.ts
      CursorApplier.ts
      cursorCss.ts
      resizeCursor.ts

    viewport/
      ViewportInteractionRuntime.ts

    capture/
      CaptureRuntime.ts

    runtime/
      InteractionRuntime.ts

    index.ts
```

第一版不要拆太碎，也可以内部按模块组织，但从外部只暴露统一入口：

```ts
export * from './pointer';
export * from './keyboard';
export * from './tool';
export * from './operation';
export * from './hover';
export * from './overlay';
export * from './cursor';
export * from './viewport';
export * from './capture';
export * from './runtime';
```

---

## 6. 可抽象 Runtime

### 6.1 PointerRuntime

```ts
export interface PointerRuntime {
  pointerId?: number;

  screen: Point;
  previousScreen: Point;
  deltaScreen: Point;

  world?: Point;
  previousWorld?: Point;
  deltaWorld?: Point;

  buttons: number;
  button?: number;

  isDown: boolean;
  isDragging: boolean;

  downScreen?: Point;
  downWorld?: Point;

  dragDistancePx: number;
  dragStartedAt?: number;

  velocityPxPerMs?: Point;
}
```

用途：

```txt
pointer move
pointer down/up
drag threshold
pointer capture
pan / drag / marquee / resize / rotate
```

---

### 6.2 KeyboardRuntime / ModifierKeys

```ts
export interface KeyboardRuntime {
  pressedKeys: Set<string>;
  modifierKeys: ModifierKeys;
  lastKeyDown?: string;
  lastKeyUp?: string;
}

export interface ModifierKeys {
  space?: boolean;
  alt?: boolean;
  shift?: boolean;
  ctrl?: boolean;
  meta?: boolean;
}
```

用途：

```txt
Space 临时 pan
Alt/Cmd 切 zoom-in / zoom-out
Shift 等比缩放
Cmd 临时 direct select
```

---

### 6.3 ToolRuntime

工具名用泛型，不绑定具体产品。

```ts
export interface ToolRuntime<TTool extends string = string> {
  currentTool: TTool;
  previousTool?: TTool;
  temporaryTool?: TTool;

  /**
   * Effective tool after modifiers.
   */
  effectiveTool: TTool;

  toolLocked?: boolean;
}
```

Vector 可以定义：

```ts
type VectorTool =
  | 'select'
  | 'hand'
  | 'zoom'
  | 'text'
  | 'pen'
  | 'path-edit'
  | 'rect'
  | 'ellipse'
  | 'line';
```

XMind 可以定义：

```ts
type MindTool =
  | 'select'
  | 'hand'
  | 'topic'
  | 'relationship'
  | 'boundary'
  | 'summary';
```

---

### 6.4 ActiveOperation

operation lifecycle 通用，payload 由业务定义。

```ts
export interface ActiveOperation<
  TType extends string = string,
  TPayload = unknown,
> {
  id: string;
  type: TType;

  startedAt: number;

  startScreen: Point;
  currentScreen: Point;
  deltaScreen: Point;

  startWorld?: Point;
  currentWorld?: Point;
  deltaWorld?: Point;

  pointerId?: number;

  payload?: TPayload;
}
```

Vector 扩展：

```ts
type VectorActiveOperation =
  | ActiveOperation<'pan'>
  | ActiveOperation<'marquee', { worldRect: Rect }>
  | ActiveOperation<'resize', { targetIds: NodeId[]; direction: ResizeDirection }>
  | ActiveOperation<'rotate', { targetIds: NodeId[] }>
  | ActiveOperation<'path-anchor-drag', { nodeId: NodeId; pointId: string }>;
```

规则：

```txt
1. active operation 只描述当前交互过程。
2. active operation 不等于 history transaction。
3. active operation commit 后由业务层生成 command / transaction。
4. active operation payload 由业务层扩展。
```

---

### 6.5 DragRuntime / GestureRuntime

```ts
export interface DragRuntime {
  active: boolean;
  started: boolean;

  startScreen: Point;
  currentScreen: Point;
  deltaScreen: Point;

  startWorld?: Point;
  currentWorld?: Point;
  deltaWorld?: Point;

  thresholdPx: number;
  hasPassedThreshold: boolean;
}

export interface GestureRuntime {
  type?: 'wheel-zoom' | 'pinch-zoom' | 'pan' | 'drag' | 'none';

  active: boolean;

  velocity?: Point;
  scaleDelta?: number;
  centerScreen?: Point;

  startedAt?: number;
  updatedAt?: number;
}
```

---

### 6.6 HoverRuntime

hit result 类型由业务扩展。

```ts
export interface HoverRuntime<TOverlayHit = unknown, TSceneHit = unknown> {
  screenPoint: Point;
  worldPoint?: Point;

  overlayHit?: TOverlayHit | null;
  sceneHit?: TSceneHit | null;

  lastOverlayHit?: TOverlayHit | null;
  lastSceneHit?: TSceneHit | null;

  changed: boolean;
}
```

---

### 6.7 OverlayRuntime

```ts
export interface OverlayRuntime<TOverlayNode = unknown, TOverlayHit = unknown> {
  version: number;

  nodes: TOverlayNode[];

  lastHit?: TOverlayHit | null;

  dirty: boolean;
  buildTimeMs?: number;
  hitTestTimeMs?: number;
}
```

---

### 6.8 CursorRuntime

```ts
export interface CursorRuntime<TCursorIntent = unknown> {
  intent: TCursorIntent;
  css: string;

  source:
    | 'app-mode'
    | 'active-operation'
    | 'temporary-tool'
    | 'overlay'
    | 'editing-mode'
    | 'tool'
    | 'scene'
    | 'default';

  reason?: string;

  lastCss?: string;
}
```

---

### 6.9 SelectionRuntime 基础版

Selection 只能抽象基础结构，不能抽象产品语义。

```ts
export interface SelectionRuntime<TId extends string = string> {
  ids: TId[];
  primaryId?: TId;
  anchorId?: TId;

  version: number;
}
```

可以抽象：

```txt
selected ids
primary selection
selection version
```

不要抽象：

```txt
vector group selection policy
xmind topic selection policy
path point selection
text range selection
component selection rules
```

---

### 6.10 ViewportInteractionRuntime

```ts
export interface ViewportInteractionRuntime {
  camera: Camera;

  isPanning: boolean;
  isZooming: boolean;

  zoomVelocity?: number;
  panVelocity?: Point;

  lastZoomCenter?: Point;
  lastPanDelta?: Point;
}
```

用途：

```txt
zoom / pan smoothness
cursor hand / grabbing
tile / snapshot scheduler interaction state
```

---

### 6.11 CommandSessionRuntime

通用层只管理 session lifecycle，不管理业务 command 内容。

```ts
export interface CommandSession<
  TCommandType extends string = string,
  TPayload = unknown,
> {
  id: string;
  type: TCommandType;

  startedAt: number;
  updatedAt: number;

  status: 'draft' | 'committed' | 'cancelled';

  payload?: TPayload;
}
```

业务层负责把 CommandSession commit 成真正的 history transaction。

---

### 6.12 CaptureRuntime

```ts
export interface CaptureRuntime {
  pointerCaptured: boolean;
  pointerId?: number;

  capturedBy?:
    | 'canvas'
    | 'overlay'
    | 'tool'
    | 'operation'
    | string;

  releaseOnPointerUp?: boolean;
}
```

用途：

```txt
pointer capture
drag 离开 canvas
active operation cursor body
```

---

### 6.13 AppModeRuntime

```ts
export type AppMode =
  | 'normal'
  | 'readonly'
  | 'disabled'
  | 'loading'
  | 'modal';

export interface AppModeRuntime {
  mode: AppMode;
  reason?: string;
}
```

---

## 7. InteractionRuntime 总结构

```ts
export interface InteractionRuntime<
  TTool extends string = string,
  TOverlayNode = unknown,
  TOverlayHit = unknown,
  TSceneHit = unknown,
  TCursorIntent = unknown,
  TOperation extends ActiveOperation = ActiveOperation,
> {
  appMode: AppModeRuntime;

  pointer: PointerRuntime;
  keyboard: KeyboardRuntime;
  tool: ToolRuntime<TTool>;

  viewport: ViewportInteractionRuntime;

  hover: HoverRuntime<TOverlayHit, TSceneHit>;
  overlay: OverlayRuntime<TOverlayNode, TOverlayHit>;
  cursor: CursorRuntime<TCursorIntent>;

  activeOperation?: TOperation;

  capture: CaptureRuntime;
}
```

Vector 使用：

```ts
type VectorInteractionRuntime = InteractionRuntime<
  VectorTool,
  EngineOverlayNode,
  OverlayHitResult,
  EngineHitResult,
  VectorCursorIntent,
  VectorActiveOperation
>;
```

XMind 使用：

```ts
type MindInteractionRuntime = InteractionRuntime<
  MindTool,
  EngineOverlayNode,
  OverlayHitResult,
  MindSceneHit,
  MindCursorIntent,
  MindActiveOperation
>;
```

---

## 8. Overlay 抽象

editor-interaction 可以定义通用 overlay primitives。

Engine 负责渲染这些 primitives。

Vector / XMind 负责生成这些 primitives。

```ts
export type OverlayPrimitiveType =
  | 'rect'
  | 'polygon'
  | 'polyline'
  | 'line'
  | 'circle'
  | 'handle'
  | 'caret'
  | 'label'
  | 'hit-area';

export interface OverlayNode<TAction = unknown> {
  id: string;
  type: OverlayPrimitiveType;

  coordinate: 'world' | 'screen';

  zIndex?: number;
  visible?: boolean;
  hittable?: boolean;

  cursor?: CursorIntent;

  /**
   * Runtime only. Core package does not interpret it.
   */
  action?: TAction;

  /**
   * Runtime only. For business/debug.
   */
  meta?: Record<string, unknown>;
}
```

业务 action 由业务定义：

```ts
type VectorOverlayAction =
  | { type: 'resize'; targetId: NodeId; direction: ResizeDirection }
  | { type: 'path-anchor-drag'; nodeId: NodeId; pointId: string }
  | { type: 'image-crop-resize'; nodeId: NodeId; direction: ResizeDirection };

type XMindOverlayAction =
  | { type: 'topic-resize'; topicId: string }
  | { type: 'branch-drag'; branchId: string }
  | { type: 'toggle-collapse'; topicId: string };
```

规则：

```txt
1. editor-interaction 定义 overlay schema。
2. engine 渲染 overlay schema。
3. vector/xmind 生成 overlay schema。
4. action payload 业务自己解释。
```

---

## 9. Cursor 抽象

editor-interaction 可以定义通用 CursorIntent。

```ts
export type CursorIntent =
  | { type: 'default' }
  | { type: 'pointer' }
  | { type: 'move' }
  | { type: 'grab' }
  | { type: 'grabbing' }
  | { type: 'text' }
  | { type: 'crosshair' }
  | { type: 'not-allowed' }
  | { type: 'wait' }
  | { type: 'progress' }
  | { type: 'zoom-in' }
  | { type: 'zoom-out' }
  | { type: 'resize'; direction: ResizeDirection; rotation?: number }
  | { type: 'rotate'; angle?: number }
  | { type: 'custom'; css: string };
```

Vector 特殊 cursor 可以：

```txt
1. 使用 custom css。
2. 或扩展 VectorCursorIntent。
3. 或注册 cursor 映射。
```

例如：

```ts
type VectorCursorIntent =
  | CursorIntent
  | { type: 'pen' }
  | { type: 'add-point' }
  | { type: 'remove-point' }
  | { type: 'convert-point' };
```

Cursor 通用工具：

```txt
CursorManager
CursorApplier
cursorIntentToCss
resizeDirectionToCssCursor
normalizeAngle
```

---

## 10. 与 engine 的关系

editor-engine 可以依赖 editor-interaction 的类型。

例如：

```txt
EngineDynamicLayer 使用 OverlayNode
hitTestOverlay 返回 OverlayHitResult
OverlayRenderer 渲染 OverlayPrimitive
Cursor hint 使用 CursorIntent
```

但 engine 不解释：

```txt
action 的业务含义
selection policy
path point editing
image crop semantics
auto layout semantics
```

Engine 只做：

```txt
render overlay primitive
hit test overlay primitive
return overlayId / cursor / action
```

---

## 11. 与 vector 的关系

vector-core 依赖 editor-interaction。

vector-core 负责：

```txt
selection policy
vector overlay builders
path editing builder
text editing builder
image crop builder
frame layout builder
operation payload
history transaction
collaboration operation
```

Vector 输出：

```txt
EngineDynamicLayer / OverlayNode[]
```

Engine 输入：

```txt
OverlayNode[]
```

---

## 12. 什么不应该放进 editor-interaction

```txt
VectorDocument
SceneNode
PathNode
TextNode
GroupNode
worldBounds 计算
text layout
path command parsing
auto layout result
quadtree data
tile cache
snapshot cache
history operation
collaboration operation
WebGL rendering
```

这些属于：

```txt
vector-core
editor-engine
history/collaboration
```

不要污染 interaction runtime。

---

## 13. 推荐当前 monorepo 结构

```txt
packages/
  editor-interaction/
    src/
      pointer/
      keyboard/
      tool/
      operation/
      hover/
      overlay/
      cursor/
      viewport/
      capture/
      runtime/
      index.ts

  editor-engine/
    src/
      core/
      renderer/
      cache/
      hittest/
      scheduler/
      index.ts

  vector-core/
    src/
      document/
      runtime/
      command/
      history/
      collaboration/
      adapter/
      overlay/
      index.ts

apps/
  vector-editor-web/
```

---

## 14. 判断边界的标准

### 放 editor-interaction，如果：

```txt
不依赖具体文档模型
不依赖 WebGL
不依赖 tile/cache/quadtree
只关心用户输入、交互状态、overlay schema、cursor schema
多个编辑器产品可以共用
```

### 放 editor-engine，如果：

```txt
依赖 renderer / WebGL / Canvas / WebGPU
依赖 scene hit test / spatial index
依赖 tile / snapshot / LOD
负责实际绘制 overlay primitive
```

### 放 vector-core，如果：

```txt
依赖 SceneNode / TextNode / PathNode
依赖 vector document runtime
依赖 vector selection policy
依赖 vector command / history / collaboration
依赖 vector overlay builders
```

---

## 15. 最终规则

```txt
1. 不动 engine。
2. 新增 packages/editor-interaction。
3. editor-interaction 抽象交互 runtime，不抽象 vector 文档语义。
4. editor-interaction 不依赖 engine，不依赖 vector。
5. engine 可以依赖 editor-interaction 的 overlay/cursor 类型。
6. vector-core 可以依赖 editor-interaction 的 runtime/overlay/cursor 类型。
7. overlay action payload 由业务定义，editor-interaction 不解释。
8. cursor intent 可以通用，业务可以扩展。
9. ActiveOperation lifecycle 可以通用，payload 由业务定义。
10. SelectionRuntime 只能抽象 selected ids / primaryId / version，selection policy 留给业务。
11. Dynamic Overlay primitives 可以通用，overlay builders 留给业务。
12. editor-interaction 的目标是复用给 vector / xmind / whiteboard / diagram。
```

一句话：

```txt
packages/editor-interaction 抽象“用户交互状态机和反馈机制”，engine 负责渲染，vector 负责产品语义。
```
# Editor Package Abstraction / Naming / Layering

## 1. 当前结论

当前设计目标不是只服务 vector，而是为后续多个编辑器项目复用：

```txt
vector
playground
xmind
whiteboard
diagram
其他编辑器应用
```

最终方向：

```txt
底层通用能力：
  使用一个所有包都能依赖的 base/lib/core 包。

编辑器交互抽象：
  使用一个编辑器项目都能复用的 primitive/interaction 包。

engine：
  保持纯净。
  只负责渲染、命中、缓存、调度。
  后面可以独立重构。

vector / playground / xmind：
  UI 层 + 本地产品实现。
  根据自己的文档模型，通过 adapter 转成 engine render model。
```

一句话：

```txt
通用底层放 base/lib/core，编辑器交互抽象放 primitive，engine 保持纯渲染，具体编辑器项目负责语义和适配。
```

---

## 2. 命名重新思考

### 2.1 `editor-foundation` 的问题

`editor-foundation` 语义准确，但名字偏大。

它容易被理解成：

```txt
整个编辑器体系的基础设施
```

这样将来容易吸进去太多东西：

```txt
document model
history
collaboration
render model
engine config
selection policy
command system
asset manager
```

所以不建议继续用 `editor-foundation` 作为当前底层公共包名。

---

### 2.2 底层通用包候选

这个包应该提供所有模块都能复用的底层能力：

```txt
math
geometry
ids
events
lifecycle
scheduler helpers
patch helpers
collections
logger
worker rpc 基础类型
serialization helpers
```

候选名字：

```txt
editor-base
editor-core
editor-lib
editor-utils
```

#### `editor-utils`

不推荐作为主包名。

原因：

```txt
utils 听起来太散。
容易变成杂物箱。
没有架构边界感。
```

#### `editor-lib`

可以，但语义偏泛。

优点：

```txt
大家都能用。
不绑定某一层。
```

缺点：

```txt
不知道里面是基础类型、工具还是完整库。
```

#### `editor-core`

不太推荐。

原因：

```txt
core 容易被理解成编辑器核心。
将来可能和 vector-core / engine-core 冲突。
```

#### `editor-base`

推荐。

原因：

```txt
base 表示底层基础能力。
比 foundation 短。
比 utils 更有边界。
比 core 更不容易和产品核心混淆。
```

推荐最终名字：

```txt
packages/editor-base
```

一句话：

```txt
editor-base 放所有编辑器包都能使用的底层基础类型、工具和算法。
```

---

## 3. `editor-interaction` 重新命名

之前的 `editor-interaction` 包实际包含：

```txt
pointer / keyboard / modifier runtime
tool runtime
active operation lifecycle
hover runtime
cursor intent / cursor manager / cursor applier
dynamic overlay primitives
overlay hit test helper
overlay action passthrough
```

它不是 vector 产品交互逻辑。

它也不是完整 editor semantic。

它更像：

```txt
编辑器交互基础图元 + 交互运行时 primitive
```

---

## 4. `editor-primitive` vs `editor-semantic`

### 4.1 `editor-semantic`

不推荐。

原因：

```txt
semantic 表示语义层。
但这个包不应该理解产品语义。
```

例如它不应该知道：

```txt
Vector PathNode 是什么
TextNode editing 怎么提交 history
Image crop 怎么改 document
XMind topic 怎么选中
AutoLayout spacing 怎么拖拽
```

如果叫 `editor-semantic`，会暗示它负责编辑器语义。这个方向危险。

---

### 4.2 `editor-primitive`

更合适。

原因：

```txt
primitive 表示基础交互图元和基础交互机制。
它可以被 vector / xmind / playground / whiteboard 复用。
它不暗示产品语义。
```

它可以包含：

```txt
PointerRuntime
KeyboardRuntime
ModifierKeys
ToolRuntime
ActiveOperation
DragRuntime
GestureRuntime
HoverRuntime
OverlayRuntime
CursorIntent
CursorManager
CursorApplier
OverlayNode
OverlayPrimitive
OverlayHit
OverlayAction passthrough
```

推荐最终名字：

```txt
packages/editor-primitive
```

一句话：

```txt
editor-primitive 抽象编辑器项目通用的交互 primitive，不抽象具体产品语义。
```

---

## 5. 最终推荐包命名

当前推荐：

```txt
packages/editor-base
packages/editor-primitive
packages/editor-engine
packages/vector-core
packages/vector-export
```

应用层：

```txt
apps/vector
apps/playground
apps/xmind
```

如果以后 xmind 也有独立核心：

```txt
packages/xmind-core
packages/xmind-export
```

---

## 6. 包职责边界

## 6.1 `packages/editor-base`

底层通用基础包。

所有包都可以依赖它。

负责：

```txt
math
geometry
Point / Rect / Matrix2D / Transform
ids / version
EventEmitter / Signal
Disposable / DisposableStore
scheduler helpers
patch path helpers
collections
logger / performance stats
worker rpc base types
serialization / migration helpers
assert / invariant
```

不负责：

```txt
pointer runtime
cursor manager
overlay primitives
engine render model
vector document model
history operation
collaboration operation
WebGL rendering
```

目录建议：

```txt
packages/editor-base/
  src/
    math/
    geometry/
    ids/
    events/
    lifecycle/
    scheduler/
    patch/
    collections/
    logger/
    worker/
    serialization/
    index.ts
```

---

## 6.2 `packages/editor-primitive`

编辑器交互 primitive 包。

依赖：

```txt
editor-base
```

负责：

```txt
PointerRuntime
KeyboardRuntime
ModifierKeys
ToolRuntime
EffectiveTool resolver
ActiveOperation lifecycle
DragRuntime
GestureRuntime
HoverRuntime
OverlayRuntime
CursorIntent
CursorManager
CursorApplier
Overlay primitives types
Overlay hit helper types
OverlayAction passthrough
zIndex sorting
screen-space hit tolerance helpers
resize cursor rotation mapping
CaptureRuntime
ViewportInteractionRuntime
InteractionRuntime
```

不负责：

```txt
VectorDocument
SceneNode
PathNode
TextNode
GroupNode
worldMatrix 计算
worldBounds 计算
text layout
path command parsing
auto layout calculation
quadtree internal structure
tile cache
snapshot cache
history operation
collaboration operation
WebGL shader / draw call
```

目录建议：

```txt
packages/editor-primitive/
  src/
    pointer/
    keyboard/
    tool/
    operation/
    hover/
    overlay/
    cursor/
    viewport/
    capture/
    runtime/
    index.ts
```

一句话：

```txt
editor-primitive 抽象“用户交互状态机和反馈机制”。
```

---

## 6.3 `packages/editor-engine`

Engine 保持纯净。

它是编辑器渲染引擎，但不是某个产品编辑器。

依赖：

```txt
editor-base
editor-primitive 的 overlay/cursor 类型可选依赖
```

负责：

```txt
EngineRenderNode
EngineScenePatch
render model
Static Base Layer
Active Element Layer
Dynamic Overlay Layer rendering
WebGL renderer
WebGL overlay renderer
scene hit test
overlay hit test execution
quadtree / spatial index
tile cache
snapshot cache
LOD
scheduler
camera / viewport
renderToBitmap / offscreen render 可选
```

不负责：

```txt
vector document model
xmind document model
selection policy
tool semantic
history
collaboration
export policy
path editing semantic
text editing semantic
image crop semantic
auto layout semantic
```

关键原则：

```txt
engine 可以渲染 overlay primitive。
engine 可以命中 overlay primitive。
engine 不解释 overlay action 的业务含义。
engine 不知道 vector / xmind 的文档模型。
```

后续 engine 可以独立重构，只要保留 render model / patch / overlay primitive contract 即可。

---

## 6.4 `packages/vector-core`

Vector 产品核心。

依赖：

```txt
editor-base
editor-primitive
可选依赖 editor-engine types / adapter contract
```

负责：

```txt
VectorDocument
SceneNode
Group / Frame / Component / Instance
fills / strokes / effects / textRuns
vector runtime cache
worldMatrix / bounds / layout / text layout
vector commands
history
collaboration operation
vector -> engine adapter
vector overlay builders
selection policy
path / text / image / frame 产品语义
```

不负责：

```txt
WebGL renderer
tile cache
snapshot cache
engine quadtree internals
React / Angular UI
```

---

## 6.5 `packages/vector-export`

Vector 导出包。

依赖：

```txt
editor-base
vector-core
可选依赖 editor-engine offscreen render API
```

负责：

```txt
ExportOptions
ExportResult
compute export bounds
build export scene
SVG export
PNG / JPG / WEBP raster export
PDF export
asset embedding
font handling
```

不负责：

```txt
interactive overlay
cursor
selection handles
history
collaboration
```

---

## 7. 应用层结构

应用层负责 UI 和本地产品组装。

例如：

```txt
apps/vector
apps/playground
apps/xmind
```

应用层负责：

```txt
React / Angular / Vue UI
canvas mount / unmount
toolbar / panel / menu
keyboard shortcut binding
local editor instance 创建
本地业务配置
本地文件读写
调用 vector-core / xmind-core
调用 editor-engine
调用 vector-export
```

应用层不应该直接承担：

```txt
engine 内部渲染逻辑
editor-primitive 的交互状态机实现
vector document schema 细节散落在 UI 中
```

推荐：

```txt
UI 层只做展示和调用 EditorApp API。
高频 pointer / cursor / overlay 状态不要进 React / Angular state。
```

---

## 8. 文档模型到渲染模型

每个编辑器项目都有自己的文档模型。

例如：

```txt
vector:
  VectorDocument -> VectorRuntime -> VectorToEngineAdapter -> EngineScenePatch

xmind:
  XMindDocument -> XMindRuntime -> XMindToEngineAdapter -> EngineScenePatch
```

Engine 不直接吃业务文档模型。

正确方式：

```txt
Document Model
  -> Runtime Cache
  -> Adapter
  -> Engine Render Model / EngineScenePatch
  -> Engine Render
```

错误方式：

```txt
engine.setDocument(vectorDocument)
engine.setDocument(xmindDocument)
```

原因：

```txt
1. engine 不应该理解产品语义。
2. 不同编辑器文档模型差异很大。
3. adapter 可以隔离文档模型变化。
4. engine 后续可以独立重构。
```

---

## 9. Dynamic Overlay 关系

`editor-primitive` 定义通用 overlay primitive：

```txt
rect
polygon
polyline
line
circle
handle
caret
label
hit-area
```

`vector-core` / `xmind-core` 负责生成 overlay：

```txt
vector selection bounds
path anchor points
text caret
image crop handles
frame auto layout guides
xmind topic handles
xmind branch handles
```

`editor-engine` 负责渲染和命中 overlay：

```txt
render overlay primitive
hit test overlay primitive
return overlayId / cursor / action
```

Engine 不解释 action：

```txt
action payload 由业务层解释。
```

---

## 10. Cursor 关系

`editor-primitive` 定义：

```txt
CursorIntent
CursorManager
CursorApplier
resize cursor rotation mapping
```

应用层或产品层提供：

```txt
current tool
modifier keys
active operation
overlay hit
scene hit
editing mode
app mode
```

最终：

```txt
CursorManager resolve CursorIntent
CursorApplier apply CSS cursor
```

规则：

```txt
cursor 不属于 document。
cursor 不进入 history。
cursor 不进入 collaboration。
cursor 不进入 engine cache。
engine 只提供 hit result / overlay cursor hint。
```

---

## 11. History / Collaboration 关系

History 和 Collaboration 不放在 `editor-primitive`。

它们属于具体编辑器核心，例如：

```txt
vector-core/history
vector-core/collaboration
xmind-core/history
xmind-core/collaboration
```

原因：

```txt
history / collaboration 强依赖 document operation。
不同产品的 operation 差异很大。
多人 undo / redo 和冲突处理依赖文档语义。
```

可以未来抽象：

```txt
editor-history-core
editor-collaboration-core
```

但当前不建议提前抽。

---

## 12. 推荐 monorepo 结构

```txt
packages/
  editor-base/
    src/
      math/
      geometry/
      ids/
      events/
      lifecycle/
      scheduler/
      patch/
      collections/
      logger/
      worker/
      serialization/
      index.ts

  editor-primitive/
    src/
      pointer/
      keyboard/
      tool/
      operation/
      hover/
      overlay/
      cursor/
      viewport/
      capture/
      runtime/
      index.ts

  editor-engine/
    src/
      core/
      renderer/
      cache/
      hittest/
      scheduler/
      layers/
      offscreen/
      index.ts

  vector-core/
    src/
      document/
      runtime/
      command/
      history/
      collaboration/
      adapter/
      overlay/
      index.ts

  vector-export/
    src/
      svg/
      raster/
      pdf/
      assets/
      fonts/
      index.ts

apps/
  vector/
  playground/
  xmind/
```

---

## 13. 推荐依赖方向

```txt
editor-base
  ↑
  ├── editor-primitive
  │       ↑
  │       ├── vector-core
  │       └── apps/*
  │
  ├── editor-engine
  │       ↑
  │       └── apps/*
  │
  ├── vector-core
  │       ↑
  │       ├── vector-export
  │       └── apps/vector
  │
  └── vector-export
```

更具体：

```txt
editor-base:
  被所有包依赖。

editor-primitive:
  依赖 editor-base。
  不依赖 engine。
  不依赖 vector-core。

editor-engine:
  依赖 editor-base。
  可以依赖 editor-primitive 的 overlay/cursor 类型。
  不依赖 vector-core。

vector-core:
  依赖 editor-base。
  依赖 editor-primitive。
  不依赖 engine 实现。
  可以依赖 engine render model 类型或 adapter contract。

vector-export:
  依赖 editor-base。
  依赖 vector-core。
  可选依赖 engine offscreen render API。

apps/*:
  负责组合。
```

---

## 14. 命名最终建议

当前建议：

```txt
editor-base
editor-primitive
editor-engine
vector-core
vector-export
```

不建议：

```txt
editor-utils:
  太像杂物箱。

editor-foundation:
  太大，容易吸入过多基础设施。

editor-core:
  容易和 vector-core / engine-core 冲突。

editor-semantic:
  暗示负责产品语义，但这个包不应该负责语义。

editor-interaction:
  可以，但没有 primitive 清楚。
```

如果之后觉得 `editor-primitive` 太宽，可以改成：

```txt
editor-interaction-primitive
```

但第一版建议短一点：

```txt
editor-primitive
```

---

## 15. 最终规则

```txt
1. editor-base 放底层基础能力，大家都能用。
2. editor-primitive 放编辑器通用交互 primitive，编辑器项目都能用。
3. editor-engine 保持纯净，后续可以独立重构。
4. engine 不吃业务文档模型，只吃 adapter 后的 render model / patch。
5. vector / playground / xmind 是 UI 层 + 本地产品实现。
6. vector-core / xmind-core 负责各自文档模型、runtime、commands、history、collaboration、overlay builders。
7. editor-primitive 不理解 vector/xmind 产品语义。
8. editor-engine 不理解 vector/xmind 产品语义。
9. overlay action payload 由业务层解释。
10. cursor 是 interaction runtime，不是 document / history / collaboration。
11. export 独立到 vector-export，不放进 primitive 或 engine。
```

一句话：

```txt
editor-base 提供底层能力，editor-primitive 提供编辑器交互原语，editor-engine 提供纯渲染执行层，具体编辑器项目通过 adapter 接入自己的文档模型和产品语义。
```
# Editor Package Abstraction / Naming / Layering

## 1. 当前最终结论

当前阶段先只考虑一个应用层编辑器：

```txt
apps/vector
```

公共包只保留三个：

```txt
packages/lib
packages/editor-primitive
packages/engine
```

最终职责：

```txt
packages/lib
  底层通用能力。
  所有包都能用。

packages/editor-primitive
  编辑器通用交互 primitive。
  vector 可以用。
  未来其他编辑器也可以用。

packages/engine
  保持纯净。
  只负责渲染、命中、缓存、调度。
  可以引用 lib。
  可以选择引用 editor-primitive 的 overlay / cursor 类型。

apps/vector
  UI 层 + 本地 vector editor 实现。
  自己负责 document / runtime / command / history / collaboration / adapter / overlay builders / export。
  通过 adapter 把 VectorDocument 转成 EngineRenderModel / EngineScenePatch。
```

一句话：

```txt
lib 提供底层通用能力，editor-primitive 提供编辑器交互原语，engine 提供纯渲染执行层，apps/vector 负责 UI 和本地 vector editor 语义实现。
```

---

## 2. 命名决策

### 2.1 `packages/lib`

确定使用：

```txt
packages/lib
```

原因：

```txt
1. lib 简短。
2. lib 表示大家都能用的底层库。
3. lib 不绑定 editor 语义。
4. lib 比 utils 更正式，不像杂物箱。
5. lib 比 foundation 更轻，不会暗示“整个编辑器基础设施”。
6. lib 比 core 更不容易和产品核心或 engine core 混淆。
```

`lib` 只放底层通用能力。

不要放：

```txt
产品语义
engine render model
history / collaboration 具体实现
vector document model
WebGL renderer
interaction runtime
cursor manager
overlay primitives
```

---

### 2.2 `packages/editor-primitive`

确定使用：

```txt
packages/editor-primitive
```

它替代之前的：

```txt
editor-interaction
editor-interaction-core
editor-interaction-runtime
```

原因：

```txt
1. primitive 表示基础交互图元和基础交互机制。
2. 它不暗示具体产品语义。
3. 它可以被 vector 复用。
4. 未来其他编辑器项目也可以复用。
5. 比 editor-interaction 更适合作为公共原语层。
```

不使用：

```txt
editor-semantic
```

原因：

```txt
semantic 表示语义层。
但这个包不应该理解产品语义。
```

它不应该知道：

```txt
Vector PathNode 是什么
TextNode editing 怎么提交 history
Image crop 怎么改 document
AutoLayout spacing 怎么拖拽
Vector selection policy 是什么
```

一句话：

```txt
editor-primitive 抽象编辑器项目通用的交互 primitive，不抽象具体产品语义。
```

---

### 2.3 `packages/engine`

确定使用：

```txt
packages/engine
```

原则：

```txt
engine 保持纯净。
engine 是渲染和命中执行层。
engine 不是 vector editor。
engine 不吃业务文档模型。
engine 只吃 adapter 后的 render model / patch。
```

engine 可以引用：

```txt
lib
```

engine 可以选择引用：

```txt
editor-primitive 的 overlay / cursor 类型
```

但 engine 不应该依赖：

```txt
apps/vector
VectorDocument
VectorRuntime
VectorCommand
VectorHistory
VectorCollaboration
VectorOverlayBuilder
```

---

## 3. 包职责边界

## 3.1 `packages/lib`

底层通用库。

所有包都可以依赖它。

负责：

```txt
math
geometry
Point / Rect / Matrix2D / Transform
ids / version
EventEmitter / Signal
Disposable / DisposableStore
scheduler helpers
patch path helpers
collections
logger / performance stats
worker rpc base types
serialization / migration helpers
assert / invariant
```

不负责：

```txt
pointer runtime
cursor manager
overlay primitives
engine render model
vector document model
history operation
collaboration operation
WebGL rendering
product semantic
```

目录建议：

```txt
packages/lib/
  src/
    math/
    geometry/
    ids/
    events/
    lifecycle/
    scheduler/
    patch/
    collections/
    logger/
    worker/
    serialization/
    index.ts
```

一句话：

```txt
lib 是所有包都能使用的底层基础库。
```

---

## 3.2 `packages/editor-primitive`

编辑器交互 primitive 包。

依赖：

```txt
lib
```

负责：

```txt
PointerRuntime
KeyboardRuntime
ModifierKeys
ToolRuntime
EffectiveTool resolver
ActiveOperation lifecycle
DragRuntime
GestureRuntime
HoverRuntime
OverlayRuntime
CursorIntent
CursorManager
CursorApplier
Overlay primitive types
Overlay hit helper types
OverlayAction passthrough
zIndex sorting
screen-space hit tolerance helpers
resize cursor rotation mapping
CaptureRuntime
ViewportInteractionRuntime
InteractionRuntime
```

不负责：

```txt
VectorDocument
SceneNode
PathNode
TextNode
GroupNode
worldMatrix 计算
worldBounds 计算
text layout
path command parsing
auto layout calculation
quadtree internal structure
tile cache
snapshot cache
history operation
collaboration operation
WebGL shader / draw call
product semantic
```

目录建议：

```txt
packages/editor-primitive/
  src/
    pointer/
    keyboard/
    tool/
    operation/
    hover/
    overlay/
    cursor/
    viewport/
    capture/
    runtime/
    index.ts
```

一句话：

```txt
editor-primitive 抽象“用户交互状态机和反馈机制”。
```

---

## 3.3 `packages/engine`

Engine 保持纯净。

它是编辑器渲染引擎，但不是某个产品编辑器。

依赖：

```txt
lib
```

可选依赖：

```txt
editor-primitive 的 overlay / cursor 类型
```

负责：

```txt
EngineRenderNode
EngineScenePatch
render model
Static Base Layer
Active Element Layer
Dynamic Overlay Layer rendering
WebGL renderer
WebGL overlay renderer
scene hit test
overlay hit test execution
quadtree / spatial index
tile cache
snapshot cache
LOD
scheduler
camera / viewport
renderToBitmap / offscreen render 可选
```

不负责：

```txt
vector document model
selection policy
tool semantic
history
collaboration
export policy
path editing semantic
text editing semantic
image crop semantic
auto layout semantic
```

关键原则：

```txt
1. engine 可以引用 lib。
2. engine 可以渲染 overlay primitive。
3. engine 可以命中 overlay primitive。
4. engine 不解释 overlay action 的业务含义。
5. engine 不知道 VectorDocument。
6. engine 不直接吃业务文档模型，只吃 adapter 后的 render model / patch。
```

后续 engine 可以独立重构，只要保留 render model / patch / overlay primitive contract 即可。

一句话：

```txt
engine 是纯渲染执行层。
```

---

## 3.4 `apps/vector`

`apps/vector` 是应用层 + 本地 vector editor 实现。

负责：

```txt
React / Angular / Vue UI
canvas mount / unmount
toolbar / panel / menu
keyboard shortcut binding
local editor instance 创建
本地业务配置
本地文件读写
VectorDocument
VectorRuntime
VectorCommands
VectorHistory
VectorCollaboration
VectorOverlayBuilders
VectorToEngineAdapter
VectorExport
调用 lib
调用 editor-primitive
调用 engine
```

不负责：

```txt
engine 内部渲染逻辑
editor-primitive 的通用交互状态机实现
lib 里的底层工具重复实现
```

推荐：

```txt
UI 层只做展示和调用 VectorEditorApp API。
高频 pointer / cursor / overlay 状态不要进 React / Angular state。
```

---

## 4. 文档模型到渲染模型

当前只考虑 vector：

```txt
VectorDocument
  -> VectorRuntime
  -> VectorToEngineAdapter
  -> EngineScenePatch / EngineRenderModel
  -> engine render
```

Engine 不直接吃 VectorDocument。

正确方式：

```txt
Document Model
  -> Runtime Cache
  -> Adapter
  -> Engine Render Model / EngineScenePatch
  -> Engine Render
```

错误方式：

```txt
engine.setDocument(vectorDocument)
```

原因：

```txt
1. engine 不应该理解产品语义。
2. adapter 可以隔离文档模型变化。
3. engine 后续可以独立重构。
4. vector 可以自由调整 document/runtime，只要 adapter contract 稳定。
```

---

## 5. Dynamic Overlay 关系

`editor-primitive` 定义通用 overlay primitive：

```txt
rect
polygon
polyline
line
circle
handle
caret
label
hit-area
```

`apps/vector` 本地 editor 实现负责生成 overlay：

```txt
vector selection bounds
path anchor points
text caret
image crop handles
frame auto layout guides
marquee
drawing preview
snap guides
```

`engine` 负责渲染和命中 overlay：

```txt
render overlay primitive
hit test overlay primitive
return overlayId / cursor / action
```

Engine 不解释 action：

```txt
action payload 由 apps/vector 的 editor 逻辑解释。
```

---

## 6. Cursor 关系

`editor-primitive` 定义：

```txt
CursorIntent
CursorManager
CursorApplier
resize cursor rotation mapping
```

`apps/vector` 提供：

```txt
current tool
modifier keys
active operation
overlay hit
scene hit
editing mode
app mode
```

最终：

```txt
CursorManager resolve CursorIntent
CursorApplier apply CSS cursor
```

规则：

```txt
cursor 不属于 document。
cursor 不进入 history。
cursor 不进入 collaboration。
cursor 不进入 engine cache。
engine 只提供 hit result / overlay cursor hint。
```

---

## 7. History / Collaboration 关系

History 和 Collaboration 不放在 `editor-primitive`。

当前阶段放在 `apps/vector` 的本地 editor 实现里：

```txt
apps/vector/editor/history
apps/vector/editor/collaboration
```

原因：

```txt
1. history / collaboration 强依赖 document operation。
2. 多人 undo / redo 和冲突处理依赖文档语义。
3. 当前阶段只有 vector，一个应用内先实现更灵活。
```

未来如果 vector 核心稳定，再考虑拆出：

```txt
packages/vector-core
```

但当前不提前抽。

---

## 8. Export 关系

Export 不放进 `editor-primitive`，也不直接塞进 `engine`。

导出属于：

```txt
document -> output artifact
```

当前阶段放在：

```txt
apps/vector/editor/export
```

规则：

```txt
interaction 处理“用户怎么操作”。
engine 处理“怎么渲染”。
export 处理“文档怎么变成文件”。
```

未来如果 vector 核心稳定，再考虑拆出：

```txt
packages/vector-export
```

---

## 9. 推荐 monorepo 结构

当前推荐：

```txt
packages/
  lib/
    src/
      math/
      geometry/
      ids/
      events/
      lifecycle/
      scheduler/
      patch/
      collections/
      logger/
      worker/
      serialization/
      index.ts

  editor-primitive/
    src/
      pointer/
      keyboard/
      tool/
      operation/
      hover/
      overlay/
      cursor/
      viewport/
      capture/
      runtime/
      index.ts

  engine/
    src/
      core/
      renderer/
      cache/
      hittest/
      scheduler/
      layers/
      offscreen/
      index.ts

apps/
  vector/
    editor/
      document/
      runtime/
      command/
      history/
      collaboration/
      adapter/
      overlay/
      export/
    ui/
```

---

## 10. 推荐依赖方向

```txt
lib
  ↑
  ├── editor-primitive
  │
  ├── engine
  │
  └── apps/vector 本地 editor 实现

editor-primitive
  ↑
  └── apps/vector 本地 editor 实现

engine
  ↑
  └── apps/vector 本地 editor 实现
```

更具体：

```txt
lib:
  被所有包依赖。

editor-primitive:
  依赖 lib。
  不依赖 engine。
  不依赖 apps/vector。

engine:
  依赖 lib。
  可以依赖 editor-primitive 的 overlay / cursor 类型。
  不依赖 apps/vector。

apps/vector:
  依赖 lib。
  依赖 editor-primitive。
  依赖 engine。
  自己实现 vector document/runtime/adapter/history/export。
```

禁止依赖：

```txt
lib 不依赖任何上层包。
editor-primitive 不依赖 engine。
editor-primitive 不依赖 apps/vector。
engine 不依赖 apps/vector。
engine 不依赖 VectorDocument。
```

---

## 11. 判断边界的标准

### 放 `lib`，如果：

```txt
所有包都可能用。
不依赖具体编辑器业务。
不依赖 WebGL / Canvas / DOM 产品逻辑。
是底层类型、算法、工具、生命周期、事件、调度、集合、patch、logger。
```

### 放 `editor-primitive`，如果：

```txt
编辑器项目都能用。
不依赖具体文档模型。
不依赖 WebGL 渲染实现。
只关心用户输入、交互状态、overlay schema、cursor schema。
```

### 放 `engine`，如果：

```txt
依赖 renderer / WebGL / Canvas / WebGPU。
依赖 scene hit test / spatial index。
依赖 tile / snapshot / LOD。
负责实际绘制 overlay primitive。
负责 render model / patch 消费。
```

### 放 `apps/vector` 本地实现，如果：

```txt
依赖 VectorDocument / SceneNode / TextNode / PathNode。
依赖 vector selection policy。
依赖 vector command / history / collaboration。
依赖 vector overlay builders。
依赖 vector export policy。
```

---

## 12. 最终规则

```txt
1. 名称使用 lib、engine、editor-primitive。
2. 应用层先只考虑 apps/vector。
3. lib 放底层通用能力，大家都能用。
4. editor-primitive 放编辑器通用交互 primitive，编辑器项目都能用。
5. engine 保持纯净，可以引用 lib。
6. engine 不吃业务文档模型，只吃 adapter 后的 render model / patch。
7. apps/vector 是 UI 层 + 本地 vector editor 实现。
8. apps/vector 负责自己的 document/runtime/commands/history/collaboration/overlay builders/adapter/export。
9. editor-primitive 不理解 vector 产品语义。
10. engine 不理解 vector 产品语义。
11. overlay action payload 由 apps/vector 解释。
12. cursor 是 interaction runtime，不是 document / history / collaboration。
13. export 不放进 primitive 或 engine，先放 apps/vector 本地实现。
```

一句话：

```txt
lib 是通用底座，editor-primitive 是编辑器交互原语，engine 是纯渲染执行层，apps/vector 负责 UI 和本地 vector editor 语义实现。
```
# Venus Editor Package Architecture

## 1. 当前结论

当前阶段只考虑一个应用层编辑器：

```txt
apps/vector
```

公共包保留三个：

```txt
@venus/lib
@venus/editor-primitive
engine
```

职责划分：

```txt
@venus/lib
  底层通用库。
  所有包都可以使用。

@venus/editor-primitive
  编辑器交互原语。
  提供 pointer / keyboard / tool / operation / overlay / cursor 等通用交互能力。

engine
  保持纯净。
  只负责渲染、命中、缓存、调度。
  不理解 VectorDocument。

apps/vector
  UI 层 + 本地 vector editor 实现。
  负责 VectorDocument / runtime / command / history / collaboration / adapter / overlay builders / export。
```

一句话：

```txt
@venus/lib 是通用底座，@venus/editor-primitive 是编辑器交互原语，engine 是纯渲染执行层，apps/vector 负责产品语义和 UI。
```

---

## 2. `@venus/lib`

`@venus/lib` 是底层通用库。

它不绑定 editor 语义，不绑定 engine，也不绑定 vector。

### 2.1 负责

```txt
math
geometry
Point / Rect / Matrix2D / Transform
ids / version
EventEmitter / Signal
Disposable / DisposableStore
scheduler helpers
patch path helpers
collections
logger / performance stats
worker rpc base types
serialization / migration helpers
assert / invariant
```

### 2.2 不负责

```txt
pointer runtime
cursor manager
overlay primitives
engine render model
VectorDocument
history / collaboration 具体实现
WebGL renderer
product semantic
```

### 2.3 目录建议

```txt
packages/lib/
  src/
    math/
    geometry/
    ids/
    events/
    lifecycle/
    scheduler/
    patch/
    collections/
    logger/
    worker/
    serialization/
    index.ts
```

---

## 3. `@venus/editor-primitive`

`@venus/editor-primitive` 是编辑器交互原语包。

它抽象的是“用户交互状态机和反馈机制”，不是具体产品语义。

### 3.1 负责

```txt
PointerRuntime
KeyboardRuntime
ModifierKeys
ToolRuntime
EffectiveTool resolver
ActiveOperation lifecycle
DragRuntime
GestureRuntime
HoverRuntime
OverlayRuntime
CursorIntent
CursorManager
CursorApplier
Overlay primitive types
Overlay hit helper types
OverlayAction passthrough
zIndex sorting
screen-space hit tolerance helpers
resize cursor rotation mapping
CaptureRuntime
ViewportInteractionRuntime
InteractionRuntime
```

### 3.2 不负责

```txt
VectorDocument
SceneNode
PathNode
TextNode
GroupNode
worldMatrix 计算
worldBounds 计算
text layout
path command parsing
auto layout calculation
quadtree internal structure
tile cache
snapshot cache
history operation
collaboration operation
WebGL shader / draw call
product semantic
```

### 3.3 目录建议

```txt
packages/editor-primitive/
  src/
    pointer/
    keyboard/
    tool/
    operation/
    hover/
    overlay/
    cursor/
    viewport/
    capture/
    runtime/
    index.ts
```

### 3.4 设计原则

```txt
1. 可以依赖 @venus/lib。
2. 不依赖 engine。
3. 不依赖 apps/vector。
4. 不理解 VectorDocument。
5. overlay action payload 只透传，不解释。
6. cursor 是 interaction runtime，不是 document state。
```

---

## 4. `engine`

`engine` 保持纯净。

它是渲染和命中执行层，不是 vector editor。

### 4.1 负责

```txt
EngineRenderNode
EngineScenePatch
render model
Static Base Layer
Active Element Layer
Dynamic Overlay Layer rendering
WebGL renderer
WebGL overlay renderer
scene hit test
overlay hit test execution
quadtree / spatial index
tile cache
snapshot cache
LOD
scheduler
camera / viewport
renderToBitmap / offscreen render 可选
```

### 4.2 不负责

```txt
VectorDocument
VectorRuntime
VectorCommand
VectorHistory
VectorCollaboration
VectorOverlayBuilder
selection policy
tool semantic
history
collaboration
export policy
path editing semantic
text editing semantic
image crop semantic
auto layout semantic
```

### 4.3 设计原则

```txt
1. engine 可以引用 @venus/lib。
2. engine 可以选择引用 @venus/editor-primitive 的 overlay / cursor 类型。
3. engine 不依赖 apps/vector。
4. engine 不直接吃业务文档模型。
5. engine 只吃 adapter 后的 EngineRenderModel / EngineScenePatch。
6. engine 可以渲染 overlay primitive。
7. engine 可以命中 overlay primitive。
8. engine 不解释 overlay action 的业务含义。
```

---

## 5. `apps/vector`

`apps/vector` 是 UI 层 + 本地 vector editor 实现。

### 5.1 负责

```txt
React / Angular / Vue UI
canvas mount / unmount
toolbar / panel / menu
keyboard shortcut binding
local editor instance 创建
本地业务配置
本地文件读写
VectorDocument
VectorRuntime
VectorCommands
VectorHistory
VectorCollaboration
VectorOverlayBuilders
VectorToEngineAdapter
VectorExport
调用 @venus/lib
调用 @venus/editor-primitive
调用 engine
```

### 5.2 不负责

```txt
engine 内部渲染逻辑
@venus/editor-primitive 的通用交互状态机实现
@venus/lib 的底层工具重复实现
```

### 5.3 UI 原则

```txt
1. UI 层只做展示和调用 VectorEditorApp API。
2. 高频 pointer / cursor / overlay 状态不要进 React / Angular state。
3. document / runtime / adapter / history / export 留在本地 editor 实现里。
```

---

## 6. Vector 到 Engine 的关系

Engine 不直接吃 `VectorDocument`。

正确流程：

```txt
VectorDocument
  -> VectorRuntime
  -> VectorToEngineAdapter
  -> EngineScenePatch / EngineRenderModel
  -> engine render
```

错误方式：

```txt
engine.setDocument(vectorDocument)
```

原因：

```txt
1. engine 不应该理解产品语义。
2. adapter 可以隔离文档模型变化。
3. engine 后续可以独立重构。
4. vector 可以自由调整 document/runtime，只要 adapter contract 稳定。
```

---

## 7. Dynamic Overlay 关系

`@venus/editor-primitive` 定义通用 overlay primitive：

```txt
rect
polygon
polyline
line
circle
handle
caret
label
hit-area
```

`apps/vector` 生成具体 overlay：

```txt
selection bounds
path anchor points
text caret
image crop handles
frame auto layout guides
marquee
drawing preview
snap guides
```

`engine` 负责：

```txt
render overlay primitive
hit test overlay primitive
return overlayId / cursor / action
```

规则：

```txt
1. overlay 是 dynamic layer，不是 document node。
2. overlay 不进 history / collaboration / tile cache / snapshot。
3. overlay action payload 由 apps/vector 解释。
4. engine 不解释 action。
```

---

## 8. Cursor 关系

`@venus/editor-primitive` 定义：

```txt
CursorIntent
CursorManager
CursorApplier
resize cursor rotation mapping
```

`apps/vector` 提供：

```txt
current tool
modifier keys
active operation
overlay hit
scene hit
editing mode
app mode
```

规则：

```txt
1. cursor 属于 interaction runtime。
2. cursor 不属于 document。
3. cursor 不进入 history。
4. cursor 不进入 collaboration。
5. cursor 不进入 engine cache。
6. engine 只提供 hit result / overlay cursor hint。
```

---

## 9. History / Collaboration / Export

当前阶段都放在 `apps/vector` 本地 editor 实现里。

```txt
apps/vector/editor/history
apps/vector/editor/collaboration
apps/vector/editor/export
```

原因：

```txt
1. history / collaboration 强依赖 VectorDocument operation。
2. 多人 undo / redo 和冲突处理依赖文档语义。
3. export 属于 document -> output artifact。
4. 当前阶段只有 vector，先在应用内实现更灵活。
```

未来如果 vector 核心稳定，再考虑拆出：

```txt
packages/vector-core
packages/vector-export
```

---

## 10. 推荐 monorepo 结构

```txt
packages/
  lib/
    src/
      math/
      geometry/
      ids/
      events/
      lifecycle/
      scheduler/
      patch/
      collections/
      logger/
      worker/
      serialization/
      index.ts

  editor-primitive/
    src/
      pointer/
      keyboard/
      tool/
      operation/
      hover/
      overlay/
      cursor/
      viewport/
      capture/
      runtime/
      index.ts

  engine/
    src/
      core/
      renderer/
      cache/
      hittest/
      scheduler/
      layers/
      offscreen/
      index.ts

apps/
  vector/
    editor/
      document/
      runtime/
      command/
      history/
      collaboration/
      adapter/
      overlay/
      export/
    ui/
```

---

## 11. 推荐依赖方向

```txt
@venus/lib
  ↑
  ├── @venus/editor-primitive
  │
  ├── engine
  │
  └── apps/vector

@venus/editor-primitive
  ↑
  └── apps/vector

engine
  ↑
  └── apps/vector
```

禁止依赖：

```txt
@venus/lib 不依赖任何上层包。
@venus/editor-primitive 不依赖 engine。
@venus/editor-primitive 不依赖 apps/vector。
engine 不依赖 apps/vector。
engine 不依赖 VectorDocument。
```

---

## 12. 判断边界的标准

### 放 `@venus/lib`，如果：

```txt
所有包都可能用。
不依赖具体编辑器业务。
不依赖 WebGL / Canvas / DOM 产品逻辑。
是底层类型、算法、工具、生命周期、事件、调度、集合、patch、logger。
```

### 放 `@venus/editor-primitive`，如果：

```txt
编辑器项目都能用。
不依赖具体文档模型。
不依赖 WebGL 渲染实现。
只关心用户输入、交互状态、overlay schema、cursor schema。
```

### 放 `engine`，如果：

```txt
依赖 renderer / WebGL / Canvas / WebGPU。
依赖 scene hit test / spatial index。
依赖 tile / snapshot / LOD。
负责实际绘制 overlay primitive。
负责 render model / patch 消费。
```

### 放 `apps/vector`，如果：

```txt
依赖 VectorDocument / SceneNode / TextNode / PathNode。
依赖 vector selection policy。
依赖 vector command / history / collaboration。
依赖 vector overlay builders。
依赖 vector export policy。
```

---

## 13. 最终规则

```txt
1. 包名使用 @venus/lib、@venus/editor-primitive、engine。
2. 应用层先只考虑 apps/vector。
3. @venus/lib 放底层通用能力。
4. @venus/editor-primitive 放编辑器通用交互 primitive。
5. engine 保持纯净，可以引用 @venus/lib。
6. engine 不吃业务文档模型，只吃 adapter 后的 render model / patch。
7. apps/vector 是 UI 层 + 本地 vector editor 实现。
8. apps/vector 负责自己的 document/runtime/commands/history/collaboration/overlay builders/adapter/export。
9. @venus/editor-primitive 不理解 vector 产品语义。
10. engine 不理解 vector 产品语义。
11. overlay action payload 由 apps/vector 解释。
12. cursor 是 interaction runtime，不是 document / history / collaboration。
13. export 不放进 primitive 或 engine，先放 apps/vector 本地实现。
```

一句话：

```txt
@venus/lib 是通用底座，@venus/editor-primitive 是编辑器交互原语，engine 是纯渲染执行层，apps/vector 负责 UI 和本地 vector editor 语义实现。
```