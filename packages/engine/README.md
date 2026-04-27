# `@venus/engine`

Venus 的机制层引擎。它提供纯粹的渲染与几何能力，包括 scene store、渲染后端、空间索引、query/hit-test、viewport 数学、render scheduling、tile 与图片采样等机制；不负责产品语义、命令历史、工具状态机或 UI overlay。

## 文档归属

- engine 专属能力、边界与接入说明，应保留在当前 package 内。
- 全局 `docs/` 只保留跨 package 的架构、治理与导航信息。

当前职责链：

`apps/* -> @venus/runtime + @venus/runtime/interaction -> @venus/runtime/worker + @venus/runtime/shared-memory -> @venus/engine`

## 一句话理解

把 `@venus/engine` 当成一个“可嵌入的场景渲染与命中机制包”，而不是完整编辑器内核。

它擅长的是：

- 吃一个 render scene
- 维护 render-facing state 与索引
- 画出当前 viewport
- 提供候选查询与精确 hit-test
- 暴露一组可组合的性能能力

它不擅长也不应该负责的是：

- 文档模型与文件格式
- command / history / collaboration
- 产品级选择规则与编辑模式
- React、DOM、SVG overlay、cursor UI

## Engine 的能力地图

### 1. Scene 能力

Engine 有自己的 render-facing scene contract，而不是直接使用产品文档模型。

核心对象：

- `EngineSceneSnapshot`
- `EngineRenderableNode`
- `EngineGroupNode`
- `EngineShapeNode`
- `EngineTextNode`
- `EngineImageNode`

支持的结构能力：

- group 与嵌套 children
- transform 组合
- clip by node / inline clip shape
- shape / text / image / path / polygon / ellipse / line 等可渲染节点

这层只表达“如何被渲染与命中”，不表达产品语义。

### 2. Scene Store 与增量更新能力

Engine 自带 render-facing store：

- `createEngineSceneStore(...)`
- `loadScene(scene)`
- `applyScenePatchBatch(batch)`
- `transaction(run)`

内部维护：

- node map
- coarse spatial index
- buffer layout
- snapshot metadata

推荐用法是 batch-first：结构性变化或初始化用 `loadScene(...)`，高频更新优先走 `applyScenePatchBatch(...)` 或 `transaction(...)`。

### 3. 渲染能力

统一入口：`createEngine(...)`

当前主后端方向：

- WebGL 是主渲染后端
- Canvas2D 在 engine 内更多是辅助/合成/裁剪/文本相关基础设施，不是并列产品后端

可直接控制的渲染能力：

- `setQuality('full' | 'interactive')`
- `setDpr(dpr, {maxDpr?})`
- `setInteractionPreview(config?)`
- `renderFrame()`
- `markDirtyBounds(bounds, zoomLevel?)`

内置的渲染机制能力包括：

- culling
- dirty-region 传播
- shortlist / coarse frame plan
- interaction-time affine preview
- model-complete composite
- tile cache
- initial render progressive path
- 图片纹理延迟上传与按需降采样

### 4. Query 与 Hit-Test 能力

Engine 既提供 coarse query，也提供 exact refinement。

可直接复用的入口：

- `query(bounds)`
- `queryViewportCandidates(padding?)`
- `queryPointCandidates(point, tolerance?)`
- `hitTest(point, tolerance?)`
- `prepareFramePlan(padding?)`
- `prepareHitPlan(point, tolerance?)`

职责划分建议：

- engine 负责几何候选收集、world-transform 下的 exact hit
- runtime 负责 locked / hidden / isolation / group preference / product pick rules
- app 负责 selection replace/add/remove/toggle 与双击行为

### 5. Viewport 与调度能力

Engine 内置 viewport 机制与渲染调度原语：

- `setViewport(next)`
- `panBy(deltaX, deltaY)`
- `zoomTo(scale, anchor?)`
- `resize(width, height)`
- `createEngineRenderScheduler(...)`

推荐模式是 runtime 持有 viewport state 与交互 phase，engine 只消费最终 viewport 与 render policy。

### 6. 交互算法能力

除了 scene-level hit-test，engine 还承载一部分机制级交互算法：

- marquee
- selection handles
- snapping
- viewport math
- zoom session helpers
- shape transform helpers

这些能力属于“机制算法”，不是产品交互语义。

