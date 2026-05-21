# Engine 非兼容破坏性重构规划与任务清单（2026-05-21）

状态：In Progress（硬切主线执行中）
责任人：Engine 架构迁移
范围：packages/engine + apps/\*/runtime/engine-bridge 适配层

## 执行进展（2026-05-21 最新）

1. 已完成硬切主线清理（engine 内）

- 删除 `createEngineCompat*` 与 `legacyEngineCompatExports` 迁移层源码及对应迁移测试。
- 对外 API 保留 canonical 命名，不再新增/保留迁移别名路径。

2. 已完成命名收口（engine 内）

- `shapeTransform` 中移除 `*Compat` 包装函数命名，改为直接 canonical 导出。
- `toLegacyShapeTransformRecord` 改名为 `toShapeTransformRecordFromMatrix`，并同步更新调用与 parity 测试。

3. 当前校验策略（按最新指令）

- 仅执行 engine 范围校验，不执行 vector/global 校验。

4. 最新校验结果

- `pnpm --filter @venus/engine test`：通过（76 passed, 0 failed）。
- `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：通过。

5. 本轮主线完成项（M0/M1/M2）

- M0/M1：补齐并强化契约测试失败路径（documentGraph 缺失节点删除幂等、sceneCompiler remove-node 全链路 invalidation）。
- M2：在 canonical `EngineHandle` 打通 `query(bounds)`、`pick(point, options)`、`raycast(ray, options)` 公共能力链路；实现基于 graph 节点的 spatial query 与 ray hit-test。
- 命名硬切：移除 active runtime 中 `compat` strictness 值，统一为 strict/dev；同步清理相关注释与测试文案。

6. 本轮继续推进（M2 + 命名收口）

- `EngineHandle` 新增 public query/pick/raycast 契约类型并从 `index.ts` 类型导出补齐。
- `createEngine` 已接入 graph 节点态驱动的 `query(bounds)`、`pick(point, options)`、`raycast(ray, options)` 实现链路。
- runtime 边界测试由 `legacyRuntimeBoundary.test.mjs` 重命名为 `runtimePackageBoundary.test.mjs`，语义保持不变（仍阻断 `@venus/engine-legacy` 运行时导入/重导出）。
- 最新 engine 校验：`pnpm --filter @venus/engine test` 与 `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit` 均通过。

## 0. 规划输入（合并分析结论）

本规划合并了前两次分析结果：

- 现状能力审计：当前主路径仍由 compat 适配层主导，WebGPU/WebGL/Canvas2D/Headless 在 vNext adapter 层存在占位/不完备项，交互可用性与渲染完备度存在缺口。
- 数据与 API 链路分析：当前 2D/3D 并非双栈完全分治，而是统一 scene 结构 + 部分 3D 能力入口（例如 ray 与 camera3d），产品语义必须先在 app/authoring adapter 中归一化为 engine runtime 输入后再进入 engine。

同时纳入新增前提：

- engine-legacy 中存在大量可复用模块，允许按规则复用，但必须受边界与退役策略约束。

设计目标来源：

- 以 `ai/draft.md` 作为目标蓝图，采用“Universal Realtime Runtime Platform”方向推进。
- 明确执行策略：不走兼容路径，允许破坏性重构，采用主版本升级切换。

---

## 1. Scope Definition

### 1.1 目标状态

建设一个平台无关、状态驱动、API-first、Renderer 解耦、GPU 显式化的现代实时 3D Runtime 系统，满足：

- 统一 Scene 数据模型，支撑 3D runtime 表达、查询、编译与渲染；2D/vector/overlay 被建模为同一 3D runtime 内的 planar layer，而不是第二套 2D 引擎
- 状态驱动：engine 由 document/world/view/backend/resource 等显式状态推进，不由产品事件或 UI 状态隐式驱动
- API-first：public API、contract 与中英文 docs 先冻结，再进入 runtime 实现
- 后端支持 WebGL / WebGPU / Canvas2D / Headless（确定性离屏）
- 通过 Dirty System、Spatial Index、Command Buffer、多阶段 Render Pipeline 实现高性能
- GPU 显式化：资源、上传、barrier、command buffer、render pass、readback 都必须作为可观测 runtime 状态建模
- 提供 picking、overlay、viewport、camera、transform preview 等编辑器可用的 runtime primitive，同时由 app/authoring adapter 持有 hover/select/undo/history 等产品状态
- 支撑服务端离屏输出、确定性回放元数据与跨后端一致性验证
- 在 `packages/engine/docs/en` 与 `packages/engine/docs/cn` 同步生成分门别类的 engine 文档，完整定义 engine 可提供的 public API surface，支撑 vector app 与 engine 重构并行开发

### 1.2 非目标

- 不在 engine core 承载产品策略（产品语义留在 app adapter）
- 不在 engine core 承载产品命令、历史记录、撤销重做、协作状态、文件保存策略或 UI 状态机
- 不引入长期并行实现轨（v2/new/temp）
- 不破坏既有 DAG 依赖边界（app -> engine -> lib）
- 不保留 compat 运行路径作为正式迁移策略

### 1.3 现状基线（必须承认）

- 当前 compat 路径仍是 app 主要可用路径（这是待删除对象，不是保留策略）。
- 2D/3D 场景当前主要是统一节点模型，3D 入口存在但主链路不完整。
- 后端抽象层结构已具备，但 WebGPU/WebGL/Canvas2D/Headless 仍需实装与对齐。

---

## 2. Type Definition（先定义契约）

在任何实现前，先冻结以下核心契约：

- SceneDocumentContract：engine 归一化场景快照（runtime 输入态，不包含产品历史或 UI 状态）
- SceneChangeSetContract：engine 可应用的增量变更载体（由 app/authoring adapter 产生）
- RuntimeWorldContract：可渲染执行世界（编译态）
- DirtyStateContract：脏标记域与传播规则
- SpatialIndexContract：统一 spatial broad-phase 查询契约，覆盖 planar layer 与 volumetric scene 两类加速结构
- CommandBufferContract：后端无关命令流
- RenderPipelineContract：多阶段 pass 图契约
- PickingContract：planar 命中 + Ray 命中能力契约
- OffscreenFrameContract：Headless 输出与确定性元数据契约
- BackendAdapterContract：WebGL/WebGPU/Canvas2D/Headless 适配接口
- ProductAdapterBoundaryContract：产品语义到 engine runtime 输入的边界约束
- PublicApiSurfaceContract：engine 对 app/adapter 暴露的完整 API 分类、稳定性级别与输入输出边界

契约原则：

- Scene 与 Renderer 解耦：Renderer 只消费 RuntimeWorld。
- 状态驱动：所有 runtime 行为必须由显式 state transition、dirty state、render plan 或 command buffer 推进，禁止隐藏全局状态。
- API-first：public API、contract、docs、tests 的顺序必须先于实现，vector app 只能依赖已定义 API。
- 产品语义禁止直接进入 renderer backend。
- Renderer 解耦：SceneDocument、RuntimeWorld、RenderPlan、CommandBuffer、BackendAdapter 必须单向依赖，Renderer 不读取产品状态。
- GPU 显式化：GPU resource、upload、barrier、pipeline、pass、readback、frame capture 必须具备契约、诊断与 replay 表达。
- 产品命令、历史、撤销重做、协作状态、文件保存策略禁止进入 engine core。
- app/authoring adapter 只向 engine 提交 SceneDocument snapshot、SceneChangeSet、view/camera/picking request 与 backend policy。
- public API 必须先在 `PublicApiSurfaceContract` 与中英文 docs 中定义，再进入实现。
- 任一 public contract 变更必须伴随注释与测试更新。

### 2.1 Public API Surface（给人读、给 app 用）

Public API 必须先服务 app 开发者，再服务 engine 内部实现。默认暴露面分两层：

1. Human-facing Developer API：vector app、playground、业务 adapter 默认只能使用这一层。
2. Advanced Runtime API：面向性能诊断、headless、后端验证、工具链和少数高级 adapter；不得作为普通 app 的首选入口。

任何新增 public API 必须标注 `developer` 或 `advanced` 稳定性级别；如果一个 API 只能被 engine 内部模块正确使用，它不应该出现在 public API surface。

#### 2.1.1 Developer API：创建与挂载

- `createEngine(options)`：创建一个可挂载的 engine 实例。
- `engine.mount(target)`：挂载到 canvas、offscreen target 或 host surface。
- `engine.unmount()`：解除 surface 绑定但保留可复用 runtime 配置。
- `engine.dispose()`：彻底释放 runtime、backend 与资源。
- `engine.ready()`：等待 backend、surface、初始资源就绪。
- `engine.configure(options)`：用面向开发者的配置更新 backend、quality、interaction、diagnostics。

#### 2.1.2 Developer API：场景数据

- `engine.setGraph(graph)`：设置完整运行时图模型，适合首次加载或大切换。
- `engine.updateGraph(patch)`：提交增量图模型补丁。
- `engine.getGraph()`：读取当前运行时图快照。
- `engine.clearGraph()`：清空图模型与派生 runtime state。
- `engine.validateGraph(graph)`：返回 schema/resource/capability 校验结果。
- `engine.onGraphChange(listener)`：订阅图模型 revision 变化。

#### 2.1.3 Developer API：视图与相机

- `engine.resize(size)`：更新 viewport 尺寸与 pixel ratio。
- `engine.setView(view)`：设置 camera、zoom、pan、projection、clip 等 view state。
- `engine.getView()`：读取当前 view state。
- `engine.fitToBounds(bounds, options)`：将 camera/view 适配到目标范围。
- `engine.screenToWorld(point)`：将屏幕坐标转为 world 坐标。
- `engine.worldToScreen(point)`：将 world 坐标转为屏幕坐标。

#### 2.1.4 Developer API：渲染控制

- `engine.render()`：立即渲染一帧，返回 frame result。
- `engine.invalidate(reason)`：通知 engine 当前 scene/view/resource 需要刷新。
- `engine.pause()`：暂停自动调度。
- `engine.resume()`：恢复自动调度。
- `engine.setQuality(quality)`：设置 quality profile，例如 interactive、balanced、quality、headless。
- `engine.captureImage(options)`：捕获当前 frame image，适合导出、缩略图与测试。

#### 2.1.5 Developer API：交互命中

- `engine.pick(point, options)`：按屏幕坐标返回命中对象列表。
- `engine.raycast(ray, options)`：按 ray 返回 3D 命中结果。
- `engine.query(bounds, options)`：查询 viewport、world bounds 或 frustum 范围内对象。
- `engine.setInteractionState(state)`：提交 hover、selection、active tool、drag preview 等 app 状态的 engine 表达。
- `engine.clearInteractionState(scope)`：清理 hover、selection overlay、drag preview 等 engine 表达。

#### 2.1.6 Developer API：Overlay 与编辑器辅助

- `engine.setOverlays(overlays)`：提交 selection outline、hover highlight、handles、guides、rulers 等 overlay。
- `engine.clearOverlays(scope)`：清理 overlay。
- `engine.setTransformPreview(preview)`：提交 transform preview，不提交产品命令。
- `engine.getOverlayState()`：读取 overlay runtime 摘要，便于 vector app 调试。

#### 2.1.7 Developer API：资源

- `engine.loadAssets(assets)`：加载 texture、mesh、font、image、volume、video 等资源。
- `engine.unloadAssets(assetIds)`：释放资源引用。
- `engine.getAssetState(assetId)`：读取资源加载、上传、驻留状态。
- `engine.preloadAssets(request)`：按预算预加载资源。

#### 2.1.8 Developer API：后端与环境

- `engine.setBackendPreference(preference)`：设置 auto、webgpu、webgl、canvas2d、headless 偏好。
- `engine.getBackendInfo()`：读取当前后端、fallback 原因、能力与限制。
- `engine.getCapabilities()`：读取 feature support、limits、precision、extensions。
- `engine.createHeadlessSession(options)`：创建服务端/测试用离屏 session。

#### 2.1.9 Developer API：事件与诊断

- `engine.on(event, listener)`：订阅 frame、error、warning、backend-change、resource-change、pick 等事件。
- `engine.off(event, listener)`：取消订阅。
- `engine.getDiagnostics()`：读取开发者可理解的 runtime 诊断摘要。
- `engine.setDiagnosticsEnabled(enabled)`：开启或关闭诊断采集。
- `engine.captureDebugFrame(options)`：捕获一帧调试包，包含 public state、render summary 与 backend 摘要。

#### 2.1.10 Developer API：Domain Adapter Helpers

- `createEngineGraphFromDomainModel(input)`：将任意产品域模型归一化为 engine graph。
- `createEngineGraphPatchFromDomainDelta(input)`：将任意产品增量归一化为 graph patch。
- `createEngineOverlaysFromDomainState(input)`：将领域交互状态转换为 engine overlay。
- `createEnginePickRequestFromDomainInput(input)`：将领域输入事件转换为 pick request。
- `assertEngineSafeInput(input)`：开发期断言输入不包含产品历史、undo/redo、协作会话、UI store。

#### 2.1.11 Advanced Runtime API：显式状态与编译链路

- `engine.runtime.getDocumentSnapshot()`：读取 engine-normalized document snapshot。
- `engine.runtime.applyChangeSet(changeSet)`：应用底层 changeSet，供 adapter 与测试使用。
- `engine.runtime.compileWorld()`：显式编译 RuntimeWorld。
- `engine.runtime.getRuntimeWorld()`：读取只读 RuntimeWorld。
- `engine.runtime.getDirtyState()`：读取 dirty domains。
- `engine.runtime.flushDirtyState()`：提交已处理 dirty 状态。

#### 2.1.12 Advanced Runtime API：Render/GPU 执行

- `engine.runtime.createRenderPlan(request)`：生成 visibility、LOD、ROI、tiling、budget 计划。
- `engine.runtime.encodeCommandBuffer(plan)`：生成后端无关 command buffer。
- `engine.runtime.submit(commandBuffer)`：提交 command buffer。
- `engine.runtime.createGpuResource(descriptor)`：创建显式 GPU resource 描述。
- `engine.runtime.createUploadBatch(request)`：生成可诊断 upload batch。
- `engine.runtime.createBarrierPlan(request)`：生成 resource transition 与 synchronization barrier 计划。
- `engine.runtime.inspectCommandBuffer(commandBuffer)`：读取 command buffer 摘要。
- `engine.runtime.readbackResource(request)`：执行显式 readback。

#### 2.1.13 Advanced Runtime API：可观测性与回放

- `engine.runtime.captureFrame(options)`：捕获 frame graph、command buffer、backend metadata。
- `engine.runtime.createReplayToken(scope)`：创建确定性回放 token。
- `engine.runtime.replay(token)`：执行 deterministic replay。
- `engine.runtime.getMetrics()`：读取指标快照，不上传产品分析数据。

### 2.2 Capability Packs（抽象能力 API，非场景语义 API）

Engine 不提供任何“场景语义 API”（例如 `engine.medical.*`、`engine.bim.*`、`engine.gis.*`）。
Engine 只暴露抽象能力包，应用通过 adapter 组合这些能力完成行业场景。

#### 2.2.1 Geometry And Topology Pack

- `engine.capability.geometry.setModel(model)`：提交几何拓扑与实例数据。
- `engine.capability.geometry.updateModel(patch)`：增量更新几何拓扑。
- `engine.capability.geometry.queryTopology(query)`：查询面、边、节点、分组关系。
- `engine.capability.geometry.computeBounds(input)`：计算包围体与层级 bounds。

#### 2.2.2 Viewport And Camera Pack

- `engine.capability.view.setViewport(viewport)`：设置 viewport 与像素参数。
- `engine.capability.view.setCamera(camera)`：设置相机模型与投影。
- `engine.capability.view.fit(bounds, options)`：按边界自动适配视图。
- `engine.capability.view.project(input)`：world 到 screen 投影。
- `engine.capability.view.unproject(input)`：screen 到 world 反投影。

#### 2.2.3 Spatial Query And Picking Pack

- `engine.capability.spatial.query(query)`：统一空间查询。
- `engine.capability.spatial.queryViewportCandidates(query)`：平面候选集查询。
- `engine.capability.spatial.queryFrustumVisibleSet(query)`：体空间可见集查询。
- `engine.capability.picking.pick(point, options)`：屏幕点选。
- `engine.capability.picking.raycast(ray, options)`：射线命中。

#### 2.2.4 Overlay And Annotation Pack

- `engine.capability.overlay.setOverlays(overlays)`：设置高亮、边框、辅助线、标注等 overlay。
- `engine.capability.overlay.clear(scope)`：清理 overlay。
- `engine.capability.overlay.setTransformPreview(preview)`：设置交互预览。
- `engine.capability.annotation.setAnnotations(annotations)`：设置文本与图形注释。

#### 2.2.5 Temporal Timeline Pack

- `engine.capability.timeline.setRange(range)`：设置时间范围。
- `engine.capability.timeline.setCursor(cursor)`：设置时间游标。
- `engine.capability.timeline.play(options)`：播放时间序列。
- `engine.capability.timeline.pause()`：暂停时间序列。
- `engine.capability.timeline.seek(time)`：跳转时间点。

#### 2.2.6 Simulation And State Transition Pack

- `engine.capability.simulation.initialize(state)`：初始化仿真状态。
- `engine.capability.simulation.step(deltaTime)`：推进仿真步。
- `engine.capability.simulation.setStatePatch(patch)`：提交状态增量。
- `engine.capability.simulation.queryState(query)`：查询当前仿真状态。

#### 2.2.7 Resource And Streaming Pack

- `engine.capability.resource.load(assets)`：加载资源集合。
- `engine.capability.resource.unload(assetIds)`：卸载资源。
- `engine.capability.resource.preload(request)`：预加载资源。
- `engine.capability.streaming.connect(endpoint)`：连接流式数据源。
- `engine.capability.streaming.setBudget(budget)`：设置流式预算。
- `engine.capability.streaming.pushChunk(chunk)`：提交分块数据。

#### 2.2.8 Render And Composition Pack

- `engine.capability.render.renderFrame(request)`：渲染一帧。
- `engine.capability.render.invalidate(reason)`：触发重绘。
- `engine.capability.render.setQuality(profile)`：设置质量策略。
- `engine.capability.composition.setGraph(graph)`：设置合成图。
- `engine.capability.composition.compose(request)`：执行层合成。

#### 2.2.9 GPU Explicit Pack

- `engine.capability.gpu.createResource(descriptor)`：显式创建 GPU 资源。
- `engine.capability.gpu.updateResource(resourceId, update)`：显式更新 GPU 资源。
- `engine.capability.gpu.createUploadBatch(request)`：创建上传批次。
- `engine.capability.gpu.createBarrierPlan(request)`：创建同步/屏障计划。
- `engine.capability.gpu.submit(commandBuffer)`：提交命令。
- `engine.capability.gpu.readback(request)`：显式回读。

#### 2.2.10 Backend And Session Pack

- `engine.capability.session.mount(target)`：挂载会话。
- `engine.capability.session.unmount()`：卸载会话。
- `engine.capability.session.createHeadless(options)`：创建离屏会话。
- `engine.capability.backend.setPreference(preference)`：设置后端偏好。
- `engine.capability.backend.getInfo()`：获取后端信息与 fallback。

#### 2.2.11 Data Field And Analysis Pack

- `engine.capability.field.setScalarField(field)`：设置标量场。
- `engine.capability.field.setVectorField(field)`：设置向量场。
- `engine.capability.field.setTransferFunction(tf)`：设置映射函数。
- `engine.capability.field.setIsoValue(value)`：设置等值阈值。
- `engine.capability.field.probe(position)`：采样查询。

#### 2.2.12 Geospatial Pack

- `engine.capability.geo.setReference(reference)`：设置地理参考。
- `engine.capability.geo.addTileset(tileset)`：添加地理分块数据。
- `engine.capability.geo.worldToGeo(point)`：world 转地理坐标。
- `engine.capability.geo.geoToWorld(position)`：地理坐标转 world。
- `engine.capability.geo.setCullingPolicy(policy)`：设置地理裁剪策略。

#### 2.2.13 Media And Multi-source Pack

- `engine.capability.media.setSources(sources)`：设置多源媒体输入。
- `engine.capability.media.setTimeline(timeline)`：设置媒体时间线。
- `engine.capability.media.renderAt(time)`：渲染指定时间。
- `engine.capability.media.capture(options)`：捕获输出帧。

#### 2.2.14 Collaboration Boundary Pack

- `engine.capability.collaboration.setRemotePointers(pointers)`：设置远端指针。
- `engine.capability.collaboration.setPresence(presence)`：设置在线状态。
- `engine.capability.collaboration.setSharedViewport(state)`：设置共享视图状态。
- `engine.capability.collaboration.setIssueMarkers(markers)`：设置协作标记。

#### 2.2.15 Diagnostics And Replay Pack

- `engine.capability.diagnostics.getSummary()`：获取诊断摘要。
- `engine.capability.diagnostics.captureFrame(options)`：捕获调试帧。
- `engine.capability.diagnostics.getMetrics()`：获取指标快照。
- `engine.capability.replay.createToken(scope)`：创建回放 token。
- `engine.capability.replay.run(token)`：执行回放。

### 2.3 Scenario To Capability Mapping（30 场景映射，不新增场景语义 API）

以下 30 个目标场景仅通过能力包组合实现。Engine 层禁止新增任何行业前缀 API。

1. Medical imaging (CT/MRI)：Data Field And Analysis + Geometry And Topology + Overlay And Annotation + Spatial Query And Picking + Render And Composition
2. Surgical simulation：Simulation And State Transition + Geometry And Topology + Spatial Query And Picking + Temporal Timeline + Overlay And Annotation
3. BIM collaboration：Geometry And Topology + Spatial Query And Picking + Collaboration Boundary + Overlay And Annotation + Viewport And Camera
4. Industrial CAD：Geometry And Topology + Spatial Query And Picking + Overlay And Annotation + Viewport And Camera + Render And Composition
5. GIS visualization：Geospatial + Viewport And Camera + Spatial Query And Picking + Resource And Streaming + Render And Composition
6. Digital twin systems：Simulation And State Transition + Temporal Timeline + Collaboration Boundary + Overlay And Annotation + Diagnostics And Replay
7. Autonomous driving replay：Temporal Timeline + Simulation And State Transition + Data Field And Analysis + Spatial Query And Picking + Diagnostics And Replay
8. Scientific visualization：Data Field And Analysis + Geometry And Topology + Render And Composition + Viewport And Camera
9. Molecular rendering：Geometry And Topology + Data Field And Analysis + Spatial Query And Picking + Render And Composition
10. 2D vector editing：Geometry And Topology + Overlay And Annotation + Spatial Query And Picking + Render And Composition
11. Video editing：Media And Multi-source + Temporal Timeline + Render And Composition + Diagnostics And Replay
12. Game runtime/editor convergence：Simulation And State Transition + Spatial Query And Picking + Overlay And Annotation + Render And Composition
13. Whiteboard collaboration：Geometry And Topology + Collaboration Boundary + Overlay And Annotation + Viewport And Camera
14. Massive SVG/PDF rendering：Geometry And Topology + Resource And Streaming + Spatial Query And Picking + Render And Composition
15. Financial visualization：Temporal Timeline + Data Field And Analysis + Render And Composition + Spatial Query And Picking
16. XR / AR / VR：Viewport And Camera + Spatial Query And Picking + Render And Composition + Backend And Session
17. Robotics visualization：Simulation And State Transition + Geometry And Topology + Data Field And Analysis + Spatial Query And Picking
18. IoT dashboards：Media And Multi-source + Temporal Timeline + Overlay And Annotation + Diagnostics And Replay
19. Cloud streaming frontend：Resource And Streaming + Backend And Session + Viewport And Camera + Render And Composition
20. Remote rendering frontend：Backend And Session + Spatial Query And Picking + Diagnostics And Replay + Render And Composition
21. AI-generated scene visualization：Geometry And Topology + Overlay And Annotation + Diagnostics And Replay + Render And Composition
22. Massive timeline/log visualization：Temporal Timeline + Data Field And Analysis + Render And Composition + Spatial Query And Picking
23. Presentation rendering：Media And Multi-source + Temporal Timeline + Overlay And Annotation + Render And Composition
24. Live compositing：Media And Multi-source + Render And Composition + GPU Explicit + Diagnostics And Replay
25. Browser creative coding runtime：Render And Composition + GPU Explicit + Temporal Timeline + Viewport And Camera
26. Procedural node graph editor：Simulation And State Transition + Geometry And Topology + Overlay And Annotation + Diagnostics And Replay
27. Simulation replay systems：Temporal Timeline + Simulation And State Transition + Diagnostics And Replay
28. Forensic playback systems：Diagnostics And Replay + Temporal Timeline + Collaboration Boundary + Overlay And Annotation
29. Scientific volume rendering：Data Field And Analysis + GPU Explicit + Render And Composition + Viewport And Camera
30. Large-scale geospatial visualization：Geospatial + Resource And Streaming + Spatial Query And Picking + Render And Composition + GPU Explicit

### 2.4 产品语义剥离流程（从场景到 Engine API）

本流程是强制方法，不是建议项。任何新需求必须按以下顺序落地：

1. 识别产品语义：先列出需求中的行业词、业务词、UI词（例如医疗、BIM、工单、白板、视频轨）。
2. 提取能力原子：将语义词映射到能力原子（geometry/view/spatial/overlay/timeline/simulation/resource/render/gpu/session/diagnostics 等）。
3. 归并能力包：把能力原子合并进 2.2 已定义 capability pack；禁止创建行业专属 pack。
4. 定义 contract：先定义 PublicApiSurfaceContract 与 capability contract（输入/输出/错误/稳定性级别）。
5. 生成 API：只允许生成 `engine.*` 或 `engine.capability.*` 抽象 API，不允许行业命名前缀 API。
6. 适配到产品：由 app/domain adapter 组合 API 形成产品能力。
7. 回归验证：用 2.3 场景映射验证能力组合是否覆盖需求，而不是新增场景语义 API。

阻断规则：若新增 API 带有行业语义前缀（如 medical/bim/gis/cad/finance/video/game 等），CR 直接拒绝。

---

## 3. CHANGE REQUEST（总 CR）

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/document/\*
  - packages/engine/src/compiler/\*
  - packages/engine/src/scene-runtime/\*
  - packages/engine/src/dirty/\*
  - packages/engine/src/spatial/\*
  - packages/engine/src/picking/\*
  - packages/engine/src/command-buffer/\*
  - packages/engine/src/render-planning/\*
  - packages/engine/src/render-runtime/\*
  - packages/engine/src/render-execution/\*
  - packages/engine/src/backend/\*
  - packages/engine/src/composition/\*
  - packages/engine/src/resources/\*
  - packages/engine/src/resource-graph/\*
  - packages/engine/src/shader/\*
  - packages/engine/src/streaming/\*
  - packages/engine/src/view/\*
  - packages/engine/src/observability/\*
  - packages/engine/src/testing/\*
  - packages/engine/src/api/\*
  - packages/engine/docs/en/\*
  - packages/engine/docs/cn/\*
  - apps/\*/runtime/engine-bridge/\*（仅适配层）

Goal:

- Problem being solved:
  - compat 主导、3D 主链路未闭环、后端能力不对齐、离屏确定性不足。
  - 现有架构与 `ai/draft.md` 的目标层次（文档层/编译层/提取层/组合层/执行层）存在差距。
  - 当前规划必须把产品 authoring 状态与 engine runtime 状态彻底切开，避免 engine core 变成产品编辑器状态容器。
  - vector app 需要与 engine 重构并行开发，因此必须先给出稳定 public API 分类与中英文文档入口。

Change Type:

- Add / Modify / Remove:
  - Add：解耦后的核心契约、运行时模块、中英文 engine docs、Public API Surface 文档
  - Modify：scene 转换链路与 render orchestration
  - Remove：compat facade、legacy bridge 导出、过时 shim、产品历史/撤销/持久化进入 engine core 的设计

Impact:

- Affected modules:
  - engine core、backend adapter、app bridge、测试与诊断

Cleanup:

- Old logic to remove:
  - 直接移除 compat-only 分支、冗余 fallback 与过时桥接，不保留长期双轨

Tests:

- Tests to add/update:
  - 契约测试、边界隔离测试、API 文档覆盖测试、后端一致性测试、交互 primitive 回归、离屏快照、性能预算门禁

---

## 4. Test Design（阻断式门禁）

### 4.1 契约门禁

- SceneDocument snapshot/changeSet apply 确定性测试
- ProductAdapterBoundary 隔离测试：产品命令、历史、撤销重做、协作状态、文件保存策略不得被 engine contract 引用
- PublicApiSurface 文档覆盖测试：每个 public API 必须在 `packages/engine/docs/en` 与 `packages/engine/docs/cn` 同步出现，并标注稳定性、输入、输出、错误语义
- PublicApiSurface 语义剥离测试：public API 名称不得出现行业语义前缀（medical/bim/gis/cad/finance/video/game 等）
- RuntimeWorld 增量编译与失效策略测试
- Dirty 传播正确性测试
- CommandBuffer 序列稳定性与可回放测试
- Pipeline pass 依赖与裁剪测试

### 4.2 后端一致性门禁

- WebGL 与 WebGPU 逻辑帧一致性（容差内）
- Headless 与基准帧一致性
- fallback 行为可观测（诊断字段 + 事件）

### 4.3 交互门禁

- Planar layer picking 正确性
- Ray picking 正确性（3D fixture）
- hover/select 输入由 app adapter 显式提交后，engine overlay primitive 跨后端一致

### 4.4 性能门禁

- 大场景帧时预算
- Dirty 增量更新预算
- 空间查询延迟预算
- 命令编译与提交预算

---

## 5. Implementation（分阶段任务）

## M0：破坏性重构开关与契约冻结（1 周）

任务：

1. 建立核心契约文件与类型注释，包含 ProductAdapterBoundary 边界契约。
2. 明确 scene -> world -> command -> backend 的单向数据边界。
3. 建立契约测试骨架（先红后绿）。
4. 建立破坏性切换规则：冻结 compat API 新增，禁止新增 compat 依赖。
5. 建立 Public API Surface 初版，并生成 `packages/engine/docs/en` 与 `packages/engine/docs/cn` 的文档目录骨架。
6. 规划主版本升级与切换窗口。

退出条件：

- typecheck + 契约测试通过
- 模块边界无反向依赖
- Public API docs 覆盖 M0 契约与 app bridge 并行接入入口

## M1：Scene/World/Dirty 核心落地 + 兼容入口摘除（2 周）

任务：

1. 落地 engine-normalized SceneDocument snapshot 与 ChangeSet 应用器。
2. 落地 RuntimeWorld 增量编译器。
3. 落地 Dirty 多域标记（transform/geometry/material/visibility/picking/resource）。
4. 建立高 churn 全量重编译阈值策略。
5. 删除 `createEngineCompat` 在 app 正式路径中的入口地位。

退出条件：

- 增量/全量路径结果一致
- Dirty 回归集通过

## M2：Spatial Index + Picking 主链路（2 周）

任务：

1. 建立统一 SpatialIndexContract，并分别落地 planar layer 与 volumetric scene 两类索引实现。
2. 打通 queryViewportCandidates/queryFrustumVisibleSet 的真实实现。
3. 打通 hitTestPlanar 与 hitTestRay 的真实实现，消除 ray 空返回占位。
4. 消除依赖 compat 命中逻辑的调用面。

退出条件：

- Planar 与 ray 命中测试通过
- 大场景查询延迟在预算内

## M3：Command Buffer + 多阶段 Render Pipeline（2 周）

任务：

1. 落地后端无关命令缓冲。
2. 落地最小可用 pass 图：visibility、depth、opaque、transparent、overlay、composite。
3. 落地 replay 诊断与命令摘要。

退出条件：

- 命令回放一致性通过
- pass 依赖与跳过策略通过

## M4：WebGL/WebGPU/Canvas2D/Headless 后端收敛（3 周）

任务：

1. WebGL adapter：由占位切换到真实提交。
2. WebGPU adapter：由探测/占位切换到真实编码与提交。
3. Canvas2D adapter：作为回退与组合层能力实现稳定运行路径。
4. Headless adapter：确定性离屏输出路径（图像/元数据/回放 token）。
5. 完成单一高层 API 下的后端无感切换（应用不感知底层后端实现细节）。

退出条件：

- 四后端能力门禁通过（WebGL/WebGPU/Canvas2D/Headless）
- Headless 快照 CI 通过

## M5：编辑器交互质量与 app bridge 非兼容切换（2 周）

任务：

1. 将当前 app bridge 对 compat 的强依赖切换到 capability runtime（不保留回退双轨）。
2. 将 hover/select 等产品状态留在 app bridge，由 app bridge 转换为 engine overlay/picking/transform preview 输入。
3. 保证 overlay/picking/transform preview 等 runtime primitive 跨后端一致。
4. 对现有 vector 页面问题建立专项回归集（不再出现仅方块/状态无变化）。

退出条件：

- 交互回归通过
- app bridge 不依赖 compat-only 行为且无回退分支

## M6：Legacy 复用收口与清理（1 周）

任务：

1. 逐项移除过时 shim/fallback/AI-TEMP。
2. 清理 dead export、冗余桥接代码与无用模块。
3. 将已迁移能力从 legacy 复用清单中摘除并归档。
4. 完成架构收口与文档更新。

退出条件：

- 无并行实现轨残留
- cleanup 检查通过

---

## 6. engine-legacy 复用策略（新增）

允许复用，但采用“受控迁移”原则，而不是直接长期依赖。

### 6.1 可复用优先级

优先复用以下类型模块（按低风险到高风险）：

1. 纯算法模块：几何、矩阵、命中数学、索引算法
2. 无副作用工具：确定性计算、序列化辅助
3. 可封装的运行时子模块：hit-test、geometry payload、spatial query、render packet 编译
4. 高耦合 orchestration 模块：最后处理，只在必要时抽象迁移

禁止作为 engine core 复用目标：产品 command、undo/redo、历史栈、协作会话、文件保存策略、UI selection store、业务侧 snapping policy。

### 6.2 复用落地规则

- 先复制契约，再迁移实现，再补齐测试，不允许黑盒长期透传。
- 若必须临时透传，必须带 AI-TEMP 标记与删除条件。
- 每次复用都要附 parity 测试，保证 canonical 行为不退化。
- 复用目标是“迁移后删除 legacy 依赖”，不是“长期依赖 legacy 运行时”。

### 6.3 退役规则

- 同一能力在 canonical 通过契约测试 + parity 测试 + 集成回归后，立即从 legacy 透传列表中移除。
- 维护一份 shrink-only 清单：只能减少不能增加。
- 若出现新增 legacy 依赖，必须阻断并回滚到最近可用迁移点。

---

## 7. Validation（每阶段必跑）

- pnpm --filter @venus/engine test
- pnpm typecheck
- pnpm lint
- pnpm build
- pnpm --filter @venus/engine cr:check

额外门禁（M3 以后）：

- 后端一致性套件
- Headless 快照差异套件
- 编辑器交互回归套件

---

## 8. Cleanup Check

每个里程碑完成后执行：

1. 删除已替代分支，不留平行轨。
2. 删除失效导出与桥接。
3. 检查 DAG 依赖是否仍成立。
4. 检查是否存在无删除条件的临时逻辑。

---

## 9. 风险与缓解

- 风险 A：WebGPU 与 WebGL 行为漂移
  - 缓解：命令缓冲统一 + parity CI

- 风险 B：交互回归影响编辑器可用性
  - 缓解：固定回放样例 + hover/select 专项基准

- 风险 C：Headless 非确定性
  - 缓解：固定时间源/随机种 + 帧元数据校验

- 风险 D：legacy 依赖回潮
  - 缓解：shrink-only 清单 + 增量迁移评审门禁

---

## 10. 本周可执行拆解（直接开工）

1. 完成 M0 契约冻结与破坏性切换开关（冻结 compat 新增依赖）。
2. 建立 legacy 复用清单与 parity 对照表，并标注每项删除条件。
3. 先行打通 M2 的 hitTestRay 真实现（去除空返回占位）。
4. 在 playground 与 vector runtime 增加 3D/后端验证场景并接入回归。
5. 制定主版本升级说明（Breaking Changes、app adapter 迁移指引、发布切换策略）。

---

## 11. 设计目标映射（来源：ai/draft.md）

以下将 `ai/draft.md` 的宏观目标映射到本计划可执行里程碑：

1. Document Layer 与外部 Authoring Runtime 分离

- 对应 M0 + M1：冻结 engine-normalized SceneDocumentContract、SceneChangeSetContract、ProductAdapterBoundaryContract、RuntimeWorldContract，并落地增量编译。
- 产品 command、history、undo/redo、collaboration、autosave、文件保存格式属于 app/authoring runtime，不属于 `@venus/engine` core。

2. Compilation Layer / Extraction Layer

- 对应 M1 + M3：建立 scene -> world -> command 的编译与提取链路。

3. Unified Composition + Layer Runtime

- 对应 M3 + M5：建立多阶段 pass 与 overlay/selection/interaction 一致性机制。

4. Spatial + Picking（含 planar layer 与 Ray）

- 对应 M2：planar/volumetric 双索引 + hitTestPlanar/hitTestRay 正式化。

5. Backend Abstraction（WebGL/WebGPU/Canvas2D/Headless）

- 对应 M4：后端实装收敛、单一高层 API 下的后端无感切换。

6. Streaming / Pressure / Budget 驱动

- 对应 M1 + M3 + M4：Dirty 增量、命令计划、后端提交与预算门禁联动。

7. 观测与回放（Deterministic Runtime）

- 对应 M3 + M4 + M6：命令回放、离屏快照、诊断闭环。

8. Non-Compat Breaking Cutover

- 对应 M0 + M5 + M6：冻结 compat 新增依赖、完成 bridge 切换、移除 compat/legacy 过时入口。

9. State-driven / API-first / Renderer-decoupled / GPU-explicit Runtime

- 对应 M0 + M1：先冻结 public API、contract、docs 与显式 state model，再落地 document/world/dirty 编译链路。
- 对应 M3 + M4：通过 RenderPlan、CommandBuffer、RenderExecution、BackendAdapter 显式表达 GPU 资源、上传、barrier、pass、submit 与 readback。
- 对应 M5：vector app 只依赖已定义 API 与 app bridge 边界，不反向读取 renderer 内部状态。

---

## 12. 全量文件清单（All Files Manifest）

本节定义最终落地时必须存在的文件。目标是：

1. 单文件单职责
2. 命名简洁清晰
3. 每个能力都有实现 + 类型契约 + 测试
4. 同名家族文件放在同目录

### 12.1 全局规则（强制）

1. 每个能力目录必须包含：`<name>.ts`、`<name>.contract.ts`、`<name>.test.ts`。
2. 能力目录可选补充：`<name>.diagnostics.ts`、`README.md`。
3. 所有公共导出类型必须有注释说明语义与边界。
4. 禁止 `utils.ts`、`helpers.ts`、`common.ts`、`temp.ts`。
5. 目录命名统一使用 lowerCamel。
6. 产品 command、history、undo/redo、collaboration、autosave、文件保存策略、UI state store 禁止出现在 `packages/engine/src` 文件清单中。
7. `packages/engine/docs/en` 与 `packages/engine/docs/cn` 必须保持同构目录；任一 public API 新增或语义变化必须同步更新两种语言文档。

### 12.2 顶层文件清单

```txt
packages/engine/src/
├── index.ts
├── api/
├── document/
├── compiler/
├── scene-runtime/
├── dirty/
├── spatial/
├── picking/
├── command-buffer/
├── render-planning/
├── render-runtime/
├── render-execution/
├── backend/
├── composition/
├── resources/
├── resource-graph/
├── shader/
├── streaming/
├── view/
├── observability/
└── testing/

