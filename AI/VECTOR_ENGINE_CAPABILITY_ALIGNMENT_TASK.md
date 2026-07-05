# Vector / Engine Capability Alignment Task

**Date:** 2026-07-03
**Status:** Active task document
**Owner:** Engine architecture / Vector validation

本文档替代旧的 `ENGINE_MODULE_ARCHITECTURE_AUDIT.md` 与
`ENGINE_MODULE_CONSTRAINTS.md`。后续 engine 与 vector 的相关改动以本文档为准。

## 1. Core Positioning

Vector 不是独立于 engine 的另一套图形系统，而是 engine 能力的验证应用。
所有通用能力都应该优先沉淀到 engine：

- 文档模型与常见节点类型
- 几何缓存、空间索引、screen culling
- selection、hit-test、snap 等交互基础能力
- base / overlay / active 分层渲染
- layer ordering
- clip、export、history 等可选模块

Vector 可以保留产品 UI、命令入口、业务策略与文件格式适配，但不应该长期持有
可复用的渲染、几何、选择、图层、导出或命中测试核心逻辑。

## 2. Architecture Direction

### 2.1 Base Engine

基础 engine 应该能完成最小绘制场景：

- 创建常见 shapes、text、image、group/frame
- 持有文档树与节点顺序
- 维护 geometry cache 与 spatial index
- 执行 base render
- 支持基础脏区与局部刷新

基础能力不等于 UI 编辑器。Engine 不包含 toolbar、panel、文件菜单、产品快捷键，
但可以提供让这些产品功能建立在其上的稳定 API。

### 2.2 Optional Public Modules

公开大模块按需启用：

| Module | Role | Default |
| --- | --- | --- |
| `base` | base render、layer ordering、base/overlay/active pipeline | enabled |
| `camera` | pan/zoom/viewport controller | optional |
| `hitTest` | pointer/rect/anchor/stroke/center hit result | optional |
| `interaction` | selection、marquee、snap、overlay interaction model | optional |
| `animate` | timeline/tween/interpolation scheduler | optional |
| `history` | engine document patch history | optional |
| `export` | image/SVG/selection/node/scene export | optional |
| `debug` | stats/diagnostics/overlay traces | optional |

`camera` 不必须依赖 `animate`。用户操作 camera 时，可以直接设置 viewport 并渲染；
只有需要惯性、平滑缩放、过渡动画时，才由 camera 可选调用 animate 的插值能力。

### 2.3 Public API Rule

Public API 不允许挂第二级。模块是安装单元、文档分类和打包入口，不是运行时
namespace。用户调用面必须是 flat API：

```ts
engine.hitTest(point, options)
engine.selectInRect(rect, options)
engine.exportSVG(options)
```

禁止在 API surface 上出现 module namespace + method 的二级形式，例如
hit-test 模块下再挂 hit-test 方法、interaction 下再挂 selection 对象、
export 下再挂具体格式方法。

可选模块启用后把能力注入 root engine API。未启用时，root API 要么不存在于 typed
surface，要么抛出清晰的 module-not-installed 错误；不通过二级对象表达模块边界。

## 3. Document Model Alignment

### 3.1 Source Of Truth

Engine 文档模型需要覆盖 Vector 已经证明常用的类型。当前 Vector 侧可作为对齐来源：

- `apps/vector-editor-web/src/runtime/model/documentModel.ts`
- `apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.ts`

Vector 当前节点类型包括：

- `frame`
- `group`
- `rectangle`
- `ellipse`
- `polygon`
- `star`
- `lineSegment`
- `path`
- `text`
- `image`

Engine 需要逐项对比并补齐：

- 节点类型缺口：`frame`、`star`、`lineSegment` alias 或标准化策略
- 树结构字段：`parentId`、`childIds`、同 parent 内顺序
- transform 字段：`x`、`y`、`width`、`height`、`rotation`、必要的 `flipX/flipY`
- shape 专有字段：points、bezierPoints、cornerRadius/cornerRadii、ellipse arc
- style 字段：fill/stroke/effects/shadow/opacity/blend
- text 字段：plain text、textRuns、字体与排版属性
- image 字段：assetId、assetUrl、intrinsic size、resource state
- clip 字段：clipPathId、clipRule、clip graph validation

Group 与 frame 的 bounds 规则需要分开：

- `group` 是纯结构容器，bounds 由 children 推导；若需要缓存 bounds，应作为
  derived/cache 数据，不作为用户必须维护的源数据。
- `frame` 是 bounds-owned 容器，保留 `x/y/width/height` 作为自身背景、clip、
  layout 与导出范围的源数据；children 保持独立几何。

### 3.2 Model Form

Engine model 仍应保持 plain object / serializable data 为主，不要求用户创建 class
实例。运行期 proxy、cache、renderer state 可以存在，但不应污染可序列化文档模型。

## 4. Render Pipeline

Engine 需要显式建立三层概念：

### 4.1 Base

Base 处理稳定内容：

- document snapshot
- screen culling
- spatial index / qtree
- geometry cache
- tile cache
- LOD
- static dirty region render

