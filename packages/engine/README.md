# `@venus/engine`

Venus 的机制层渲染引擎。它负责 scene store、渲染、空间索引、hit-test、viewport 数学和调度，不负责产品语义、命令编排或 UI overlay。

## 角色边界

### Engine 负责

- WebGL 主渲染后端，以及 Canvas2D 辅助/合成能力
- `EngineSceneSnapshot` / `EngineRenderableNode` 场景模型
- `createEngine(...)` 统一入口
- scene store、batch patch、transaction
- coarse spatial index、frame plan、hit plan、top hit / all hits
- viewport 数学、selection handles、snapping 等机制级算法

### Engine 不负责

- 文档模型语义和文件格式
- 选择策略、双击进入何种编辑态、工具状态机
- command / history / collaboration protocol
- React、DOM、SVG overlay、cursor UI

当前仓库里的职责链是：

`apps/* -> @venus/runtime + @venus/runtime/interaction -> @venus/runtime/worker + @venus/runtime/shared-memory -> @venus/engine`

## 当前实现结论

### 1. 是否已有“静态层 / 交互层”概念

- 有零散能力，没有统一公共抽象。
- Engine 内已经有与这个方向相关的机制：`tileConfig.cacheStaticOnly`、dirty-region、`interactionPreview`、`modelCompleteComposite`。
- 但 selection box、handles、snap guides、hover/path edit chrome 仍然在 app 层的 SVG overlay 渲染，不属于 engine 的正式 layer API。

### 2. 是否已有 group 概念

- 有。`EngineRenderableNode` 包含 `EngineGroupNode`，`type: 'group'`，可嵌套 children。
- group 参与 world transform 组合、render traversal、hit-test 递归和 scene indexing。
- 当前 top-level vector 产品还在 runtime / worker / app 层维护 group 的语义选择、编组/解组命令和父子关系。

### 3. mask / clip 当前是什么形态

- Engine 层是通用 `clip` 能力，不是产品语义上的“mask group”。
- `EngineNodeBase.clip` 支持 `clipNodeId` 和 `clipShape`，image/text/shape 都能消费 clip。
- 当前 vector 产品只把 `shape.set-clip` 用在图片与闭合 shape 的 masking 流程上，尚未抽象成独立 mask group 节点。

## 对接方式

对接新编辑器时，不要把 engine 当成完整编辑器内核。推荐把它当成三段能力：

1. `scene mechanism`: 可渲染的节点树和增量更新
2. `render mechanism`: WebGL 帧绘制、dirty 标记、调度、诊断
3. `interaction mechanism`: hit-test、viewport、selection handles、snapping 这类底层算法

你需要在 runtime / app 层补齐：

- 文档模型到 engine scene 的 adapter
- command 和 history
- overlay / preview / cursor
- 工具状态机与编辑模式

## 对接步骤

以下步骤适合新建一个 `xmind-editor`、`mindmap-editor` 或其他图形编辑器。

### 1. 定义你的文档模型

你的文档模型应保留产品语义，例如：

- 节点、连线、分组、容器
- 业务字段
- 命令和撤销重做所需的最小持久状态

不要直接把 engine scene 当作持久化模型。

### 2. 写一个 scene adapter

把文档节点映射为 `EngineSceneSnapshot`：

- 视觉节点映射为 `shape` / `text` / `image` / `group`
- 业务层 parent/child 关系映射为 engine children 或 transform
- 可命中的几何和 clip 信息在这里下沉

vector 当前就是这样做的：文档和 runtime snapshot 先合成，再适配成 engine scene。

### 3. 创建 engine 实例

```ts
import { createEngine } from "@venus/engine";

const engine = createEngine({
  canvas,
  performance: {
    culling: true,
  },
  render: {
    quality: "full",
    webglClearColor: [1, 1, 1, 1],
    dpr: "auto",
    maxPixelRatio: 2,
    modelCompleteComposite: true,
    interactionPreview: {
      enabled: true,
      mode: "interaction",
    },
  },
  resource: {
    loader: {
      resolveImage: (assetId) => imageMap.get(assetId) ?? null,
    },
  },
});
```

说明：

- 当前主后端是 WebGL。
- Canvas2D 在仓库里仍存在，但方向上是辅助/合成基础设施，不是并列产品后端。

### 4. 首次加载 scene

```ts
engine.loadScene({
  revision: 1,
  width: 1600,
  height: 1200,
  nodes: [
    {
      id: "topic-root",
      type: "shape",
      shape: "rect",
      x: 120,
      y: 80,
      width: 240,
      height: 72,
      fill: "#fff8db",
      stroke: "#d6b656",
      strokeWidth: 1,
      cornerRadius: 16,
    },
    {
      id: "topic-root-label",
      type: "text",
      x: 144,
      y: 104,
      text: "Root Topic",
      style: {
        fontFamily: "sans-serif",
        fontSize: 18,
        fill: "#1f2937",
      },
    },
  ],
});
```

