# Vector App 对接 Engine 新 API 可行性与工作量评估（2026-05-21）

负责人：app/vector + engine adapter
范围：apps/vector-editor-web 与 packages/engine/docs/cn 新 API 面对齐

## 1. 结论摘要

- 结论：可行，但不建议直接“替换式切换”；建议采用 adapter 分层迁移。
- 当前耦合深度：高（vector runtime 直接依赖 @venus/engine 的 74 个符号，分布在 23 个文件）。
- 对接难度：中高。
- 预计工作量（不含新功能，仅迁移对齐）：
  - 保守平滑迁移（先适配后替换）：12-18 人天
  - 直接切主 API（跳过过渡层）：20-30 人天

## 2. 现状基线

### 2.1 构建基线

- 验证命令：pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit
- 结果：通过（当前 integration baseline 可编译）

### 2.2 依赖面基线

- apps/vector-editor-web 下来自 @venus/engine 的导入：
  - 文件数：23
  - import 语句数：25
  - distinct symbols：74
- 重度依赖文件集中在：
  - runtime engine bridge
  - viewport/zoom/interaction
  - worker spatial/hit-test

## 3. 新 API 与现状差异

### 3.1 文档中的目标 API（新）

文档目标是 developer/runtime/capability 分层：

- Developer API：createEngine(options), engine.setGraph, engine.updateGraph, engine.pick, engine.setOverlays 等。
- 迁移指南明确从 compat.setScene / compat.patchScene 映射到 setGraph / updateGraph。

### 3.2 当前运行时实际使用（旧/compat 导向）

vector bridge 当前仍依赖 compat 风格引擎能力：

- 场景：loadScene, applyScenePatchBatch
- 视口：setViewport, updateCameraAnimation, resize
- 渲染：renderFrame
- 诊断与脏区：getDiagnostics, markDirtyBounds
- overlay：setOverlayNodes

这组能力与文档里的 setGraph/updateGraph/render/pick/setOverlays 并不一一同名同参。

### 3.3 包出口状态

- packages/engine 当前仍在 index 层保留 legacy compat 导出（export \* from ./api/legacyEngineCompatExports）。
- 说明仓库处于“新旧 API 并存过渡期”，不属于完全切换完成状态。

## 4. 可行性评估

## 4.1 技术可行性

- 可行性：高。
- 原因：
  - 现有 app 已有 runtime engine bridge，可承接 API 映射改造。
  - engine 侧已有 publicApiSurface 与 profile/runtime builder 机制，具备逐步收敛条件。

## 4.2 实施复杂度

- 复杂度：中高。
- 复杂点：
  - bridge 方法映射不是简单重命名，涉及 scene patch 语义与渲染调度语义重排。
  - viewport/zoom/dirty-region 与高频交互链路对行为回归非常敏感。
  - worker 侧空间索引/命中策略目前也直接依赖 engine 导出，需分层迁移。

## 5. 工作量拆解（建议方案：分阶段）

### Phase 0: API 冻结与映射表（1-2 人天）

- 固化 vector 允许使用的 developer API 子集。
- 建立“当前 74 符号 -> 新 API/新模块”映射清单。
- 输出破坏性变更登记（breaking changes 清单）。

### Phase 1: Bridge 过渡层（3-4 人天）

- 在 apps/vector-editor-web/runtime/engine-bridge 内引入统一 adapter（app 仅依赖 adapter contract）。
- 将 createEngine/scene/render/overlay 入口集中，减少散落直连。

### Phase 2: 场景与渲染主链迁移（4-6 人天）

- loadScene/applyScenePatchBatch 迁移到 setGraph/updateGraph 语义。
- renderFrame 调度链对齐 engine.render / invalidate / pause-resume（按冻结子集）。
- 对齐 diagnostics 事件订阅模型。

### Phase 3: 视口与交互链路迁移（2-4 人天）

- setViewport/updateCameraAnimation/dirtyBounds 迁移到新 view + render 控制链。
- 回归高风险场景：高倍缩放、快速平移、拖拽预览、overlay settle。

### Phase 4: Worker 与几何工具链（2-3 人天）

- createEngineSpatialIndex、hit-test、geometry helpers 的依赖归位（capability 或 lib 层）。
- 去除 worker 对不稳定 engine surface 的直接耦合。

### Phase 5: 回归与收尾（2-3 人天）

- typecheck/lint/关键交互回归。
- 移除 compat-only 别名与临时桥接。
- 同步文档与 contract 测试。

合计：12-18 人天（建议方案）

## 6. 风险清单

- 行为回归风险（高）：缩放/平移/命中顺序/overlay 一致性。
- API 漂移风险（中）：docs 与实际导出仍存在过渡差异，需先冻结子集。
- 性能风险（中）：dirty region 与增量 patch 策略切换可能影响交互帧稳定性。
- 组织风险（中）：若 engine 文档继续快速变更，app 迁移窗口会反复返工。

## 7. 推荐执行策略

1. 先冻结“vector 对接白名单 API”再改代码（避免边改边漂移）。
2. 采用 adapter 双轨期：
   - app 只看 adapter contract
   - adapter 内部可短期桥接新旧 API
3. 以交互回归为第一验收门（hover/selection/zoom/pan/pick）。
4. 最后再做 compat 彻底清退，而不是一开始硬切。

## 8. 验收标准（建议）

- vector runtime 不再直接依赖 compat-only 方法名。
- bridge 层完成新 API 语义映射并有 contract 测试。
- 全量 typecheck/lint 通过。
- 关键交互回归场景通过：
  - 高倍缩放连续手势
  - 视口平移 + 选择命中
  - overlay 与主渲染一致性
  - scene patch 增量更新稳定性

## 9. 决策建议

- 如果目标是“尽快可用且可控风险”：采用 12-18 人天平滑迁移方案。
- 如果目标是“短期一次性纯净切换”：预计 20-30 人天，且回归风险显著上升。