packages/engine/docs/
├── en/
└── cn/
```

### 12.3 API 模块全量文件

```txt
packages/engine/src/api/
├── createEngine/
│   ├── createEngine.ts
│   ├── createEngine.contract.ts
│   ├── createEngine.test.ts
│   └── README.md
├── createScene/
│   ├── createScene.ts
│   ├── createScene.contract.ts
│   ├── createScene.test.ts
│   └── README.md
├── createRenderer/
│   ├── createRenderer.ts
│   ├── createRenderer.contract.ts
│   ├── createRenderer.test.ts
│   └── README.md
├── publicTypes/
│   ├── publicTypes.ts
│   ├── publicTypes.contract.ts
│   ├── publicTypes.test.ts
│   └── README.md
├── productAdapterBoundary/
│   ├── productAdapterBoundary.ts
│   ├── productAdapterBoundary.contract.ts
│   ├── productAdapterBoundary.test.ts
│   └── README.md
├── publicApiSurface/
│   ├── publicApiSurface.ts
│   ├── publicApiSurface.contract.ts
│   ├── publicApiSurface.test.ts
│   └── README.md
└── index.ts
```

### 12.4 Document 模块全量文件

```txt
packages/engine/src/document/
├── documentGraph/
│   ├── documentGraph.ts
│   ├── documentGraph.contract.ts
│   ├── documentGraph.test.ts
│   └── README.md
├── documentNode/
│   ├── documentNode.ts
│   ├── documentNode.contract.ts
│   ├── documentNode.test.ts
│   └── README.md
├── documentVersion/
│   ├── documentVersion.ts
│   ├── documentVersion.contract.ts
│   ├── documentVersion.test.ts
│   └── README.md
├── documentRevision/
│   ├── documentRevision.ts
│   ├── documentRevision.contract.ts
│   ├── documentRevision.test.ts
│   └── README.md
├── changeSet/
│   ├── changeSet.ts
│   ├── changeSet.contract.ts
│   ├── changeSet.test.ts
│   └── README.md
├── deltaPatch/
│   ├── deltaPatch.ts
│   ├── deltaPatch.contract.ts
│   ├── deltaPatch.test.ts
│   └── README.md
├── documentSnapshot/
│   ├── documentSnapshot.ts
│   ├── documentSnapshot.contract.ts
│   ├── documentSnapshot.test.ts
│   └── README.md
├── documentSchema/
│   ├── documentSchema.ts
│   ├── documentSchema.contract.ts
│   ├── documentSchema.test.ts
│   └── README.md
├── documentCodec/
│   ├── documentCodec.ts
│   ├── documentCodec.contract.ts
│   ├── documentCodec.test.ts
│   └── README.md
└── index.ts
```

边界说明：`document/` 只表示 engine 能理解的规范化 runtime document。产品操作命令、历史栈、撤销重做、协作会话、autosave 与业务文件格式属于 app/authoring runtime，只能通过 `api/productAdapterBoundary/` 转换为 engine snapshot 或 changeSet。

### 12.5 Compiler 模块全量文件

```txt
packages/engine/src/compiler/
├── sceneCompiler/
│   ├── sceneCompiler.ts
│   ├── sceneCompiler.contract.ts
│   ├── sceneCompiler.test.ts
│   └── README.md
├── transformCompiler/
│   ├── transformCompiler.ts
│   ├── transformCompiler.contract.ts
│   ├── transformCompiler.test.ts
│   └── README.md
├── materialCompiler/
│   ├── materialCompiler.ts
│   ├── materialCompiler.contract.ts
│   ├── materialCompiler.test.ts
│   └── README.md
├── geometryCompiler/
│   ├── geometryCompiler.ts
│   ├── geometryCompiler.contract.ts
│   ├── geometryCompiler.test.ts
│   └── README.md
├── visibilityCompiler/
│   ├── visibilityCompiler.ts
│   ├── visibilityCompiler.contract.ts
│   ├── visibilityCompiler.test.ts
│   └── README.md
├── runtimeExtractor/
│   ├── runtimeExtractor.ts
│   ├── runtimeExtractor.contract.ts
│   ├── runtimeExtractor.test.ts
│   └── README.md
├── gpuCompiler/
│   ├── gpuCompiler.ts
│   ├── gpuCompiler.contract.ts
│   ├── gpuCompiler.test.ts
│   └── README.md
├── incrementalCompiler/
│   ├── incrementalCompiler.ts
│   ├── incrementalCompiler.contract.ts
│   ├── incrementalCompiler.test.ts
│   └── README.md
└── index.ts
```

### 12.6 Scene Runtime 模块全量文件

```txt
packages/engine/src/scene-runtime/
├── runtimeWorld/
│   ├── runtimeWorld.ts
│   ├── runtimeWorld.contract.ts
│   ├── runtimeWorld.test.ts
│   └── README.md
├── entityStore/
│   ├── entityStore.ts
│   ├── entityStore.contract.ts
│   ├── entityStore.test.ts
│   └── README.md
├── componentStore/
│   ├── componentStore.ts
│   ├── componentStore.contract.ts
│   ├── componentStore.test.ts
│   └── README.md
├── queryRuntime/
│   ├── queryRuntime.ts
│   ├── queryRuntime.contract.ts
│   ├── queryRuntime.test.ts
│   └── README.md
├── runtimeState/
│   ├── runtimeState.ts
│   ├── runtimeState.contract.ts
│   ├── runtimeState.test.ts
│   └── README.md
└── index.ts
```

### 12.7 Dirty 模块全量文件

```txt
packages/engine/src/dirty/
├── dirtyFlags/
│   ├── dirtyFlags.ts
│   ├── dirtyFlags.contract.ts
│   ├── dirtyFlags.test.ts
│   └── README.md
├── dirtyPropagation/
│   ├── dirtyPropagation.ts
│   ├── dirtyPropagation.contract.ts
│   ├── dirtyPropagation.test.ts
│   └── README.md
├── dirtyMerge/
│   ├── dirtyMerge.ts
│   ├── dirtyMerge.contract.ts
│   ├── dirtyMerge.test.ts
│   └── README.md
├── dirtyPolicy/
│   ├── dirtyPolicy.ts
│   ├── dirtyPolicy.contract.ts
│   ├── dirtyPolicy.test.ts
│   └── README.md
└── index.ts
```

### 12.8 Spatial 模块全量文件

```txt
packages/engine/src/spatial/
├── planarSpatialIndex/
│   ├── planarSpatialIndex.ts
│   ├── planarSpatialIndex.contract.ts
│   ├── planarSpatialIndex.test.ts
│   └── README.md
├── volumetricSpatialIndex/
│   ├── volumetricSpatialIndex.ts
│   ├── volumetricSpatialIndex.contract.ts
│   ├── volumetricSpatialIndex.test.ts
│   └── README.md
├── broadPhase/
│   ├── broadPhase.ts
│   ├── broadPhase.contract.ts
│   ├── broadPhase.test.ts
│   └── README.md
├── narrowPhase/
│   ├── narrowPhase.ts
│   ├── narrowPhase.contract.ts
│   ├── narrowPhase.test.ts
│   └── README.md
├── spatialQuery/
│   ├── spatialQuery.ts
│   ├── spatialQuery.contract.ts
│   ├── spatialQuery.test.ts
│   └── README.md
└── index.ts
```

### 12.9 Picking 模块全量文件

```txt
packages/engine/src/picking/
├── pickingPipeline/
│   ├── pickingPipeline.ts
│   ├── pickingPipeline.contract.ts
│   ├── pickingPipeline.test.ts
│   └── README.md
├── hitTestPlanar/
│   ├── hitTestPlanar.ts
│   ├── hitTestPlanar.contract.ts
│   ├── hitTestPlanar.test.ts
│   └── README.md
├── hitTestRay/
│   ├── hitTestRay.ts
│   ├── hitTestRay.contract.ts
│   ├── hitTestRay.test.ts
│   └── README.md
├── marqueePicking/
│   ├── marqueePicking.ts
│   ├── marqueePicking.contract.ts
│   ├── marqueePicking.test.ts
│   └── README.md
├── lassoPicking/
│   ├── lassoPicking.ts
│   ├── lassoPicking.contract.ts
│   ├── lassoPicking.test.ts
│   └── README.md
├── hoverPicking/
│   ├── hoverPicking.ts
│   ├── hoverPicking.contract.ts
│   ├── hoverPicking.test.ts
│   └── README.md
├── penetrationPicking/
│   ├── penetrationPicking.ts
│   ├── penetrationPicking.contract.ts
│   ├── penetrationPicking.test.ts
│   └── README.md
├── pickingCache/
│   ├── pickingCache.ts
│   ├── pickingCache.contract.ts
│   ├── pickingCache.test.ts
│   └── README.md
└── index.ts
```

### 12.10 Command Buffer 模块全量文件

本模块的 `command` 指后端无关 render command，不代表产品操作命令。产品操作命令必须停留在 app/authoring runtime。

```txt
packages/engine/src/command-buffer/
├── commandTypes/
│   ├── commandTypes.ts
│   ├── commandTypes.contract.ts
│   ├── commandTypes.test.ts
│   └── README.md
├── commandEncoder/
│   ├── commandEncoder.ts
│   ├── commandEncoder.contract.ts
│   ├── commandEncoder.test.ts
│   └── README.md
├── commandValidation/
│   ├── commandValidation.ts
│   ├── commandValidation.contract.ts
│   ├── commandValidation.test.ts
│   └── README.md
├── commandReplay/
│   ├── commandReplay.ts
│   ├── commandReplay.contract.ts
│   ├── commandReplay.test.ts
│   └── README.md
├── commandStats/
│   ├── commandStats.ts
│   ├── commandStats.contract.ts
│   ├── commandStats.test.ts
│   └── README.md
└── index.ts
```

### 12.11 Render Planning 模块全量文件

```txt
packages/engine/src/render-planning/
├── visibilityPlan/
│   ├── visibilityPlan.ts
│   ├── visibilityPlan.contract.ts
│   ├── visibilityPlan.test.ts
│   └── README.md
├── lodPlan/
│   ├── lodPlan.ts
│   ├── lodPlan.contract.ts
│   ├── lodPlan.test.ts
│   └── README.md
├── roiPlan/
│   ├── roiPlan.ts
│   ├── roiPlan.contract.ts
│   ├── roiPlan.test.ts
│   └── README.md
├── tilingPlan/
│   ├── tilingPlan.ts
│   ├── tilingPlan.contract.ts
│   ├── tilingPlan.test.ts
│   └── README.md
├── progressivePlan/
│   ├── progressivePlan.ts
│   ├── progressivePlan.contract.ts
│   ├── progressivePlan.test.ts
│   └── README.md
├── frameBudgetPlan/
│   ├── frameBudgetPlan.ts
│   ├── frameBudgetPlan.contract.ts
│   ├── frameBudgetPlan.test.ts
│   └── README.md
└── index.ts
```

### 12.12 Render Runtime 模块全量文件

```txt
packages/engine/src/render-runtime/
├── frameOrchestrator/
│   ├── frameOrchestrator.ts
│   ├── frameOrchestrator.contract.ts
│   ├── frameOrchestrator.test.ts
│   └── README.md
├── renderExtraction/
│   ├── renderExtraction.ts
│   ├── renderExtraction.contract.ts
│   ├── renderExtraction.test.ts
│   └── README.md
├── submissionRuntime/
│   ├── submissionRuntime.ts
│   ├── submissionRuntime.contract.ts
│   ├── submissionRuntime.test.ts
│   └── README.md
├── synchronizationRuntime/
│   ├── synchronizationRuntime.ts
│   ├── synchronizationRuntime.contract.ts
│   ├── synchronizationRuntime.test.ts
│   └── README.md
├── renderDiagnostics/
│   ├── renderDiagnostics.ts
│   ├── renderDiagnostics.contract.ts
│   ├── renderDiagnostics.test.ts
│   └── README.md
└── index.ts
```

### 12.13 Render Execution 模块全量文件

```txt
packages/engine/src/render-execution/
├── packets/
│   ├── packets.ts
│   ├── packets.contract.ts
│   ├── packets.test.ts
│   └── README.md
├── uploads/
│   ├── uploads.ts
│   ├── uploads.contract.ts
│   ├── uploads.test.ts
│   └── README.md
├── barriers/
│   ├── barriers.ts
│   ├── barriers.contract.ts
│   ├── barriers.test.ts
│   └── README.md
├── canvas2d/
│   ├── canvas2dExecution.ts
│   ├── canvas2dExecution.contract.ts
│   ├── canvas2dExecution.test.ts
│   └── README.md
├── webgl/
│   ├── webglExecution.ts
│   ├── webglExecution.contract.ts
│   ├── webglExecution.test.ts
│   └── README.md
├── webgpu/
│   ├── webgpuExecution.ts
│   ├── webgpuExecution.contract.ts
│   ├── webgpuExecution.test.ts
│   └── README.md
├── headless/
│   ├── headlessExecution.ts
│   ├── headlessExecution.contract.ts
│   ├── headlessExecution.test.ts
│   └── README.md
└── index.ts
```

### 12.14 Backend 模块全量文件

```txt
packages/engine/src/backend/
├── backendContract/
│   ├── backendContract.ts
│   ├── backendContract.contract.ts
│   ├── backendContract.test.ts
│   └── README.md
├── backendSelector/
│   ├── backendSelector.ts
│   ├── backendSelector.contract.ts
│   ├── backendSelector.test.ts
│   └── README.md
├── canvas2d/
│   ├── canvas2dBackend.ts
│   ├── canvas2dBackend.contract.ts
│   ├── canvas2dBackend.test.ts
│   └── README.md
├── webgl/
│   ├── webglBackend.ts
│   ├── webglBackend.contract.ts
│   ├── webglBackend.test.ts
│   └── README.md
├── webgpu/
│   ├── webgpuBackend.ts
│   ├── webgpuBackend.contract.ts
│   ├── webgpuBackend.test.ts
│   └── README.md
├── headless/
│   ├── headlessBackend.ts
│   ├── headlessBackend.contract.ts
│   ├── headlessBackend.test.ts
│   └── README.md
└── index.ts
```

### 12.15 Composition 模块全量文件

```txt
packages/engine/src/composition/
├── compositionGraph/
│   ├── compositionGraph.ts
│   ├── compositionGraph.contract.ts
│   ├── compositionGraph.test.ts
│   └── README.md
├── layerRuntime/
│   ├── layerRuntime.ts
│   ├── layerRuntime.contract.ts
│   ├── layerRuntime.test.ts
│   └── README.md
├── layerInvalidation/
│   ├── layerInvalidation.ts
│   ├── layerInvalidation.contract.ts
│   ├── layerInvalidation.test.ts
│   └── README.md
├── layerCompositor/
│   ├── layerCompositor.ts
│   ├── layerCompositor.contract.ts
│   ├── layerCompositor.test.ts
│   └── README.md
├── presentationComposer/
│   ├── presentationComposer.ts
│   ├── presentationComposer.contract.ts
│   ├── presentationComposer.test.ts
│   └── README.md
└── index.ts
```

### 12.16 Resources 与 Resource Graph 模块全量文件

```txt
packages/engine/src/resources/
├── assetRegistry/
│   ├── assetRegistry.ts
│   ├── assetRegistry.contract.ts
│   ├── assetRegistry.test.ts
│   └── README.md
├── resourceCache/
│   ├── resourceCache.ts
│   ├── resourceCache.contract.ts
│   ├── resourceCache.test.ts
│   └── README.md
├── residencyManager/
│   ├── residencyManager.ts
│   ├── residencyManager.contract.ts
│   ├── residencyManager.test.ts
│   └── README.md
├── lifetimeManager/
│   ├── lifetimeManager.ts
│   ├── lifetimeManager.contract.ts
│   ├── lifetimeManager.test.ts
│   └── README.md
├── resourceGc/
│   ├── resourceGc.ts
│   ├── resourceGc.contract.ts
│   ├── resourceGc.test.ts
│   └── README.md
└── index.ts

