# Engine 模块总览（基于当前代码结构）

本文目标：把 `packages/engine/src` 当前所有模块的职责、能力和主调用关系讲清楚，作为后续重构和职责收敛的导航文档。

## 1. Engine 的定位

Engine 是机制层，不是产品层。

- 输入：scene 快照、viewport、交互上下文、性能策略。
- 输出：渲染帧、命中结果、候选查询、运行时诊断。
- 不负责：产品语义规则、命令历史、协作协议、UI 组件状态。

核心链路：

1. runtime 维护状态并驱动渲染。
2. scene 维护 render-facing 数据与索引。
3. renderer 选择 WebGL/Canvas2D 路径产出帧。
4. interaction 提供机制级 hit/snap/viewport 计算。

## 2. 顶层模块职责地图（src 全覆盖）

### 2.1 `runtime/`

运行时编排中心，负责把 scene、renderer、interaction 串成完整引擎实例。

- `createEngine.ts`
  - 对外入口（createEngine）。
  - 汇总 render strategy、frame budget、predictor、shortlist、layered bridge。
  - 负责场景装载、viewport 更新、渲染触发、stats 汇总、diagnostics 暴露。
- `createEngineLoop.ts`
  - 引擎循环控制（连续渲染/单帧渲染）。
- `renderScheduler.ts`
  - 渲染调度器（合帧、节流、优先级）。
- `createEngine/*`
  - `config.ts`：运行参数归一化。
  - `planning.ts`：frame/hit plan 组装。
  - `strategy.ts`：交互阶段策略机。
  - `frameBudgetBroker.ts`：预算分配。
  - `interactionPredictor.ts`：平移方向/速度预测。
  - `shortlist.ts`：候选集收敛。
  - `layeredBridge.ts`：分层渲染兼容桥。

### 2.2 `renderer/`

渲染后端与性能机制实现层。

- `webgl.ts`
  - 主渲染后端入口。
  - 组织 plan -> packet -> texture/cache/tile -> composite 全链路。
  - 汇总 fallback 原因、LOD、tile、snapshot、overlay 等执行分支。
- `canvas2d.ts`
  - Canvas2D 路径和辅助能力（如 model surface、文本/裁剪辅助）。
- `plan.ts` / `instances.ts` / `webglPackets.ts`
  - 将 scene/frame 结构编译为渲染计划和批次数据。
- `tileManager.ts` / `tileScheduler.ts`
  - tile key、zoom bucket、缓存、请求队列与调度。
- `zoomPerformance.ts`
  - 缩放策略阈值、bucket 生成与策略判定。
- `webgl*` 系列能力模块
  - `webglPipeline.ts`：GL 管线基础。
  - `webglTextures.ts`：纹理上传与缓存。
  - `webglTiles.ts`：tile 合成与回退。
  - `webglComposite.ts`：复合输出/快照合成。
  - `webglInteractionPreview.ts`：交互快照复用。
  - `webglResources.ts`：资源预算。
  - `webglRuntimeHelpers.ts` / `webglSurfaceHelpers.ts`：路径判定与辅助工具。
  - `webglSnapshotCapability.ts` / `webglTileCacheCapability.ts` / `webglTileQueueCapability.ts` / `webglLodCapability.ts`：能力封装。
- `fallbackTaxonomy.ts`
  - 渲染回退原因分类（可观测性基线）。
- `initialRender.ts`
  - 初次渲染阶段控制。
- `interactionPredictiveTiles.ts`
  - 预测驱动的 tile 预加载策略。

### 2.3 `scene/`

render-facing 场景数据、索引、计划和 patch 的核心域。

- `types.ts`
  - 可渲染节点和场景契约（shape/text/image/group 等）。
- `store.ts`
  - 场景存储与事务更新。
- `patch.ts`
  - 场景增量 patch 应用。
- `buffer.ts`
  - 渲染缓冲布局。
- `indexing.ts`
  - 场景索引构建与同步。
- `worldBounds.ts`
  - 节点 world bounds 计算。
- `framePlan.ts`
  - 帧候选计划。
- `hitPlan.ts`
  - 命中候选计划。
- `hitTest.ts`
  - 场景级命中解析。
