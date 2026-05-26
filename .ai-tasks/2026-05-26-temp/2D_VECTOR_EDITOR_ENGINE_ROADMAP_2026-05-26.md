# 2D Vector Editor × Engine 全仓开发路线文档（2026-05-26）

Status: Draft for execution  
Owner: Product/Runtime/Engine 联合工作流  
Scope: `apps/vector-editor-web` + `apps/playground` + `packages/engine`

## 0. CHANGE REQUEST（执行前记录）

### 0.1 Target

1. File / Module:
   1. `docs/2D_VECTOR_EDITOR_ENGINE_ROADMAP_2026-05-26.md`
   2. `docs/index.md`（索引入口）

### 0.2 Goal

1. Problem being solved:
   1. 2D Vector Editor 的产品目标明确，但对 Engine 能力边界、Backend 可用性、2D->3D 映射契约和回归基线缺少统一执行文档。
   2. 需要将“现状证据、风险、阶段计划、首周任务、验收口径”收敛到一个可执行、可编号、可追踪文档。

### 0.3 Change Type

1. Add / Modify / Remove:
   1. Add：新增路线文档。
   2. Modify：文档索引增加入口。

### 0.4 Impact

1. Affected modules:
   1. 文档层，不修改业务代码。

### 0.5 Cleanup

1. Old logic to remove:
   1. 无（本次是统一落盘，不替换运行时代码）。

### 0.6 Tests

1. Tests to add/update:
   1. 无（文档变更）。

---

## 1. 目标与范围定义

### 1.1 产品总目标

1. 在完善 Engine 能力的同时，持续交付可用的 2D Vector Editor（对标 Figma/Adobe Illustrator 核心能力）。
2. 保持架构分层：Product 语义在 `vector-editor-web`，Runtime 机制在 runtime bridge，Engine 负责底层渲染/命中/调度。

### 1.2 当前关键困难

1. 2D 语义与 3D API 的概念交错，导致映射边界不清。
2. Backend 能力分层存在，但“哪些可生产使用、哪些仅诊断/实验”需要明确门禁。
3. API 名称层面存在“需求名”与“实现名”不一致问题。
4. 你对 3D 不熟，必须通过“契约化 + 场景化回归”降低认知负担。

### 1.3 本文交付范围

1. 全仓模块地图与成熟度。
2. 风险与耦合点。
3. 分阶段路线图（目标、依赖、里程碑、验收）。
4. 第一周任务清单（编号、优先级、输出物）。
5. 能力盘点表结构与评分方法。

---

## 2. 现状证据地图（按仓库路径）

### 2.1 顶层模块

1. Product 主应用：`apps/vector-editor-web`
2. 验证与诊断：`apps/playground`
3. 引擎核心：`packages/engine`
4. 编辑基础设施：`packages/editor-primitive`
5. 底层工具：`packages/lib`

### 2.2 Engine 与 Backend 证据

1. Backend 分层政策：`packages/engine/docs/backend-tier-policy.md`
2. Backend 选择入口：`packages/engine/src/backend/backendSelector.ts`
3. WebGL 适配：`packages/engine/src/backend/adapters/webglBackendAdapter.ts`
4. Canvas2D 适配：`packages/engine/src/backend/adapters/canvas2dBackendAdapter.ts`
5. WebGPU 适配：`packages/engine/src/backend/adapters/webgpuBackendAdapter.ts`
6. 公共 Engine Handle 契约：`packages/engine/src/orchestration/api/public-types/engine-handle.types.ts`
7. Runtime/Capability 契约：`packages/engine/src/orchestration/api/public-types/runtime-capability.types.ts`
8. Runtime 能力注册表：`packages/engine/src/orchestration/api/runtimeCapabilityMap.ts`

### 2.3 Vector Runtime Bridge 证据

1. Runtime Engine facade：`apps/vector-editor-web/src/runtime/engine-bridge/engine.ts`
2. 渲染策略与 LOD：`apps/vector-editor-web/src/runtime/engine-bridge/renderPolicy.ts`
3. 命中适配层：`apps/vector-editor-web/src/runtime/hittest/hitTestAdapter.ts`
4. 共享内存布局：`apps/vector-editor-web/src/runtime/shared-memory/index.ts`