packages/engine/src/resource-graph/
├── resourceNode/
│   ├── resourceNode.ts
│   ├── resourceNode.contract.ts
│   ├── resourceNode.test.ts
│   └── README.md
├── resourceEdge/
│   ├── resourceEdge.ts
│   ├── resourceEdge.contract.ts
│   ├── resourceEdge.test.ts
│   └── README.md
├── uploadGraph/
│   ├── uploadGraph.ts
│   ├── uploadGraph.contract.ts
│   ├── uploadGraph.test.ts
│   └── README.md
├── evictionGraph/
│   ├── evictionGraph.ts
│   ├── evictionGraph.contract.ts
│   ├── evictionGraph.test.ts
│   └── README.md
├── pressureGraph/
│   ├── pressureGraph.ts
│   ├── pressureGraph.contract.ts
│   ├── pressureGraph.test.ts
│   └── README.md
└── index.ts
```

### 12.17 Shader、Streaming、View、Observability 模块全量文件

```txt
packages/engine/src/shader/
├── shaderCompiler/
├── shaderVariant/
├── shaderReflection/
├── shaderCache/
└── index.ts

packages/engine/src/streaming/
├── streamScheduler/
├── preloadRuntime/
├── decodeRuntime/
├── residencyRuntime/
└── index.ts