### 5. 增量 CRUD 使用 batch patch

高频编辑不要反复 `loadScene`。优先用：

- `applyScenePatchBatch(...)`
- `transaction(...)`

```ts
engine.applyScenePatchBatch({
  patches: [
    {
      revision: 2,
      upsertNodes: [
        {
          id: "topic-root",
          type: "shape",
          shape: "rect",
          x: 160,
          y: 120,
          width: 240,
          height: 72,
          fill: "#fff8db",
          stroke: "#d6b656",
          strokeWidth: 1,
          cornerRadius: 16,
        },
      ],
    },
  ],
});

engine.markDirtyBounds({ x: 120, y: 80, width: 280, height: 120 });
engine.renderFrame();
```

### 6. viewport 与 render 调度由 runtime 持有

```ts
engine.resize(width, height);
engine.setViewport({ offsetX, offsetY, scale });
engine.renderFrame();
```

如果你有自己的 runtime bridge，建议：

- runtime 持有 viewport 状态
- runtime 根据 interaction phase 切换 quality / dpr
- engine 只吃最终 viewport + render policy

### 7. hit-test / query 通过 engine，规则判断留在 runtime

```ts
const topHit = engine.hitTest({ x: worldX, y: worldY }, 6);
const allHits = engine.prepareHitPlan({ x: worldX, y: worldY }, 6);
```

当前建议做法：

- engine 负责几何命中和候选排序
- runtime 负责 locked / hidden / isolation / group preference / mask preference
- app 再决定 selection replace/add/remove/toggle 与双击行为

## Vector 当前是如何初始化和更新 engine 的

以 `apps/vector-editor-web` 为例：

1. app 创建 canvas 和 engine 实例。
2. runtime 将 `EditorDocument + SceneShapeSnapshot` 适配为 `EngineSceneSnapshot`。
3. 首次或结构性变化时调用 `engine.loadScene(...)`。
4. 普通局部变更时调用 `engine.applyScenePatchBatch(...)`。
5. render prep 计算 dirty candidates，并用 `engine.markDirtyBounds(...)` 驱动局部失效。
6. render scheduler 统一触发 `engine.renderFrame()`。
7. selection box / handles / guides / preview 在 app 的 SVG overlay 里单独渲染。

这意味着当前 vector 的“编辑器”是三层组合：

- engine: 画主场景
- runtime: 做增量更新、命中和交互策略桥接
- app: 画 overlay，持有工具和交互态

## 当前可直接复用的 engine API

### Scene / mutation

- `loadScene(scene)`
- `applyScenePatchBatch(batch)`
- `transaction(run)`
- `getNode(nodeId)`
- `getSnapshot()`

### Query / hit-test

- `query(bounds)`
- `queryViewportCandidates(padding?)`
- `queryPointCandidates(point, tolerance?)`
- `hitTest(point, tolerance?)`
- `prepareFramePlan(padding?)`
- `prepareHitPlan(point, tolerance?)`

### Viewport / render

- `setViewport(next)`
- `panBy(deltaX, deltaY)`
- `zoomTo(scale, anchor?)`
- `resize(width, height)`
- `setDpr(dpr, {maxDpr?})`
- `setQuality('full' | 'interactive')`
- `markDirtyBounds(bounds, zoomLevel?)`
- `renderFrame()`

### Runtime diagnostics

- `getDiagnostics()`
- `setProtectedNodeIds(nodeIds?)`

## 已支持的数据能力

- group 节点与嵌套 group
- image/text/shape/path/polygon/ellipse/line
- node transform matrix
- clip by node / inline clip shape
- world-bounds、spatial index、viewport shortlist
- interaction-time affine preview
- settled full-quality model-complete composite

## 当前限制

- 没有公共的“scene layer / overlay layer / picking layer”正式 API
- 没有产品级 mask group 概念
- 没有产品级 cursor / editing mode / double-click state machine
- 没有产品级 selection semantics，尤其是 deep select、group isolation、text edit
- overlay 仍是 app 层 SVG/DOM，不走 engine WebGL 合成

## 何时应该自己补 runtime/app 层

如果你要做 `xmind-editor`，通常需要自己实现：

- 节点与连线的文档模型
- 选中规则、框选规则、双击进入编辑态规则
- topic resize / branch reconnect / text edit / fold 等命令
- DOM 文本编辑层
- overlay renderer
- cursor resolver

如果你只需要“渲染 + 几何查询 + viewport + 局部更新”，engine 已经够用。
