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
3. [API 总览](api/overview.md)
4. [Developer API](api/developer-api.md)
5. [Runtime API](api/runtime-api.md)
6. [Capability API](api/capability-api.md)
7. [Event API](api/event-api.md)
8. [后端能力矩阵](backends/backend-capability-matrix.md)
9. [交互原语手册](editor-integration/interaction-primitives.md)
10. [Breaking Changes 策略](migration/breaking-changes.md)
11. [App Adapter 迁移指南](migration/app-adapter-migration.md)
12. [预算与 SLO](performance/budgets-and-slos.md)
13. [回放与追踪](diagnostics/replay-and-trace.md)