packages/engine/src/view/
├── viewport/
├── camera/
├── interactionContext/
├── multiView/
└── index.ts

packages/engine/src/observability/
├── traceRuntime/
├── metricsRuntime/
├── replayRuntime/
├── frameCapture/
└── index.ts
```

上面四个模块的每个子目录同样必须具备三件套：

1. `<name>.ts`
2. `<name>.contract.ts`
3. `<name>.test.ts`

### 12.18 Testing 模块全量文件

```txt
packages/engine/src/testing/
├── contract/
│   ├── apiContract.test.ts
│   ├── documentContract.test.ts
│   ├── productAdapterBoundaryContract.test.ts
│   ├── publicApiSurfaceContract.test.ts
│   ├── compilerContract.test.ts
│   ├── commandBufferContract.test.ts
│   └── backendContract.test.ts
├── docs/
│   ├── apiDocsCoverage.test.ts
│   ├── bilingualDocsParity.test.ts
│   └── docsNavigation.test.ts
├── parity/
│   ├── webglWebgpuParity.test.ts
│   ├── migratedAlgorithmParity.test.ts
│   └── pickingParity.test.ts
├── regression/
│   ├── hoverSelectedRegression.test.ts
│   ├── productStateIsolationRegression.test.ts
│   ├── viewportRegression.test.ts
│   └── scenePatchRegression.test.ts
├── snapshot/
│   ├── headlessSnapshot.test.ts
│   └── renderSnapshot.test.ts
└── performance/
  ├── frameBudgetPerf.test.ts
  ├── spatialQueryPerf.test.ts
  └── commandEncodePerf.test.ts