### 2.4 Playground / 3dEditor 验证面证据

1. 路由入口（`#/3dEditor`）：`apps/playground/src/main.tsx`
2. 本地 3D Editor Runtime 挂载：`apps/playground/src/runtime/threeEditor/mountThreeEditorRuntime.ts`
3. 场景目录：`apps/playground/src/scenarios/scenarioCatalog.ts`
4. 关键场景：
   1. `apps/playground/src/scenarios/3d-editor-validation/scene.ts`
   2. `apps/playground/src/scenarios/2d-basic/scene.ts`
   3. `apps/playground/src/scenarios/2d-interactive/scene.ts`
   4. `apps/playground/src/scenarios/canvas2d-fallback/scene.ts`
   5. `apps/playground/src/scenarios/2d-performance/scene.ts`

### 2.5 PRD 与执行基线证据

1. 总览：`apps/vector-editor-web/docs/product-requirements/prd-overview.md`
2. 里程碑：`apps/vector-editor-web/docs/product-requirements/release-plan.md`
3. Runtime-Engine API 需求：`apps/vector-editor-web/docs/product-requirements/runtime-engine-api-requirements-2026-05-23.md`
4. M1/M2 目标：`apps/vector-editor-web/docs/product-requirements/m1-target-expectations.md`、`m2-target-expectations.md`
5. Runtime 桥接模块要求：`apps/vector-editor-web/docs/product-requirements/module-05-runtime-bridge-performance.md`

---

## 3. 成熟度评估（可用/部分/占位）

### 3.1 Engine & Backend

1. **WebGL（Tier1）**：可作为当前生产主路径。
2. **Canvas2D（Tier3）**：可用，但目标是正确性与诊断，不承担高保真 parity 责任。
3. **WebGPU（Tier2）**：具备适配器与门禁机制，但定位实验轨。
4. **Diagnostics 与 Scheduler**：契约和接口齐全（`getDiagnostics`、scheduler diagnostics 等）。

### 3.2 Vector Runtime

1. Runtime bridge 已形成独立边界，不是直接产品层操作 engine 内部。
2. 命中、几何、调度、渲染策略都有对应模块。
3. Shared memory 不是空壳，已有明确布局（meta/geometry/renderHints/kind/flags）。

### 3.3 Playground

1. `#/3dEditor` 可运行，且状态栏直接读取 engine diagnostics/stats。
2. Scenario catalog 已覆盖 2D 基础、2D交互、性能、3D验证、fallback 场景。
3. 适合作为能力验证与回归对照面。

### 3.4 结论

1. 当前不是“无能力状态”，而是“能力存在但契约名与执行口径尚未完全统一”。
2. 路线重点应是契约对账与语义固化，而不是盲目补底层实现。

---

## 4. 需求 API 与实现 API 对账（核心差异）

### 4.1 需求侧（PRD 命名）

1. `resolveHitGeometryV2`
2. `invalidateSceneRegions`
3. `syncSceneDelta`
4. `commitViewportState`
5. `getRuntimeDiagnosticsSnapshot`

### 4.2 实现侧（当前可映射能力）

1. 几何命中聚合：
   1. `engine.capability.spatial.createHitGeometryPayload`
   2. `engine.runtime.plan.createHitGeometryPayload`
2. 增量同步：
   1. `setGraph`
   2. `updateGraph`
   3. `batchUpdateGraph`
3. 视口提交：
   1. `setView`
   2. `getView`
4. 失效与重绘：
   1. `invalidate`（存在，但是否达到“region merge + reason 输出”语义需补契约）
5. 诊断快照：
   1. `getDiagnostics`
   2. scheduler diagnostics（runtime bridge）

### 4.3 差异类型

1. **命名差异**：PRD 要求名与实际公共 API 名不一致。
2. **语义差异**：部分“结构化输出字段”在当前 API 不一定同构。
3. **治理差异**：需要“需求契约 -> 适配层 -> 引擎能力”三段映射表，避免团队口径分裂。

---

## 5. 架构风险与控制措施

### 5.1 风险 R-01：2D 语义到 3D API 映射漂移

1. 风险描述：
   1. 坐标、矩阵、命中容差在多个模块各自解释，导致渲染和交互错位。
