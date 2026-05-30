# Venus Engine 官方文档

版本：Draft（2026-05-21）
受众：Engine 集成方、Adapter 开发者、Runtime 维护者

## 文档目标

本文档是 `@venus/engine` 公共能力面的官方规范来源。
它不是宣传材料，而是 API 语义、参数契约、治理规则的权威参照。

## 文档分类体系

1. 概念（Concepts）

- 架构与边界
- 数据流模型
- API 治理规则

2. API 参考（API Reference）

- Developer API（`engine.*`）
- Runtime API（`engine.runtime.*`）
- Capability API（`engine.capability.*`）
- Event API（`engine.events.*` 及事件域）

3. Runtime 内核说明

- 编译、脏传播、规划、命令提交

4. 诊断与可靠性

- 指标、追踪、帧抓取、回放

5. 性能与预算

- 帧预算、查询预算、上传预算与回归门禁

## API 命名策略

公共命名空间仅允许：

- `engine.*`
- `engine.runtime.*`
- `engine.capability.*`
- `engine.events.*`

禁止：

- 在公共 API 名中出现行业语义（`medical`、`bim`、`gis`、`cad`、`finance`、`video`、`game`）。

## 稳定性级别

每个 API 必须标注以下级别之一：

- `experimental`：次版本可能调整。
- `beta`：形态趋稳，语义仍在收敛。
- `stable`：仅在主版本做破坏性变更。

## 每个 API 必须具备的契约字段

每个 API 文档页面都必须包含：

- 签名
- 参数表（名称、类型、必填、约束）
- 返回结构
- 错误码与恢复建议
- 确定性说明（如适用）
- 性能预算影响（如适用）
- 关联事件

## 推荐阅读顺序

1. [架构与边界](concepts/architecture.md)
2. [API 治理规则](concepts/api-governance.md)
3. [事件契约治理 ADR](concepts/event-contract-governance-adr.md)
4. [Playground Demo 深度分析与 API 需求文档](concepts/playground-demo-deep-analysis-2026-05-24.md)
5. [API 总览](api/overview.md)
6. [发布 API 基线](api/release-api-baseline.md)
7. [Developer API](api/developer-api.md)
8. [Runtime API](api/runtime-api.md)
9. [Capability API](api/capability-api.md)
10. [Event API](api/event-api.md)
11. [3D 优先运行时与 2D 显式启用](concepts/3d-first-2d-opt-in.md)
12. [资源与资产接入 API](api/resource-asset-ingestion.md)
13. [空间查询基线](api/spatial-query-baseline.md)
14. [时间线与回放基线](api/timeline-replay-baseline.md)
15. [后端能力矩阵](backends/backend-capability-matrix.md)
16. [发布后端矩阵](backends/release-backend-matrix.md)
17. [交互原语手册](editor-integration/interaction-primitives.md)
18. [场景 Adapter 边界手册](editor-integration/scenario-adapter-boundary-cookbook.md)
19. [Breaking Changes 策略](migration/breaking-changes.md)
20. [App Adapter 迁移指南](migration/app-adapter-migration.md)
21. [预算与 SLO](performance/budgets-and-slos.md)
22. [回放与追踪](diagnostics/replay-and-trace.md)