```

### 12.19 Docs 模块全量文件

```txt
packages/engine/docs/en/
├── index.md
├── getting-started/
│   ├── overview.md
│   ├── installation.md
│   ├── first-scene.md
│   └── vector-app-integration.md
├── concepts/
│   ├── engine-positioning.md
│   ├── scene-document.md
│   ├── runtime-world.md
│   ├── planar-layer.md
│   ├── volumetric-scene.md
│   ├── renderer-separation.md
│   └── product-adapter-boundary.md
├── api/
│   ├── overview.md
│   ├── developer-api.md
│   ├── mounting.md
│   ├── scene.md
│   ├── view.md
│   ├── interaction.md
│   ├── overlays.md
│   ├── assets.md
│   ├── events.md
│   ├── headless-session.md
│   ├── lifecycle.md
│   ├── scene-document.md
│   ├── runtime-world.md
│   ├── view-camera.md
│   ├── rendering.md
│   ├── backend.md
│   ├── gpu-execution.md
│   ├── resources.md
│   ├── spatial-picking.md
│   ├── composition-overlay.md
│   ├── streaming-budget.md
│   ├── observability-replay.md
│   ├── advanced-runtime.md
│   └── product-adapter-boundary.md
├── runtime/
│   ├── dirty-system.md
│   ├── frame-budget.md
│   ├── scheduler.md
│   └── deterministic-runtime.md
├── rendering/
│   ├── render-pipeline.md
│   ├── command-buffer.md
│   ├── render-planning.md
│   ├── render-execution.md
│   └── composition.md
├── backends/
│   ├── overview.md
│   ├── webgpu.md
│   ├── webgl.md
│   ├── canvas2d.md
│   └── headless.md
├── editor-integration/
│   ├── vector-app.md
│   ├── picking.md
│   ├── overlays.md
│   ├── transform-preview.md
│   └── app-bridge.md
├── diagnostics/
│   ├── metrics.md
│   ├── frame-capture.md
│   └── replay.md
├── migration/
│   ├── breaking-changes.md
│   ├── compat-removal.md
│   └── app-adapter-migration.md
├── examples/
│   ├── minimal-engine.md
│   ├── vector-scene.md
│   ├── headless-render.md
│   └── backend-selection.md
├── use-cases/
│   ├── medical-imaging.md
│   ├── surgical-simulation.md
│   ├── bim-collaboration.md
│   ├── industrial-cad.md
│   ├── gis-visualization.md
│   ├── digital-twin.md
│   ├── autonomous-driving-replay.md
│   ├── scientific-visualization.md
│   ├── molecular-rendering.md
│   ├── vector-editing.md
│   ├── video-editing.md
│   ├── game-editor-convergence.md
│   ├── whiteboard-collaboration.md
│   ├── massive-svg-pdf.md
│   ├── financial-visualization.md
│   ├── xr-ar-vr.md
│   ├── robotics-visualization.md
│   ├── iot-dashboards.md
│   ├── cloud-streaming-frontend.md
│   ├── remote-rendering-frontend.md
│   ├── ai-generated-scene.md
│   ├── massive-timeline-log.md
│   ├── presentation-rendering.md
│   ├── live-compositing.md
│   ├── creative-coding.md
│   ├── procedural-node-graph.md
│   ├── simulation-replay.md
│   ├── forensic-playback.md
│   ├── scientific-volume-rendering.md
│   └── large-scale-geospatial.md
└── API_PACK_MATRIX.md