2. 控制措施：
   1. 固化“单一映射规范文档”（坐标系、矩阵顺序、单位、容差）。
   2. 在 bridge 侧增加统一转换入口，禁止重复散落实现。

### 5.2 风险 R-02：Fallback 语义不一致

1. 风险描述：
   1. WebGL/Canvas2D 降级后出现行为差异却无法归因。
2. 控制措施：
   1. 场景级回归基线固定（2d-basic、2d-interactive、canvas2d-fallback、3d-editor-validation）。
   2. 每次回归保留 fallback reason 与视觉对比记录。

### 5.3 风险 R-03：需求 API 与实现 API 对不上

1. 风险描述：
   1. 产品文档写的是 A，代码调的是 B，造成“已实现/未实现”争议。
2. 控制措施：
   1. 建立映射字典（需求项->实现项->缺口->临时策略->owner）。
   2. 合并评审必须以映射字典为准。

### 5.4 风险 R-04：交互主链路回归成本高

1. 风险描述：
   1. 编辑器交互复杂，局部改动容易破坏指针生命周期和提交一致性。
2. 控制措施：
   1. 以现有 M1/M2 回归脚本为门禁，新增改动必须通过核心链路清单。

---

## 6. 分阶段开发路线（执行版）

### 6.1 Phase 0（能力盘点与契约对齐）

1. 目标：
   1. 解除 Engine/Backend 黑盒状态。
   2. 给出“已实现、部分实现、缺失”的明确边界。
2. 关键里程碑：
   1. M0-1：能力盘点矩阵落盘（engine/backend/editor 三维）。
   2. M0-2：需求 API 对账表落盘。
   3. M0-3：Playground 四场景基线建立。
3. 验收：
   1. 每个需求项均有映射结果或阻塞说明。
   2. 四场景有统一基线记录。

### 6.2 Phase 1（2D/3D 契约固化与主链路稳定）

1. 目标：
   1. 固化 document->scene->engine 的映射规则。
   2. 稳定选择、命中、变换、样式提交链路。
2. 关键里程碑：
   1. M1-1：坐标系与矩阵规范统一。
   2. M1-2：命中容差与候选排序语义统一。
   3. M1-3：增量同步策略统一（full snapshot vs patch）。
3. 验收：
   1. 交互无明显漂移、跳变、错选。
   2. WebGL 主路径稳定，Canvas2D 降级可解释。

### 6.3 Phase 2（专业编辑深度）

1. 目标：
   1. 在稳定底座上推进路径/文字/结构能力。
2. 关键里程碑：
   1. M2-1：路径拓扑操作增强。
   2. M2-2：文字 run/段落能力增强。
   3. M2-3：图层/蒙版/布尔链路增强。
3. 验收：
   1. M2 复杂任务通过率提升且可回归。

### 6.4 Phase 3（平台化能力）

1. 目标：
   1. 组件、协作、扩展能力进入可演示阶段。
2. 关键里程碑：
   1. M3-1：组件系统 MVP。
   2. M3-2：协作模型 MVP。
   3. M3-3：插件 API Alpha。
3. 验收：
   1. 多人协作主链路可演示。
   2. 组件复用链路可用于真实场景。

---

## 7. 第一周执行清单（编号版）

### 7.1 W1-T01（P0）Engine 能力盘点表落盘

1. 输入：
   1. `backend-tier-policy.md`
   2. `engine-handle.types.ts`
   3. `runtime-capability.types.ts`
2. 行动：
   1. 列出所有公共能力项。
   2. 标注稳定级别与依赖 backend tier。
3. 输出物：
   1. 能力盘点表 v1（见第 8 章模板）。
4. 验收：
   1. 至少覆盖 query/pick/raycast/view/graph/diagnostics/runtime/capability 主项。

### 7.2 W1-T02（P0）需求 API 对账表

1. 输入：
   1. `runtime-engine-api-requirements-2026-05-23.md`
2. 行动：
   1. 将每个需求 API 映射到实际 engine/runtime/capability 接口。
   2. 标注差异类型（命名差异/语义差异/缺失）。
3. 输出物：
   1. API 对账表 v1。
4. 验收：
   1. 所有需求项均有归属。