## LOD、DPR 与其他性能能力的关系

### 结论

`DPR` 不是 `LOD` 的同义词，但 `LOD` 配置可以包含 `DPR` 作为一个可组合字段。

准确说法是：

- `DPR` 是 engine 的独立运行时能力，能单独通过 `setDpr(...)` 控制
- `LOD` 是一组性能退化/切换策略，用来决定在不同场景或 phase 下如何组合质量、DPR、节流、preview 等能力

### 当前仓库里的两类 LOD 概念

#### 1. Coarse profile

`resolveEngineCanvasLodProfile(...)` 会根据以下因素给出一个 coarse profile：

- scene pressure
- zoom scale
- interaction velocity

返回内容当前包括：

- `lodLevel`
- `renderQuality`
- `targetDpr`
- `imageSmoothingQuality`
- `interactiveIntervalMs`

这说明在当前实现里，LOD profile 确实已经把 DPR 作为策略输出的一部分。

#### 2. Capability config

`EngineLodConfig.interactionCapabilities` 则是更偏“能力组合”的另一层配置。它当前支持：

- `quality`
- `dpr`
- `interactionActive`
- `interactiveIntervalMs`

这进一步说明：DPR 在 engine 里既是单独能力，也是 LOD capability 可以调度的一个维度。

### 推荐理解方式

把这些能力拆开理解最清楚：

- `quality`: full 或 interactive
- `dpr`: backing-store pixel ratio
- `interactiveIntervalMs`: 交互态节流间隔
- `interactionPreview`: 是否允许使用上一帧做仿射预览
- `tileConfig`: 是否启用 tile cache，以及如何失效/复用
- `image downsampling`: 图片上传时的缩放采样策略

LOD 不是单个开关，而是这些能力的组合策略层。

## Engine 内置但不应被误解为产品层的能力

### 已有 group 概念

- 有 `EngineGroupNode`
- group 参与 transform 组合、render traversal、scene indexing、hit-test 路径

但 engine 不负责：

- 编组/解组命令
- group isolation 语义
- deep select 规则

### 已有 clip 能力

- `clipNodeId`
- `clipShape`

但这不是产品级 `mask group` 语义。

### 没有正式 overlay layer API

engine 内有一些和静态层/交互层方向相关的机制：

- `interactionPreview`
- `tileConfig`
- dirty-region
- model-complete composite

但当前没有正式的公共 `scene layer / overlay layer / picking layer` API。selection bounds、handles、guides、hover chrome 仍主要在 app/runtime overlay 中完成。

## 最小接入方式

### 1. 保留你自己的产品文档模型

不要把 `EngineSceneSnapshot` 当持久化模型。你的产品仍应有自己的：

- 节点/连线/容器语义
- 历史记录与命令模型
- 文件格式

### 2. 写一个 scene adapter

把你的产品文档映射到 engine scene：

- 视觉节点映射为 `shape` / `text` / `image` / `group`
- parent/child 与 transform 映射为 engine children 或 node transform
- clip 与 hit geometry 在这里下沉

### 3. 创建 engine

```ts
import { createEngine } from "@venus/engine";

const engine = createEngine({
  canvas,
  performance: {
    culling: true,
  },
  render: {
    quality: "full",
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

### 5. 高频更新走 batch patch

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
await engine.renderFrame();
```

### 6. 外层 runtime 持有 viewport 和交互 phase

```ts
engine.resize(width, height);
engine.setViewport({ offsetX, offsetY, scale });
engine.setQuality("interactive");
engine.setDpr("auto", { maxDpr: 2 });
await engine.renderFrame();
```

### 7. hit-test 用 engine，选择语义留给 runtime/app

```ts
const topHit = engine.hitTest({ x: worldX, y: worldY }, 6);
const hitPlan = engine.prepareHitPlan({ x: worldX, y: worldY }, 6);
```

## 外层仍需补充的产品能力

如果你要做一个新的产品编辑器，通常还需要自己实现：

- 文档模型与文件格式
- command / history
- 选中规则与多选规则
- topic / branch / connector 的产品语义
- DOM 文本编辑层
- overlay renderer
- cursor 与工具状态机

如果你的目标只是“渲染 + query/hit-test + viewport + 局部更新”，那么 engine 已经足够作为底层机制层使用。