packages/engine/docs/cn/
├── index.md
├── getting-started/
│   ├── overview.md
│   ├── installation.md
│   ├── first-scene.md
│   └── vector-app-integration.md
├── concepts/
│   ├── engine-positioning.md
│   ├── scene-document.md
│   ├── runtime-world.md
│   ├── planar-layer.md
│   ├── volumetric-scene.md
│   ├── renderer-separation.md
│   └── product-adapter-boundary.md
├── api/
│   ├── overview.md
│   ├── developer-api.md
│   ├── mounting.md
│   ├── scene.md
│   ├── view.md
│   ├── interaction.md
│   ├── overlays.md
│   ├── assets.md
│   ├── events.md
│   ├── headless-session.md
│   ├── lifecycle.md
│   ├── scene-document.md
│   ├── runtime-world.md
│   ├── view-camera.md
│   ├── rendering.md
│   ├── backend.md
│   ├── gpu-execution.md
│   ├── resources.md
│   ├── spatial-picking.md
│   ├── composition-overlay.md
│   ├── streaming-budget.md
│   ├── observability-replay.md
│   ├── advanced-runtime.md
│   └── product-adapter-boundary.md
├── runtime/
│   ├── dirty-system.md
│   ├── frame-budget.md
│   ├── scheduler.md
│   └── deterministic-runtime.md
├── rendering/
│   ├── render-pipeline.md
│   ├── command-buffer.md
│   ├── render-planning.md
│   ├── render-execution.md
│   └── composition.md
├── backends/
│   ├── overview.md
│   ├── webgpu.md
│   ├── webgl.md
│   ├── canvas2d.md
│   └── headless.md
├── editor-integration/
│   ├── vector-app.md
│   ├── picking.md
│   ├── overlays.md
│   ├── transform-preview.md
│   └── app-bridge.md
├── diagnostics/
│   ├── metrics.md
│   ├── frame-capture.md
│   └── replay.md
├── migration/
│   ├── breaking-changes.md
│   ├── compat-removal.md
│   └── app-adapter-migration.md
├── examples/
│   ├── minimal-engine.md
│   ├── vector-scene.md
│   ├── headless-render.md
│   └── backend-selection.md
├── use-cases/
│   ├── medical-imaging.md
│   ├── surgical-simulation.md
│   ├── bim-collaboration.md
│   ├── industrial-cad.md
│   ├── gis-visualization.md
│   ├── digital-twin.md
│   ├── autonomous-driving-replay.md
│   ├── scientific-visualization.md
│   ├── molecular-rendering.md
│   ├── vector-editing.md
│   ├── video-editing.md
│   ├── game-editor-convergence.md
│   ├── whiteboard-collaboration.md
│   ├── massive-svg-pdf.md
│   ├── financial-visualization.md
│   ├── xr-ar-vr.md
│   ├── robotics-visualization.md
│   ├── iot-dashboards.md
│   ├── cloud-streaming-frontend.md
│   ├── remote-rendering-frontend.md
│   ├── ai-generated-scene.md
│   ├── massive-timeline-log.md
│   ├── presentation-rendering.md
│   ├── live-compositing.md
│   ├── creative-coding.md
│   ├── procedural-node-graph.md
│   ├── simulation-replay.md
│   ├── forensic-playback.md
│   ├── scientific-volume-rendering.md
│   └── large-scale-geospatial.md
└── API_PACK_MATRIX.md
```

### 12.20 本周 M0/M1 最小落地文件（必须创建）

```txt
packages/engine/src/document/documentGraph/
├── documentGraph.ts
├── documentGraph.contract.ts
└── documentGraph.test.ts