Base 是默认启用的 `base` 模块核心，不作为独立可选模块。

### 4.2 Overlay

Overlay 处理非文档内容：

- selection outline
- marquee rectangle
- hover outline
- transform handles
- anchor handles
- snap guides
- debug guides

Overlay 不应该修改 document model。Vector 现有 overlay model/adapters 应迁移到
engine 的 interaction/render 交界处。

### 4.3 Active

Active 处理正在快速变化的元素：

- drag/move/resize/rotate during interaction
- path anchor editing preview
- text editing caret/range preview
- image transform preview

Active 层需要：

- active node id set
- dirty bounds tracking
- base layer temporary exclusion/protection
- interaction commit 前的 fast path render
- release 后合并回 base snapshot

## 5. Extraction Tasks

### P0. Capability Matrix

建立 Vector 与 Engine 的能力对照表：

- document node field matrix
- render feature matrix
- hit-test result matrix
- selection API matrix
- layer command matrix
- clip/export support matrix

当前矩阵文件：`AI/VECTOR_ENGINE_CAPABILITY_MATRIX.md`。

验收：每个 Vector 字段要标记为 engine-owned、vector-only-product-policy、
derived-cache 或 deprecated。

### P1. Document Model Completion

以 Vector 常用模型补齐 engine 文档模型：

- 补齐 frame/star/lineSegment/path/text/image/group 所需字段
- 明确 group derived bounds 与 frame authored bounds 的规则
- 建立 model schema tests
- 更新 Vector adapter，使其尽量变成薄映射层

验收：Vector 的常用节点可以无信息丢失地转换为 engine model，再转换为 render snapshot。

注意：Vector adapter 迁移到 nested render tree 前，需要保证 frame background 的
hit target 映射稳定。Engine/Venus 内部 frame 会展开为 group + background rect；当前
render node 已支持 `hitTargetId`，可让内部 background 命中返回 frame id。

Vector adapter 的 nested tree 输出还需要 parent-local transform 策略。当前已补齐
`resolveParentLocalEngineTransform` 一类工具，用来保证
`parentWorld * childLocal = childWorld`；同时 adapter 已增加 opt-in `structureMode: 'tree'`
模式，复用 shared node conversion，将 frame 输出为 group + background，并保持默认 flat
模式不变。Renderer props 已能传入 tree mode；scene sync 在 tree mode 下已支持普通叶子
节点属性变更的 parent-aware incremental patch，也支持 group/frame 本体变更时用完整子树
upsert 做增量更新。结构脏场景仍保持 full scene load，后续应按 engine module/API 设计
补齐删除、reparent、同级重排能力，而不是暴露裸 diff 工具函数。产品层目前可通过
`localStorage["venus.vector.engine.sceneStructureMode"] = "tree"` 打开 tree mode 做 QA。
后续需要做视觉 parity，并继续补齐 base 与 layer API，再考虑切换默认路径。

### P2. Selection Module Extraction

从 Vector 提取 selection 处理逻辑到 `interaction` module，但 public API 保持
root-level：

- selection state API
- single/multi select
- range/marquee select
- selected bounds query
- selected overlay model query
- anchor selection for line/path
- locked/hidden/child/group selection policy options

新增框内元素判断 API：

```ts
engine.querySelectionInRect(rect, options)
engine.selectInRect(rect, options)
engine.getSelection()
engine.setSelection(nodeIds, options)
engine.clearSelection()
```

内部执行策略：

1. screen rect -> world rect
2. spatial index / qtree broad phase
3. geometry cache AABB/BBOX filter
4. path/stroke/fill/anchor precise phase
5. z-order and policy resolution

验收：Vector marquee selection 不再直接维护几何筛选主逻辑。

### P3. Render Layer And Ordering

从 Vector 提取 layer ordering 到 engine `base` 模块，但 public API 保持
root-level：

```ts
engine.getLayerOrder(parentId)
engine.moveBefore(nodeId, targetId)
engine.moveAfter(nodeId, targetId)
engine.bringForward(nodeId)
engine.sendBackward(nodeId)
engine.bringToFront(nodeId)
engine.sendToBack(nodeId)
```

规则：

- layer order 是同一 parent 内的 child order
- group/frame 内部递归保持局部顺序
- API 操作 id，不直接保存 shape object 引用
- 当前 Venus root layer API 已由默认启用的 `base` module 接管，调用面保持 flat
- 下一步需要返回 patch / revision，方便 history 和 Vector command system 接入

验收：Vector layer panel 与 arrange commands 调用 engine API。

增量 scene patch 需要支持 nested node 替换、删除、插入与 reparent。当前 engine 已支持
对 nested render node 的替换/删除并刷新索引，也支持通过 `upsertParentId` /
`upsertIndex` 进行 parent-aware insert/reparent。

### P4. Clip Capability Completion

补齐 engine clip 能力：

- clip path graph validation
- missing clip node detection
- cyclic clip detection
- clipRule parity
- clip-aware hit-test
- clip-aware export
- clip-aware bounds/cache invalidation