### 7.3 W1-T03（P0）2D->3D 映射规范冻结

1. 输入：
   1. `engine-bridge/engine.ts`
   2. `shared-memory/index.ts`
   3. `renderPolicy.ts`
2. 行动：
   1. 固化坐标系定义。
   2. 固化矩阵顺序和单位约定。
   3. 固化命中容差语义和默认值来源。
3. 输出物：
   1. 映射规范 v1（供 runtime/engine 共用）。
4. 验收：
   1. 不允许同一语义在多处重复定义。

### 7.4 W1-T04（P0）Playground 基线建立

1. 场景：
   1. `3d-editor-validation`
   2. `2d-basic`
   3. `2d-interactive`
   4. `canvas2d-fallback`
2. 行动：
   1. 固定观察项（节点数量、命中结果、fallback 信息、关键视觉项）。
3. 输出物：
   1. 每场景一份基线记录（可后续自动化）。
4. 验收：
   1. 场景切换稳定，结果可复现。

### 7.5 W1-T05（P1）回归门禁接线

1. 输入：
   1. 现有 M1/M2 回归脚本与 perf gate。
2. 行动：
   1. 将“契约改动 -> 回归项”建立映射。
3. 输出物：
   1. 回归项映射表 v1。
4. 验收：
   1. 每类改动都能定位对应回归集合。

### 7.6 W1-T06（P1）缺口闭环机制

1. 行动：
   1. 对“需求 API 无法直接映射”的项设定 owner、替代策略、阻塞等级。
2. 输出物：
   1. 缺口闭环清单 v1。
3. 验收：
   1. 不再出现“未知状态”的需求项。

---

## 8. 能力盘点表结构（执行模板）

### 8.1 表头定义

1. `ID`
2. `维度`（Engine / Backend / Editor）
3. `能力项`
4. `目标语义`
5. `现有接口`
6. `状态`（Stable / Experimental / Partial / Missing / Unknown）
7. `分值`
8. `依赖项`
9. `风险等级`
10. `替代策略`
11. `Owner`
12. `验收用例`
13. `备注`

### 8.2 评分规则

1. Stable = 4
2. Experimental = 2
3. Partial = 1
4. Missing = 0
5. Unknown = 不计分（必须在当周转为已知）

### 8.3 评分输出

1. 每维度得分（Engine/Backend/Editor）。
2. 总分与周趋势（W1/W2/...）。
3. 阻塞项占比（Missing + Unknown）。

---

## 9. Playground 作为长期基线的执行规则

### 9.1 定位

1. `#/3dEditor`：Engine 3D 能力验证主场景。
2. scenario catalog：2D/3D/fallback/perf 的回归矩阵载体。

### 9.2 规则

1. 新增/修改 Engine 能力时，必须指定受影响场景。
2. 未覆盖场景的能力变更不得直接宣称“已稳定”。
3. 每个高风险改动至少回归以下两类场景：
   1. 1 个 2D 场景
   2. 1 个 3D 或 fallback 场景

### 9.3 目标

1. 将“主观感觉可用”变成“场景可证据化可用”。

---

## 10. 团队协作与责任边界（RACI 简版）

### 10.1 Product

1. 负责语义定义、交互规则、验收口径。

### 10.2 Runtime

1. 负责 bridge 契约、调度、命中映射、预览提交一致性。

### 10.3 Engine

1. 负责渲染机制、backend 选择与能力门禁、诊断输出。

### 10.4 QA/工具链

1. 负责 scenario 基线、回归门禁、性能趋势记录。

---

## 11. 决策原则（防止路线跑偏）

1. 先对齐契约再扩展功能。
2. 先固化映射语义再调优渲染效果。
3. 先做可回归场景再做“演示型”功能。
4. 对 3D 不熟时，优先依赖“能力表 + 场景基线 + 对账表”，而非口头判断。

---

## 12. 立即执行顺序（建议）

1. 执行 W1-T01 与 W1-T02（同天并行）。
2. 执行 W1-T03（形成单一映射规范）。
3. 执行 W1-T04（建立 playground 四场景基线）。
4. 执行 W1-T05 与 W1-T06（回归门禁与缺口闭环）。

当以上 6 项完成后，再进入 Phase 1 的功能性改造任务。