packages/engine/src/api/productAdapterBoundary/
├── productAdapterBoundary.ts
├── productAdapterBoundary.contract.ts
└── productAdapterBoundary.test.ts

packages/engine/src/api/publicApiSurface/
├── publicApiSurface.ts
├── publicApiSurface.contract.ts
└── publicApiSurface.test.ts

packages/engine/src/compiler/sceneCompiler/
├── sceneCompiler.ts
├── sceneCompiler.contract.ts
└── sceneCompiler.test.ts

packages/engine/src/scene-runtime/runtimeWorld/
├── runtimeWorld.ts
├── runtimeWorld.contract.ts
└── runtimeWorld.test.ts

packages/engine/src/dirty/dirtyPropagation/
├── dirtyPropagation.ts
├── dirtyPropagation.contract.ts
└── dirtyPropagation.test.ts

packages/engine/src/command-buffer/commandEncoder/
├── commandEncoder.ts
├── commandEncoder.contract.ts
└── commandEncoder.test.ts

packages/engine/src/backend/backendSelector/
├── backendSelector.ts
├── backendSelector.contract.ts
└── backendSelector.test.ts

packages/engine/docs/en/
├── index.md
├── api/overview.md
├── api/developer-api.md
├── api/mounting.md
├── api/scene.md
├── api/view.md
├── api/interaction.md
├── api/overlays.md
├── api/assets.md
├── api/events.md
├── api/lifecycle.md
├── api/advanced-runtime.md
├── api/product-adapter-boundary.md
├── use-cases/vector-editing.md
├── use-cases/gis-visualization.md
├── use-cases/medical-imaging.md
├── use-cases/video-editing.md
├── use-cases/scientific-volume-rendering.md
├── use-cases/large-scale-geospatial.md
├── use-cases/autonomous-driving-replay.md
├── editor-integration/vector-app.md
└── API_PACK_MATRIX.md