建议 API：

```ts
engine.validateClipGraph(scene)
engine.resolveClipDependencies(nodeId)
engine.hitTest(point, { respectClip: true })
engine.exportSVG({ respectClip: true })
```

验收：同一 clip 场景在 canvas render、hit-test、SVG export 中行为一致。

### P5. Hit-Test Application

将 Vector 侧命中测试能力并入 engine `hitTest`：

- pointer hit
- rect/marquee hit
- stroke/fill/center/anchor 分类
- path anchor hit
- text/image bounds hit
- group/frame child hit policy
- z-order aware result sorting

结果结构需要包含足够细节：

```ts
type HitResult = {
  nodeId: string
  part: 'fill' | 'stroke' | 'anchor' | 'center' | 'bounds' | 'handle'
  anchorId?: string
  distance?: number
  worldPoint: Point
  localPoint: Point
}
```

验收：Vector hover、click select、path/line anchor select 使用 engine hit result。

### P6. Export Upgrade

Export 作为独立 public module。若 engine 能力不足，从 Vector 提取并入：

- scene export
- selected nodes export
- single node export
- PNG/JPEG canvas export
- SVG export
- clip-aware export
- image resource export
- text export parity

建议 API：

```ts
engine.exportCanvas(options)
engine.exportBlob(options)
engine.exportDataURL(options)
engine.exportSVG(options)
engine.exportNode(nodeId, options)
engine.exportSelection(options)
```

验收：Vector export 入口只做 UI 与文件下载，不再实现核心 scene traversal/render
逻辑。

### P7. Vector App Upgrade / Downgrade

这一条需要单独执行，而不是只在迁移结尾顺手处理。按照当前 engine 架构，
Vector app 的方向是“升级接入 engine，降级自身职责”。

Vector 需要升级为：

- engine capability validation app：所有 engine module 都应能在 Vector 中被真实场景验证
- engine model consumer：优先使用 engine document model，Vector model 只保留产品扩展字段
- module wiring shell：在应用启动时选择启用 camera、interaction、hitTest、history、
  export、debug 等模块
- root API caller：所有能力通过 `engine.method(...)` 调用，不通过二级 namespace
- regression fixture source：把 Vector 常用文档、复杂 group、clip、text/image、large scene
  沉淀成 engine 测试 fixture
- product command wrapper：菜单、快捷键、面板命令只包装 engine patch/API，不再重写底层逻辑

Vector 需要降级/删除的职责：

- 自己维护一套通用 document node contract
- 自己做 selection geometry filtering
- 自己做 layer ordering mutation
- 自己做 hit-test geometry classifier
- 自己做 export scene traversal/render traversal
- 自己做 overlay model core builder
- 自己维护与 engine 重复的 bounds/path/cache 计算

Vector 可以保留并强化的职责：

- product shell
- UI panels
- command menu and shortcuts
- tool state machine
- app-specific document persistence
- business presets
- import/save file format policy
- engine module demo and validation scenarios

## 6. Module Relationships

### Geometry Cache

Geometry cache 是内部基础服务，供多个模块共享：

- render: dirty bounds, culling, LOD
- hitTest: broad/narrow phase
- selection: marquee and bounds
- snap: candidates
- export: bounds and clipping

缓存层级：

- AABB: fast broad phase
- BBOX/OBB: transformed bounds
- Path cache: precise geometry
- Stroke outline cache: stroke hit/export
- Text/image intrinsic metrics cache

### Screen Culling / QTree

Screen culling 与 qtree/spatial index 属于内部服务，不作为用户可直接启用的大模块。
`base`、`hitTest`、`selection` 按需使用它们。

### History

History 必须是 optional module。原因：

- 有些用户完全依赖 engine document model，需要 engine patch history
- 有些用户拥有自定义业务模型，例如 `attrTable` group，engine 无法理解全部语义

History API 应围绕 engine patches，而不是强制接管用户业务命令系统。

## 7. Testing Requirements

需要新增测试层级：

- Model schema tests：覆盖所有 node type 和字段默认值
- Adapter parity tests：Vector document -> engine model -> render snapshot 不丢字段
- Module gating tests：未启用 optional module 时 API 不出现或明确报错
- Combination tests：camera + base、hitTest + selection、selection + overlay、
  export + clip、history + layer
- Geometry cache tests：AABB/BBOX/path/stroke/text/image cache invalidation
- Clip parity tests：render / hit-test / export 一致
- Vector integration tests：Vector UI 命令实际调用 engine module API

## 8. Acceptance Criteria

本任务完成时应满足：

- Engine 文档模型覆盖 Vector 常用节点和字段
- Vector 不再重复实现通用 selection/layer/hit-test/export 核心能力
- Selection、history、export、hitTest 等能力可按需启用
- Base/overlay/active render pipeline 在 engine 中有清晰 API 与测试
- Clip 在 render、hit-test、export 中一致
- 所有 public module API 有文档、demo、form 表现能力和测试覆盖
