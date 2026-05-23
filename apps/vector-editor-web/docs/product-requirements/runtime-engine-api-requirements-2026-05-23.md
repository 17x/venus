# Vector Runtime 对 Engine API 需求文档（仅需求，不改实现）

## 1. 目的与边界

目的：

1. 为 vector runtime 提供稳定、可版本化的 engine 能力契约
2. 避免 runtime 侧直接耦合 engine 内部细节
3. 支撑高频交互、可观测性、回放和性能门禁

边界：

1. 本文只描述 API 需求与规范，不触碰 engine 实现
2. Product 语义仍在 vector product/runtime 层，不下沉到 engine

## 2. 现状输入

当前已可见桥接能力：

1. createEngine
2. createEngineRenderScheduler
3. geometry payload 解析
4. adaptive hit tolerance
5. node transform 解析
6. scene adapter（runtime snapshot -> scene nodes）

## 3. 新增/强化 API 需求

### 3.1 Geometry 与命中

#### API-RG-01: resolveHitGeometryV2

目的：统一 point/marquee/outline/detailOutlines 的返回语义，减少 runtime 二次拼装。

输入：

1. nodes
2. pointer / marquee bounds
3. tolerance / clipTolerance
4. group selection 和 clip exclusion 策略
5. outline level

输出：

1. pointHitNodeIds
2. marqueeCandidateNodeIds
3. marqueeResolvedNodeIds
4. hovered payload
5. selected payload
6. diagnostics（candidateCount、filteredCount、costMs）

规范：

1. 输出顺序 deterministic
2. 空输入返回空结构，不抛异常
3. 支持版本号字段 apiVersion

### 3.2 Render Invalidation

#### API-RI-01: invalidateSceneRegions

目的：支撑 runtime 增量渲染策略，降低全量重绘成本。

输入：

1. revision
2. dirty regions（world bounds）
3. reason code（transform/style/selection/viewport/text-layout）

输出：

1. accepted / dropped
2. merged regions count
3. fallbackFullRedraw 标识

规范：

1. reason code 必填
2. region 归并策略对外可观测
3. 失败不崩溃，需返回可降级建议

### 3.3 Scene Sync

#### API-SS-01: syncSceneDelta

目的：支持 runtime 将 document delta 增量同步至渲染层。

输入：

1. baseRevision
2. nextRevision
3. add/update/remove/reorder patch 列表
4. viewport interaction hints

输出：

1. appliedRevision
2. appliedPatchCount
3. skippedPatchCount
4. syncWarnings

规范：

1. revision 不连续时返回 explicit mismatch 错误
2. 允许 runtime 触发 full snapshot fallback

### 3.4 Viewport 与交互

#### API-VP-01: commitViewportState

目的：统一 pan/zoom/fit-view 后的视口提交语义。

输入：

1. scale
2. offsetX/offsetY
3. interaction phase
4. source（wheel/gesture/command）

输出：

1. committed viewport
2. clamped 标记
3. diagnostics（anchorClamp、scaleClamp）

规范：

1. 需要 anchor clamp 信息，便于排查跳变
2. 返回值必须可直接用于下一帧矩阵计算

### 3.5 Diagnostics 与可观测性

#### API-DI-01: getRuntimeDiagnosticsSnapshot

目的：为调试面板、回归门禁提供统一诊断快照。

输出建议字段：

1. render queue wait
2. interaction throttle delay
3. coalesced request count
4. inFlight / pending frame
5. last invalidation reason
6. fallback path counters

规范：

1. 快照获取必须无副作用
2. 字段缺失时给出兼容默认值

## 4. API 设计规范

1. 每个 API 必须版本化（major.minor）
2. 破坏性变更需提供至少一个次版本兼容期
3. 错误模型统一：code + message + retryable + fallbackHint
4. 响应必须包含 deterministic 字段顺序（用于快照测试）
5. 所有新增字段必须注明稳定级别：experimental / stable

## 5. 对接流程建议

1. runtime 先引入 capability negotiation
2. 启动时读取 engine capability map
3. 不支持能力走降级路径并记录 AI-TEMP 兼容注释（若存在临时分支）
4. 在集成测试中验证契约版本和回退行为

## 6. 验收口径

1. Integration Contract Test 全通过
2. Scene Sync 与 Render Invalidation 行为可回归
3. 高频交互性能预算无明显回退
4. 诊断字段满足问题首轮归因