packages/engine/docs/cn/
├── index.md
├── api/overview.md
├── api/developer-api.md
├── api/mounting.md
├── api/scene.md
├── api/view.md
├── api/interaction.md
├── api/overlays.md
├── api/assets.md
├── api/events.md
├── api/lifecycle.md
├── api/advanced-runtime.md
├── api/product-adapter-boundary.md
├── use-cases/vector-editing.md
├── use-cases/gis-visualization.md
├── use-cases/medical-imaging.md
├── use-cases/video-editing.md
├── use-cases/scientific-volume-rendering.md
├── use-cases/large-scale-geospatial.md
├── use-cases/autonomous-driving-replay.md
├── editor-integration/vector-app.md
└── API_PACK_MATRIX.md
```

### 12.21 文件职责与注释规范（强制）

每个实现文件必须满足：

1. 文件头注释说明“做什么/不做什么”。
2. 对外函数有显式参数与返回类型。
3. 非显然分支必须有意图注释。
4. `.test.ts` 至少覆盖：正常路径、边界路径、失败路径。

验收标准：

1. 全量文件存在并可被 typecheck。
2. 家族结构符合同名目录规则。
3. 无新增 compat 依赖。
4. `packages/engine/docs/en` 与 `packages/engine/docs/cn` 目录同构，API 文档覆盖 `PublicApiSurfaceContract` 的全部分类。