- `scene/spatial/`
  - 空间索引实现与查询入口（RBush 适配）。
- `scene/geometry/`
  - bounds/path/bezier 等几何能力。

### 2.4 `interaction/`

机制级交互算法域（不含产品语义）。

- `hitTest.ts` / `hitTolerance.ts`
  - 机制级命中与容差策略。
- `snapping.ts`
  - 移动吸附能力。
- `viewport.ts` / `viewportPan.ts` / `zoom.ts`
  - viewport 更新、平移累计、缩放会话。
- `shapeTransform.ts`
  - 变换矩阵与兼容变换记录。
- `geometryPayload.ts`
  - 为外层交互与 overlay 生成几何负载。
- `overlayCanvas.ts`
  - overlay 绘制节点契约与绘制入口。
- `lodProfile.ts` / `lodConfig.ts` / `lodTypes.ts` / `visibilityLod.ts`
  - 交互期 LOD 与可见性预算策略。
- `interaction/hitTest/*`
  - path/geometry/matrix 子能力拆分。

### 2.5 `core/`

轻量分层渲染核心协议。

- `types.ts`：分层输入输出契约。
- `compose.ts`：base/active/overlay 合成规则。
- `render.ts`：分层执行主流程。

### 2.6 `renderer/layers/*` + `renderer/camera` + `renderer/hit` + `renderer/cache`

分层渲染相关能力已统一归并到 `renderer` 域：

- `renderer/layers/base/*`：基础层生成、裁剪与基础缓存。
- `renderer/layers/active/*`：active 层与预览变换。
- `renderer/layers/overlay/*`：hover/selection overlay 命令布局。
- `renderer/camera/*`：project/unproject 统一入口。
- `renderer/hit/*`：active/base 分层命中优先级。
- `renderer/cache/*`：几何缓存、分层 tile 缓存。

### 2.7 基础支撑域

- `math/`：矩阵和点变换。
- `animation/`：动画控制器与 easing。
- `time/`：时钟抽象。
- `utils/`：断言等基础工具。
- `worker/`：worker 能力开关/兼容边界。
- `bench/`：性能基准场景与执行脚本。

### 2.8 `index.ts` / `index.d.ts`

Engine 对外统一导出面，决定哪些能力是 public contract，哪些仅限内部。

## 3. 关键逻辑主链路

### 3.1 渲染主链路

1. runtime 生成 frame context（viewport、quality、budget、interaction phase）。
2. renderer 读取 plan 和 shortlist 候选。
3. 进入 WebGL 主路径：packet/tiles/snapshot/composite/overlay。
4. 记录 fallback taxonomy 与性能统计，回传 runtime diagnostics。

### 3.2 命中与查询链路

1. scene/spatial 给出 coarse candidates。
2. scene/hitPlan 或 interaction/hitTest 做 refine。
3. runtime 将机制命中映射到上层语义策略。

### 3.3 交互与视口链路

1. interaction 负责 zoom/pan/transform 的数学与会话状态。
2. runtime strategy 决定 interactive 与 settled 阶段策略。
3. frameBudget + predictor 共同调度 tile 与上传预算。

## 4. 当前结构状态评估（基于现状）

本轮迁移后，主要重复轨道已收敛：

1. 分层模块统一进入 `renderer/*` 责任域。
2. 空间索引与几何模块统一进入 `scene/*` 责任域。
3. 对外导出与核心调用路径已切换到新目录。

当前剩余关注点主要是“后续新增功能是否继续遵守单轨归属”，而不是历史重复目录。

## 5. 模块能力边界总结（给重构使用）

推荐按以下边界理解 engine：

1. runtime：编排与状态机。
2. scene：数据与候选计划。
3. renderer：后端执行与性能机制。
4. interaction：机制算法（hit/snap/viewport/transform）。
5. math/time/animation/utils：基础设施。
6. worker/bench：环境与验证。

后续无论做目录重组还是能力下沉，都应保持“一个责任域只保留一条实现主轨”。

## 6. 使用这份文档的方式

1. 新增能力前：先判断属于 runtime/scene/renderer/interaction 哪一域。
2. 修改问题前：先沿主链路定位，不要跨域打补丁。
3. 做收敛重构时：优先消除重复目录，再统一对外导出面。
